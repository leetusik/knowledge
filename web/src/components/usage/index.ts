// Barrel for the reusable usage components (P12.S3). Both are presentational,
// props-only server components on the Knowledge Base `.kb-*` console classes; S4's
// project page can reuse them for its own per-project usage.
export { StatTiles } from "./stat-tiles";
export type { StatTileVM, StatTilesProps } from "./stat-tiles";

export { TrendChart, trendGeometry } from "./trend-chart";
export type { TrendChartProps, TrendGeometry } from "./trend-chart";
