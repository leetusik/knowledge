/** A class list from the parts that are on: `cx("qz-st", !on && "is-off")`. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
