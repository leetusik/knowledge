// P12.S3 — the four usage stat tiles (Documents created / Searches / Deleted /
// Active total), rendered on the Knowledge Base console `.kb-tile-grid` + `.kb-tile`
// classes. Presentational and props-only: it takes a pre-computed view-model (the
// "Active total" tile is `documents_created − documents_deleted`, derived in the
// page, not a `totals` key) and never fetches.
//
// The big figures are the Fraunces display numerals baked into `.kb-tile__num`
// (design decision #1). Values are grouped with `toLocaleString("en-US")`. Per the
// operator decision there is NO delta line — the design's `.kb-tile__delta` caption
// is intentionally omitted (a real month-over-month delta needs prior-period data
// the single-window usage payload does not carry).

export interface StatTileVM {
  /** Stable key (also the React key). */
  key: string;
  /** Mono uppercase eyebrow label. */
  eyebrow: string;
  /** The figure to render (formatted with `toLocaleString`). */
  value: number;
}

export interface StatTilesProps {
  tiles: readonly StatTileVM[];
}

export function StatTiles({ tiles }: StatTilesProps) {
  return (
    <div className="kb-tile-grid">
      {tiles.map((tile) => (
        <div key={tile.key} className="kb-tile">
          <div className="kb-tile__eyebrow">{tile.eyebrow}</div>
          <div className="kb-tile__num">{tile.value.toLocaleString("en-US")}</div>
        </div>
      ))}
    </div>
  );
}
