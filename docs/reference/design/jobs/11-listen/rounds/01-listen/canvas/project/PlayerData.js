/* The player page's fixture and formats (frame.md F2, F11, F18, F19). One source for Player and PlayerPanel.
   Canvas data only: the build reads the same shapes from the Listen's job and its parts. */
(function () {
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  // A position: m:ss under an hour, h:mm:ss from an hour (F2)
  var clock = function (s) {
    s = Math.max(0, Math.round(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? h + ':' + pad(m) + ':' + pad(x) : m + ':' + pad(x);
  };
  var secs = function (t) {
    if (typeof t === 'number') return t;
    return String(t || '0:00').split(':').map(Number).reduce(function (a, b) { return a * 60 + b; }, 0);
  };
  // A length of made audio: "42 min" under an hour, "1 h 7 min" from an hour (F2)
  var length = function (s) {
    var mins = Math.round(s / 60);
    if (mins < 60) return mins + ' min';
    return Math.floor(mins / 60) + ' h' + (mins % 60 ? ' ' + (mins % 60) + ' min' : '');
  };
  var CP5 = [24, 31, 28, 36, 22, 40, 33, 27, 45, 30, 26, 38, 29, 34, 25, 41, 32, 28, 35, 23];
  var UNITS = {
    'bar': { kind: 'doc', title: 'Our bar: performance rule v1', lang: 'en', len: 2530, parts: 12 },
    'bar-ko': { kind: 'doc', title: '우리의 기준: 성과 규칙 v1', lang: 'ko', len: 3025, parts: 14 },
    'guide': { kind: 'book', title: 'knowledge maintainer guide', lang: 'en', parts: 9, chapters: [
      ['knowledge: what it is and how it is used', 2300],
      ['System internals: the content plane, the write path and the contracts', 4030],
      ['knowledge’s read surfaces: two front ends, one corpus', 2645],
      ['Shipping and running knowledge: distribution, the edge, security and the gates', 3520],
      ['Why knowledge is this way, and how to change it', 1875],
    ] },
    'changple5': { kind: 'book', title: 'changple5 curriculum', lang: 'en', made: 6, parts: 9,
      chapters: CP5.map(function (m, i) { return ['[Chapter ' + (i + 1) + ' title]', m * 60]; }) },
  };
  // made: the last chapter whose audio is made (a fact about the Listen, never relative to where the listener is)
  var BASE = { unit: 'guide', from: 2, ch: 2, made: 3, pos: '12:30', state: 'playing', old: false, soFar: false, len: '', speed: '1×', follow: true, offer: false, updating: false };
  var unit = function (L) { return UNITS[(L && L.unit) || 'guide'] || UNITS.guide; };
  var isBook = function (L) { return unit(L).kind === 'book'; };
  // How far the book is made (F13 OQ4: from the chapter Listen started, ahead in order). The Listen carries it, so a
  // chapter move never changes what is made; only the making does.
  var madeTo = function (L) {
    var u = unit(L), total = u.chapters.length;
    if (L.state === 'finished') return total;
    if (L.made) return Math.min(total, L.made);
    return u.made || total;
  };
  var chapterRows = function (L) {
    var u = unit(L);
    if (u.kind !== 'book') return [];
    var to = madeTo(L), from = L.from || 1;
    return u.chapters.map(function (c, i) {
      var n = i + 1;
      var made = n >= from && n <= to;
      var preparing = !made && n === to + 1 && n >= from;
      return { n: n, title: c[0], secs: c[1], len: length(c[1]), made: made, preparing: preparing, current: n === L.ch };
    });
  };
  // The current item's length in seconds (made audio; "so far" while the rest is preparing)
  var lenSecs = function (L) {
    if (L.soFar && L.len) return secs(L.len);
    var u = unit(L);
    if (u.kind === 'book') { var c = u.chapters[(L.ch || 1) - 1]; return c ? c[1] : 0; }
    return u.len;
  };
  var title = function (L) {
    var u = unit(L);
    if (u.kind === 'book') { var c = u.chapters[(L.ch || 1) - 1]; return c ? c[0] : u.title; }
    return u.title;
  };
  // The Dock's props for a Listen (frame.md F21)
  var dock = function (L) {
    var u = unit(L), book = u.kind === 'book';
    return {
      state: L.state, unit: book ? 'book' : 'doc', title: title(L), lang: u.lang,
      n: L.ch || 1, total: book ? u.chapters.length : 1, next: L.ch || 1,
      pos: L.pos, len: clock(lenSecs(L)), soFar: !!L.soFar, old: !!L.old,
      part: L.part || 3, parts: u.parts || 12, loaded: '2:40', reset: '09:00', seen: '19:55', runner: 'the Mac',
    };
  };
  window.PL = { UNITS: UNITS, BASE: BASE, clock: clock, secs: secs, length: length, unit: unit, isBook: isBook,
    madeTo: madeTo, chapterRows: chapterRows, lenSecs: lenSecs, title: title, dock: dock,
    SPEEDS: ['0.75×', '1×', '1.25×', '1.5×', '1.75×', '2×'] };
})();
