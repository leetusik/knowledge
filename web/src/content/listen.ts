// P41-sr.W1 — Listen's own words, word for word from the signed `11-listen` round
// `01-listen` (`frame.md` F1, F2, F6, F7, F9 and F10; the `Listen`, `Dock` and `ListenNote`
// boards). English only, like the reader's chrome. The sentences that carry a value are
// functions, so the dock, the note and the head build them from one source. The canvas's
// typographic apostrophe (’) is kept as drawn.

/** The voice runner as the operator knows it (F1): a prop, never a host or account name. */
const RUNNER = "the Mac";

export const LISTEN = {
  runner: RUNNER,
  /** The Listen control (F6): the head's button, its busy label and the slot pill. */
  control: {
    listen: "Listen",
    starting: "Starting…",
    continue: "Continue listening",
    startOver: "Start over",
    /** The pill's qualifier: "▶ Listen · 42 min", "▶ Continue listening · 18:05". */
    pillQ: (q: string): string => `· ${q}`,
    /** Left part-way: "18:05 of 42:10". */
    resumeQ: (pos: string, len: string): string => `${pos} of ${len}`,
  },
  /** The dock (F7): its region, its controls' accessible names and its short forms (F10). */
  dock: {
    region: "Listen",
    play: "Play",
    pause: "Pause",
    startOver: "Start over",
    tryAgain: "Try again",
    open: "Open the player",
    signIn: "Sign in",
    where: (pos: string, len: string, soFar: boolean): string =>
      `${pos} of ${len}${soFar ? " so far" : ""}`,
    whereBook: (n: number, pos: string): string => `Chapter ${n} · ${pos}`,
    waiting: (runner: string): string => `Waiting for ${runner}`,
    lastSeen: (seen: string): string => `last seen ${seen}`,
    preparing: "Preparing…",
    part: (n: number, of: number): string => `part ${n} of ${of}`,
    readyToPlay: "Ready to play",
    restPreparing: "the rest is preparing",
    loading: "Loading…",
    playing: "Playing",
    paused: "Paused",
    earlier: "Earlier version",
    buffering: "Buffering…",
    chapter: (n: number): string => `Chapter ${n}`,
    finished: "Finished",
    allChapters: (total: number): string => `all ${total} chapters`,
    preparingStopped: "Preparing stopped",
    tryAgainLower: "try again",
    dailyLimit: "Daily limit",
    resumes: (at: string): string => `resumes ${at}`,
    playbackStopped: "Playback stopped",
    connectionLost: "connection lost",
    signedOut: "Signed out",
    unreadable: "Can’t be read aloud",
    offline: "Offline",
    offlineStart: "starts when you’re back online",
    loaded: (left: string): string => `${left} loaded`,
    stoppedAt: (pos: string): string => `stopped at ${pos}`,
    /** The polite live region (F7): state and chapter changes, never the ticking position. */
    say: {
      nextWaiting: (n: number): string =>
        `Chapter ${n} is still preparing; it plays when it’s ready.`,
      signedOut: "Signed out. Sign in to keep listening.",
      dailyLimit: (at: string): string =>
        `Daily limit reached; preparing resumes at ${at}.`,
      playingChapter: (word: string, n: number, title: string): string =>
        `${word}: chapter ${n}, ${title}`,
    },
  },
  /** The note (F10): the trio word, its sentence, the progress line and the one action. */
  note: {
    waiting: "Waiting",
    waitingText: (runner: string, seen: string | null): string =>
      seen
        ? `Waiting for ${runner}, last seen ${seen}. Preparing starts by itself when it’s on.`
        : `Waiting for ${runner}. Preparing starts by itself when it’s on.`,
    preparing: "Preparing…",
    /** F9: a book's step, a document's part with its time left, or the first part. */
    makingBook: (n: number, total: number, left: string): string =>
      `Chapter ${n} of ${total} · ${left} left.`,
    makingFirst: (parts: number): string =>
      `Part 1 of ${parts}. You can play once this part is ready.`,
    makingPart: (n: number, parts: number, left: string): string =>
      `Part ${n} of ${parts} · ${left} left.`,
    ready: "Ready",
    readyText: (ready: string): string =>
      `The first ${ready} are ready to play; the rest is still preparing.`,
    tapText: "It’s ready. Your phone needs one more tap to start playing.",
    loading: "Loading…",
    buffering: "Buffering…",
    playing: "Playing",
    paused: "Paused",
    nextWaitingText: (next: number, left: string): string =>
      `Chapter ${next} is still preparing, ${left}. It plays by itself when it’s ready.`,
    finished: "Finished",
    finishedDoc: "You’ve listened to the end.",
    finishedBook: (total: number): string =>
      `You’ve listened to all ${total} chapters.`,
    stopped: "Stopped",
    voiceText: (part: number, parts: number): string =>
      `Something on our side stopped preparing this audio at part ${part} of ${parts}.`,
    voiceRef: "Error · 502",
    dailyLimit: "Daily limit",
    limitText: (reset: string, ready: string | null): string =>
      `The free voice’s daily limit is reached. Preparing goes on by itself at ${reset}.${ready ? ` The first ${ready} are ready to play.` : ""}`,
    playText: (pos: string): string =>
      `The connection dropped, so playback stopped at ${pos}.`,
    signedOut: "Signed out",
    sessionText: "Your session has expired. Sign in again to keep listening.",
    unreadable: "Can’t be read aloud",
    unreadableText: (noun: "chapter" | "document"): string =>
      `Something on our side couldn’t read this ${noun} aloud.`,
    unreadableRef: "Error · 422",
    offline: "Offline",
    offlineStartText:
      "You’re offline. Listen can start once you’re back online.",
    offlinePlayText: (left: string): string =>
      `You’re offline. Playing what’s loaded: ${left} left.`,
    offlineStoppedText: (pos: string): string =>
      `You’re offline, so playback stopped at ${pos}. Play again once you’re back online.`,
    earlier: "Earlier version",
    outdatedText:
      "The text changed after this audio was made. Until you update it, you hear the earlier version.",
    lineDoc: "Audio prepared",
    lineBook: "Chapters prepared",
    play: "Play",
    tryAgain: "Try again",
    startOver: "Start over",
    signIn: "Sign in",
    update: "Update audio",
    updating: "Updating…",
  },
  /** F2's words around a time. */
  time: {
    about: (span: string): string => `about ${span}`,
    under5: "under 5 min",
    tomorrow: (clock: string): string => `${clock} tomorrow`,
    yesterday: (clock: string): string => `${clock} yesterday`,
  },
} as const;
