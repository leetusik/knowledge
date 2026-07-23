---
title: "Characteristics of Korean Hybrid Search: Tokenization Alignment, Dense Models, and Score Fusion Architecture"
date: 2026-07-23
tags:
  - korean-nlp
  - hybrid-search
  - rag
  - bm25
  - vector-search
related:
  - hi2vi/2026-07-15-hybrid-ranking-in-vector-search-algorithms-architectures-and-optimizations.md
  - hi2vi/2026-07-14-the-hi2vi-research-space.md
  - hi2vi/2026-07-17-implementing-anthropic-s-contextual-retrieval-pattern-with-prompt-caching.md
source:
  project: hi2vi
  repo: https://hi2vi.com
---

# Characteristics of Korean Hybrid Search: Tokenization Alignment, Dense Models, and Score Fusion Architecture

> **Note for Beginners:** Imagine searching for a specific recipe in a massive cookbook written in a language where words constantly change their endings depending on grammar. If you search for the word "cook," you might completely miss pages that say "cooked" or "cooking." In Korean, functional grammar particles attach directly to root nouns and verbs, causing standard keyword search engines to fail. Korean Hybrid Search overcomes this by pairing **morphological analyzers** (which dismantle complex Korean words into root concepts for keyword matching) with **dense vector models** (which understand overall context and meaning regardless of exact wording) and combining their results into a unified ranking.

## 1. The Morphological Challenge in Korean Lexical Retrieval (BM25)

Lexical search algorithms such as BM25 depend on exact term matching and term frequency statistics. In English, splitting text by whitespace or standard punctuation yields functional keywords. Korean, however, is an **agglutinative language** (*교착어*), meaning that words (*Eojeol* / 어절) are formed by attaching postpositional particles (*Josa* / 조사, such as `-은/는`, `-에서`, `-을/를`) and inflectional verb endings (*Eomi* / 어미, such as `-했다`, `-하는`) directly to root stems (*체언/용언 어간*).

When search systems rely on standard whitespace splitting or ICU Unicode boundary tokenization, variations of the same root term—such as "학교" (school), "학교에서" (at school), and "학교로" (to school)—are indexed as completely distinct tokens. On standard Korean retrieval benchmarks like MIRACL-ko, search engines using non-morphological tokenization achieve normalized discounted cumulative gain (NDCG) scores of only **~0.36–0.41**. Applying dedicated Korean morphological analyzers to isolate root morphemes elevates NDCG scores to **0.61–0.64**.

```
[ Unsegmented Korean Input ] ────> "학교에서 검색했다" (Searched at school)
                                           │
      ┌────────────────────────────────────┴────────────────────────────────────┐
      │                                                                         │
      ▼ (Naive Tokenization)                                                    ▼ (Morphological Analysis)
Tokens: ["학교에서", "검색했다"]                                            Tokens: ["학교", "검색"]
Impact: Fails exact BM25 match against "학교" or "검색"                     Impact: Matches root stems; strips particles & endings
```

To achieve precise lexical matching in enterprise engines like Elasticsearch and OpenSearch, architectures integrate specialized tokenizers:

*   **Nori (`analysis-nori`)**: The official Elasticsearch/Lucene plugin built on Java/C++ native bindings using the `mecab-ko-dic` dictionary and MeCab Viterbi lattice searching. It utilizes Part-Of-Speech (POS) filtering (`nori_part_of_speech`) to discard grammatical noise (particles `J*`, endings `E*`) while retaining content nouns (`N*`). Nori offers three composite noun decompounding modes (`decompound_mode`):
    *   `none`: Keeps compound nouns intact (e.g., "삼성전자" $\rightarrow$ `["삼성전자"]`), maximizing precision.
    *   `discard`: Decomposes compounds and drops the original composite token (e.g., "삼성전자" $\rightarrow$ `["삼성", "전자"]`).
    *   `mixed`: Retains both the composite term and individual decompounded tokens at the same token position (e.g., "삼성전자" $\rightarrow$ `["삼성전자", "삼성", "전자"]`), serving as the enterprise standard to maximize recall.
    *   *Limitations*: Susceptible to over-segmenting Out-Of-Vocabulary (OOV / 미등록어) terms. Updating Nori's user dictionary requires modifying system cluster files and cycling indices.
*   **Kiwi (`kiwipiepy`)**: A C++ morphological library with Python wrappers combining a statistical language model with a Skip-Bigram model to resolve context-dependent ambiguity. Kiwi achieves **86.7% accuracy** in resolving Korean morphological ambiguity (compared to 50–70% for deep learning open-source analyzers).
    *   *Features*: Includes built-in spelling/typo correction, automatic OOV detection, dynamic runtime dictionary management (`add_user_word`) without cluster restarts, and flexible compound decomposition (`split_complex=True`). It is widely preferred in Python-native RAG frameworks (e.g., AutoRAG `ko_kiwi`).

In production hybrid pipelines, tokenizers used at index time and query time must match exactly. Furthermore, multi-token Korean synonym expansion should be executed at query time rather than index time to prevent Lucene token graph flattening and avoid index bloat.

## 2. Dense Retrieval, Learned Sparse, and Multi-Vector Architectures for Korean

While lexical search ensures precision for exact product codes or legal terms, dense and learned sparse neural models capture semantic intent, paraphrases, and context.

| Paradigm | Primary Mechanism | Tokenization Alignment | OOV / Jargon Resilience | Primary Strength |
| :--- | :--- | :--- | :--- | :--- |
| **Sparse Lexical (Nori / BM25)** | MeCab Viterbi lattice + `mecab-ko-dic` | Morphological segmentation; strips particles | Low; over-segments OOVs without static dictionary | Exact keyword matching & low ingestion latency |
| **Morphological Sparse (Kiwi)** | Statistical Language Model + Skip-Bigram | Morphological segmentation; runtime user words | High; built-in typo handling & dynamic API updates | High contextual precision & RAG QA document matching |
| **Dense Bi-encoder (KoE5 / KURE-v1)** | $[CLS]$ vector compression (1024 dims) | Transformer Subword (WordPiece / SentencePiece) | Moderate; depends on pre-training corpus exposure | Captures semantic intent & paraphrased expressions |
| **Learned Sparse (SPLADE-ko)** | MLM vocabulary weight expansion | Transformer Subword expanded into inverted index | High semantic expansion; low exact code precision | Resolves vocabulary mismatch via term expansion |
| **Multi-Vector (ColBERT-ko)** | Late-interaction MaxSim scoring | Token-level vector sequences | High fine-grained match; high RAM footprint | High precision matching across long multi-hop passages |

### Dense Bi-encoder Models
Dense bi-encoders map queries and passages into unified vector spaces using Cosine or Dot Product distance:
*   **KoE5 (`nlpai-lab/KoE5`)**: Fine-tuned from `intfloat/multilingual-e5-large` on the Korean triplet dataset `ko-triplet-v1.0` (query, positive passage, hard negative). Supports 1024 dimensions with a 512-token context limit.
*   **BGE-M3 (`BAAI/bge-m3`)**: Features an XLM-RoBERTa backbone supporting an 8,192-token context window and 1024 vector dimensions.
*   **Fine-Tuned Variants**: Korean fine-tuned variants include `dragonkue/BGE-m3-ko`, `nlpai-lab/KURE-v1` (fine-tuned using `CachedGISTEmbedLoss`), and `dragonkue/snowflake-arctic-embed-l-v2.0-ko`.

On the standardized **MTEB-ko Retrieval Suite**, performance diverges across domains. Base `BAAI/bge-m3` outperforms Korean fine-tuned models on broad Wikipedia retrieval tasks like `MIRACLRetrieval` (0.7015 vs. 0.6816 NDCG) due to massive multilingual pre-training. However, on domain-specific commercial, legal, and medical PDF retrieval tasks (`AutoRAGRetrieval`), fine-tuned Korean models lead significantly—with `dragonkue/snowflake-arctic-embed-l-v2.0-ko` reaching **0.9093 NDCG**, followed by `dragonkue/BGE-m3-ko` (**0.8738**) and `nlpai-lab/KURE-v1` (**0.8708**), compared to base BGE-M3 (**0.8301**). Overall MTEB-ko average NDCG ranks `snowflake-arctic-embed-l-v2.0-ko` highest (**0.7404**), with `BGE-m3-ko` (**0.7300**) and `KURE-v1` (**0.7277**) following closely.

### Learned Sparse Retrieval (SPLADE)
Learned Sparse Retrieval (LSR) uses Transformer Masked Language Model (MLM) heads to project documents into high-dimensional vocabulary spaces (e.g., 32,000–50,000 dimensions). By applying $L_1$ or FLOPs sparsity regularization, models like `yjoonjang/splade-ko-v1` (fine-tuned from `skt/A.X-Encoder-base`) and `sewoong/korean-neural-sparse-encoder-base-klue-large` predict non-explicit, contextually relevant Korean tokens, indexing them directly into traditional inverted index structures. Non-Korean-optimized sparse models (such as `granite-30m-sparse`) fail on Korean corpora because they retain virtually no active Korean vocabulary tokens (e.g., only 2 active Korean tokens), causing catastrophic vocabulary mismatch.

### ColBERT & Multi-Vector Late Interaction
Multi-vector models maintain sequences of token-level vectors rather than compressing passages into a single vector. Retrieval utilizes the **MaxSim** operator:

$$\text{Score}(Q, D) = \sum_{i \in Q} \max_{j \in D} \left( E_{q_i} \cdot E_{d_j}^\top \right)$$

Models like `sigridjineth/colbert-small-korean-20241212` and `dragonkue/colbert-ko-0.1b` capture token-to-token interactions. However, storing ~60–65 vector embeddings per Korean document creates severe RAM and storage overhead during large-scale production deployments compared to single-vector Approximate Nearest Neighbor (ANN) indices.

Notably, **BGE-M3** provides a **Tri-Mode** architecture, generating dense embeddings ($[CLS]$ vector), sparse token weights ($W_{lex}$ across 250,002 vocabulary tokens), and multi-vector representations concurrently in a single forward pass.

## 3. Score Fusion Mechanics and Two-Stage Pipeline Architecture

Because sparse BM25 scores are unbounded positive numbers (typically ranging from 0 to 50+) and dense vector similarity scores are bounded floats (e.g., Cosine similarity in $[0, 1]$), direct score summation is impossible without calibration.

```
                  ┌─────────────────────────────────────────┐
                  │          Incoming User Query            │
                  └────────────────────┬────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│     Lexical BM25      │                             │     Dense Vector      │
│ (Nori / Kiwi Engine)  │                             │  (KURE-v1 / BGE-M3)   │
└───────────┬───────────┘                             └───────────┬───────────┘
            │                                                     │
            │ Top-100 Candidates                                  │ Top-100 Candidates
            └──────────────────────────┬──────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Candidate Fusion (Stage 1)        │
                  │       (RRF / Weighted Sum Fusion)       │
                  └────────────────────┬────────────────────┘
                                       │ Top-50 Fused Candidates
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │     Cross-Encoder Reranker (Stage 2)    │
                  │   (dragonkue/bge-reranker-v2-m3-ko)    │
                  └────────────────────┬────────────────────┘
                                       │ Top-5 to Top-10 Final Context
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │         LLM Prompt Context Ingestion    │
                  └─────────────────────────────────────────┘
```

### Reciprocal Rank Fusion (RRF)
RRF converts raw scores purely into rank positions, ignoring score magnitudes:

$$RRF(d) = \sum_{m \in M} \frac{w_m}{k + r_m(d)}$$

where $r_m(d)$ is document $d$'s 1-based rank in retriever $m$, $k$ is a smoothing constant (typically $k=60$), and $w_m$ is an optional sub-query weight. 

*   *Advantages*: Requires zero scale calibration; immune to outlier score skews.
*   *Disadvantages*: Discards confidence margins. A document ranking #1 with a dominant score margin receives the same rank point gap as a document barely exceeding rank #2.

### Weighted Sum (Convex Combination)
Weighted Sum normalizes raw scores from each retriever to a uniform $[0, 1]$ scale (via Min-Max, L2, or Z-score normalization) before combining them:

$$Score(d) = \alpha \cdot \text{NormScore}_{\text{lex}}(d) + (1-\alpha) \cdot \text{NormScore}_{\text{sem}}(d)$$

*   *Advantages*: Preserves confidence score margins and enables domain-specific tuning ($\alpha \approx 0.7\text{--}0.8$ prioritizes exact keyword matches for statutory/technical codes, whereas $\alpha \approx 0.3\text{--}0.4$ favors natural language QA).
*   *Disadvantages*: Highly sensitive to min/max score bounds within candidate window sizes.

### Platform Implementations & Reranking
Modern engines natively support these mechanics. Elasticsearch (8.14+/8.16+) provides native `rrf` and `linear` retriever nodes alongside ES|QL `FORK`/`FUSE` constructs. OpenSearch (2.10+/2.19+) offers `normalization-processor` and `weighted-rrf-pipeline` constructs. Single-node PostgreSQL setups co-locating `textsearch_ko` (MeCab), `pg_textsearch` (BM25), and `pgvector` HNSW deliver sub-2ms RRF fusion latencies (0.92ms–1.79ms on MIRACL/EZIS benchmarks).

In modern architectures, candidate fusion serves as **Stage 1** (fetching top 50–100 candidates). Top candidates are then passed to a **Stage 2 Cross-Encoder Re-ranker** (e.g., `dragonkue/bge-reranker-v2-m3-ko`, 0.5B parameters, reaching **0.7849 NDCG**), which concatenates the query and candidate passage into joint self-attention layers to produce final precision scores for LLM context injection.

## 4. Korean Preprocessing Pipelines and Optimization Trade-offs

A robust Korean hybrid search architecture requires query preprocessing to handle common linguistic issues before retrieval.

```
[ Raw User Query ] ("아버지가방에들어가신다" / "미팅 정리본")
        │
        ▼
[ Preprocessing Step 1: Spacing Correction ]
  └── Corrects word boundaries (PyKiwi space_calculator / PyKoSpacing)
        │
        ▼
[ Preprocessing Step 2: Typo Correction ]
  └── Fixes spelling errors (Kiwi typo_transformer / Neural KoGEC)
        │
        ▼
[ Preprocessing Step 3: Query Expansion ]
  └── Generates synonyms/paraphrases (HyDE / Multi-Query LLM)
        │
  ┌─────┴─────────────────────────────────────────┐
  ▼ (Morphologically Analyzed / Nouns Only)       ▼ (Raw Natural Language Text)
[ Sparse Retrieval: BM25 Engine ]               [ Dense Retrieval: Vector Engine ]
  └─────┬─────────────────────────────────────────┘
        │
        ▼
[ Stage 1 Candidate Fusion (RRF / Convex Combination) ]
        │
        ▼
[ Stage 2 Korean Cross-Encoder Reranker ]
```

### Preprocessing Steps
1.  **Spacing Correction (띄어쓰기 교정)**: Missing spaces in Korean queries (e.g., "아버지가방에들어가신다") prevent morphological analyzers from isolating morphemes and cause dense subword tokenizers to fragment text into out-of-vocabulary tokens. Systems use language-model spacing tools such as PyKiwi's `space_calculator`, Soyspacing, or PyKoSpacing before tokenization.
2.  **Typo Correction (오탈자 교정)**: Typos cause complete miss-matches in lexical BM25 search. Pipelines apply rule/dictionary transformers (e.g., Kiwi `typo_transformer`, Bareun Hangul) or neural Grammatical Error Correction (GEC) models (such as KoGEC using explicit `<ko_Hang>` tokens). Domain user dictionaries are strictly required to prevent neural models from over-correcting alphanumeric product codes or technical jargon.
3.  **Query Expansion**: To address lexical context gaps (e.g., matching "미팅 정리본" to "회의록"), systems deploy:
    *   *HyDE (Hypothetical Document Embeddings)*: An LLM generates a hypothetical Korean answer chunk, which is embedded in dense vector space to align with document passages.
    *   *Multi-Query Reformulation*: An LLM rewrites short queries into multiple paraphrased queries, taking the union of candidate results to maximize recall.
    *   *Doc2Query*: Executed at index time, models generate synthetic questions for document chunks, indexing them alongside source text to bridge vocabulary gaps without adding runtime LLM latency.

### Tokenization Alignment Pattern
Lexical engines and dense models require different input formats. To prevent subword fragmentation in dense models while ensuring clean term frequencies in BM25, architectures implement a **split query routing pattern**:
*   The **sparse branch** receives a morphologically analyzed, POS-filtered keyword string (e.g., noun stems extracted via Kiwi or MeCab).
*   The **dense branch** receives the raw, unsegmented natural language sentence to preserve grammatical context for Transformer attention layers.

### Performance, Memory, and Storage Optimizations
*   **Ingestion Overhead**: Korean morphological tokenizers are computationally intensive during bulk ingestion. For example, Meilisearch's Charabia tokenizer (using Lindera + KO-dict) processes Korean text at ~1–3 MiB/s, creating an ingestion bottleneck compared to whitespace languages.
*   **Index Size Overhead**: Storing dual indices inflates system resource requirements. While character N-gram indexing (`pg_bigm`) causes index size explosion and buffer thrashing under limited RAM, morphological inverted indexing creates compact discrete token indices. Conversely, high-dimensional dense vector graphs (HNSW) require substantial RAM for vector dimensions (768–1024 dims) and graph construction parameters ($M$, $ef\_construction$).
*   **Execution Optimization**: Running sparse and dense retrievers sequentially doubles network overhead. Async parallel query execution is mandatory. For query expansion, deploying lightweight fine-tuned models (e.g., T5-small) keeps query transformation overhead within 45–60%, maintaining sub-100ms real-time response targets.

## Mini-glossary

*   **Agglutinative Language (교착어)**: A language structure where grammatical relationships are expressed by attaching postpositional particles (*Josa*) and verb endings (*Eomi*) to unaltered root words.
*   **Eojeol (어절)**: A spacing unit in Korean text, typically comprising a root word combined with one or more functional grammar particles or endings.
*   **Josa (조사)**: Postpositional particles attached to nouns in Korean that indicate grammatical roles (e.g., subject, object, or location markers).
*   **Morphological Analysis**: The process of parsing text into its smallest meaningful grammatical units (morphemes), isolating root stems from functional particles.
*   **Bi-encoder**: A neural architecture that independently encodes queries and passages into single dense vectors, enabling fast approximate nearest neighbor vector search.
*   **Cross-encoder**: A neural model that processes the query and passage simultaneously through joint self-attention layers, yielding high accuracy at the cost of higher latency.
*   **Reciprocal Rank Fusion (RRF)**: A score fusion algorithm that combines rankings from multiple retrieval systems based purely on rank positions rather than raw score values.
*   **MaxSim**: The late-interaction operator used in ColBERT that computes relevance by summing the maximum cosine similarities between query token vectors and document token vectors.
*   **HyDE (Hypothetical Document Embeddings)**: A query expansion technique where an LLM generates a hypothetical answer to a user query, which is then embedded to perform dense semantic retrieval.

## References
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGCh4_PNYxvjs6-4uMaxN4jXzzdEgRHVfo2MjZpNsJPlrOZS4TNl6SVYXMrOAvUNIfbBqzFYmI47PEluHfXP9o_5LdnDRh67XJ1B23wthGzf7B53Q==)
- [jaesolshin.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF2SghdwIfOM7LpIgylr9_2kL9B45Y5rK2IJlevnubLtNCYQFk-gdWvsQgSIKTiaHG7RoCltQh_CTSWjtPv3pZWSBo1DsRULaV2y11ao2nUibNHGb06xdo2nlfnxInpw2wca2_UhMxgs7JpcIjW5nvJfGoC2lQ=)
- [velog.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGbwEs041H5dSiJhKyT2YMEqxrOlTvmHf0R1jd56skqa5wLANz_xbCX7tCXAOO_gG6onAHiOXnubgF17eZu6ik0N-4KuhUlBFRClFF5mU-YjGu4K5vLPVbPAP4DQG4LHEbmqeUBwi6jGl_OzThUcaE6rhicjeEe2krWTF7NLeRFB6fXrdev89ZxBPcfqNrIR5ptIEJS1gMobHFx22hbifqCXk1tXDDxuwfjj5CA8SfB7KnRlyapO9B7zTdSFx5yEpYZxOBRQv3aFjYE88_ql_gFyJaYnwT_URCUmCIR6Jcoi0FiL0dphTE7qAXToNrCyhUCJqlevsKPcpftM8Velg52DHgP8il_Jm3rFdpVVbto6IR4avFarNJgnU84MhMELiylNr4Kug2lC0XWc7yj)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG3UPMikcOyaEB96xih66lwTv4dtDqHZVBnhJcncF-CAOpQ0mGQFoEcAGZIiagcVFhlGhrAbBZ8reYE4783EgmB6yE8E6ma1D2EQaii8jxoexIpQjLlYi0=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE3ok_zexUzTD13-jRDQlTRYzUw8PLvLsXEu8lF0fAG6ATOhADpx4ujYk65n1frUHv9_h0vk9bqUR1favXMsarg6BeT9p86zICW2XIJgLRCL5O-DQ==)
- [seonghak.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEjg-Bhit5_x-5tXnIB-_AVUE2Tkn6_Q7aViDu_n6xTdu4WxPKIlj1ocC_6J4urbTH5H_-NWiUCxoZdmbq_zx7VUX2zqbhVFQFlf0ZwSaUZMmR9roroB8yFNgl4o1aQjzjB9mA8yGfoxUWNzVUrBJ0GJIw=)
- [elastic.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGDz0CN8YwYNvxsuIkYc7JKrG_NX2cCJuIrd-JQS1f-ZFA8z0ztZa0627Q-VzBvbsMEtnt6bA9zVhXPH4Hdk-_mElhLdRFHPl4Md6LjDFsafd0MvObNGk5IUakRzOraz2T5MrdCDXPiG0AeC2ilK0Armpvv7-2sdQ9AbXU1chHFsmnpybTv7QXSPswYVkIFNJs8mWdoQA==)
- [elastic.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFjFjIuvG-Ex4dzrzifrURUu0e_tbiAPaRf7TPFnG6gwmBl1O7SxA9w6NCAdzOGCZf_9-0wr2wVjZElBQuJjwIlDWGqrYpW0JlRkJJPizCrj99Ij8evQ_D577WLrhxAyZ_R17gUz35YDgR154J3OA0ddKBEGAS4EjJI1I5DDech)
- [fosworld.co.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG92BkJNLPz9TPC9wGZjSXaxAt_cRMhcX6iM3GjNRH3u9HNMii3NXQFK5fn300Lyol34Lw7pnJJM5ZyYfy2usLF-jlU0CBOMTfMtCytYSPkB9Y4nzsgb5logoQvGu3kFS4KlNeBXiZhOWIWFnZEOhMqOX36rErBITrNm_YTzHEz59_WIX8=)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF09WGLNk4mHiJzIBmMeOqnirU_Ku9E97_Y2ZXoAC5jluoIBQggDmzSaLKdN2r1u6HZe6cMVU6hkAqCwW8hBvECIGf1wc4Lbsg3sBTjN4ws7nWEcJzT)
- [accesson.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFYBgIZWuYdaBFjPnBlBDC5BL69eV3Th1saCeggR-rYxxlhx1ZqWWzY4cM08TxiVaUTOW4gOpzmFP-NNEpDjRtB1kSvmjrqKBhVE-9IGANiOPLCeyWa5ZUdLMD0z5y2)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHI0RFUUAVNq65hGZum_d9-o8qJgTNPSdiYCK0BMUZQJQAH7uyQmICxCEqCcoY5Se9M-UTvveTmCh96f9C24rJfjQR5RvvZOKYzvQWP1lI-BejrOaka)
- [velog.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEdXt3RrqlBwCzcNO5ObKpcx7Fzuq6zOqEk5nRG9W7QjI_6z3EkSbNIw3fJej3UiswX20NGbavUlxJ8nClJd26sLXrt4Bl2Z8jltA6Oy7AxlWSDQJ_c_0Qth0MFOhISPSYD1HVlM1AdCWfHiDKsaCArYoHPQmn8fRiBAuHwXOTTsGNaU3b1cJYyRbM5FfFR-tKIFr40G5IffpldJjRgo47p8ue2EBjfkKe87H-HwdzxGG6X-I4hzKwJ2a9uS9BLUlTQ5FtHJr7XLTzeEfNube09dM3kjBHIAGIzrWQ5yPRcl3h1BWGJTOfgHcPEe6EWwFcdS-4WUGKdLgByex6f2NICdRXqs0YvNIZ3gzmfLeRPlV54AIYVBN7RI03ahmhLpOdCJI6FfFdp15VF0kbJAem590xOytGcbuAT0Qv2LijaT3Lp3jX8pUaA3y1VLKAh1jEUI3aT29mMTGd6S08i_2EzQ8Fzp19r_ex2hsmYw-LpopMsscdF57xN_CqkvjQFEij1OD3lUNGAPXjFaVmIbAs=)
- [github.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFK7cooTwC5_0329qsgtFkgQb68xl3gZcAuLf2ynVer3ywEu9E52YvfNpunBwZiMzFveCaHJWIh9m_9_a-LnJyNyVjJ1OBTVYvX8-BQWyEscl5bg9vQ-Q6GhwLIdVNw7EUS0XmV2icSztIW4J_xgeSkCKSRIPT8vAhYNQ==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEBw7vTmJHT6eUQwVMFtFOf-ASMKUIoiACjv5xeo2Qpixk9nJaNj0VMBq2qviddDd41DGUiETZm_FytY18vW2CAnpn4FvIEyCehZ-Ezgsw0JCV8Aw==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHo_yloKynMeVbXP0IslHUCYhlXRaMu3LJSZcNrWmK3wRiDHrfpNDw5xzYy3BCFDjLAnxU1FX_utAwP9cggaCLjxF377IpTZTYGBR7CRO89tIGGsA==)
- [korea.ac.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFk_IVDHBIa0ralDSYtyJEOrdEzbTn8q8szSZz3899jWV8X3zyp1AtV780ssP8wd1HMsiV7y-KENstUtQWBxMJGpvu1RIEz_w_006hw00Bauq7bEIBJDfGVC0uU5m9p7FqZEAE2_S_kBOqjyzvpWnA-kR9b6VZWVvkqmERF4z3nID5mEuXGP2qq_l8H18SIxCzorg2yw86X5K4-fVmIt7liQWjkhKwulE7M-pKbQO8lMfhRRKC0EaDe-Rf9XOS7JBAmHfKBCQ==)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF6NvY_rGXCI6wqXNnR_8Lg5_7klVvh2LO0FfLw0u9dhQLVZjgv4NEqX1aBtDtZ15F9WNaAy6MfvxnAMmfz8JKTTEpCh06FxPA61Z_ULQzYilZsQ1jZeZk=)
- [bge-model.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHa_2qV9I9zuou0EoLK8oXy64rfqNkuI21sTTXpeVKOJo0rrOtccpZkQhrSzCcdL_05Ocx1h0p4RUBlEU3eAU0PkgC2ZtlIeGG4DwODmmLzRN75TleykSHfu1BVviUNGysZSXMRKhynaqutbHg=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFwHP-Bn6d-77kAjwaq6NLEM1-AvmZGkQoRWrRP7nRnzP7YJn-dvTcafFs_2pAATPI1-Nh1v5xnlPYU3HbA-37pzTf_OUMMuDy6ERKXHm2NL03BqwfKXjoRlZI4u6A=)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGCS09JirpTzD6kHg8QQ3g6MgaHGcXiZ6FlreH4kUI01s0GpGmBj5CoOsUEys2jP1NRi06Cw4PjzY8NVfKnteY4nyR9zL4vqxxyFnNQeFcKvTChZepPjgD-zMwTYZy_y7ZJn7mezTmSzcShYL1_yA==)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHiT5708mY93L_wgI4o8uiaBPTXdAyOvrr1ZToGobn8TypdRbH2tNtkrKLxMpwXhakkHal2xQEfE_KmxbSa_1IDg7xKkBkf-nRvxTYAi9dnj-9v0c3tiKcVxzjO64zRdMdKTm4guQk6nmEffU6YwUuvyToBeXIk)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGb1D5p9b5cq13QTkgd65hbHR3UvbKDzspWDtMM7SyB3VM2PZp8ZEdzH2iIppCHJS8zRLKZMYjAp9nLHBuEBEppg4XMX-p1N5LRBp4li7HK4qclPX-NhX8=)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH10UMvjUtY9GLPsmC8hsMR1oWf93zPDPzIFLmYUpmrazSA3MMsEdsS5y9jc30SFfu1OYkjxpJJjy-kRfar332msVHWjoeXBe8ZkDPIEvc3NvzfP5ELXdOFrclHKJ6RAc3_u4A8lxf9XbbpFQyfr5y7dplHs8wjuY4NvV_Guanignj4kxKfth2KerEB6Q7G32y2TcblXaQ4)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFutM_lyIG7gMB0Dn3ZY0jvECa_x23JeIutiZ36UB71owO10n3cap8ZZhp1QSP44-4ndsa0x8wVSUtt2gLIyw6Ra0nR9ZP02XC4JagGrr4sMjDTEerXYYBB4xAM)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG52ziSsDYphriUweRiH4IUb4fpCtOgQiGth6Ee2aKHsDHZ0OUfk7-K_66V2VuCb5YIgWZLty3Fd46gl4Vi9DoPk-wfyo4d4puOD3n1KMXcudbAsQiPVoZ-PSS5g6FGXUYRTfLgQEiE36M527I=)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFskcmyLAQelZfXKJtHH25slQjAGTLfTvj4M21-sN5PcnViJrUj1e3F-9H9f3kHztWRCVeTJgR3LxIfFiP_g2lrJNK521xsdHIK_dSjeGc8PA25GZTMflqu7elRukK8cik3j_YR)
- [modelscope.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHmddPfyvb4fI2TyogfvWxpumoz4NuF50FZRT1esvINgiUrfH21jKdkJexITxM1IUYhamjOrn9-8po1ERcIVO_zk1j_zPr4TVqiqj6Ur8aC61eQncL-LyAKxlolTWagVs1PjQ==)
- [sionic.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQERuPyZDgu-gDgPnE8WDNR3l1U4jShXN44zXP3O3MX8b_8zHdqhRo_ERs02scsVSv92Rr4tnapYZALS04fuEKhjF1p6FNuzpzzOivkzKKNV6gofRg==)
- [velog.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGnAyyqxaAcBZdbyknwL5mIbAmK1SVu_MaRuA4fYZyeAKFa5kGfg9VEbuJLCb95Z9rXDgX6AeL3dWwD-5qRX2zGCwRr_bWaeIHVEsVb1-TUe8feRX64T2IcmhgICYe-d4nC98VVVOcClDrrjknJuBm8-MUOsfOeVo3Rnbui79up8kka4ndFAtXxWbogtcZ8Dob6FMvLpBobsQiXPPxgA8OLu-6Ku2KV-wzAGCkt40zxZkAjGY9Fza7fXgcErg8Ai32yIhktggvo9HWH5suthZdEQ6J00vjfG0oL0aca2YFu1qyABqhdiMPaqOjMTw==)
- [arca.live](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGZKK1_1TJpMxzlbKccZIOyduQHI4Sa5kdEw1-e-p8a7g6hFsRPqNE-QjLUWcqv8TDF37XCOHoyKrFmeO981Jjkij4iTsOxuAYwjahP7D8ABcQ58uMkoANZ0pc=)
- [data-dynamics.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFUXu_zkJspL3ax0sCZW83LyLIDgEcBn4J1SuW3mE66EMY8_zJYGXgA15fnmLhd94fAUc6Irsfz48gWvhtsQ8ZeICYHb78C23jo3zWV3Ec5Fu7-hVYYjMBkego1Ywux8GBBToIVIDpPoXlF5hMpFScR)
- [fastcampus.co.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE8cK4w2nyISHzKB7p9_cuZl3UU7GM6rEj4wn7RxcsydumQxZ8h9naD8tdukkN7BfB_eHUvT8HE9YI3LI7lRQRw2ddc8eghNAeToOJhx11NyRWw7Wie-1ap-pWbdIq6-A==)
- [jaesolshin.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF7y5dvDpvrAmNzZ9YuPl5LS1hwwf3FJzsGnVFdA_dTtWbm8U94p7DzXBGBfgu91AFxeQQJ29D0NODFHYJ8YuIwWoZyOpSZ9gbtL_NzP8BKPtzMOxw2mOcXoQL9xP_iQQQkfVVt7vJrZuaVeIAjXD5MZEXK2rM=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFueG0d3yyfcRaV_p7uDfev5-FNbi9WIGZ4hDe_3YAifKTd72j4w9tqgLsP_Jfh8gUjQGo169k_b8FkSLLn1bTyRWzOUHtH37APdiRFvtCJh7BwaO0gkw==)
- [ruahverce.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF2bICdmX452Mdaz1JvG-X0Fxt-AtOHEbJXuP9M7tpqHY3KOCXiXbAgeR33fZrKQYWpdgq4NIA9CCL1zt_gDJkGWyOO4DiMT1LzJ38FA3onsFChjzrg7PXjhhrr2kwQN2hqeu5xyr2lZN3nLSA=)
- [kmworks.co.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGAyu81OCf4NYolghHkON3xSDk35FS5p8RsujKKoV3ibCI6kww1eMtOMfftMqNLOj9Pn1k7JKs7EyPlFziRwVywmG4Mtvq3TXjbu-xQyqivio3oXJK24-ASElHWEsR5kQR2d4DupnFEVMii7sZNVKedA9xJRQUCs7jAtX7MJ1RsDQ==)
- [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFZVIbTVB2z-aaKhdUHlYcBHCb5e-8uT3qExa4Z2ODVzqAWiluy3lvOR__iViI2TlWPFwv7w5h3uzqxsejdgbUVR24Zb5BO9rz6TBecQrs9m8UkgOMTJN25Bt20OfjJspNMkK17PfXSyeqvHGRFM_gGb4EZ81tmOe9C2iIwwzAS7MUcBLE1)
- [github.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFDPmtcnTYI9RWcaC8P8ZoEsikEFU2I0YCyJncNHpneNgncQtiqAyUahBOgsCFv7v_fBUD_GbvxLSCdgfzCveu5L5nl411GBT9b48gTOYjYocBK_WlSYeL4aYEMNPP3nQOB7qOaSK-6MBEB6_sGpQ==)
- [mariadb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEySo1Y2V05T_FFBXjEJcQtufJpgC8dv6OqonU0G2OWXkGSnbI3GzMwMSlUE0Tg1TGgRJwwOFARxcjbjk7HIB_xMpymkf61bgkO4T_d71er2dhu51azazuRAgea-LfC7OSKMGkSdDxo2uramP42-gPFSYQ4cYtOqx8lvtDz2iug4TlzKFkgoHI94wnv3m4Kd7mX83vOduRa83cYHnUdS17W7m9drnCRIe9jz8i0I7WiD2CfJOU=)
- [bigdataboutique.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGUbwBDp0Wg06h0WmlByTU9C7nRIYCw2gxIMgKCKobr5uEXbzxni95qgBYdYj4ARV843zY0MRm2meCXPIy3a0h3j3jyH3ulwhXaryLefT4WJHg7_BFPOS0DF_DIuWJxoJ6H6Qdr4hTSBfn2Kbpy8Q==)
- [opensearch.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEcWX8toqzIzknSUTe1rNAtIuvSaQPEgwtP_8qQWbiZTsD4dwVILmn80iIQ6FLI_DWd0MaAqSTkOC4FCxUNO91wVUbfdIPRMFpc-1sJwESDCIcsMGjtpI_9bbIOTHJRV9LC166BIU_J0D6_4bQgyW_ovhMHbVMdfrgu6bwOlxGjKdXyvA==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGQvGy1hJ-s8-z1dQxSyeau37cFHLSbBrbe4ly_4XCER6zmK8nWL0holrl9ReIy5ECfX6zL1oq2F2Ry-K-jLVwUxdu1bbyqNR-mvA5G0ajFff5VlpazXg==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEdTLslN9qmNHuCollk7vDevt1_y6f9q6SIu0yIAY6vOaGjastJbWYh37McV3kLgXHAItvGienfuyvCOxcTGI63Y89G3_lFJIuWN-m6J1lguz1srQ==)
- [velog.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHv7vcUWdfkY0Ji_qlmVBcTWh_JsMIzYL_vIILdnF-niRlWvTuUs56HDjQYpHKG3xjecDRBN1qLDnPTamtnZzkyHfysThXNqNXUtlqzN0oFeGnzkL6hXI4EOLT6qVp8oDzUksRs09fyQal5WyePLscljhZBYzOLxqYyGyiMAjNpuS92LXZ2dkVY_aiTs37FnF93yQAuxJe_1FURHjIxnTn9rQ==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE1cTxuHdOGL_GZX-uOj9epImZ5hf-9U90DMTA_RjqjunKBhb2IHz-T0GVVuUlIykhGY8HIXr6NG_QkncGqV9uVxAkT_3UtPDWhluKUAuOIRTZnJ_laA52aJRfwcnFT7JjKUr0Fvxz09esHbLra5ra7JaThLesAGqXdwbR0FP1jG9El0AR_kOztNwc-uuFSgLSqfNAe52VhMwzHr8etE2uL894Of7JXwnKtb08q2V4FVO9mZDW1R7yLeqp0sjFJiPJtUXUIJrEZMI0AHg==)
- [opensearch.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFGewmu0CWq6ePa5LBQCl50UwvIYpalxGOdGj1WYbKNIQ1YJyJgMQPYeTCDOCiXbCKK0uHywxe-ew1Jr2UHcmy13KsxQ1SQiv79KOPTJl0s51stNnaQs_uIVzRth-mKhMM1TIHyfPOEbxGjIqcqBq28CaWkbKjsQkPVUw4cZ26UGxDhXujA1xYf_SILnAG3sTyHixhEwzX8kgDlVV8PRO0=)
- [gaejabong.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGAkEk8j94HC7ZVCUIxgiV5GY02_sd0Y5AO6_hxJBNMY57VlWcYL99iYOTZb5FevPldCV9EmDBC5FYlSma1mHFqjAgEzoakPDzIVm45YWJcPdRBNx_rI0rh6RQExAMW_g==)
- [elastic.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE9hKKuAbFv5xbqBNLTBwRSld4zksmT-UmVZr2ptA5dV4wQVLAP7gtUdG7F_ZTTGd4VxXTaI54fAegEngbKyYwZdZFLlG0DbVL-vsRzYnEGLIknVkZESDHm_By8f4Czh8sS7IROV1twgA7SzyK_j3LS8uPe74SinL44EzBRPsnJQDOlji6szLIFQ4LoCt1Ufw==)
- [elastic.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH33AzVTFkkFu39SOr6zj9TCjp7fsZ8ijK0tNfhSx4Zj0R6VR_TnXWJlEKNEb-O9OZ-k6q2zcHCANBGFEqQ-6PxW295YZNUXmymuXWwR9J7-sagGYknXTCtZjtnWOBU4QXC6yxz6Si04YS8Tc6858k_8IWnkiDjX20Jlb-1QReSxAMiDFgiow==)
- [arxiv.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHN8UXtUYGuW9oMqGrAlc4FOIxXAAbJh71RzCXID5PdU80_YoXwufrJWunGNED5_JdPAjJLIt2DhRBT6HS4-p-pF-GK6j2GpeWGegdnX2WFsLq_8A6f-7bwJg==)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFFCsuYKWO35_GZeeQC5fp1M1PVwOWgs8Z929OQTcIaDbFTgy5LwcBZuDlgq9YrjofuzRuGFd0x8cfbstoOXXiv4E_APSh6XsiO214b38Y_HnrXbqg=)
- [themoonlight.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGYpS4fhx3no55HRBYMudC3_VHJ1j_OSFGPXsjmi6m4g0q4z7i6yW6t_jSKqFt9t-bLksrTir-3dMeUYFinqkMxUwO5_Nc9nkRM8z1zLOEuA9oolxr_hLuEjiRxGzCS8dSp6UA-ap1lmq9x7vl22mxi0qdgQ5SrzBHTwrcYtA==)
- [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGRIM_p5cwi9CU6eQhdCAWrPeyC4_n0XWxWNVYOlKaYk3gECa3YQmGYcZzJSX6E1w_ZTIiz1eHYzB3vwgE7cSf0TqcEzv6MkD63r_KjHzd_bRC1x4jZTAy3U3ghgGuutTKnA9I4dhg6PI2oz-gvYVHKUY-ApUmgRBxxhD3QQaoR-St0mTQ=)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF47DZYhtxioBxW2Uq5Af9YlqF5dgDJlKu8JflpqrOqJ5sVLxIYf1CCv6yh42XCMixw7bB611VubXWiPVStBFPdjBQ6BbzYhOY3b1eRLU73J-QvIJScBvihPaEVVudGdsQzjw==)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHn4chXN1eH6gbHE1Z4Rxl_9_dHQUKrC025vjmIs1D99b4o_Ng1m2TBwucOh3v2oUyGe-9Xbs9xeWaim4tLh0qDB8hH4fm6c_na_tfKNWDp5OUl1xBJ32Vr1Ly85CwOYg0jxlho_BfwP4s0AGjs6HAP7bfHA-ZPyfuGqVNZRgmSG1OGQXJWcVDljtkYNK49F4tunNKVyGeJOqQQvYLhWt-kLX6tOAaV3k62jCF5lFO5xyCtcPMN67gtYgoARdqGG21ORwwa-GPbQFUhzrkZhifyi4ulHz1sef9yETXebWRIDGscTaYvfpHgVnUiN3g=)
- [arxiv.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFo9teSqZYyl4Zp5D7d_PpBH3Sld_68wGZWlvZ0d55YOqhrpXJCB0DeAb5SeSu_0oHvTts1Ts9sbOJ870xdWGJWLBo-cp0drDYRBJ4NijRwRjgJV64bUMlE)
- [sionic.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGLWMBW-HdZHhnsPUdAd2C0UKK5mhSZrTNpEEc5M8nmZzC1djN4oh6lGUBQrqfKnWKOJRe1rr80kUXXB0g3gD8pCSIJ9ekKW_AKLsa_ml8XFDmJ)
- [moark.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHYvK0fzuGqUbrSFBU5CtQmbf1dazo0PpjuOJCmvz6CNEJj5BKHXUiCYJjvUd9eZEV4gUCTAQxMcU2Hbu2zG-qEObCi58fyfVVzg7LdXj596OzhxM_xhTtnZLSAbQ==)
- [bge-model.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF1-8BZm37U3GVHPtFGr8986ie7qn54S3ckg8q746uat7qQb_Fy5AfsmupQ3SMCTvjZquKeCyYrcmOrpo2qPCN1gE47GwvbFeobNCY-lw-EYu8981yTt1uOb9w=)
- [pristren.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH0iRuR1VOuAItUKW8ZuGyL3kLxXNBLdx8CFWfjMKpWpi3qB96AS8egbvZaMDiP82Ewnv1J2IT4bRUERkrAp1FfZlLpJopFIf820ccKOsrVk0n3Q7d3UU4ziGhw-h4pGAgtSPn2THhOopa5cylVQw==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGdMgAxeNaZET4EVR8sCJNn2vOTeiCEuMO-0OHy7fXBtQp1jxXtAl3XDGp8qniivOrwp5yEaQiLrhruq07iStItXMrCzT2tEZ-VgwwuqjbEB96CWPY=)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEUU8QTOIIgss-YtCx9o0yl8vrxLDAfOkiCu_RkUGHX5zVFGLdAIRe1kIlImNUAj7_1tSXOaQ_ZpOBe78BNUG-obLw34wKK4q__CGb2E75zkoHQkuxC3UUs59W1QPpeREo=)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFcr-kL7CTmkh_esoqMKe9DxWShoXZcqYTnYlzaT7QVDBdKWYeZga2oy8x4CNVUlqagoaYDJrbUajas4tyzlcQRZOKzGnMVxVAOaQg1GBzfWXxWJdm4265PDlMmuIcb5A==)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFLtNqIfx9VubEedVC4GEU5AMPEnQeDu5WFiNtnog2QV__ur8B2iJPfTJp1Tp5mwZuJWZzQ1Hxev8DiFdOlKhMsvSZWW1vP66JRk28gTOY0N6C7OYMMgQ==)
- [mdpi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEulj7q0rD3TfF7brdbuSIocHIk_StsU6OG5kkqI0T1FB_0h0StqKf_VA25YSwQvaqOKhlnKgMM48PDDDWSqwczR6lBIsonE7Qlrok9HH9QibgJCZrybbGiYcABo5OMHw==)
- [facerain.me](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFesbRRTHLaW6C68AG8NWc-Lw0bukGZZposZ5PbFotJ69_oKtelxlwB3MMoAEM5tb8hc4WAjruNyxO6f7xcYKKei1WCH8o3sjPNlfNUEM9E859UDZtIp8rkbq0=)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHYFj4tKQBIntNQAHQWkE3MmSdRMG_cPb-Usn5HxqQSJbHVX_WsvJUukD-TY0IxN-quQcnZmF7PFb2g_u_peNY_heYLHhJr4ASavlgEgxn_nDgCT4kl4zh6UZ6RYBquxr07j6XwF1rNEVMr1udIH2DKCWx8SxFN)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH8uMkXfvCum5YvU0tSnBWVD_UpRjC4SHtjVkGlr1u_hwMWSplW_mXM5urHm8l82WDL9INO8lLIATan9rlTZ_CHcGqwnyaX0i7BboomJQ3Zx2eGHiEnbGd8FW3cCnt-Aw1cxIbF4A==)
- [cloudfront.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHFHgCJCC-t35zO7lZUDIM6zqsFDv9RqqvuzvJYM2Ab9JH3c0LjWBys_aI98yN96r1ziVwq3vEUNjdGZOU-4Hp0Ru6HnGNotYSzsJ0dpSl7fj94NvFZp7u5RSCXF740j7WqUX73kaOcKAsNXQ1hJ04Qrk2JUPmkoM0=)
- [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFZ3ObCKU0WYffytTO2viCTvfwcoxDfRtZ-k10Yk6ZLpI3-3TUy9itf4Bwg86hGY9vuxEg59OPgAeLIIu7BrakLL1RDQdAtUtFEQhLDa_EajQyav-2tfslxX5Wfv8wOyezSu22IOR00iHUmCScZp1-UtVhfzq01htiulS2bPSrocqusFfxojD6AKnxS_CALyGNIIbvQAqox78znPvM96r4=)
- [deview.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFs_t-k9bJDYeH8BBZlx9pSlDj3a_DIoNm8XcF5a_BcckhYMZx2CRr3oXlM8VAPvCq-tSEupjaKj3rCplvIIa-C3pyMY2nQr2yKVRU1Dqt9wjtZH3tKjvWMrzQeWrVinA8Oxl6KZfxaQPCRS2L-nGaoWFFNN0b-H9DEdKUXuH_H4YhURZzQs1qGJxb39eMJj8uRHrDBmi3eBlxtzWE3F8MayN897-DP3bZfkW2lx6c8JXRaJr2OtTHEe5yM0AL6rnHfXerwaHgCsKUzvzl15daO7iy3x12l8XmCfWHoc2ar_0L9D8-gk3NSh3nEbNVfmNfBREJfLM2xsVBVrpR5FsoCM-ChI3Ei4D0PQWWflgIfvqLEQ96stiNNhsuWMOgIO6qxhvswopKeFG9uv2LQVg24J30QoF4UeeJPgJTLL_iSrL7sJjd049YQvymBPn9M4g973HQJjolSymRVMl2mUdHPgjp40jws-hSqjCJBoL4ybuT8rPonRpH0NiUv4xttC0T1OU2eEnDqoaom0DV81Yy2KBTQAp2jqMNKY4-Zoc6L7rJpm8RdE6IB_K3YV2JKRdjdJpetlFBbO-cGp4VuMqfQgUCjHjBhNH0rOkBrGAig8NVI6yI-52nFxT0gYOu3DmfuFamcgGghaqpCf62FJ3VpaiPgoeDMDHto13z1_PM_XJa1Ni_yWUkfTCcWAKymECVQiT7QAyd0r3tmkUuryu4HNVZkSU5hnwIhpBu6ditiimFLaTUNQBW3WtEVacNCHp4yNjDhlML2X0eKI6o9hAHB_eg6uH7gDIhV4NSc2rEorL3XR2sUXBK2cC3LcKq_LbtCSj6eiK0eNx-sdcj9_jelazAH_x2b9jgTw4mMBDrNoS7LpBO2ucg4bSl9zqmer6K_oSwbEw4jz-GXs1UI-nbFaA==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEzY-a28JDLlWRpk9DC8T0x-Sk5HHPeQvOVGGOijl5VEX-S-NSpZWlj5sKeEBEAy6XoBRAgo94d5UI7_lnV8JhWLwBw33aYvH-J55KUmqlR4rbwYkaJsVkUOF1nWkXX281fWKo2pOnl-WuK3nCbmOrm0RKLZS-l9KMMhZOjI3I67pYwlr1Pw9mMd-bUIR1LYmHf9wXhVDW2zh0SduvRExIQjzjUe9yISy8FriV1QX-mYoqQpTIdZWKm37PLC8E9Z6c5aZ1XxVbfgwtXz_IoYjI7lq2MSR589tc4kK1NZwXdEnv2InldDrWlsBDZesDo7WzNbZr1yGSqQoYrDQ==)
- [abhik.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE0SmqwTkqWexzcazT-vuzzx0QOzsTn1GSqae6aEBguh0xg1tx2f3aTMaGjppoI2AW31J-Hj4AOp6DHvBQuuUdLTzDwFx4zFLwYTpLs6A8Xax5JoAwibs9Ht3eFEmKyZD68axjqhsQCJhQZ5LjW)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFv8HRXLqXIn5sB1qYBhlzt5RgHZtY8r09tKRtluVpmBLIlrWhGljZRDyRjy5kWodvsy5aPIrqatLBAYNktXNuclHVknVjeoXs3U6niR_5gsYPqqV7Jhw5eyNPz49MTsQSMsxrKv6uxKyVXWbRfYpgL6F_HtTRTEsVtoQVko3Fyp1MZ08YN6207ISybV7f0t6RoauBw7wKemztnQEf4uDzo3VxCL0XLhsjrLqjKXV8kneljF0FQZQwrt8ASz39_natpCqOJu16XphWYqB02C8MVP-uAoZB6lw4VGZWf2lX5Fl1wWw==)
- [velog.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFCbwEJ7GOWxYw5QAe45TC1Z5rxEzyJ1URg_G5IdqX9cmVLdeLUledbPo7cMBsekjVEfGMF4InvbwUAd2UHbyCcW23hhO1CulhjFvyXhvStjtcVuenGzQr0RJImlJC20CKuUOaoblo91zGBp7G9jz2o8z9sWZhUlWd75k8xFFDyvLk5o9Vflm_znOoxlwqY4a736CZlleeA9sZob13bWE19ORupsaE6t2fy9h_cfPAXFiibH67X4lDdEQglQTwA2vJNZkxqE5TL_oH0v-OpKxQeN2lLelQK7Uv80jVjaI4_7fAmITjop-WflA3RWa_FJlqmSEpGnQ==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHP2XT7ljasZutgCJJmh3gCwhz1MRubQzS7kuNimTvrG8domD9FjmCzA7ia37ydlvyqvkufcVMn16vYK4RZ72nzGGdtqLv33v7E9wBCvZSCw1Mb0gpfGjzo)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEIgzt4IL8ppG-8m2NoJ9D-iuOSSF0rfAJR1Yh2HD5B8Xai7IUG5W-f7Jjog7ElW5KxbzUd8rhFAH3mu2sSY-lp_tOMFHeHagXzkO_l72DFV-4yKOxtx8h7dc3UYQ==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEie_Ic_LsSPSZuPQHek3uZQJCmzb3P-4hjNjUx-C-9O1OpzUaqfpXsVfVr29fLPXCLVbVAIrSgyBUFBowO-MTPysci51KZpVqojAFPjHhCxjISW97LXtHTe6s=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFGxCLUntAhtZxmW2GUd6qWg8zZlT-RptksBAj4NjLbBZpuwgSMkW1r1ty0md3Gu6s1xzfA8ndw30XJCdtFKmvLqh8eZ5X_FU5ikAchMLy45NUzOA==)
- [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHxMkqICwrBKiC0aTJudDgMG8L_i7ZWAt4eYAf6GebMTyM1tgrMChe9-edgxTo8RFu8GmRu1IsnrJko9c49FKl2joz6PZIJtaSARVqyRoA-Gj69m1tIeJ3B15x2BF5F2QGvTKw1thZYNJywSNhZcDLhhGTNJ0jibxxgYkkFvg==)
- [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQExTnTv4L3JCcdbKt4EPr-pUp2-tzKha1GERbppcCZB3U8Az1mdH4_a9GYNIhdgr04lMjgEQcXgoj6PB8IJh8nF4cgKJwSYeV8eru0fPLWb835c8Rinu9PbvGFIWA_Yl8r3N6D5SnpQXxyd1etBuPJtZ50EfZ8bGLrvUBmoBlyAplt0ZfbXPrd9iN2ZmyAnYtxN7Fk=)
- [mdpi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHBtxZtzp59ogya_gOa2kbdCNG74Mu3VZqNGSnNQaHhaURqsmr9D5ZeVN3czKA-O39QyRE33Iqk11BqMQbD3I8pBN2cPx61qyHCcyeEEknOf7WIzSIMOWWaout60zqS)
- [velog.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG55XL0RlqJcVPG7U6D0JBnev518ggkCSUhsIJxQoYGkrnqUa5_WDUsdCpqlfZJpUgjfA8N95zp6Lnd_HnOpfwx_6y3dN3ZVc6ZixcoFWsGZBkQX3n-rBz0KQ4ikQAlwOFeQhYWKWm7bADXH8_0p9QEnw==)
- [bareun.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHmV5rCffAKFiNBm0pDtZtNh_GySok_NJkQD2KugaSgCMp47jhIyoxEEJtnH6ZZcOgI_jCYw7PALfMPS4ix5ffh4Y4twdu0fgpgiO3xRx1cG7sVKXbWeUSV1sL-mW4-2rzVHERw)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFXgWYvSnXn57DI8PZSpn4EsCWnwy4ogDumunB17-L-4yTkXPbOdRg150_cOhQFH-DVMs2Q-1DHKlZoD_DnUn-RZ08EK8HOebMMJnYNdbmh3tE6g_lziQzQse6LLGYS9fteo-8AYdPilV4Wwo_w187-4wEnVzt5UJ0s2-zc4Ob6ftZ3T7HwYbBzCXKNauVjXwZlZM1pq7Dhd7yGVb3i7RaUb8jFJq3fthRN4J4JDLYK9OYqSvjpeAlMnLo0QrGq453gzumBUtqEvugz05YJbLSTkX8dNejGYtDjWaL_fceLRylFq2PVABFfqo8cfCxm0KYg4cl7lD0AjKYpYKMTNBQsagZqkN1MbRyi-QDVHLFrKF3fQXxkgQOrWgMnRPBVjx3klBHt0fH_Sk2gkzJ-lM9XGY6_87Plc4AOO5WrWL2t_-7rs8vatm9Z-D3JwFlOdn3VOvJHaf4gLTzEdQCzhoKlaNkjOVO0SL6CJllf9R3D9tzDQB4h_W9doEOeNnpl1N4VOnRQa1kDUDK67ItIfe6H1B71SnekDoOODY7pDYEqUK_A9PDFXQ_SzF9ZDSv4XyLeAHdC8reDIN_TlDzBFReMWOJ5k_S2E5ECuDE8WWn6wAiRuLzLU0CDXScmBKUEVgh9yOqIcA==)
- [sionic.ai](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE3JmGNu-zEyfI3EIt6AAiA-ckrvhGPl9EQJCqddLdQy9K8knr-MkTsO25ZJeMX17bSAWusr7RhWI0lPhsPzGoreqg3D8h2sUqjqSnR6pKDV6HjUA==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFaHecFFpHtCMAFumDgcoY1A3Y6ot1Hb6FsOKip6O6h7NZ_v353hX1ukDPJeIbB1XIv3amLkSrgSPQncT4MAFWICJtkCU4y7oFV495iHy8TRJVySoob0LZy)
- [hancom.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG--rfTJBjjY4ahjpMr_LO3bryWFKLI5m71IKp3Csfs2EdZ59xFEnQXqTcHfQlI5wFZNjnmqqpjdla1qDyC6ff7Kc7N3xfSiZFSj1nHvAaJAQPL8sRCzeA1e_jSQ1e-BsQUHzkGvPsljd-1YrPQltlmvjQIu6IEEAoD_W--jndonY3UgvMghzBtVWlEAAOXSFjQB5YtZkSsgALLFRtW84k=)
- [kjas.or.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG1vbMvoquI9J91CmXar52eo7T8KXFjzYslYk2ponAZsdLlAmyzSKsa5-jVDnxYfTM-oXIX_jBpcKy0eUIMIbDirUDkhYZ0VqWTcVYfkaAdYqWxUTTaOxueptK5_GZetgsP644oY-644L4PC4A8-NSO)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHpsyuCIaTEpe-grzibfSl2nD6W0hdYRkIE-jF-AWHPCTvMF2s6_F0rpNAlKh98p5yRirErMLtCOb_uTMhOYIk1iIjjk_atq2NI4hCFPWRKIEfDTGWG)
- [kkamji.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGbF4hZxbpRXQUBc7-jeYQqkb9WlhXwMnoT70JIwiEHNjPtz_BHAkYY1_Ezn1_Pd75ZBCk1XNcUyME4qCe1F08amHaCDQIrdfPF9xmZkqx5WHH5TDF9YEdYtVzGHvU99NMGPvj2K8OTk8iNJ0f8BJ4=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEjmZXvaym7TVMZKlq8svQ9AHP8kzGYszkO4U3-7j592sJPH5aCRyu-ohjUaDDYRvtOnzHxP-MU1M72D943i7N9C9t-9knvczc1K509T7-AdXir)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGWiYWjFVkb2zfXslEcUeWZkL-DB4lNB_MpX8hEuo3RnMvEvBd4GgsBHia0eR7aejLFN2ZZsIO2cQoU-0MKizYoBezjf8NtRnra5oHWMRflq7j_W6c=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHe-VPMTWWKFKEevLWEUNJ05o5owaZV-DOXV42RF84fnCaPmWotWoBKbxkFB5k8HVOdsyn5kt17KwH8QDrzj20U7M5QHbyypwXNXkEyrHeGEHfpnqaqYg==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEVPQnk0Oqn0pNcWZ3IcParjwHPQa4tez0xZUXLLO6_4DIp6OPCrmuU_DQzur0FpgfIHmfr6SfKERXFyvVvHtVLGhg7qHm19pNljVQLbiTuEYJY5KI6kLKx)
- [huggingface.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF3s6YJ3-2UEAdLnCzR5Yqzi-NMmAhFpSktOpoBxi1yr5lhYI0iyYXNZj4HG1AlYkuZsxPG3_qXMYdvaX_eHsS1XW6Dd84GTP62dOyeh46bu0WdSWAXVjOhM5jbsQXeIVLNWONMV1OwMEm0Wa8=)
- [benelog.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEWSZ5x6vzMXken8TvGCCMUQr6WHP0MQ6t-rhnSL8qCY5a90YzM0gSS7rNHvtNMC4QMworv9iEkMA-Qe-x_HdZ6BejkP84HNHzk2zbLPGM=)
- [fosworld.co.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG5AW2jSJRTkI99j2qtlYkt6VkZv6GL30PUvoY4hlxIxH03iOlmunN5CUvOTOPKGMR-eC4oNVdtZt7yp7JrFShtFE2F0iGnzmpVLCPy5W0vDlo1GjMs1yejqeMO2Ah5Mlgn85PT0SaF_NXD6rEQa_L8UagGcrl0XSthZtrMhMhMYnZ_NA==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFSgHQ_oBVhs6xeW812FxKLOCWPyysaHyggifUf8Ud1o9nrhEwJGRSpygl3zdtItR6UUZwbU9uiSiVeehCtVRSGBXnw3IdAR8BXCAoePJRGLAzI)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF3lwB-v2LwTLq3TFlM6OeiHbwgVg_AelowA_-Bouw1fHn8vjEOGfxP-I7S8-29NtOKUOyaFuD_EZ3g2080BGcfZZHVj5YaNd1QKuf6YfWa9tQ8FhL9UiCCZyAGCOp7E_STWZcfrUJhZFaEzbJzUFHWrZW98pqy5fpm9rfZg16yccp3QY3ipQ8pabx79MYRfaAhU-nBypuSt_eBPN4k_3wJ17IzOhhcXYB3UaOshtiDzs8cjyEM37Gxj-TbRN6CUvX7NgR-HfDJ9IPal8EPkpL4cPPNsVA_sb-pyofa_3uWm6PDy3koScSBLrGESO2Whc0G013L4i5Wy7MYrdYDAvepGFtJ9DWkzHwBSzli2nw5A89OHKhLYZGYURzQBieqt-BeQRPvQnLjHYSjgW_hfGWN3xi7wgDjdVJaf1jaq6HhnmvL8jrIk32dicsfeYvNTp2G5ChQYEJG2bhOd8D0ESDNPOxp3zdxO8aTDnakEZv2pXcAclhjDQnicOC-h_FZ)
- [jaesolshin.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEmffqDP32oZjUr0ttXt4Vlk0xHn7lBb_ESWjiIsAmEkz0wwyl55pFUiqGPoor1rDowjb1xZX4uA4IadSUIgKr2Parudf_PwGxx47TzbErDR09Onv1kJShfbZy2IOLN6sbcfCsxYFlsiraGUFQ9w2dYaFSARg==)
- [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFkKnjHj8PZthXcyOzptdqR9ESqHnPL_-klzl5XKZf0hdudJD50_fSnkcDbPVUEU7X5UUYP9oiPvm55behNrgf0dzR1SxcBQ70KKQwwSOP1mgmDxpFj1-Q2ZhK0YtlJuEdeeVIlGL0jpqaOuCQIQH59h2TcAXoxMr9OyNr2UMmfKS5we5KiIFtm0tKWKV6r6_h1TME=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFD3-lALC0r-awivLbFjFtxh1KASWyliPqhbaMwsVS3kZYIMKoX9C8DMBkshFHt-Ltcd8A0duR9GjoW65pDW6SvvdoyUAMIzOJ1GAz0COskgGAtzH_U)
- [medium.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEqfLW6ca70dbnnNKwJBcEbrP_Kb4INgVSestCkRVsr89KgwtNwojyC_Lus9aQjt0g-x985LbzQAl43o84ISfVVGecoZwwlXlP2TpATkzuigLgtF_BPCDJprPsKeaT0mloRIHGAd1wdVOc6HgysL_dS2osGOtP7_2aKLHp2vQ5nUuPOERfxBdf4dkdliqVkvnKJk9YFQwtmdRhRaPvv5W69NKMCmzhkCH7OzF8jszGQ_tSVAEDXqTc41XLXKEUyEMsF2VKmXWE-xf-dQQZ-zkapmlaVD1gjiVsjILxaM96ewtpdR9u0ui8BXAHxQ4tvUBUyUJ4nKBuJ7YsMXIPwRKCtsF0GhIaKz0oqii0Lr1dhvFb3sLyE)
- [mdpi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGoxnlwBspovB_rC_g3556njB-wb7EesVrS77VljJAvBafc4J3ABaUQqiqag6a1bwPJtKpjFG-sVGUIn1_tMwZt-6lFeb6qi0P_HMd9N8A-bq3FrwgWrHBvlxE=)
- [gopenai.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHOv25qEQfAOInrv92_14KmugEmSHL_BCvkvbBT2U-On-2mCJsABiWWyR-AHslRn-LVK_VoRLGm-Dv2gJLnQTcqiXV6AqBfFpITgpURYD3-UKf6rmiEUO2MJXcdY60VmUxy5AiyIoHTZhYSZrC8srmpUY3Sd-TQqVb4lgRDZY8D94hJ5GtKOCIXBI7qXtcNF4lTIWosXrHmMQetxpAbI1sFBNitw_xReUC4AmuSyyzqophG99ibjYE=)
- [data-dynamics.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGtI-n2zuDZtCr_IjSwRN8gjj05f28Y5g-NpSGhvO20N_gntNEeP4d4cblJyQRQA7e1rAALb_IY0XOOfCRpjirBuGzgufUV66V-NT3kuYQcXtf42ApyAgbvaiaG2_MD16S3mZw7rMpX12Pw7KWHLaM=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFP2qWGA8djQcUvxUfyPIxH7VZTcCSsu6aAJa1zSxCYbTuOBuG7bJaaYr8HUXQ2wOXH2Pz0u6JwiuUhEZd2k5uKgfjWrj-4_0A_srXL2iHuVbou50fC-Q==)
- [opensearch.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGHhJ8-U_uTeC-3pUqsUMi_S_vBrO5K_T0fGQ_sk3QVbRj95nguPTFZX-IAYqr7o18TF67E8OkXWz7Nfz-JETN0Y4U0daCCpzxuI3pTuiHvxqyA75f_ADDV3rmuAe31nmFQU1dGa91il44EytSN8QgV965K1UBqLqIj5qdY6vWrbPF-Dl0ZZ1Fd-9Pa3bUGL7ouWQyEz-bZ8GlhLKduJxCQgG0=)
- [srce.hr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHforoBB1x52BsoV7nASqRBajZAC4M_Xw6HNYeqiB_xHdFJgUUKRFCgzEdQK4GsQB40WjZ5l6IrNSRUM7N7pQ9hqg-2jeDT_XKq1i49SCljS97m04QT20M=)
- [ijarcse.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQES7iC5CSjCAKxH-EpPdI4j5bn4cGOABcrtL1GTb0S7uibsH04t88cUfGRCZK3i2poMPF3evOYCgfTano7sG14vPDczbKTRW47g-eulMziAZPSx-MuSy4Tj03UeQfV4Aa_5V3xnkpEc8aAWO1o=)
- [naver.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHSG0Pk_pS2wIN-mDn5VOBoxj35Hs6mtcOUtZp1nzYV2VErJ5l6uJgj8DBP1TrXFG5YtEjGWmEWnG9Q8Lg_XoW66C5s-KZ2KjDPm6Ka3--Hc_Z1hNQIXVeuyyhytyPMUVy94_Q9f_ZGgxAQ5yoxIg1c3KJOjbxSjbsBX13hXM2SmMukhza05w31U7YIz21HIx1h_-BE1mTXfcXoTvPiQGmuX5VkyWUlCahxjiIiOUTRP0XEYnKNP5W03IPwXfqtOj433WlHaAq8Oxq_vy1IbP3ZCXYmxBKPf0X_fjqfZGPdNi2kvweOte4haxlaH5GIGcB6XLi32LnODObDPk-FZRFKsOMGlHN7bwKkgK9XSTuioRQjQgory44W37nYeZqW91g8vqY0d9LoXZT1DfJcTcjsyFS6DfOsxHc5CDMbQTLniPeGJfsKiRn-hvVJc03ykr8SGWrCpDStVamwu64rB1o8eLNvsGFGQmaHuOKUZTvKIyWNFmfUNeUCtML9k1sHvp7tAv_kCBzXoI__erxphsOP49pL8pItfFZFdKDhTqUQd5Ots9n0Eh86sYSxtdTYfxyVLdvO4PO3RQ6T0jhMsh6Oq8t_RansHxXbP6F90U7GFt3nrk8Zx5-FmtHwp8DGJPTxJ0pyYQyKq2j1tUCW1ufJt8twpPcs-oCiRQpXKPUOEv-mAg==)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFUBvlXYzjHlOUP1TusMHQBjRZ-py-im7_l0SX_0RDE0HqVYI2zDFljMP_xKJoCavE53H7JbSLdI9JP1ABAQkSsjuxuM4L2HFyP4jyJRovJGjOcq90F)
- [amazon.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG_mG0CeKNhGFlnmcWa-B34mIkaX64GaOgOt0q0IQUcWfmHTjRTd3q1y-8OX_NRKgU2_MlLYSu043zUg4WaI1IMjPv0Z1RKWDVvSoDWHTk5kV5EWFJadYAYJIZPrrpSajhaTAV_kdZUJ75f6gWx4O4RjG7YiKat3CVhDohPHxOy1a1Jw_I=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEVpBs39DRJ68r9qZh-JwUP6ABqIc6OLfG5cJmLPZHJl65PKj_XaDRM7js8Dbw5Orfx_BgdbkZGQ-WIP15nPLmaNP3TSY5wDgUPQFGRJTorCaYrdtUB)
- [elastic.co](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGWuF2T_EKne8Bw6OVbUDhuhNAQ7iywNMXEbboUbyonDc5XE9XeXeRBxTpBBcGlGgFDVjNZECB1amD8txR3kIqYcgMmNzxgRZbhRKyYJTbiqidzxEmgbwV9ybicSTnjYP7R_T2Urb3snIzjLp31ipuztdOJo2Ok-WmQYWCU7kPCHuTjUq4Jxwk3rYjAsxrGTnOE)
- [data-dynamics.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHt2EFBF8R_eyT9CGGnkXVn11mtOEVrbWLS4IIzwTojJ-X_x25d7dZ6eeYAhqwISecunQGzGUzb_ygwnG0Tkd4rSsanFeDL2S4dayGYqpauXwQRVErXmBIC55rCh6WNHVjNW-DXfvVOELD7TX2YCn1xXdf6Vu--nbrHW1JgEfJozxsmUw==)
- [s-core.co.kr](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFmIrcJ90xx4-241LUsa8bk2aq-52gLlZgaIW8KmiFGd10rFZLfPrRRGgq9rneelKtdhvWuEOQBm2YEg52jw0WT9wsfzaVp6JufCD8x4c4YF67AM8goUvXgfcAJE8CO6KrYlIa8GickZLG-gvlESKwySxWmpdxmduiikpsADAySKM8Nu1XBu1Pp0dXfQeW1bwgwo3qAGOoIZbj1B-zZ8p2f-hQ-D7t7Jbdf3pf98Lc2DB1YQlA4nzx7Otklr65g97P41TPTAesl-8YEuvIudnx1dgKEGgitv5tkWfAJ7qL50juhV-dq_NDUL4oejkI8wmcV5vwwcLKLrdx9peV4RhQrZZgoZxIATyej3dc9LRBPzQvx79VCCSkv)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHemJFnxQ82r3pa4HsxW6n5PCLUE64nvPjhg_yNWnbjtIT9912HjiMQOHFuSOWwjiNDc3ZRxDZIV5ew9ShYiwEIBCsTlqQru2iDsbEIa265eaB8yaM=)
- [tistory.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFu0KCubHwVnA-0QQw6T_upqi3riUHDh42ptb9wds2jC1fGHSQOtO4YwZNo4-ekHYqNJishH_zNxjOjSQj5IPb3kWjiouBJ15vbnuM6UfEiuL6Ve_j2kYGnaB0STCeF6HAyLNnZIKZvGCn5PPqMXVz3L4agvrMn3tqWxOijIntkc8uTrlZKIqLe9ctretSccnEHeRHXS0psN1ynsbG7o1vZrqEcmVo0Z62SropVuOexmXLE77rzXkqjOyzXdFUGi_udvZtenXhU3wIMnQ==)
