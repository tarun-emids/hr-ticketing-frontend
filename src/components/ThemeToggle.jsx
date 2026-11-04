import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";

const KEY = "hrdesk.theme";

function init() {
  const stored = localStorage.getItem(KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(init);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-lg border border-warm/15 p-2 text-warm/55 transition-colors hover:border-warm/30 hover:text-warm"
    >
      {theme === "dark" ? <IconSun size={15} aria-hidden /> : <IconMoon size={15} aria-hidden />}
    </button>
  );
}
