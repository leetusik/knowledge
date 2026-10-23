## Background {#background}

SQLite makes a commit atomic in one of two ways. The default is the **rollback journal**: before it changes a page, SQLite copies the page's original content into a separate journal file, then writes the change straight into the database file, and the commit happens when the journal is deleted ([wal.html](#s-r1-found-rw-01)).

The **write-ahead log (WAL)** is what SQLite's documentation calls the inverse. The original content stays in the database file, and each change is appended to a separate file, the **-wal file** ([wal.html](#s-r1-found-rw-01)). WAL arrived in version 3.7.0, released on 2010-07-21 ([release 3.7.0](#s-r1-found-rw-06)), and the rollback journal is still the default, so a database uses WAL only once you switch it on.

The documentation names what the inversion buys: a write transaction writes its content once instead of twice, all of it sequentially, with many fewer `fsync()` calls than the rollback journal needs ([wal.html](#s-r1-found-rw-01)). The rest of this chapter is about what it costs: where the new pages live, who waits for whom, and what has to happen later to put the pages back.

## Intuition {#intuition}

> [!IMPORTANT] The key idea
> In WAL mode a commit appends pages to the -wal file and leaves the database file alone. Each reader reads the database as it was at one point in the -wal, its own *end mark*, so the writer and the readers work at the same time. Later, a *checkpoint* copies the appended pages back into the database file.

### A commit is an append {#commit-appends}

Take a database of a few pages and one transaction that changes rows stored on pages 2 and 5. In WAL mode nothing in the database file changes. SQLite appends two **frames** to the -wal file, frame 1 holding the new page 2 and frame 2 the new page 5, and makes frame 2 the **commit frame**. Writing that frame is the commit ([fileformat2.html](#s-r1-found-rw-02)).

A second transaction now changes page 2 again and commits with frame 3, a newer copy of page 2. The -wal holds two transactions and two versions of page 2; a single -wal usually records several transactions this way.

A frame is a 24-byte header followed by one page. The header carries the page number and, in a commit frame only, the size of the database in pages after the commit. Every other frame has zero there, which is how SQLite tells a commit frame from the rest ([fileformat2.html](#s-r1-found-rw-02), [walformat.html](#s-r1-found-rw-04)).

Nothing has reached the database file yet. Moving committed transactions from the -wal back into it is a separate operation, the **checkpoint**, and in WAL mode it is the only way committed changes get there ([isolation.html](#s-r1-found-rw-03)).

### Readers keep a snapshot {#snapshots}

Now add a reader. When a read transaction starts, it notes where the last valid commit record in the -wal is: its **end mark**. The end mark stays the same until the transaction ends, so the reader sees the database as it was at one point in time, however many commits follow ([wal.html](#s-r1-found-rw-01)). The file-format specification calls the same number `mxFrame`: the number of valid frames when the read began, which is also the index of the last valid commit frame ([fileformat2.html](#s-r1-found-rw-02), [walformat.html](#s-r1-found-rw-04)).

To read page P, the reader looks in the -wal for the newest frame of P whose index does not exceed its end mark. If there is one, that frame is the page; if not, the reader takes P from the database file ([wal.html](#s-r1-found-rw-01), [walformat.html](#s-r1-found-rw-04)).

Back to the example. Say reader R1 began after the first transaction, so its end mark is frame 2. The second transaction then commits frame 3. When R1 reads page 2 it gets frame 1, the page as it was when R1 began. A reader R2 that starts now has end mark 3 and gets frame 3. Both take page 3 from the database file, since no frame holds it.

SQLite calls this **snapshot isolation**. A write that commits while a read transaction is open stays invisible to it; to see the write, the reader must end its transaction and start a new one ([isolation.html](#s-r1-found-rw-03)).

So it matters when a read transaction starts and ends. A statement run outside an explicit transaction starts its own, which commits when the last statement finishes. A plain `BEGIN` (`DEFERRED`, the default) starts nothing until the database is first touched, and then lasts until `COMMIT`, `ROLLBACK` or a rollback provoked by an error; if its first statement is a `SELECT`, it is a read transaction ([lang_transaction.html](#s-r1-found-rw-05)). Until it ends, a read transaction keeps its snapshot, and the sections on checkpoints show what that holds up.

```diagram #flow-commit-read
kind: flow
title: A commit appends frames to the -wal; a reader reads as of its end mark
direction: down
groups:
  - id: write-side
    label: Write transaction
    nodes: [w-change, w-frames, w-commit]
  - id: read-side
    label: Read transaction
    nodes: [r-start, r-need, r-find, r-wal, r-db]
nodes:
  - id: w-change
    label: Change pages
    sub: inside the write transaction
  - id: w-frames
    label: Append a frame per changed page
    sub: the database file is not written
  - id: w-commit
    label: The last frame is the commit frame
    sub: its header holds the database size; the commit is done
  - id: r-start
    label: Start the read transaction
    sub: record the end mark (mxFrame)
  - id: r-need
    label: Need page P
  - id: r-find
    label: Newest frame of P at or below the end mark?
  - id: r-wal
    label: Read P from that frame
    shape: store
    tone: store
  - id: r-db
    label: Read P from the database file
    shape: store
    tone: store
edges:
  - {from: w-change, to: w-frames}
  - {from: w-frames, to: w-commit}
  - {from: r-start, to: r-need}
  - {from: r-need, to: r-find}
  - {from: r-find, to: r-wal, label: found}
  - {from: r-find, to: r-db, label: none, style: dashed}
caption: "The steps in the order the WAL overview (wal.html §2) and the file-format specification (fileformat2.html §4.4–§4.6) give them. The writer never touches the database file; the reader never looks past its own end mark."
```

### One writer at a time {#one-writer}

**In standard SQLite, readers and the one writer run at the same time.** A writer only appends to the end of the -wal, so it does nothing that gets in a reader's way. But there is only one -wal file, so there can be only one writer at a time. The documentation counts this among WAL's advantages: readers do not block writers, and a writer does not block readers ([wal.html](#s-r1-found-rw-01)).

A lock enforces the single writer. Any connection appending to the -wal holds the **WAL write lock** exclusively, so only one process at a time can append ([walformat.html](#s-r1-found-rw-04)). Many connections may still write to the same database; they take turns, with one write transaction active at a time beside any number of read transactions ([isolation.html](#s-r1-found-rw-03)).

Snapshots cost the writer one thing. A read transaction whose snapshot is no longer the latest cannot turn into a write transaction, because letting it write would fork the database's history, which SQLite does not support. The attempt fails with an error that [chapter 2](chapter:sqlite-wal/running-wal) names and shows how to avoid ([isolation.html](#s-r1-found-rw-03)).

## The -wal file, crash recovery and the files on disk {#wal-file}

Committed transactions live in the -wal until a checkpoint copies them, so the -wal is part of the database's persistent state ([wal.html](#s-r1-found-rw-01)). This section shows how SQLite tells a complete commit from a torn one after a crash, and ends with the three files you will see on disk.

**Every frame carries a checksum computed over everything up to it, which is how SQLite finds where the last complete commit ends.** The -wal starts with a 32-byte header that holds, among other fields, the page size and two random numbers, salt-1 and salt-2. Each frame header repeats the two salts and holds a two-part checksum, cumulative up to and including that frame ([fileformat2.html](#s-r1-found-rw-02)).

The specification makes the rule exact. A frame is valid only if its salts match the header's, and its checksum matches one computed in order over the header's first 24 bytes, then the first 8 bytes of the frame header and the page content of every frame up to and including this one. Even a valid frame counts only if it is a commit frame or a commit frame follows it; otherwise a reader takes the page from the database file ([fileformat2.html](#s-r1-found-rw-02)).

**Recovery** puts the rule to work. The first connection to open a WAL database makes one pass over the -wal from the start, checks each frame's checksum, stops at the end of the file or at the first frame that fails, and sets `mxFrame` to the last valid commit frame ([walformat.html](#s-r1-found-rw-04)). The frames of a commit that a crash cut short are left out.

```diagram #fig-torn-commit
kind: flow
title: Recovery keeps the -wal up to the last valid commit frame
direction: right
nodes:
  - id: hdr
    label: WAL header
    sub: salts and a checksum
    shape: store
    tone: store
  - id: f1
    label: Frame 1
    sub: page 2
    tone: ok
  - id: f2
    label: Frame 2
    sub: "page 5, commit frame"
    tone: ok
  - id: f3
    label: Frame 3
    sub: page 2
    tone: muted
  - id: f4
    label: Frame 4
    sub: "page 7, commit frame; checksum fails"
    tone: bad
edges:
  - {from: hdr, to: f1, label: checksum carried on}
  - {from: f1, to: f2, label: checksum carried on}
  - {from: f2, to: f3, label: checksum carried on}
  - {from: f3, to: f4, label: torn by the crash, style: dashed, tone: bad}
caption: "A crash tore the second transaction (frames 3 and 4). Recovery checks the checksums in order, stops at frame 4, and sets `mxFrame` to frame 2, the last valid commit frame. Frame 3 is not followed by a valid commit frame, so no reader uses it either."
```

The salts have one more job. When the -wal is reused from its start (a WAL reset, covered under checkpoints), salt-1 is incremented and salt-2 is randomized, which invalidates the old frames still in the file that were already copied to the database ([fileformat2.html](#s-r1-found-rw-02)).

> [!NOTE]- The -wal header, field by field
> Eight big-endian 32-bit numbers: a magic number (0x377f0682 or 0x377f0683), the file format version (currently 3007000), the database page size, a checkpoint sequence number, salt-1, salt-2, and a two-part checksum over the header's first 24 bytes ([fileformat2.html](#s-r1-found-rw-02)).

### The three files on disk {#three-files}

While a WAL database is in use you will usually find three files: the database, the -wal and the -shm, the wal-index file that the next section explains, along with the one locking mode that does without it. The -wal exists for as long as any connection has the database open ([walformat.html](#s-r1-found-rw-04)).

When the last connection closes cleanly, it runs one last checkpoint, which moves everything in the -wal into the database, and then deletes the -wal and the -shm, so an idle database is usually a single file. If the last process exits without closing its connection, as a crash does, or the last to close is read-only, that cleanup does not happen and both files stay on disk ([walformat.html](#s-r1-found-rw-04)).

| File | What it holds | On disk | After a crash | Does recovery need it? |
|---|---|---|---|---|
| Database file | The pages as of the last checkpoint; commits reach it only through checkpoints | Always | Lacks the commits not yet checkpointed, which are only in the -wal | It is the database |
| -wal | Frames of committed transactions not yet copied into the database file; part of the database's persistent state | While any connection has the database open; deleted by a clean last close | Left on disk | **Yes.** Recovery reads it, and moving or deleting it after a crash breaks recovery and may corrupt the database |
| -shm | The wal-index; no database content | While the database is in use, except in EXCLUSIVE locking mode (next section); deleted by a clean last close | Left on disk; the first connection to the idle database normally truncates it | No: the wal-index is rebuilt from the -wal. But never delete it while the database is open (below) |

> [!WARNING] "Not needed for recovery" does not mean "safe to delete"
> The documentation explains how SQLite keeps these files from being deleted out from under other connections: every WAL connection holds a shared lock on the database file for as long as it is attached, and while any connection holds it, no other can take the exclusive lock that deleting the -wal and -shm requires; only the last connection can, as it closes ([walformat.html](#s-r1-found-rw-04)). A comment in SQLite's source adds that if another process unlinked the -wal or -shm just after a client opened it, "the system would be badly broken" ([wal.c, 3.54.1](#s-r2-found-ckpt-01)). For the -wal, the documentation names the only safe way to remove it: open the database and close it again ([wal.html](#s-r1-found-rw-01)).

## The wal-index and the one-host rule {#wal-index}

**Readers find pages through the wal-index, and the wal-index is memory every process shares, which is why WAL needs them all on one host.** Scanning the whole -wal for every page would be slow, so SQLite keeps a **wal-index** in shared memory to help readers find pages in the -wal quickly ([wal.html](#s-r1-found-rw-01)). It answers the reader's question from the example: given page P and an end mark M, what is the largest frame index for P that does not exceed M, if there is one ([walformat.html](#s-r1-found-rw-04))?

On Unix and Windows the wal-index is the **-shm** file. Each connection memory-maps it and uses it as shared memory, both to coordinate access to the database and as a cache for finding frames; it is never used as an ordinary file. It is usually exactly 32,768 bytes, and grows only when the -wal holds more than 4,079 frames ([walformat.html](#s-r1-found-rw-04)).

Its header is where readers and checkpoints meet. It records the number of valid committed frames in the -wal (`mxFrame`), how many of them checkpoints have already copied into the database (`nBackfill`), five **read marks**, and space set aside for locks. A reader holds a shared lock on one read mark for its whole transaction: a promise to read from the -wal any page changed within the first read-mark frames. A checkpoint that sees the lock must not copy more than those frames into the database ([walformat.html](#s-r1-found-rw-04)).

The -shm sits in the database's own directory for a reason the developers give: mapping a file there is the only way they found to guarantee that every process opening the database uses the same shared memory ([wal.html](#s-r1-found-rw-01)).

> [!NOTE]- Why not /dev/shm?
> Early pre-release versions kept the wal-index in volatile shared memory, in /dev/shm or /tmp. Processes with a different root directory (set with chroot) then saw different files and used different shared memory, which led to database corruption ([wal.html](#s-r1-found-rw-01)). A comment in SQLite's Unix source makes the same point for any two processes on one database that end up with different shared-memory files, through differing permissions or a chroot: their memory is not really shared, which might cause corruption ([os_unix.c](#s-r1-found-shm-11)).

**All processes using a WAL database must be on the same host computer, and WAL does not work over a network filesystem.** The documentation's reason is the wal-index: WAL needs every process to share a small amount of memory, and processes on separate machines cannot ([wal.html](#s-r1-found-rw-01)). The file-format specification says the same of a network filesystem with clients on different machines ([fileformat2.html](#s-r1-found-rw-02)). Network filesystems add a second risk: some, NFS in particular, have bugs in their locking, and two processes using one database on such a filesystem at once might corrupt it ([howtocorrupt.html](#s-r1-found-shm-06)).

The documentation stops at the rule and its reason. It does not walk through what fails, or how, if processes on two hosts share a WAL database anyway.

There is one way to run WAL without shared memory. Since version 3.7.4 (2010-12-07), a connection that sets **EXCLUSIVE locking mode** before its first access can create, read and write a WAL database with no shared memory, provided it is the only process using the database ([wal.html](#s-r1-found-rw-01)). SQLite then creates no -shm file and keeps the wal-index in ordinary heap memory ([walformat.html](#s-r1-found-rw-04)).

The price is steep. The connection never releases its file locks; while it has the database open, every query from any other connection gets a busy error; and it stays in EXCLUSIVE mode until the database leaves WAL mode ([pragma.html](#s-r1-found-ckpt-03), [wal.html](#s-r1-found-rw-01)).

## Checkpoints {#checkpoints}

**You rarely start a checkpoint yourself: by default SQLite runs one whenever a COMMIT leaves the -wal at 1,000 pages or more, and when the last connection to the database closes** ([wal.html](#s-r1-found-rw-01)). That threshold is the **auto-checkpoint**. A compile-time option can change its default, and a setting that [chapter 2](chapter:sqlite-wal/running-wal) shows can change it or turn it off ([pragma.html](#s-r1-found-ckpt-03)).

How big is 1,000 pages? With a 4,096-byte page, the default for new databases since version 3.12.0 ([pragma.html](#s-r1-found-ckpt-03)), the documentation puts it at "about 4MB". Every automatic checkpoint is PASSIVE, the mode that never waits for anyone, described below ([wal.html](#s-r1-found-rw-01)).

The checkpoint runs inside the statement that committed: in SQLite 3.54.1, that statement's own call runs a PASSIVE checkpoint before it returns, once the frame count has reached the threshold ([vdbeapi.c, 3.54.1](#s-ch1-r1-found-ckpt-03), [main.c, 3.54.1](#s-ch1-r1-found-ckpt-02)). So most COMMITs are very fast, and the occasional one that triggers a checkpoint is much slower. And once the -wal has reached about 1,000 pages, a checkpoint runs on every later COMMIT until the -wal is reset ([wal.html](#s-r1-found-rw-01)).

### What a checkpoint does, step by step {#checkpoint-steps}

Here is one automatic checkpoint, followed by the next write, in the order SQLite 3.54.1's checkpoint code (`walCheckpoint` in `src/wal.c`) runs them.

```diagram #seq-checkpoint
kind: sequence
title: An automatic checkpoint and the next write, in the order the SQLite 3.54.1 code runs them
actors:
  - {id: conn, label: Committing connection}
  - {id: shm, label: "wal-index (-shm)"}
  - {id: wal, label: "-wal file"}
  - {id: db, label: Database file}
  - {id: next, label: Next writer}
steps:
  - from: conn
    to: wal
    label: "COMMIT appends its frames; the -wal is now at 1,000 pages or more"
  - from: conn
    to: shm
    label: "Same call starts a PASSIVE checkpoint: read the read marks, limit = the oldest reader's end mark"
  - from: conn
    to: wal
    label: Sync the -wal file
  - from: conn
    to: db
    label: "Copy pages in ascending page order, each from the frame that last wrote it, skipping frames past the limit"
  - from: conn
    to: db
    label: "Only if every frame was copied: truncate the database file to its size, then sync it"
    note: A checkpoint held back by a reader skips this step
  - from: conn
    to: shm
    label: Record progress (nBackfill = the limit)
    note: A later checkpoint resumes from here; PASSIVE never resets or truncates the -wal
  - from: next
    to: shm
    label: "Before appending: is every frame copied, with no reader using the -wal?"
  - from: next
    to: wal
    label: "If so: new salts, frame count back to 0, write from the start of the same file. If not: append"
caption: "The order is the code's, and it matches the documentation's (sync the -wal, copy, sync the database file). Progress is recorded after the database sync, not before it, and a partial checkpoint skips that sync."
```

**A checkpoint copies only what no reader still needs.** Before copying, it reads the read marks and lowers its limit to the end mark of the oldest reader still using the -wal, because frames past that point might overwrite database pages that reader is still using ([wal.c, 3.54.1](#s-r2-found-ckpt-01)). The documentation describes the same stop, and adds that the checkpoint remembers in the wal-index how far it got and resumes from there on its next run ([wal.html](#s-r1-found-rw-01)).

It then syncs the -wal, so that everything it is about to copy could be recovered after a power loss, and copies pages into the database file in ascending page order, each from the frame that last wrote it, skipping any frame past the limit. Only if it copied every frame does it truncate the database file to its committed size and sync it; a checkpoint held back by a reader does neither. Last, if the copy went through, it records how far it got as `nBackfill` ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).

> [!NOTE]- Why the database sync waits for a complete copy
> The file-format specification gives the order as sync the -wal, copy the valid content, then sync the database file ([fileformat2.html](#s-r1-found-rw-02)), and the API reference says a PASSIVE checkpoint syncs the database file if it checkpointed every frame ([wal_checkpoint_v2](#s-r1-found-ckpt-02)). A comment in the 3.54.1 code says the same: the database file is synced "if (and only if) the entire WAL content is copied into the database file" ([wal.c, 3.54.1](#s-r2-found-ckpt-01)). The documentation also notes that although pages go to the database in ascending order, a checkpoint still does many seeks, and with the syncs that makes checkpoints slower than write transactions ([wal.html](#s-r1-found-rw-01)).

**A PASSIVE checkpoint never shrinks or resets the -wal; the next writer resets it.** Just before a write appends its frames, SQLite checks whether every frame has been copied and no reader is reading from the -wal. If so, and if it can confirm that at once without waiting, it starts the -wal over: new salts, the frame count back to zero, and the next frames written from the start of the same file. If not, the write simply appends ([wal.c, 3.54.1](#s-r2-found-ckpt-01)). Readers that read only the database file do not stand in the way ([walformat.html](#s-r1-found-rw-04)). This is the **WAL reset**. The TRUNCATE mode, below, is the one exception: it resets the -wal itself.

### What stops a checkpoint {#what-stops}

**The usual reason a checkpoint stops short is a reader on an old snapshot.** A checkpoint runs to completion only if every reader is using the last transaction in the -wal, so a long-running read transaction on an older snapshot keeps it from making progress ([fileformat2.html](#s-r1-found-rw-02)). The documentation describes the result as **checkpoint starvation**: while another connection has a read transaction open, a checkpoint does what it can but cannot complete or reset the -wal, and it starts again where it left off after the next write ([wal.html](#s-r1-found-rw-01)).

The same page warns that if readers overlap so that one is always active, no checkpoint can complete and the -wal grows without bound. The remedies it suggests are for chapter 2, and one of them is disputed (see the modes below).

What stops a checkpoint:

- **A reader on an old snapshot.** The checkpoint copies only up to that reader's end mark, and the -wal cannot be reset while the reader uses it. In an application this is a read transaction that has not ended: a `BEGIN` that has read and not yet committed, or a statement that has not finished ([lang_transaction.html](#s-r1-found-rw-05)). [Chapter 2](chapter:sqlite-wal/running-wal) shows where these hide in Python and Go code.
- **A write transaction in progress.** The -wal cannot be reset in the middle of a write transaction, so one large change to a large database can leave a very large -wal ([wal.html](#s-r1-found-rw-01)). A PASSIVE checkpoint may stop short while writers are active, and the stronger modes must first wait for the writer lock ([wal_checkpoint_v2](#s-r1-found-ckpt-02)).
- **Another checkpointer.** Every checkpoint takes an exclusive checkpoint lock. While another process holds it, a second checkpoint call returns a busy error at once, without waiting ([wal_checkpoint_v2](#s-r1-found-ckpt-02)).

**Why the -wal does not shrink.** A checkpoint does not normally truncate the -wal file (unless a size limit is set, which chapter 2 covers). Instead SQLite starts overwriting it from the beginning after a reset, because overwriting an existing file is normally faster than growing one ([wal.html](#s-r1-found-rw-01)). So a -wal that grew during a burst of writes, or while a reader held the checkpoints back, keeps its size on disk after every frame has been copied. Of the modes below, only TRUNCATE cuts it to zero bytes ([wal_checkpoint_v2](#s-r1-found-ckpt-02)).

### The checkpoint modes {#checkpoint-modes}

Automatic checkpoints are always PASSIVE; an application can ask for a stronger mode, with the call chapter 2 shows. The modes differ in what they wait for:

- **PASSIVE** copies as many frames as it can without waiting for any reader or writer, and syncs the database file if it copied them all; with readers or writers active it may stop short ([wal_checkpoint_v2](#s-r1-found-ckpt-02)). In the 3.54.1 code it takes the checkpoint lock but not the writer lock ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).
- **FULL** takes the writer lock ([wal_checkpoint_v2](#s-r1-found-ckpt-02)) and waits for every reader whose end mark is below the end of the -wal; once none is left, it copies every frame and syncs the database file ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).
- **RESTART** does what FULL does, then, still holding the writer lock, waits until no reader is using the -wal at all, so that the next writer can reset it ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).
- **TRUNCATE** does what RESTART does, then truncates the -wal to zero bytes just before it returns ([wal_checkpoint_v2](#s-r1-found-ckpt-02)); in the 3.54.1 code it resets the -wal itself rather than leaving that to the next writer ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).
- **NOOP**, added in version 3.51.0 ([changes.html](#s-r1-found-ckpt-07)), copies nothing; it exists to report the -wal's frame counts ([wal_checkpoint_v2](#s-r1-found-ckpt-02)).

If a FULL, RESTART or TRUNCATE checkpoint gives up waiting, it carries on like PASSIVE, copying what it can without blocking further, and reports that it was busy ([wal_checkpoint_v2](#s-r1-found-ckpt-02)). How long it keeps waiting is the connection's choice, which chapter 2 covers.

**Whether new readers wait while a RESTART or TRUNCATE checkpoint waits is disputed between SQLite's own pages, so treat it as an open question.** The API reference says RESTART "does not impede readers", the pragma page says it "allows readers to proceed", and the 3.54.1 header source repeats the API reference's words ([wal_checkpoint_v2](#s-r1-found-ckpt-02), [pragma.html](#s-r1-found-ckpt-03), [sqlite.h.in, 3.54.1](#s-r2-found-ckpt-06)). The WAL overview page alone says that with RESTART and TRUNCATE "readers might block while the checkpoint is running" ([wal.html](#s-r1-found-rw-01)).

Three of the project's sources take one side and one page takes the other. A reading of the 3.54.1 code as a whole, made for this book and not a statement by the project, finds a new reader going ahead without waiting for the checkpoint, by taking a read mark or by reading the database file directly, apart from brief internal retries ([wal.c, 3.54.1](#s-r2-found-ckpt-01)). What would settle it is a statement from the developers on the overview page's sentence, or a test that starts a new reader while such a checkpoint is waiting.

> [!NOTE]- The disagreement in detail
> - The overview page's sentence was already there in a 2016 capture of the page ([wal.html, 2016-10-09 capture](#s-r2-found-ckpt-05)).
> - In 3.54.1, any checkpoint holds read slot 0 exclusively while it copies frames. A new reader that cannot take slot 0 does not wait: it takes a read mark and reads recent pages from the -wal. It retries at once, rather than waiting on the checkpoint, when it finds no usable read mark and every slot it tries is busy, and in some transient cases ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).
> - After five such retries a reader sleeps between attempts, and a comment in the code puts the total delay before it gives up at under 10 seconds.
> - In builds compiled with `SQLITE_ENABLE_SETLK_TIMEOUT`, a checkpoint given a way to wait uses blocking locks where it can. This book did not trace that path.

## Who waits for whom {#who-waits}

**Put the locks together and you can predict who waits for whom.** In the table, "waits for" means the operation cannot go on until the other is done. Where a connection gets a busy error, SQLite refuses the operation instead of making it wait; [chapter 2](chapter:sqlite-wal/running-wal) is about handling those errors.

| Who | Waits for | Blocks |
|---|---|---|
| A reader | Not the writer, and not a checkpoint's copy: it takes a read mark and reads its snapshot | A checkpoint from copying past its end mark; the WAL reset; FULL, RESTART and TRUNCATE checkpoints, which wait for it |
| The writer | Another writer (one WAL write lock); a FULL, RESTART or TRUNCATE checkpoint holding the writer lock | Other writers. Not readers |
| PASSIVE checkpoint | Nobody: it copies what it can and stops | No writer (it takes no writer lock) and no new reader (a reader takes a read mark instead) |
| FULL checkpoint | The writer lock, then every reader on an older snapshot | New writers, while it holds the writer lock. New readers are not blocked, say the API reference and the pragma page |
| RESTART checkpoint | As FULL, then every reader still using the -wal | New writers, for its whole wait. New readers: **disputed** between SQLite's own pages ([see the modes](#checkpoint-modes)) |
| TRUNCATE checkpoint | As RESTART | As RESTART, new readers **disputed** ([see the modes](#checkpoint-modes)); then it cuts the -wal to zero bytes |
| Recovery | — (the first connection to open the database runs it) | All writing, and all reading of transactions in the -wal, until it ends; a query meanwhile gets a busy error |
| A connection in EXCLUSIVE locking mode | — | Every other connection: each of their queries gets a busy error |
| The last connection, closing | — | Briefly, a connection that opens and queries meanwhile may get a busy error |

Every checkpoint also holds the checkpoint lock, so a second checkpoint started meanwhile gets a busy error at once ([wal_checkpoint_v2](#s-r1-found-ckpt-02)). The rows rest on the WAL pages, the checkpoint API reference and the 3.54.1 source cited in the sections above ([walformat.html](#s-r1-found-rw-04), [wal.html](#s-r1-found-rw-01)).

## Limits: before you turn WAL on {#limits}

**Most of WAL's limits follow from the design above.** One -wal file means one writer at a time. A transaction that changes several ATTACHed databases is atomic for each database, but not across them as a set. And the page size is fixed once a database is in WAL mode: it cannot change on an empty database, by VACUUM, or by restoring through the backup API ([wal.html](#s-r1-found-rw-01)).

The documentation also lists, as disadvantages, the two extra files, which can make SQLite less appealing as an application file format, and checkpointing, an extra operation that developers still need to be mindful of even though it is automatic. It says read performance deteriorates as the -wal grows, because the time a reader needs to check the -wal is proportional to its size, which the wal-index reduces but does not remove. And it estimates that WAL may be about 1% or 2% slower than the rollback journal for applications that mostly read and seldom write ([wal.html](#s-r1-found-rw-01)).

One old warning no longer applies. The current WAL page strikes through its old cautions about very large transactions: since version 3.11.0 (2016-02-15), it says, WAL works as efficiently with large transactions as rollback mode ([wal.html](#s-r1-found-rw-01)).

Two conditions concern where the files live. A process that can only read the database needs the -shm and -wal to exist already, or a writable directory to create them, or the `immutable` option: that has worked since 3.22.0 (2018-01-22), and before it, reading a WAL database needed write access. For read-only media, the documentation calls it good practice to switch the database back to the rollback journal first ([wal.html](#s-r1-found-rw-01)).

Containers need care, because SQLite's documentation does not mention them. Docker's documentation says a named volume is a directory on the Docker host that several containers can mount at once, and that a bind mount mounts a file or directory from the host into a container ([Docker: volumes](#s-ch1-r1-shm-hosts-06), [Docker: bind mounts](#s-ch1-r1-shm-hosts-07)). It also shows named volumes whose files live on another machine, one through a volume driver and one over NFS, so a shared volume is not by itself one host ([Docker: volumes](#s-ch1-r1-shm-hosts-06)).

On Docker Desktop, the Docker daemon and its containers run inside a Linux VM, not directly on the native host, and the host's folders reach them through Docker Desktop's file sharing ([Docker: bind mounts](#s-ch1-r1-shm-hosts-07)). No source we found says whether containers sharing a volume, or a process on the host side of that file sharing and one in a container, count as one host for WAL. Treat that as an open question rather than a yes.

**Before you turn WAL on**

- **One host.** Every process that opens the database runs on the same host computer, and the database is not on a network filesystem such as NFS.
- **Containers checked.** If processes in more than one container open the database, you know where the volume's files live, and you are not counting on Docker Desktop's host file sharing being one host (see above).
- **Room for the -wal and -shm.** SQLite can create both files in the database's directory; a read-only process on 3.22.0 or later instead needs both to exist already, or the database opened as immutable.
- **Not headed for read-only media**, or switched back to the rollback journal before it goes there.
- **No atomic commits across ATTACHed databases needed.**
- **The page size is final.**
- **One writer at a time is enough.**

## Best practices & next steps {#best-practices}

**What the defaults already do.** Out of the box SQLite checkpoints for you: a PASSIVE checkpoint whenever a COMMIT leaves the -wal at 1,000 pages or more, and a last one when the last connection closes. The same documentation still lists checkpointing as an operation developers need to be mindful of ([wal.html](#s-r1-found-rw-01)).

**Where you have to act.** The documentation's own advice covers the points this chapter has shown to matter:

- Keep the -wal with the database: it is part of the database's persistent state and should go with it whenever the database is copied or moved ([wal.html](#s-r1-found-rw-01)).
- Remove a -wal only by opening the database and closing it again, which the documentation calls the only safe way ([wal.html](#s-r1-found-rw-01)); and leave the -shm alone while the database is open, as SQLite's source warns ([wal.c, 3.54.1](#s-r2-found-ckpt-01)).
- Give checkpoints room: the WAL page's remedy for checkpoint starvation is "reader gaps", times when no process is reading from the database, with checkpoints attempted during them ([wal.html](#s-r1-found-rw-01)).
- Keep every process on one host, as the documentation requires ([wal.html](#s-r1-found-rw-01)).

**Next steps.** [Chapter 2](chapter:sqlite-wal/running-wal) turns this mechanism into operations:

1. turn WAL on and choose how durable each commit is;
2. find and handle the busy errors from the table above;
3. control checkpoints and stop a -wal that keeps growing;
4. back the database up and handle its three files safely.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-open-read
    type: choice
    prompt: "A worker runs `BEGIN`, reads a few rows, then waits ten minutes on a slow network call before it commits. Other workers keep writing meanwhile. What happens to checkpoints and the -wal file during those ten minutes?"
    options:
      - id: a
        text: "Nothing changes: checkpoints copy every frame as usual, because a reader does not block a writer."
      - id: b
        text: "Checkpoints stop at the slow worker's end mark and cannot reset the -wal, so the other workers' commits keep being appended and the file grows."
      - id: c
        text: "The other workers wait for the slow worker to commit, so the -wal stops growing."
      - id: d
        text: "SQLite ends the slow worker's transaction once the -wal reaches 1,000 pages."
    answer: [b]
    explain: "The worker's read transaction fixed its end mark when it first read, and keeps it until it commits. A checkpoint must stop at any current reader's end mark, and the -wal cannot be reset while that reader still uses it. Writers do not wait for readers, so their commits keep being appended to the -wal, which grows: checkpoint starvation in miniature."
  - id: q-snapshot
    type: choice
    prompt: "Connection A runs `BEGIN` and `SELECT count(*) FROM orders` and gets 100. Connection B then inserts an order and commits. A runs the same SELECT again, still inside its transaction. What does A see, and how can it see B's order?"
    options:
      - id: a
        text: "101, because B's commit is in the -wal and readers check the -wal first."
      - id: b
        text: "100. A must end its transaction and start a new one, which records a new end mark."
      - id: c
        text: "An error, because A's snapshot is no longer the latest."
      - id: d
        text: "100 until the next checkpoint copies B's frames into the database file, then 101."
    answer: [b]
    explain: "A recorded its end mark when its read transaction started and keeps it until the transaction ends, so B's frames, appended after that mark, are invisible to it: snapshot isolation. A checkpoint never copies past a current reader's end mark, so it cannot change what A sees either. Only a new read transaction, with a new end mark, sees B's commit. A stale snapshot causes an error when A tries to write, not when it reads."
  - id: q-one-writer
    type: recall
    prompt: "Why can readers keep reading while the writer commits, when two writers can never append to the -wal at the same moment?"
    answer: "A writer only appends frames to the end of the -wal and never writes the database file, so readers keep reading as of their own end marks. But there is only one -wal to append to, and appending requires holding the WAL write lock exclusively, so writers take turns: one write transaction at a time."
    explain: "Readers and the writer are separated by the end mark, writers by the single -wal and its write lock."
  - id: q-network
    type: choice
    prompt: "Two app servers mount the same database file over NFS, and each opens it in WAL mode. Why does SQLite's documentation say this does not work?"
    options:
      - id: a
        text: "NFS is too slow for the -wal's sequential writes."
      - id: b
        text: "WAL needs every process to share the wal-index in memory, and processes on separate machines cannot share memory."
      - id: c
        text: "Only one process at a time may open a WAL database."
      - id: d
        text: "The -wal file cannot be created on a network filesystem."
    answer: [b]
    explain: "Readers find pages through the wal-index, which every process maps as shared memory from the -shm file; the developers put it in a file beside the database precisely so that all processes would share the same memory. Processes on separate hosts cannot share memory, so the documentation says all processes must be on one host. Many processes on one host can open the same WAL database."
  - id: q-crash-files
    type: cloze
    text: "After a crash you find the database file with its -wal and -shm still beside it. The file that must never be deleted or separated from the database is the {{-wal|wal|-wal file}}; the file whose content SQLite rebuilds is the {{-shm|shm|-shm file}}."
    explain: "The -wal holds committed transactions not yet copied into the database, and recovery reads it: moving or deleting it after a crash breaks recovery and may corrupt the database. The -shm holds no database content and is rebuilt from the -wal. Even so, never delete the -shm while any connection has the database open."
```

## Sources {#sources-list}

```sources #sources
items:
  - id: s-r1-found-rw-01
    title: Write-Ahead Logging
    url: https://www.sqlite.org/wal.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-rw-02
    title: Database File Format
    url: https://www.sqlite.org/fileformat2.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-rw-03
    title: Isolation In SQLite
    url: https://www.sqlite.org/isolation.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-rw-04
    title: WAL-mode File Format
    url: https://www.sqlite.org/walformat.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-rw-05
    title: Transaction
    url: https://www.sqlite.org/lang_transaction.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-rw-06
    title: SQLite Release 3.7.0 On 2010-07-21
    url: https://www.sqlite.org/releaselog/3_7_0.html
    publisher: SQLite
    date: "2010-07-21"
    accessed: "2026-10-23"
  - id: s-r1-found-ckpt-02
    title: Checkpoint a database (SQLite C Interface)
    url: https://sqlite.org/c3ref/wal_checkpoint_v2.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-ckpt-03
    title: Pragma statements supported by SQLite
    url: https://sqlite.org/pragma.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-ckpt-07
    title: Release History Of SQLite
    url: https://sqlite.org/changes.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-shm-06
    title: How To Corrupt An SQLite Database File
    url: https://www.sqlite.org/howtocorrupt.html
    publisher: SQLite
    accessed: "2026-10-23"
  - id: s-r1-found-shm-11
    title: src/os_unix.c (SQLite source, master)
    url: https://github.com/sqlite/sqlite/blob/master/src/os_unix.c
    publisher: SQLite project
    accessed: "2026-10-23"
    note: Read at the master branch on 2026-10-23, unpinned.
  - id: s-r2-found-ckpt-01
    title: src/wal.c (SQLite source, release 3.54.1)
    url: https://github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c
    publisher: SQLite project
    accessed: "2026-10-23"
    note: Tag version-3.54.1, commit 57520227c953.
  - id: s-r2-found-ckpt-05
    title: Write-Ahead Logging (Internet Archive capture, 2016-10-09)
    url: https://web.archive.org/web/20161009044054/http://www.sqlite.org:80/wal.html
    publisher: SQLite
    date: "2016-10-09"
    accessed: "2026-10-23"
  - id: s-r2-found-ckpt-06
    title: src/sqlite.h.in (SQLite source, release 3.54.1)
    url: https://github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/sqlite.h.in
    publisher: SQLite project
    accessed: "2026-10-23"
    note: Tag version-3.54.1, commit 57520227c953.
  - id: s-ch1-r1-found-ckpt-02
    title: src/main.c (SQLite source, release 3.54.1)
    url: https://github.com/sqlite/sqlite/blob/version-3.54.1/src/main.c
    publisher: SQLite project
    accessed: "2026-10-23"
    note: Tag version-3.54.1, commit 57520227c953.
  - id: s-ch1-r1-found-ckpt-03
    title: src/vdbeapi.c (SQLite source, release 3.54.1)
    url: https://github.com/sqlite/sqlite/blob/version-3.54.1/src/vdbeapi.c
    publisher: SQLite project
    accessed: "2026-10-23"
    note: Tag version-3.54.1, commit 57520227c953.
  - id: s-ch1-r1-shm-hosts-06
    title: Volumes
    url: https://docs.docker.com/engine/storage/volumes/
    publisher: Docker
    accessed: "2026-10-23"
  - id: s-ch1-r1-shm-hosts-07
    title: Bind mounts
    url: https://docs.docker.com/engine/storage/bind-mounts/
    publisher: Docker
    accessed: "2026-10-23"
```
