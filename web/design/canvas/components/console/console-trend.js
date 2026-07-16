/* Knowledge Base — console usage-trend renderer (P12).
   Draws the 30-day usage trend for any <figure class="kb-trend-wrap"
   data-series="[..]">: a faint hairline grid, a teal area fill (gradient to
   transparent), a teal line, and an emphasized teal endpoint. Every ink reads
   live from the --kb-trend-* tokens, so it re-themes with the scheme. Design
   reference for the app's TrendChart — engineering keeps this drawing spec. */
(function () {
  var W = 600, H = 160, PT = 12, PB = 24, PX = 6, GRID = 3;
  var uid = 0;

  function render(el) {
    var series;
    try { series = JSON.parse(el.getAttribute("data-series")); }
    catch (e) { return; }
    if (!series || !series.length) return;

    var min = Math.min.apply(null, series);
    var max = Math.max.apply(null, series);
    var span = max - min || 1;
    var innerW = W - PX * 2, innerH = H - PT - PB;
    var n = series.length;
    var id = "kbtrend-" + (uid++);

    var xy = series.map(function (v, i) {
      var x = PX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      var y = PT + innerH - ((v - min) / span) * innerH;
      return [x, y];
    });

    var line = xy.map(function (p, i) {
      return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }).join(" ");
    var area = "M" + PX + " " + (PT + innerH).toFixed(1) + " " +
      xy.map(function (p) { return "L" + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ") +
      " L" + (PX + innerW).toFixed(1) + " " + (PT + innerH).toFixed(1) + " Z";

    var grid = "";
    for (var g = 0; g <= GRID; g++) {
      var gy = (PT + (g / GRID) * innerH).toFixed(1);
      grid += '<line class="kb-trend__grid" x1="' + PX + '" y1="' + gy +
        '" x2="' + (PX + innerW) + '" y2="' + gy + '"/>';
    }

    var last = xy[xy.length - 1];
    var svg =
      '<svg class="kb-trend" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Usage over the last 30 days">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--kb-trend-fill-from)"/>' +
      '<stop offset="1" stop-color="var(--kb-trend-fill-to)"/>' +
      '</linearGradient></defs>' +
      grid +
      '<path class="kb-trend__area" d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path class="kb-trend__line" d="' + line + '"/>' +
      '<circle class="kb-trend__point" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="' + (window.getComputedStyle ? 3.5 : 3.5) + '"/>' +
      "</svg>";
    el.innerHTML = svg;
  }

  function boot() {
    var nodes = document.querySelectorAll(".kb-trend-wrap");
    for (var i = 0; i < nodes.length; i++) render(nodes[i]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
  window.kbTrend = render;
})();
