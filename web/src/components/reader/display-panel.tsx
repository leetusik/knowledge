import { READER } from "@/content";
import type { TextSize, ThemeChoice } from "@/lib/reader-cookie";

const SIZES: readonly TextSize[] = [1, 2, 3, 4, 5];
const THEMES: readonly {
  key: ThemeChoice;
  /** The swatch halves, each a scheme the System swatch splits across. */
  halves: readonly ("default" | "slate" | "sepia")[];
}[] = [
  { key: "system", halves: ["default", "slate"] },
  { key: "light", halves: ["default"] },
  { key: "dark", halves: ["slate"] },
  { key: "sepia", halves: ["sepia"] },
];

/**
 * The Display sheet's body (`01-reader` §13, `DisplayPanel`, board 16).
 *
 *  - Text size: a `fieldset` "TEXT SIZE" with five "A" buttons at the step's size
 *    (`aria-pressed`, "Text size N of 5", plus ", smallest" / ", default" /
 *    ", largest"), and the readout "Size **N of 5** · default";
 *  - Theme: a `fieldset` "THEME" with System (the swatch split light and dark), Light,
 *    Dark and Sepia, and the readout under it;
 *  - the note "Saved on this device. Your other devices keep their own." — no column-
 *    width control.
 * Every choice applies live to the whole reader; the frame stores it on the device.
 */
export function DisplayPanel({
  size,
  theme,
  os,
  onSize,
  onTheme,
}: {
  size: TextSize;
  theme: ThemeChoice;
  /** What the device is now, for System's readout. */
  os: "light" | "dark";
  onSize: (size: TextSize) => void;
  onTheme: (theme: ThemeChoice) => void;
}) {
  const sizeNote = READER.display.sizeNote[size];
  return (
    <div className="rd-disp">
      <fieldset className="rd-disp__group">
        <legend className="rd-disp__label">{READER.display.textSize}</legend>
        <div className="rd-sizes">
          {SIZES.map((n) => (
            <button
              key={n}
              type="button"
              className="rd-opt"
              aria-pressed={size === n}
              aria-label={READER.display.sizeAria(
                n,
                READER.display.sizeNote[n] ?? "",
              )}
              onClick={() => onSize(n)}
            >
              <span className={`rd-opt__a rd-opt__a--${n}`} aria-hidden="true">
                A
              </span>
            </button>
          ))}
        </div>
        <p className="rd-disp__readout">
          Size <b>{size} of 5</b>
          {sizeNote ? ` · ${sizeNote}` : ""}
        </p>
      </fieldset>
      <fieldset className="rd-disp__group">
        <legend className="rd-disp__label">{READER.display.theme}</legend>
        <div className="rd-themes">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="rd-opt"
              aria-pressed={theme === t.key}
              onClick={() => onTheme(t.key)}
            >
              <span className="rd-swatch" aria-hidden="true">
                {t.halves.map((h) => (
                  <span
                    key={h}
                    className="rd-swatch__half"
                    data-md-color-scheme={h}
                  >
                    Aa
                  </span>
                ))}
              </span>
              <span>{READER.display.themes[t.key]}</span>
            </button>
          ))}
        </div>
        <p className="rd-disp__readout">
          <b>{READER.display.themes[theme]}</b>
          {theme === "system"
            ? READER.display.systemNote(os)
            : theme === "sepia"
              ? READER.display.sepiaNote
              : ""}
        </p>
      </fieldset>
      <p className="rd-disp__note">{READER.display.saved}</p>
    </div>
  );
}
