export type ThemePref = "system" | "light" | "dark";

export function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem("mandaat.theme");
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

/** Apply a theme without every color transition firing at once. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  root.classList.add("no-transitions");
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
  void root.offsetHeight;
  requestAnimationFrame(() => root.classList.remove("no-transitions"));
  try {
    if (pref === "system") localStorage.removeItem("mandaat.theme");
    else localStorage.setItem("mandaat.theme", pref);
  } catch {
    /* ignore */
  }
}
