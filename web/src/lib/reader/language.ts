/** "English", "한국어": a language named in itself (pure, shared by the loaders and the lists). */
export function languageName(lang: string): string {
  if (lang === "en") return "English";
  if (lang === "ko") return "한국어";
  try {
    const name = new Intl.DisplayNames([lang], { type: "language" }).of(lang);
    if (name && name !== lang)
      return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // an unknown tag: show the code
  }
  return lang;
}
