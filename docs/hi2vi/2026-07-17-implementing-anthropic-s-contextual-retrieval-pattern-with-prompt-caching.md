---
title: "Implementing Anthropic's Contextual Retrieval Pattern with Prompt Caching"
date: 2026-07-17
tags:
  - rag
  - prompt-caching
  - vector-search
  - knowledge-graphs
related:
  - hi2vi/2026-07-16-implementing-microsoft-s-graphrag-approach-for-global-context-reasoning-in-enterprise-knowledge-bases.md
  - hi2vi/2026-07-15-optimizing-entity-extraction-and-resolution-in-graphrag-pipelines-using-dspy-pro.md
  - hi2vi/2026-07-15-hybrid-ranking-in-vector-search-algorithms-architectures-and-optimizations.md
source:
  project: hi2vi
  repo: https://hi2vi.com
---

# Implementing Anthropic's Contextual Retrieval Pattern with Prompt Caching

> **Note for Beginners:** Imagine taking a single page out of a dense textbook and handing it to a friend out of the blue. Without knowing the book's title, the chapter, or the overarching topic, they might entirely misunderstand what that page is about. Standard Retrieval-Augmented Generation (RAG) suffers from this exact problem when it splits large documents into small, isolated "chunks" for database search. Anthropic's Contextual Retrieval solves this by having an AI read the whole textbook first and explicitly write a short "sticky note" on every single page explaining how it fits into the bigger picture. Because making the AI read the whole book for every single page would be incredibly slow and expensive, we use a technique called "Prompt Caching" to let the AI memorize the book once and instantly recall it for the rest of the pages.

## 1. The Contextual Retrieval Architecture
Traditional RAG pipelines struggle with decontextualization; a chunk stating "revenue increased by 5%" is useless if the system cannot link it to a specific company or quarter. Anthropic's Contextual Retrieval architecture rectifies this through a rigorous ingestion and retrieval pipeline.

### A. The Ingestion Pipeline
During the one-time indexing phase, the system divides input documents into standard chunks (e.g., 500 to 1,000 tokens). Before vectorization, each chunk is processed by an LLM (typically Claude 3 Haiku or Claude 3.5 Sonnet) alongside its complete parent document. 

The LLM generates a highly specific, succinct context statement (usually 1–2 sentences, or 50–100 tokens) detailing the chunk's relationship to the parent text. To enforce brevity and prevent the model from outputting conversational filler, the prompt explicitly commands: *"Answer only with the succinct context and nothing else."*

This output is directly prepended to the original chunk:
`Contextualized Text = Generated Context + "\n\n" + Original Chunk`

The newly contextualized text undergoes dual indexing:
1. **Contextual Embeddings:** It is passed to an embedding model (like Voyage AI) to generate a dense vector for semantic search.
2. **Contextual BM25:** It is simultaneously indexed into a sparse lexical database (like Elasticsearch) to capture exact keyword matches across both the raw chunk and its new contextual summary.

### B. The Retrieval Pipeline
At search time, the system executes two concurrent searches over the dense and sparse indexes. The results are merged using Reciprocal Rank Fusion (RRF). Anthropic recommends a Weighted Reciprocal Rank Fusion (WRRF) that heavily favors semantic search—using a baseline tunable weight of 80% for semantic vectors and 20% for BM25 lexical matches. Finally, a cross-encoder reranker (such as Cohere's Rerank model) evaluates the top 150 candidates, pushing the most actionable query-document pairs to the top before passing them to the final generation LLM.

```text
+---------------------+       +------------------------+       +------------------------+
|  Parent Document    | ----> | Write to KV-Cache      | ----> | Cached Prefix (Active) |
+---------------------+       +------------------------+       +------------------------+
          |                                                             |
          v                                                             v
+---------------------+       +------------------------+       +------------------------+
| Sequential Chunks   | ----> |  Dynamic Chunk Prompt  | ----> | Fast Context Generation|
+---------------------+       +------------------------+       +------------------------+
                                                                        |
                                         +------------------------------+
                                         v
                          +------------------------------+
                          | Contextualized Chunk Created |
                          | (Summary + Original Text)    |
                          +------------------------------+
                                         |
                       +-----------------+-----------------+
                       v                                   v
             +-------------------+               +-------------------+
             | Dense Indexing    |               | Sparse Indexing   |
             | (Voyage AI Dense) |               | (BM25 Lexical)    |
             +-------------------+               +-------------------+
```

## 2. Prompt Caching Economics and Mechanics
Prepending context to thousands of chunks creates a scaling bottleneck. Passing an entire document to an LLM for *every* individual chunk scales computationally as $\mathcal{O}(N \times M)$ (where $N$ is document length and $M$ is the number of chunks). Anthropic circumvents this via their Prompt Caching API.

### Integration Mechanics
Developers explicitly designate the parent document as a cacheable prefix by injecting `"cache_control": {"type": "ephemeral"}` into the API payload's document block. To maximize cache efficiency, chunks must be processed sequentially by document.

1. **Cache Write (Prefill):** The first chunk triggers a cache miss. The LLM computes the Key-Value (KV) self-attention states for the full document prefix and writes them to hardware memory. This incurs a slight premium (roughly 1.25× the standard token rate) tracked under `cache_creation_input_tokens`.
2. **Cache Reads:** Subsequent requests for the remaining chunks reuse this identical prefix, triggering a cache hit. The model bypasses the prefill compute phase entirely. 

This read mechanism cuts latency by up to 85% and provides a 90% cost discount on prefix tokens (e.g., $0.30 per million tokens on Claude 3.5 Sonnet, bringing large-scale ingestion costs down to roughly $1.02 per million document tokens). 

### Crucial Constraints
The cache has a strict 5-minute Time-To-Live (TTL), which refreshes on every hit. Determinism is mandatory: any modification to the system prompt or data preceding the dynamic chunk text invalidates the cache. Additionally, developers utilizing parallel batching APIs must first send a single synchronous "warming" request to establish the cache before firing parallel chunk requests; otherwise, the concurrent requests will all register as cache misses. Minimum token limits also apply (1,024 tokens for Claude 3.5 Sonnet/Opus; 2,048 for Haiku).

## 3. The Truncation Conundrum
Prepending 100 tokens of context to a standard 500-token chunk increases the total payload size. If routed through older embedding models with strict input limits (e.g., 512 tokens), the model will often succumb to the "silent truncation trap." The model silently drops the tail end of the text—destroying the original chunk data—without throwing an error, severely degrading retrieval accuracy.

Anthropic mandates using embedding models with expansive context windows to prevent this. Native model-level solutions have also emerged. Voyage AI (an Anthropic-recommended provider) offers specialized models (`voyage-context-3` and `voyage-context-4`) featuring up to a 32,000-token per-chunk context window. Furthermore, Voyage models support a boolean `truncation` parameter; explicitly setting `truncation=False` forces the system to throw a hard error rather than silently discarding text. An alternative industry approach is "Late Chunking," where the entire text is processed by a long-context transformer before boundary pooling is applied, neutralizing input string alteration risks entirely.

## 4. Performance Benchmarks
Anthropic measures contextual retrieval success using the "Top-20-chunk retrieval failure rate" (1 minus Recall@20), averaged across codebases, fiction, and scientific/arXiv papers. Contextual embedding consistently outperforms baseline semantic chunking, with the full hybrid stack yielding a nearly 70% reduction in failure rates.

| Architecture Setup | Retrieval Failure Rate (Top-20) | Relative Improvement vs Baseline |
| :--- | :--- | :--- |
| Standard RAG (Baseline) | 5.7% | 0% |
| Contextual Embeddings Only | 3.7% | 35% |
| Contextual Embeddings + Contextual BM25 | 2.9% | 49% |
| Full Stack (Embeddings + BM25 + Reranking) | 1.9% | 67% |

These internal benchmarks were independently validated in June 2025 by AWS Bedrock, which reported aggregated improvements in context precision, context recall, and answer correctness.

## 5. Implementation in standard RAG Frameworks
As of 2026, framework support for Contextual Retrieval varies in out-of-the-box maturity:

* **LlamaIndex:** Introduced native support in early 2025 (v0.12.13) via the `DocumentContextExtractor` class. This component requires a `docstore` to house the raw parent documents. It automatically retrieves parent texts, handles chunk mapping, and leverages parallel processing with exponential backoff for rate limits. It maps the generated summary to a customizable metadata `"context"` key, formatting it alongside the raw text during the final embedding stage.
* **LangChain:** LangChain currently lacks a single dedicated extraction wrapper for pre-index context generation. Implementations rely on LangChain Expression Language (LCEL) pipelines linking `RecursiveCharacterTextSplitter`, `ChatPromptTemplate`, and manual LangChain `Document` re-creation. Developers must explicitly apply the `cache_control` parameter inside their prompt structures to prevent silent cache busts during document iteration. (Note: LangChain's `ContextualCompressionRetriever` is a post-retrieval query filter, not an ingestion tool, and should not be confused with this pattern).

## Mini-glossary
* **BM25:** A sparse, keyword-based search algorithm that ranks documents based on the term frequency and inverse document frequency of the exact words in a query.
* **Cross-Encoder:** A machine learning architecture used for reranking that processes both the user query and the retrieved document simultaneously, evaluating their relevance deeply at the cost of higher latency.
* **KV-cache (Key-Value cache):** A mechanism in large language models that stores intermediate computational states (attention keys and values) of previously processed text, allowing the model to bypass redundant calculations for repeated text prefixes.
* **Late Chunking:** An alternative to contextual retrieval where a long-context embedding model processes a full document first, and dense vector representations are assigned to chunks post-processing based on token spans.
* **Reciprocal Rank Fusion (RRF):** An algorithm used in hybrid search pipelines that mathematically combines multiple ranked lists (e.g., from dense semantic search and sparse keyword search) into a single, unified ranking.
* **Recall@20:** A retrieval metric measuring whether the relevant, target chunk appeared anywhere within the top 20 results returned by the search algorithm.
* **Time-To-Live (TTL):** The strict operational lifespan of cached data before it is automatically deleted (e.g., 5 minutes for Anthropic's ephemeral prompt cache).

## References
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFJCwHj6JZCzXLIRsAGCmZF63GnkoLF_kCF8h8ilkPAbPFesVpLJr6QxOqF-mwdTpl8qEglux2-J8e_Sts4qtezzkFShswnHE6F74vmu4GUEZwCQH4JD4z3KKf5D7Im9egMVNjqYESSRfiKPqL30rGXRtBSJ86dFHI0Vgsi-oP65KPXwQ==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGdka9YOgIZcKHO-J4paKxtmG0R5_gto8nkuXqZw_adZo4OKVADjEutL3HHW44GhXjrJcIogHJ3dOqP6iGA8wgYMxQIl4LTmS2bFl6J2nZc1pXh-GwQn0G9VVHZ_-L6yOqwZEjSossb7Ms4gtDKdBUdstGXsdtm5egyVtnHEBsAsI6mHXl6I7iVKZS8K4tBDPDFxyI5dr9T8q8_MVzNVRaxRH98f6GQV8L3P1NFsxZCA5LICNeNAOAypGw6RTGtPc_nizj1HtkbXaEf)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHkUBedknsgSpRH-W1MWHAxkZH7wSpJJXePd9TuKR3APGEqIG1G2IIHuVHTpaZVmkYn6KDkEjN5LrqTr6bDf-cp_E7plE9kTQ8in1r-QlOZ1D5Nx-DMVannaICQLgPdJOyv6OK49Jx-MApM5Amp8QPoKVw=)
- [datacamp.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHhtl1lY6uPIDsEw-UXuXOpKyILqg4_Q2tUfgqblcprGme0GE3GHuPXiUG6VQYwHdQA5R0OaNU6tab_qTXwkFvTUz2acul07LQtsR3tpOL74pUps4lJkp64rXid75UwvsyV7V03eoJ_N04TMMUpqFS7q4XktFcy)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGOtu9hMCeI3bFmMlJs_kNwFxnXf7a2DpZt31QrYqrbntOz_1M8yNm6WERRx5T-eMQy-yFBvys5W7H6_JKqg7aUk_EhJBzCHo_rQgXzhBNuvBppv_UGpetbs8qfwW7YjSUEq24BQbtLcNCTd4JMiQe-Lw4GlFQqJsYNqhH3e71_15QFZJUG9OFv0Y38l5prkrxPre3qCA==)
- [arxiv.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGQ9sVVmDS58s5DDptD1RxQmop4ud8alCMRWD5unQw1XVFKbitubIbBznenGM41uLTMNfWfMbHCyGSf2Clcplp76BWQltp9lcXXZ2C2NgQEUz0NGFCKNtPlEA==)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEpr_gCNdNo34Cv8RwgwRmcxHZD51codd-MrSjeQNGpewV_m0m4HojCOE9ga5VB5fbSjJWlfMhj5B03g6puwmu4CTQhWy2zKns7LRIcJtMn3RqOSiOYm695zse2DBLEoXSHk9rdxZ0AR2ddtjPXmxkgbek5RdSURX5ERjSiO231VRh16g==)
- [scribd.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGmD0d-SoP4rP6XQywWFWnIonfKCVriTnJQpAB-dWfD7El7lU9iik93wnwCYSqirWssBKQQc80bi0EjnrIgpayPo08Mmk7YHltBTwcFxg78wqgsl0OSwoeNbK_qqodnEAJ5fPMX-kWVdi9UPrCCwPIXzdWU-DGy0U_3gXXNmLalF3GhfryKbMGAL02iupvG3lEV-D08Y979lPDpNp_hY3x4BY3aIvtjhLA1NfO2pOY=)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQETyEVnpLOV8fAMkdribTPkQFKCNi_J7uY7YVxJfSe9yuLoIgsWdkawYT0XQOE9HT_9OHEpFs-4VhZiohAFps5p5u5H0OBwcYnA5PWq1Yw0on_sgHPulT-7FV0RxDpNt-W74SKsUyPjqztgB0yhqF-HSiQL-X7kCxz5LR_uydJAEtEXmct7_Djpcp28cW8oaN4C7wdK7bCrRjvFve-0QEhjcurW-7WFmMuTAUMJOHTZe1nkEC_4TOmLRFaCfTlmj0Mylag=)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFsd1LccAAn7s2zVvcaUBD-C_6Z-BybN42bOwkg9VR2KQPD5RvgGy2vENbJUmbevygzxv0LY6obN3U5vXEpeBQpNWAl9n21QG9EvEPmK9_UZPMfEP1eb6sA2WOFZVIYtomKPL_jqNhrpnYWqQti054hf4n8N81JNtJCZJLkoDIpuhUb)
- [microsoft.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFHync2eTZj3gbk8WpdOBAGuek8QJhgam1SXuAierz7KIYjGRDZ1JwxNXzO0A_koIRmaBAi69IzmQ8GO12k3QskyMuY62K-TMbJlSfbxWimAvdLjeNsgt3_0VKs7Msp87jxintin6KPWxmwl8yyalWJVpb8EpjONbdID1Hp36OpCWojYdmG0fdeHQ2nyPfTYeupDHoID9SKfvRS_j5SST2Sb6mt9CO_Od3xQ8YDJYFpGnc9xAsSPD1XCsRHcN0s)
- [freecodecamp.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFvydW00xANFp-2yUscQRrzK54KZs__Mrwfh_AN1QgiLC6XvbqfoZSjp_6hlH-VfE1rQgSxCexvY4cWAHM5EOeoX7eHT22b_W_SySUM5d5Upznwfs0ZwOK7RsyLGCYdnU2ab7mxTH7gXlJYx7fCtI4ocQ68eSkTTmslmmDFy2cm_8LEPY_Dl1f4Upy-CuLYuT7jRE5yzh_GpZ71)
- [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEonEJQhVYdYyt8yKfhx7N01kkf3WNWH-Uqw--0uc_xRXz0Vuq-thYweTz7s_h5ANXlC0F04jPPZDdvwewnGve_JQZmEAmg5_65pHhkuUL4ex82BBgplHursx6rkMttqGOJje1isC74_D3D6UgoBAXd06VDI4tSZGGhhgoh8dyGe3Ky23osyFJLTVH2kXU3sxpZ)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEJjSyI20cvQKrkk7kcvqLCejjYQQy1IUdlY-aS0dSRc1kX7huVA5z__AoNVejldeoyE0CYHGlC-7K1rTLciaM2hedLSimiqEsRVk5fUzlYROsZdUHDU4ga4UqNy0Unjvp42kdBiekDl4F1KbBhFc-sr1CrdjKvJPPn58mV2GTSvaw5mcXxuC2jLj37-OT-mnKW0kkTXvQHXMUR74f5513n42_HHO3H1c7TtkyFJ917bjX3JeNR5YwI7_nTG_aRwJBDVCk=)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQERJ11OO9lvamHUAKZGLpvVuuxHMR0DocMLTQZPKU7VOciEpzQgV5Oa4tbQ5oPsZ6-XHK1njAq7BRDBHabCQQ3hY51PdoxBikdv4lA54n3nQtkzMXm4vFUTtM42A3nFURGnj6NjTeqk7EP8lUbihIFZ)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEYVA8Wo8bi0Y94y100Hh_T6s_4yyNC5TeKQDlBvxct75l2CiFVd5Eehp9V1ZWINSQdnNiVZ00zDvf0xpDlHE2TLjEw5ZRPPCSrvzqIKBU0H-3yW8RGnwDjQiqzlWnjyuo7fzJDmTvIYsYKLzMkvirRjZtAXXnxFUJS_ocY_zQe3PwGzg==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF6my0_ZtTrYvEPSb1Wlo_d024FKP6I-N94cmVIUH-ky-FJTgj7gAuxFGs0XF7YxPKXpWtGc18yxOheo7GMpglEdf6fFQ6_9jTnb2-Z0hmbw2Midyfp8fvTLfqyiCGZawg3sMBPz_a8HkB0gReO7_vzN1TQF-xnKbvtSB6C6GYQXUUfid4xvoxL4RtdvqDpgyuim1CR7EUuMDK7dwjVK2LJlejA9dgw176NXzlDDe3VlXJ_7rp7c-TmzGOzcZqsCFpfvHmlm9eQrQs53A==)
- [openreview.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH_u8N9qjmoqIWKL6KsAFAjpZznuTivY_Op5Q4Dv-KExduQjUPYpQvy1KR8ZqNfUKK0_miUufrWyVAqPw41u5eFd72GkirMUSlAB-Iy0KjtjIEmozg76XDfJp5wbr7nf7DLdleU1FBew-B-t0IX)
- [datacamp.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH-SdDKCuARfPiufBF7y8e5TzUFgIuIYYgyWGDyi3nEYo0-D3l7vvYZNgB8M0ehBvD-E-7uF22oN4d_YGFJDy-4MUWZvcd8abE-QRCvhjfEWnZN0ZolfFH4-y4tNUAYnBldlkvpdrq6K6tZaH_9WpDkmsp6qFtb)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH3B0J_A2LqtlzJGYwFsqAgAru1Ut4NqED-Gw-9EFCnELTBnD0zwKcTebs26BWMP4l5fX4-WGr7BwiaZswusTpkkCzjFc82MQccrc9-bpocRf8ShM8UOhKk30dQakghhpm_6sYt7nbQ4oRP0tejLej1vjE8UE-3YhFuPec8UOibGHCORtRn1zFYIVD-lRZtYJRgq94Og3ro9lLJqI9n-On74hljrh2gmA4qkOjQu5mzbl49JpBbvkxY8psJPEjK4d8bBlGNWOVS9J0fjA==)
- [fastly.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF2rPF7h2rE71pKyNPLzxz3ZSOqWOvHI9bObB04J3hLP6z83ChFmJOaqzvWzfbqSqGGFmiD7-TMCwQxXJ0274fDk_dH7YCgayI8e7ws9xxqc1HBfi_ryImciWKGe07HkxNL9ZSgi2-N6ZqzqV7Axtjn-u0FFZqnE43_q_kc-ufS3qOatUfqlUCt7bdBpP9f9IPfcnbFvi652dnqOr8G3NJXM3GhbxPhXdsiigVA)
- [ycombinator.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFEcjzQSRLvnVXOl3Xgez0Etri_H3lcZhA7Py7DqNGEIuLDtTu08bomxx4--KYUfWENLDEWVTKMGZ3lNuqMxDVdYVXF0uNaqO7TGCltjp1w9o7mlHzDDGW367am98CBnQ6Mzws=)
- [elvex.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEmW-XnfzmqtCO4EjVloJl80ZdXlNnZjE6vq1Yy1eMB9wb_DxPi9sHJitP759WtdthzSbaSXFKYCE23Aezj8iY1Bs8whtIcOycFtMehbuHrKrGXMwL_SM7EXphd01VCc9jhNExymXRgvcpyuZAQCQsm0wtiTe2XXFf5jzQvdPw-rYI5H48GrQ==)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFY2_p5aNytGiw83joafqWO0iSj386DpPCC0-B_EUUDgxvZ9juN8O44WR9JS4pze4MKVN5Xe9n32yR4oD1dI8AufAcLvhM-WUtjoeMS91JiW0p5ERCYC5ce5wLJux8tXzW99jUw2Fd_4JCE2l0GJQpg2TLAvSRkgiDRzPhvz8YPuXkNEg==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEbycYsPddV2sPjpgYXex-tHyeca48ezUy8kqsV2CUd4jCjEWwzIZc54stdWaooeYZ7FRl4JjBzO30MOt13ubTMCig5if6BJRAtOBYANbOaRaC3EFW1ujDaiNU45FEtztXhq7lS5gAAOLFeeODtUru-del1PIU6O2GkUWK0iTVCD88Cxp8sjPQ-D3a8XE4717flRoDjqh5l2YxFInGfGg8P4xXw61HqWnlJUj9ZejSwdGIKVbLJjhjwqWs3okczMPcyE9NzOmrgogN0LQ==)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFoA52g2TKkGR0dXSQ0Q4xxFKaxV5QoqEkYVdiqXlPBXMnbJ_X0T6MBFY9l3dDkex9W8gArdImkwlcGRC3X7RskTPYsNg8IvmK6Mv9kN4FVZ7Uw2wDgcsVH0-Rs3sPDLruEbfs79gSGtRXJmkTf4w5AyZW08v6UlU61NenBiQ6RhSla4Q==)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHkBMYlqt6Z2cyxx2Q-CVyuhRtwQEINp4G7d-TM40951gXu63BopNl_L3TOQ02WtvBzMdsGEU0BrKuNMhWD1IhT21mqH1-kpSsC4wnFaXnWGWejWJLj2gB79Rt4rPfYUMZ09HjO2CZKnCy_OS1134PRFuNtoSxkJzc2eQ==)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE7SYJhNrzR4HY7_lM1N_1DYsIl5LBFmDNAS2iSrwx9sOXe1N6HMAF_-12LO1szHMRxV0fatYLFDVClQVjHTxCRkwgxUAqcWZYlVQarKujOcDxyJG-AnS2-xlY8xEwrL1yyjAmBeuQyAB-g9_Cgf0pgXmtWXAm1fsPA)
- [litellm.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFKNPVFcZbhNZBf64DkRG-PeefFBDAPEBn_wrcF-_0XZmkW91AWeSV9u4FMuvpJKz9FnoUb8E1EmIQERWkylL2lSMUf1sspk6H6-2jI2rtYGEzJXpguv-VN6t3GM51x_rzS57EMP4Ytf3OpnQ==)
- [mindstudio.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH1TBGItxRERTIy3n2I6SH58vbl3NXz-8LZj1M9igeVEVIyyw3EQMFAb4DoeIocSPHLW9GAo3s6B58eL1qFJQ7ZcGuIDCPs9sfKu0jiJJZdGL73pRNGAnRxN3AkBYZqvbZ_cI4f2XErOJNcrv6ix6fchheQpj5P0GabfvGPLnURtFmrhUlNQEPI)
- [n8n.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHH3MhyoVUjRBkPhmCxdE771qaq9e_GMAZHe9j8lBdhMCH0X4KBkJAffSkE0uZSbl_r_dmw9wqkrPGc0MspkwINJ71cLospAVUyRlenW_j6aq9WG35YEfyOwDhIcEXMtzXM1xFylUzE-zMBAMzuIThiYVH4FcHXZJZty6-G6xVpufsAC5aGXO5wCP4Uy1e0wsAe5w==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGu6fGeY2jiB9mS1kXSFhi_9DIzo4dYE2LKzDbvBWoXv9vCAlN4psdaLZOMKaVvd7aAA7sDZF_ueLZYtzqn_kw5HFQ-p-6BPDP1QVXQcHOX6So3ydN0k62Hyg==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGnTNkEqNLsw0ZQBgOQxTkUKBb1E0C4EFIqDxjHCF95N_dhzcmd8-6SmFvWCJEh37BwCCLSx2H8cLp2C4SSoKY8Gu4OOPy_iwWHC7EJphPyzQk-ZU8BIikH4F-nDDp2_eDbU0dHhy4W5f80b-47_lkbQLTdGlxQTChiWyl-HdXHAy8iDj41QOSUe3nmBqf67chmQhfSsg==)
- [mindstudio.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFDhTUfklmcYnSItxKYXR4w8kiTI3z0WX-lZcGJxMONbC6dXSt4RUyfY3acVbnaoZ2KyyHohFsmkGbaddD6UGEoqukCy9CinpWFnS_9M5osbv130L7NnOwIguLa6IoZKL1ZWmgtTGAXHh1bCgzbbHQ-JRREhYzUI7SvyByXRpnJyXLj9Tg=)
- [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHGsAMm2T4G_3-SQl8SxS37w2s15BnSOojOy6vMhpNGeZyW0-3paL7myKBMLoCiT0zplx-tF7bS3OTWlY-y3LMpMyDAdVbrkcVLJpNn3YAuDlP1jE_rvXwukbKcaTeHZQ2T)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGp7ApVhg1q-_6Lna5fLynLuyo9mz_a7M3or0EutDsabr6Sx6erZhRllftU7nMS1aZ0fJU8MoMn26cJHXS8F9T2vh5gVyjRYghfLAuHLk0YEPF4wyvGyqm8ISjvm0QLhgqLph-F74rI5W8ou8EVmoXX)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHr7pzWDQoGSOwBIF_leMp9Uu6W8Y7BbBMzJKvDJeIKnCnahsGSJuRloFUEcKOrCQI_xqMrvpj12rbRHQB9YymV0ACEGlUdOAqxJaNPLshOUEpkO4M8TZ_n-cnhl3MkMYwth88VMRoqNB5NUjZj13et738O94Ppv4Cy5jHzPN7qGhaM1rBhHUVKNkilJtPr5kdZhkvvPEOPKmu_5cM4-oB8mid6BX3_oQ==)
- [softmoa.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGD3IvESNt3BoYu_tNxX_8A7dozzgWTIU-gSRhUFKg2564ayekCsZ8yS64NbOb5NKoXShtSu4W67C4dmvUNJ3UuL_fJI8YdzW34UTQuTyJF6ax733bjxg==)
- [ai.moda](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFwDEIGq6KLpT8kqC1nF5cv1xTwKDJQEdxCfk3ZPWD9PM73wyY5nJ-KYi6eGhjh2Lnl1n1f1aN_ZGsZeSkx6-RVyUu-A_rJAFS_3BPcdIQdnNlHXPQAr7lZvEz23WhyT4_D1QXd6zunlyOdGT9BmDh-DA==)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHgQ6NPw8Vif2BXSYaNkLp-xhRKeSBYkqj1YzgzBdqunwKkmA0wT_Md3dEndIbPBud3mgP7vhqGEfL93UdWVv0V7OT7yYC_8N9WZGLeSpxN7MLozyf4GS4sdrqpzxEUXo-3oylZvdFMqyYboGUhLxU=)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEdnDAVJo6Jv_8jdZfNVjAoTWExOC7g7IBB9qjDpfcPJ_0piU7lRLaOR9UzRoOThwkl-pgF_9M5yTkkTR_zvZ5lX9zR0wGZtBUgqvRW3dGrkJOquHRvTcUjDKu7VDTS3QBEVOvbQYPcKImIeRIkiwo=)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE8395T0cYoMjfynfTrlNNjWckcsXnB2Usmu4eEGDdJ1s3nIo_fWRkVDX5RBB1vp91It6OngI4_-XdmDerfVq01Jikp7Z8nJz6Ipwn6rXEox16T3jg_CoUB72X27a5lP4iOTRcIr1ZuRzs4LgAFGbI=)
- [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHzDEp5aIh0QTQm-SHnGgsSNdf_GcVb0niRd-cvk_Rl9g0gBQeZ51AKmG-uRNqrRA0PahUv2HGVn8F5I8YuRKva8VLXHiumkLS26VHFtD6jDf8Sp8yDklcRP4o1w-TYS-SDbUi4j2BRkGY4sIg4yLfqpuKtF3Q5ElQp4ZFy3myD6ajN8Qzyk4xUitGdBFJnBF94_-OMVeJSFXJSxRrD4Kzba567-JqygEsDAa0=)
- [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHR0m1Gs_wAr1eS37vlhjzJCkdV1TUiPGMC3oj1iMBnZdF94-2Ku8E1EiKcvmGoHbSnT3BKamB7QhYnXwdVTKTOKiX_ubB6YF92Fx555K9q96yjLkR4ix6c_mJ0Den1fMU-uZTNWxjYcVQkt1CipJLRm6EZ6vn5HFSYoE_SwqkCGRDXTJCorwH5qfSzexzky1A6Lw==)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHOb1J8rDFCPLx8M0G2ehSCfovSLlliy2AA74r_cRUrWPaXugdRV934ei96vN7x9YH4L16pjXdAsHRl0yyhRuD6jTbIYwZ9FBOcj-98_9MSnFfnubwT3o8ZPUsITsBCPbfPaj1TGEYA7DCDHBtQOYxS)
- [boundev.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEfxlp7Rp1f3TlqWPiHUNMVwdO0qGSmH26JzR9A4SCOwK7Rs6r2ZBwQAneoMFMs7nH2ZMjvhMHxWQrdBcS2KIkmBrTnICawwvwb__RlqGV1VyDQB5rERo_RAhK3R03qJzbJgHjpKC0CU3Bsno4mr-jtohQ1f-3aj9IlijI=)
- [galileo.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFe98p6DF3xSLRcMJnraHPbpP4NlEnoMWTakMqLBEjhvJISJMdVOxrWlZ20Z0ldTo03SqUHJSh3eXVMv3PepkwIwyUZWVcRNnehn_0LBnFufW5UUJ5j0ovpVIqOYiJh)
- [databricks.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG7fgdhqy-lGhUPKj3tOLvoNxNHlqT3O0ucOnrAq3KJgRNryZKNttLrNvRzO7MKPY3-90vzgW3oeD3JtfAz6rrKEGoAmnWx43HslpIUObVuaNDXouSC4guDz_Z18mkOusOduobL__1DofFv1rWEM8xEYRW-yF_uY2cb0_5p_hnDCoI4s-JB61vR57-V5uj8XeOajH9lEM9PQ4Wu-DsuYMRsLGAnzzv4WqRFnjIQdDFPf4Q=)
- [aimind.so](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHWfvRVjM16RepMyC1FXaVo5xiTvVr7PAwEGGW7KcD_mQhA_0nrWsBKJWZmbtPVbVCXg_DQcYagaCVDnuNGYT-erDjs5oOrM2e1NZsOjsOqV48NsE_1kwiUryYnAH5yqyL26X36vhbXjKrCSMZjAxHoAwNNGJRLt2SGwNN30G3o_tPe0sjHb4c=)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFiS99Gv_mdTJ97_cqJvCKOQafmXZOCxaj6lDbwYOjuSWm5ahjLH7kZB8bw6Hn2yoW-BEHGS5hHI0mkD5tJBeSaCQ5KgdyKtiRbqCL0l3_ImBshLuBqYcyC3dpnczhB6QQ87og_hVFHAFwV0foXcVAIpq4hPD0KI6mBx84seKColUCOpBV1DF-2TV5qWoY7c8JZuodB-ZzVN5T_y7nm0WohdiJ-BPLJHErmM2xN0Zdb3ZbZ5I7OUSUTgjRaMe_21kc8eCA=)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGOw-10CHm1HP2xxlWSfNzF8sJ13hcIX9B-8BqKMZORPCbMzrbccRxRsXtL7eAjc0QsS680zFULeQ90C8UMXuKSBpbpjvaEdG0MiVCDjHBdvTdxEPHGv3SB49FGmBZDwOu8pqfp6F-ChjklwJhR7uCFZEzmQg-Ub_RQp5eIDdQlwz354g==)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGczcnS6cVsz4ShtNI8gnhXDLef4sFNXBQdFG6rb5SHu5Vf_B_wWBMpxIvhkD_iejf2YLT3oaNX4TFP9MFQlFWWopT90Te0L5J1H9TkskDQiUB4F-wo-PGrn2quEjD9sTQENZAJQZuo1tMIOhQr6ViW)
- [claude.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFamAxVqTZGXCAXd_RYKdXggJUzUMXYxO91Q6J6YWfaNAShFu0GwgnRUIecBju3ZaIFxIR8wFOleBjN1KNEEpecD19ziKS76qndVoHhmPlLRq0OZoQxX-SN62lMRIyHZ0u73AlBGxyB7tqqJLYoC7o69N7RfJ4GwA_e4TUqeQ-vFcqAsA==)
- [voyageai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGcKHCUyOy-T8am0grPMIMpHxSQQujSkuX7Ov7S9h3ngBufMaXUbZh9AepixxGqf-_j-cpU5DSsiRuz1pwDvQsdXigey0fEdWQ6fiAthebs532nflFzIUvS_1KaZFmP7uNTQKz0eqoGnFTGER0=)
- [promptfoo.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGhNyrmPn4xLfJZiuJYblmc8o9MkAGLmEmVStKwL6UnfrJk58cwqqCRWpOFJETE50ETOtBEpbncf0rMsMvrf3owUZh7yW4_HD6rtxpqYK7i0VReFXmjwSjLLTFSfqE7xs5FUDbj8g==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQESYUPqGOybmRdzCxAsnu9VPcc_4mSfUEdsk8gggSJPATWl-M6FUZ_ItI7EndC8cWc9U8x-SshAK8cut2GvMzjiwEbMH7uzPmVK8ufoyR_gl875wKOVxfmcHJ6LBzjwyrNc9AF7bJck5DJckjieD3rAeUeC2TyukyFagikkOvrNgVxpRKr2cm6m1R1TzmSAjTV1wcT90jg2i3NaLeT61RVDlA4vnVY-hWvnwZ1rUxyR)
- [mongodb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEk9pTIifirrIoa-0CXNl7ViE9esNkeydME-n9i5rVA4GVDL0cKyBhxU5fzVbrTXY0RY56SoTn5ocbwKxHfFutemrzuBC89ao2ttGEJEt6uI5KdOJs9QbDJxRrLlUwmNtmahkokXjufcVxeFmC7D5_vrQyYY4v-rNfdkHAAqHDu5RCRq4nrUeHHqXcKuu3Rvln2j_oEalIl2oTWNSMQDNAFTkehJsSKvejwHDMgucvmtJw9IUnaehfp2cckLpk=)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQETfwmlLxvUD4cfYS1YuYPHvKR-U0TuiTHNKx-X31n_sfZv-Tvgj7Nw6kUNCWCL_k7jxBkbzp149i_kbyEfKpJ8Eg9eXkC3IPN31Gx3xJVTiPUAL4frws_3jsqzvDGU3RViCKmcJ_TCHsSxhgkN-Uzw7ULwomXvkYqP9tZ-QLzUqNlzTljYuccc7C5P5pZikWtXnM_4sdc-zFExNByAsh2ng0XgxYuAMGZc3leCGI-4KlwRDl4TzjjW4g==)
- [voyageai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG14FAssuXNN7Qp2ZoEfOpJxBgmjIQFD3kTLa4AikmkDO_JZO1WAttQadX_QIdWJcSX8-fhHHMs5pgUoO2hjfjZabM9eve3DuJfCj8G-g2pdOQ_5-H1XA_HaL1H4MRdvhOCTPS0j9ZYdgd0QQcOYtw-8Fdi)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH0jZnxxkHRoRtUTE_fBE0uGHOCiOHEWODre6IC74RFTTDJSFiEMXoPqeAb8lEkzvGOc2d6M_dcaYwH_AAE-qWTQ_YXABvOTJKZBAx71IV43aPX3r05x0_SbR41sEzBfyzjqNITY1VL0TUl4Ye48xQz_zSlEy-uSwwTLVXboWQerZ8cDoRmW5kbc855ScQDQKdko07YjsuoTanZs6Oe84-Iow==)
- [lancedb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHhVcCRN5VSEA3ojcENCkoNsCVd1DA6YOuyyVVAqqLnkzoXi34JnVqHzqqZP3KvchnB-OtEZHW2Dxy_XHHXTfjQaviOoVSp2lqq3hfZz7ufyxwZ7NZ_AmJhxmKwh1v5sroWmoL91XOh50m6jM9azQ==)
- [google.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHnVqXys-Q-dI6ibGZnv8BG4YAPolfC59RY6x-GE0vXpjhXJX4JbGxJV8-rkVn_7FqlBUX73RfYkDueLNKMJfJrH_Biiq6f2cW1oW_RHB7fAabPO3hkMKuEPobs4RBQ23A_lZ8eosiGrIBoukb34Jb-xGrajmzc_vmO6-HqKw9YZ6j8-qLm-U3GaHe7lfVn7CNAH7GK_irUMaIn3tk2RKuQskycHBfEh-GMVhdcHpHPhUjlt0idf5y5_K2R)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFxn3Z1P8dUcWr-LO4BhXBNHuqaWfX74zRU1MwSwIDPQGIxWlpesJ4Aq8-asedabqQ8wNOm3imV5YvVdAQMLC2zayj1mfr0jOuDBiFr8JK9GdThksnqMacQraQAXLORBnvFnr8LdxlRn2wjsVdKnCMM05BpPK6Bpg1xhfjQRm_JEQt9os0j8jqZMzUFFmZWL3dh9R7nQfVu)
- [minzkn.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEaqr_TD4jS5aig38q-i1N7j7h7C1kflSeG22SmF76lX2DpOtpk-WhRQ_s38BPQrq8EalAFvX-hKkqwsGhzNeOGVRgRjH4P8OvbOf9-GM0KxePKWinltdFQAax7Boz_J4R-yRDnYwIezdrxi64=)
- [anthropic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFk40OcG5Q-vXXy5idNVfIGEMz08yRTa9HEjP0MzCKTb0Wm6BSyQ0ld1HEWKm3hExNnwlqAeRNe0AnxUbPqlIrK6PdL2izlXFJXg5ADSI_IQ3Rd0_eRmkdDuWh24sJTymttbQ9TAoh8ZqdZYFreJcA=)
- [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHYaaCqbDRrDDo3yhcsNW1yCnW16EJb4dhXLVFGf3Y9f_nsxtHUz62pWo6H3Ao418dlLeVeILAr8nplh0ApNH1US7bt5n5j9IRyru6z35oK0lGx2661ACIylbv35NSW_17_spW8RIJLy0JPNVFbRkRzf7i4t760sjo3CzjzFu40O9fcY7ARkTGi8HWHVprnZjpEFHxaJQz3lJMs4g==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFXPI90G6bQNOCnpsb4Umom0oRKDMzLLLuspUDpx1E39orUQsh5sC0dhavY03M3zPjIXgyoNyEDwePfgl4Sg_35dXF3IIWMYQPHqkMhYzt2X15HFkyNo5Zu9wVIKfNSt5QAFleReYmnefiJbgEKOkIXzRWF-HNtaZyYxDp1H9FhN1LiLoAfYvaUHM-cEfuZcGF4iPA=)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGWex-rHScBI0aMpoNBzcTYV1SU6RXoO_M06G6pZ9-Fssi5AA_6TTnA7SjfXL7JLj4yyQEprmHtVzYaopa08FKM8b0QnLv3pW1U_zronic0niZivWdQG3rqUmSjpnv5YiGXzvH3b62c9BYLBLZK)
- [llamaindex.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGN7cl-9LlW6TxJm4N1-txTXl-AUOJlCbtmsHezDSyex9mD2aNTUVuIiZp95_Fus59WXX1mjfmXsGyoo0sL9NymGoJ5xH81LdCk4ZvGLq6E39pxtT8dG6eBOUF7BxGQIEMPEmOWlEEXwiokLPz9XNnJUCI=)
- [llamaindex.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHWwiaC2vhkm-WzJcjN21NQSVik5BjI0OE-STHhPH6Zm38JTkUjtq9oa1DmWYezEdbQdeM_gRLhvzpHV7ABcyKvgxU1PsjmThho25A6NYpbukIy4K_lQ0kR6LOGmaWlBJ8Jrn66qCR-75D96IZ1tiYC900VuBxhTVX1YNJR_iaR41mPcisNHZnPbA==)
- [llamaindex.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFpWHtlBmVyt15SrbFR9OaXNyHg2XXOJKAyGOmu_2-3wbj_YHTRk_ICfBhbpOEa_oS9GrEzT-6OqgUXmsFuiMGxIlwB4q4p-GQV1nmo1sgm0EKnsPoQjIVCc6pVGWZzqraAFtxZhDwS1DbknT_Yb_plH9PX1veR3ExgATB9tNt7KjqWXw4xA8h8EQ==)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHd5PN6XdHOO9IUuWeGG7FpFvXKsUaAS8PlC1uL-L2GaBtLrhpzAJXKGx-rc-Gn2Ff6bMWn9XwQgdYE3LMXHPjHt3jZ2TJlB--7R37h-JW45ek7QgM31t6XAW5q3ya4yTzCCi2c6lm82To24u8L)
- [llamaindex.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGJIMmDIMT9wmhCJf7Wbf9P1KauaRABAchUN8-TsIfmFHU3dcdePSJ5TdkamI2FvvS8dwj319JMN5mEU5TqUr1Fsg0QAbVBq4sOfRhHoIfECoaH3urMQ4wrB3Cp74AJOIwFaF0TzcYfvkZDdW8b2r0mdnCEve3Z152DRobC_Z8-3bS4Fhchrm4ufcsnvRKjcJXFCABD)
- [llamaindex.org.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHT8CA_J7YNYOGShFHsmmHP2Yag9VfYbGxd56FBXXruQaMwFNHXsMCxkSdZq6vSX-o_1pFwzsJu43_pdLEnDilR2zF2zl7n1z-bBMWl_dITokYkz1EMzry4ohwnG985P38ED2ig63S6cVxV6b_BrtE10HUnvpOGgkQLkzo_0HNUOH1WyPqY67B240-Td6oLqFvuW59hQA==)
- [llamaindex.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFTbvjYw8qlEhYYqKOPcRHC8nWq3wOtoud9b_SbzcmoAB6QbQCw3j_CL7RSHCXxYgt9GBMMo-7NmFo7YT0JWzJi-w-5wke9DTzC8N0S_izJqpJHpciVc9ytUPFrIB45DQTSt4qKhtTRZwC3x_BHmhKM2Mtibryp5NpiS8VFTuvT_mglVm5A0KI=)
- [llamaindex.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH2iwpehwLV03Mjym6B1r8lsDz7o7QZJh6mRF5hZnLvANPAmUszmQhgdLvbKG_uazyK8YRvqC2rLpRN8OoH5C_7I1e4ilTaA2DzEsxAi921UEXVRRfOvw5aYlur5wKi5bm5yk85xzlhHc2LXUK0hX5a6RIMASaGoxQHTmRkv8_OtMovhmFYrFQosg==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEq6KM1kdggVUEeC9fq0oy83DtVq6CgQ8l2sE9HLqXEcjSUgsPcUw2MmnjXp6Pd6Phlo8aRvKnNVRFMUvuSEEdGNfA9fXBICNl3kin9EJAxjB2mYrYc1geycmj12p0W4PB10rQM3c3KqXCzHF7gkVtG1RPeIMIi7XZK2DSLRmLUsJ3nZsGBLg11RSo=)
- [gitgood.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGMINquglkjP0X3snIA24BwqvZISDtKCStcPC3l0no-p3FjHL529RiH63Pt0VjIQaZaVvk_HWu7egUoQ7TG_r70Z9TrLcsp3b3mt4boq2x8FH-ImVSz84gwJdw8B6DF3hPz6lSDGB0ITJO58TodI_EudgisiWsLdAIHdQ==)
- [pinecone.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG6BS8gd7fzgMqH414wz1Q9bfPZdqLouRDKhZ7tUb1UlXPua84dvHUZsizGC95LTPuxR-mwTIIvehO7fA_LYTQ09QRiM2Q4odJBm30cqkvzoEsoRXb73siRjVDbWyCHjgQmAKedBp9kBA==)
- [lancedb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGttschjVxK6oK18UUTxzhc85Mz-kW9yCi7dIpjvPu0IqXjVXVcf-0GY2uM-l0BeCnspLs1ujZpbfw7KJmY8Kj0WV4lECL6XiMEQJ-sK2JcDSSIp0ZCV2SRjKdHyvWWDZgtQmXHDyGzywKNK3ImAmALvnMGQhcEQmG4K1HK4dfKizxAM0F_XRxT77x8-2hL7etgp0v4)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHivPp9b4pnQD8v593dc7tqZKfLCMTY3Av22DPOzgnwtBtyX50PZ6wqLTWrAWVlDD7xN0v60knFsLd_DYeiES1ov2j-gkn78Z_KI-sLwPYfVvoI0x1Dd3gsMg6S7ioKf4RpvEOLi1fM8JjdrptbPHnwT2J1DHuuXDu3m8CmzQlv6Cnfxl0U4-Y6EnCwVV1OADvRzh1yn9Q=)
- [dev.to](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEpvEvKMKPjqJZ_h7Q4zzskToRdWgvwMnsdGO4qgnZdT5Np_4ZQ_TxmS5uCpLOa2PhHPhXf_vcfjJoj-ZQGL_lbBcPQ0iuCwqYlGw25_Ee5C3hKfFOaKhSEdvi0G94tNx_uqPfY43MLyNVaZu9wJcdNbR-_-M0H3T3iw9ti9EACfd5TCgYOhk3uaaiYa4IxPLNKNGkjRIbTYEwMpm4jfmbmWMIJBcHpO-rR8r3u)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGn2Cq5CspkECbi19djjqtFljT89_q2HZ-OOcY-UkuJ4-pAwaYStbeJOKJ6-tfNuAcmIEsuLyMXekszulghoQyIbD380ad_IrKjc6xf4b3wmZjvCR3w6-FiktRnKAgQN55b28giURvUBOGprg==)
- [langchain.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGNicQd2ZhTuj4LGeF9iR6vbMkLeBzoCq1FyVaZ91vCX4-Z_I_0mrQOrMKxCdVv0FjfNu85MDiDScVcLToFPqC8e-etdC14toCysZXCwrH8q35nxBWpInKZmKxvU6YOGl8txy5MCAmYwWSLOSkVCA==)
- [langchain.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH_vww9XFQnEE2RBYkfBcETixkv7gVt-yiBF8TnY8_WlS5E241ce_hOzEaSw3VElbKgHrihl8geSYp2yMh4DvQvfo9JoEJcoWR_4KqrFeEYONfXQbnnv-jWc7N29rT6OU-UtBT73cmFSoJgmiK56ZVrPTCd5z7fWfc2Q50vQN7jeMqhiDvkFxZxn37l0Q==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG4Cbdk0oREug366TUm0zou2lpvRGAgvdABLzb_t5aOazmb7M6hNSZvf2laMyvN6H60YR25j8ufQroSsMfRGCYnTtvkCB2AtVS6pUyeKGwOToqgnKEpEhM8AKg33VenIhomgoJw4FEB4H6WMeMVbSsMZ3ZCFduonQq4OCotdVF1L0D0E37bhY7qVkw=)
- [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQET6yV_yQIcGznCNJ0BzEaOE9KR_pshYSDSSDFlnwBn4ndXmfujUBVuWPmhVKg9c0TztcsN8WKALZEdaTs_onHvtpjOXMSV74H86bY2iAxI-Wc3PaD0yOhfrI3Vhiap9o5IKZHnBGztTyOHJTn120TZBnTYe9tn9JUhG4Wt4qEOSJWUs0vPqz-c_4Mn8aYLSLFj)
- [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGZMbHGhTokhlP-BduPRYuHOZUtz0OKoue1YQQOuyImEQPb8wPvpXwCjktBpAaO3DXyn_B3LbVqza7tFv-N9YHIxx09aPQVFiDrsIZFPc2oUODIHICJ0wXSUs4bOitqzxQModOqLTUBpKKx-6_pWyVYRfmUeLjSvYQOTRXYN7G_xC7Ucs0EhBp0GRHUFltDhaPYIg==)
