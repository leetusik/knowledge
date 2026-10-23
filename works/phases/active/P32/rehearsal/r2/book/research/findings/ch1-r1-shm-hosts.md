# Findings: 20261023-1245-sqlite-wal · round 1 (chapter 1 top-up) · angle shm-hosts
- researcher: claude-opus-5-5 · status: partial (hard cap nearly spent; no SQLite-developer or Docker statement on WAL across containers or across the Docker Desktop VM share was found; the Synchronized file shares page was not opened) · tool calls: 36

## Questions
- Q-ch1-02: thin — claims: C-ch1-r1-shm-hosts-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12, -13, -14, -15 — note: same-host containers are covered only as a chain of separate rung-1 pieces (Linux man pages + Docker docs + SQLite's "same host" rule, known already) plus an AI-generated experiment (attributed only) and rung-3 forum anecdotes; no SQLite developer, Docker doc or rung-2 source states the conclusion. For the Docker Desktop VM share, Docker's docs establish that containers run in a Linux VM separate from the native host, but no source found says whether WAL works across that share; any "not one host" conclusion is an inference the lead must not attribute to one source.

## Sources

### S-ch1-r1-shm-hosts-01
- url: https://raw.githubusercontent.com/simonw/research/main/sqlite-wal-docker-containers/README.md · canonical: github.com/simonw/research/tree/main/sqlite-wal-docker-containers
- title: SQLite WAL Mode Across Docker Containers Sharing a Volume · authors: not printed (an LLM, per the page's note) · publisher: Simon Willison (github.com/simonw/research)
- date: experiment dated 2026-04-07 · version: main branch as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: other (AI-generated experiment report with scripts) · peer-review: no
- owner: Simon Willison · upstream: none (this is the experiment that S-r1-found-shm-08 reports)
- lateral: the repo is Simon Willison's personal research repository; the README says all text and code were created by an LLM. No independent reproduction found.
- passages:
  - P1 · § "SQLite WAL Mode Across Docker Containers Sharing a Volume": "This is an AI-generated research report. All text and code in this report was created by an LLM (Large Language Model)."
  - P2 · § "Experiment": "Tested on Docker Desktop for macOS (2026-04-07) using a Docker named volume shared between containers."
  - P3 · § "Test 1: Writer + Reader in separate containers": "Reader tracked the writer in real-time, seeing counts increase from 6 to 50 … SHM monitor observed … 48 hash changes … across 80 ticks … Zero errors from either container"
  - P4 · § "Test 2: Two concurrent writers in separate containers": "All 100 rows present … (50 from each writer), zero gaps, zero errors … SQLite's POSIX file locking worked correctly across containers"
  - P5 · § "Answer": "Docker containers share the same kernel, so … of the same file on a shared volume produces truly shared memory."

### S-ch1-r1-shm-hosts-02
- url: https://sqlite.org/forum/forumpost/292a68c5e4?t=c · canonical: sqlite.org/forum/forumpost/292a68c5e4
- title: Can I detect if the disk supports WAL mode? · authors: forum users (original poster shown as "example-user"; Warren Young (wyoung); Keith Medcalf (kmedcalf)) · publisher: SQLite User Forum (sqlite.org)
- date: 2021-09-28 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: SQLite project hosts the forum; posts are by individual users · upstream: none
- lateral: none of the posters in this thread is an SQLite core developer as far as this researcher could tell (not verified off-page within the budget); no post by Richard Hipp or Dan Kennedy appears in the thread.
- passages:
  - P1 · § "(3) By example-user on 2021-09-28 18:52:24 in reply to 2": "Linux host and Linux guest seems to work (same Linux kernel instance), but a non-Linux host always results in a corrupt DB (Linux kernel runs in a VM)."
  - P2 · § "(4) By Warren Young (wyoung) on 2021-09-28 19:24:37 in reply to 3": "I'd be surprised if you could mmap between two Docker containers even on the same host, with the same OS, shared local file store, matching CPU type, etc."
  - P3 · § "(1) By example-user on 2021-09-28 17:17:36": "At the moment WAL mode seems to corrupt the database if given a VM/docker volume."
  - P4 · § "(5) By Keith Medcalf (kmedcalf) on 2021-09-28 19:56:16 in reply to 1": "As a separate application in its own right, it has its own set of constraints -- one of which is that IT DOES NOT PROVIDE A SUFFICIENTLY WORKING FILESYSTEM FOR CONCURRENT ACCESS."

### S-ch1-r1-shm-hosts-03
- url: https://man7.org/linux/man-pages/man2/mmap.2.html · canonical: man7.org/linux/man-pages/man2/mmap.2.html
- title: mmap(2) — Linux manual page · authors: Linux man-pages project · publisher: man7.org
- date: not recorded · version: current man-pages release on man7.org as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Linux man-pages project (hosted by Michael Kerrisk at man7.org) · upstream: none
- lateral: man7.org is the canonical online home of the Linux man-pages project.
- passages:
  - P1 · § "DESCRIPTION": "MAP_SHARED Share this mapping. Updates to the mapping are visible to other processes mapping the same region, and (in the case of file-backed mappings) are carried through to the underlying file."

### S-ch1-r1-shm-hosts-04
- url: https://man7.org/linux/man-pages/man2/fcntl_locking.2.html · canonical: man7.org/linux/man-pages/man2/fcntl_locking.2.html
- title: fcntl_locking(2) — Linux manual page · authors: Linux man-pages project · publisher: man7.org
- date: not recorded · version: current man-pages release on man7.org as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Linux man-pages project · upstream: none
- lateral: as S-ch1-r1-shm-hosts-03.
- passages:
  - P1 · § "DESCRIPTION": "Linux implements traditional ("process-associated") UNIX record locks, as standardized by POSIX."
  - P2 · § "DESCRIPTION": "Any number of processes may hold a read lock (shared lock) on a file region, but only one process may hold a write lock (exclusive lock). An exclusive lock excludes all other locks, both shared and exclusive."
  - P3 · § "DESCRIPTION": "If a conflicting lock is held by another process, this call returns -1 and sets errno to EACCES or EAGAIN."

### S-ch1-r1-shm-hosts-05
- url: https://man7.org/linux/man-pages/man7/ipc_namespaces.7.html · canonical: man7.org/linux/man-pages/man7/ipc_namespaces.7.html
- title: ipc_namespaces(7) — Linux manual page · authors: Linux man-pages project · publisher: man7.org
- date: not recorded · version: current man-pages release as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Linux man-pages project · upstream: none
- lateral: as S-ch1-r1-shm-hosts-03.
- passages:
  - P1 · § "DESCRIPTION": "IPC namespaces isolate certain IPC resources, namely, System V IPC objects (see sysvipc(7)) and (since Linux 2.6.30) POSIX message queues (see mq_overview(7)). The common characteristic of these IPC mechanisms is that IPC objects are identified by mechanisms other than filesystem pathnames."

### S-ch1-r1-shm-hosts-06
- url: https://docs.docker.com/engine/storage/volumes/ · canonical: docs.docker.com/engine/storage/volumes/
- title: Volumes · authors: not printed · publisher: Docker Inc. (docs.docker.com)
- date: not recorded · version: current Docker Engine docs as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Docker Inc. · upstream: none
- lateral: Docker's official documentation site.
- passages:
  - P1 · § "Volumes": "When you create a volume, it's stored within a directory on the Docker host. When you mount the volume into a container, this directory is what's mounted into the container."
  - P2 · § "Volumes": "A given volume can be mounted into multiple containers simultaneously."
  - P3 · § "Use a volume driver": "This example mounts the /remote directory on host 1.2.3.4 into a volume named rclonevolume."
  - P4 · § "Use a volume driver": "The following example shows how you can create an NFS volume when creating a service. It uses 10.0.0.10 as the NFS server and /var/docker-nfs as the exported directory on the NFS server. Note that the volume driver specified is local."

### S-ch1-r1-shm-hosts-07
- url: https://docs.docker.com/engine/storage/bind-mounts/ · canonical: docs.docker.com/engine/storage/bind-mounts/
- title: Bind mounts · authors: not printed · publisher: Docker Inc. (docs.docker.com)
- date: not recorded · version: current Docker docs as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Docker Inc. · upstream: none
- lateral: Docker's official documentation site.
- passages:
  - P1 · § "Bind mounts": "When you use a bind mount, a file or directory on the host machine is mounted from the host into a container. By contrast, when you use a volume, a new directory is created within Docker's storage directory on the host machine. Docker creates and maintains this storage location, but containers access it directly using standard filesystem operations."
  - P2 · § "Bind mounts": "For Docker Desktop, the daemon runs inside a Linux VM, not directly on the native host. Docker Desktop has built-in mechanisms that transparently handle bind mounts, allowing you to share native host filesystem paths with containers running in the virtual machine."

### S-ch1-r1-shm-hosts-08
- url: https://docs.docker.com/desktop/settings-and-maintenance/settings/ · canonical: docs.docker.com/desktop/settings-and-maintenance/settings/
- title: Change your Docker Desktop settings · authors: not printed · publisher: Docker Inc. (docs.docker.com)
- date: not recorded · version: current Docker Desktop docs as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Docker Inc. · upstream: none
- lateral: Docker's official documentation site.
- passages:
  - P1 · § "General": "Choose whether you want to share files using VirtioFS, or gRPC FUSE"
  - P2 · § "File sharing": "Share only the directories that you need with the container. File sharing introduces overhead as any changes to the files on the host need to be notified to the Linux VM."
  - P3 · § "File sharing": "Shared folders are designed to allow application code to be edited on the host while being executed in containers. For non-code items such as cache directories or databases, the performance will be much better if they are stored in the Linux VM, using a data volume (named volume) or data container."
  - P4 · § "File sharing": "Fast and flexible host-to-VM file sharing, enhancing bind mount performance through the use of synchronized filesystem caches."

## Claims

### C-ch1-r1-shm-hosts-01
- claim: On Linux, the mmap(2) manual page says that a mapping created with MAP_SHARED is shared: updates to the mapping are visible to other processes mapping the same region, and for a file-backed mapping the updates are carried through to the underlying file.
- kind: behaviour
- questions: Q-ch1-02 · load-bearing: yes (first link of the same-kernel chain: what MAP_SHARED guarantees between processes of one kernel)
- support: S-ch1-r1-shm-hosts-03/P1 · rung 1 · fit direct · upstream self
- scope: Linux; processes of one kernel mapping the same region; says nothing about containers or VMs
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-02
- claim: On Linux, the fcntl_locking(2) manual page says Linux implements POSIX ("process-associated") record locks, under which any number of processes may hold a read lock on a file region but only one process may hold a write lock, and a request that conflicts with a lock held by another process fails with EACCES or EAGAIN (F_SETLK).
- kind: behaviour
- questions: Q-ch1-02 · load-bearing: yes (second link of the chain: the advisory locks are arbitrated between processes by the kernel)
- support: S-ch1-r1-shm-hosts-04/P1 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-04/P2 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-04/P3 · rung 1 · fit direct · upstream self
- scope: Linux traditional POSIX record locks; says nothing about containers or VMs
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-03
- claim: The ipc_namespaces(7) manual page says Linux IPC namespaces isolate System V IPC objects and POSIX message queues, which are IPC objects identified by mechanisms other than filesystem pathnames.
- kind: definition
- questions: Q-ch1-02 · load-bearing: no (supports the point that a container's own IPC namespace is not listed as isolating file-backed shared mappings; that point is an inference from the list, not stated by the page)
- support: S-ch1-r1-shm-hosts-05/P1 · rung 1 · fit partial (the page lists what is isolated; it does not mention mmap of files) · upstream self
- scope: Linux IPC namespaces
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-04
- claim: Docker's documentation says a Docker volume is stored within a directory on the Docker host, that this directory is what is mounted into a container, and that a given volume can be mounted into multiple containers simultaneously.
- kind: fact
- questions: Q-ch1-02 · load-bearing: yes (two containers with the same named volume open the same host directory)
- support: S-ch1-r1-shm-hosts-06/P1 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-06/P2 · rung 1 · fit direct · upstream self
- scope: Docker Engine volumes with the default local driver (see C-ch1-r1-shm-hosts-06 for drivers)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-05
- claim: Docker's documentation says a bind mount mounts a file or directory on the host machine into a container, and that with either a bind mount or a volume, containers access the storage directly using standard filesystem operations.
- kind: fact
- questions: Q-ch1-02 · load-bearing: yes (a bind mount exposes the host's own file, not a copy)
- support: S-ch1-r1-shm-hosts-07/P1 · rung 1 · fit direct · upstream self
- scope: Docker Engine on a native Linux host (Docker Desktop is the exception in C-ch1-r1-shm-hosts-07)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-06
- claim: Docker's volumes documentation gives examples of named volumes whose data lives on another machine: a volume driver that mounts a /remote directory on host 1.2.3.4, and an NFS volume created with the built-in local driver.
- kind: fact
- questions: Q-ch1-02 · load-bearing: yes (a "named volume" is not by itself evidence of one host; the driver decides where the files live)
- support: S-ch1-r1-shm-hosts-06/P3 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-06/P4 · rung 1 · fit direct · upstream self
- scope: Docker volumes created with volume drivers or local-driver NFS options
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-07
- claim: Docker's documentation says that on Docker Desktop the Docker daemon runs inside a Linux VM rather than directly on the native host, and that Docker Desktop shares native host filesystem paths with containers in that VM through built-in mechanisms for bind mounts.
- kind: fact
- questions: Q-ch1-02 · load-bearing: yes (on Docker Desktop, a bind-mounted file crosses from the native host's OS into a separate Linux VM)
- support: S-ch1-r1-shm-hosts-07/P2 · rung 1 · fit direct · upstream self
- scope: Docker Desktop (macOS, Windows, and Docker Desktop for Linux)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-08
- claim: Docker Desktop's settings documentation says files can be shared with containers using VirtioFS or gRPC FUSE, and that file sharing introduces overhead because changes to files on the host need to be notified to the Linux VM.
- kind: fact
- questions: Q-ch1-02 · load-bearing: no (names the VM file-sharing layers; says nothing about mmap or locks)
- support: S-ch1-r1-shm-hosts-08/P1 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-08/P2 · rung 1 · fit direct · upstream self
- scope: Docker Desktop; the VirtioFS / gRPC FUSE choice is offered with the Apple Virtualization framework VMM (per the page)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-09
- claim: Docker Desktop's documentation recommends that databases be stored in the Linux VM, in a named volume or data container, rather than in shared host folders, and gives performance as the reason.
- kind: fact
- questions: Q-ch1-02 · load-bearing: yes (Docker's own advice keeps a database inside the VM; the stated reason is performance, not correctness)
- support: S-ch1-r1-shm-hosts-08/P3 · rung 1 · fit direct · upstream self
- scope: Docker Desktop; the page's reason is "performance", it says nothing about SQLite, mmap or locking
- confidence: high · flags: vendor-about-itself (attribute to Docker)
- conflicts: none

### C-ch1-r1-shm-hosts-10
- claim: Docker Desktop's documentation describes "Synchronized file shares" as host-to-VM file sharing that uses synchronized filesystem caches.
- kind: fact
- questions: Q-ch1-02 · load-bearing: no (suggests a mode in which host and VM may hold separate copies; the dedicated page was not opened)
- support: S-ch1-r1-shm-hosts-08/P4 · rung 1 · fit partial (one-line description only) · upstream self
- scope: Docker Desktop Pro, Team and Business subscriptions
- confidence: medium · flags: none
- conflicts: none

### C-ch1-r1-shm-hosts-11
- claim: An AI-generated report in Simon Willison's research repository states that it was tested on Docker Desktop for macOS on 2026-04-07 using a Docker named volume shared between containers.
- kind: fact
- questions: Q-ch1-02 · load-bearing: yes (fixes the experiment's scope: a named volume, which per C-ch1-r1-shm-hosts-09 lives inside Docker Desktop's Linux VM, not a bind mount of a macOS folder)
- support: S-ch1-r1-shm-hosts-01/P2 · rung 1 (attributed form only: what the report says it did) · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-01/P1 · rung 1 · fit direct (the report's own statement that it is AI-generated) · upstream self
- scope: one run on Docker Desktop for macOS, named volume, 2026-04-07
- confidence: medium · flags: exceptional (AI-generated, single unreproduced run)
- conflicts: none

### C-ch1-r1-shm-hosts-12
- claim: The AI-generated report in Simon Willison's research repository says that in its 2026-04-07 test a reader container tracked a writer container's inserts in real time, a monitor container that memory-mapped the -shm file saw 48 changes of its hash across 80 ticks, and two writer containers together inserted all 100 rows with zero errors.
- kind: number
- questions: Q-ch1-02 · load-bearing: yes (the only experiment found on containers sharing one WAL database)
- support: S-ch1-r1-shm-hosts-01/P3 · rung 1 (attributed form only) · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-01/P4 · rung 1 (attributed form only) · fit direct · upstream self
- scope: Docker Desktop for macOS, named volume, 50 rows per writer; a short test that cannot show the absence of rare races
- confidence: medium · flags: exceptional (AI-generated report, no independent reproduction)
- conflicts: S-ch1-r1-shm-hosts-02/P2 "I'd be surprised if you could mmap between two Docker containers even on the same host, with the same OS, shared local file store, matching CPU type, etc."

### C-ch1-r1-shm-hosts-13
- claim: The AI-generated report in Simon Willison's research repository explains its result by saying that Docker containers share the same kernel, so memory-mapping the same file on a shared volume produces truly shared memory.
- kind: interpretation
- questions: Q-ch1-02 · load-bearing: no (an explanation in an AI-written report; the chapter should rest on C-ch1-r1-shm-hosts-01/-02/-04/-05 instead)
- support: S-ch1-r1-shm-hosts-01/P5 · rung 3 for the general truth (AI-generated); rung 1 only for "the report says" · fit direct · upstream self
- scope: same-host Docker containers
- confidence: low · flags: exceptional
- conflicts: none

### C-ch1-r1-shm-hosts-14
- claim: In a 2021 SQLite forum thread, a user reported that WAL mode seemed to work with a Linux host and Linux container (the same Linux kernel instance) but that a non-Linux host, where the Linux kernel runs in a VM, always resulted in a corrupt database.
- kind: fact
- questions: Q-ch1-02 · load-bearing: no (anecdote; rung 3; the report does not say whether a bind mount or a volume was used or whether a host-side process also opened the file)
- support: S-ch1-r1-shm-hosts-02/P1 · rung 3 · fit direct · upstream self
- support: S-ch1-r1-shm-hosts-02/P3 · rung 3 · fit partial · upstream self
- scope: one forum user's setup, 2021-09-28, configuration not stated
- confidence: low · flags: exceptional
- conflicts: S-ch1-r1-shm-hosts-01/P2 and P3 (Docker Desktop for macOS, named volume, zero errors) — the scopes differ (see Conflicts)

### C-ch1-r1-shm-hosts-15
- claim: In the same 2021 SQLite forum thread, Warren Young wrote that he would be surprised if mmap could be shared between two Docker containers even on the same host with the same OS and a shared local file store.
- kind: prediction
- questions: Q-ch1-02 · load-bearing: no (an expectation, not a test; rung 3)
- support: S-ch1-r1-shm-hosts-02/P2 · rung 3 · fit direct · upstream self
- scope: forum opinion, 2021-09-28
- confidence: low · flags: speculation ("I'd be surprised")
- conflicts: S-ch1-r1-shm-hosts-01/P3 "SHM monitor observed … 48 hash changes … across 80 ticks"

## Conflicts
- C-ch1-r1-shm-hosts-12 vs C-ch1-r1-shm-hosts-15: S-ch1-r1-shm-hosts-01/P3 reports a monitor container saw the -shm mapping change while other containers wrote; S-ch1-r1-shm-hosts-02/P2 expected mmap not to be shared between two containers on one host. Both quoted above; not settled.
- C-ch1-r1-shm-hosts-14 vs C-ch1-r1-shm-hosts-11/-12: S-ch1-r1-shm-hosts-02/P1 says a non-Linux host "always results in a corrupt DB"; S-ch1-r1-shm-hosts-01/P2-P4 reports zero errors on Docker Desktop for macOS. The scopes probably differ (the 2026 test used a named volume inside the Linux VM per its P2; the 2021 setup is unstated), but neither source says so; not settled.

## Speculation and flags
- S-ch1-r1-shm-hosts-01: AI-generated report ("This is an AI-generated research report"); one run; no independent reproduction found. Its "When It Would NOT Work" list and its rule "mmap works if and only if the processes share the same kernel and filesystem" are unsourced generalisations; not claimed.
- S-ch1-r1-shm-hosts-02/P4: Keith Medcalf's post is polemical ("It is a hopeless abortion for use by little kiddies") and gives no evidence; not claimed.
- Chain warning for the lead: the conclusion "containers on one Linux host count as one host for WAL" is built only from C-ch1-r1-shm-hosts-01, -02, -04, -05 plus C-r1-found-shm-11 (known already); no single source states it. Likewise "a macOS/Windows host process and a Docker Desktop container are not one host" would be built from C-ch1-r1-shm-hosts-07 and C-r1-found-shm-11/-12; no source found states it, and none says what VirtioFS or gRPC FUSE do with MAP_SHARED mappings or fcntl locks.
- C-ch1-r1-shm-hosts-09: Docker's reason for keeping databases in the VM is performance only.

## Unused leads
- https://docs.docker.com/desktop/features/synchronized-file-sharing/ — the Synchronized file shares page; may say whether host and VM keep separate copies (relevant to a host process and a container sharing one file). Not opened (budget).
- https://tangentsoft.com/sqlite/dir/walbanger?ci=trunk — "walbanger", a test tool (by Warren Young's site) for WAL safety across the container boundary, with a Docker Swarm setup; may hold test results.
- https://news.ycombinator.com/item?id=47637353 — the Hacker News thread that prompted the 2026 experiment; rung 3, may point to other tests.
- https://sqlite.org/forum/forumpost/a57302c81bb734f0?raw — the original poster's earlier forum thread ("prev forum posting"), may contain more configuration detail or a developer reply.
- https://virtio-fs.gitlab.io/ — the virtio-fs project's own docs on shared mmap (DAX) and locking across host and guest; would be the rung-1 source for what VirtioFS shares.

## Queries
- "Docker Desktop file sharing virtiofs mmap" → nothing new (pointed to Docker settings page, fetched directly)
- "sqlite forum WAL docker containers same host" → useful (forum thread 292a68c5e4, walbanger)
- direct fetches: the experiment README (upstream of S-r1-found-shm-08), mmap(2), fcntl_locking(2), ipc_namespaces(7), Docker volumes, Docker bind mounts, Docker Desktop settings → useful
