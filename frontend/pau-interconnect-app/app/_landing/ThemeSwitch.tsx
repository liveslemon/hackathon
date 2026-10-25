"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/**
 * Light/dark switch that reveals the new theme as a circle growing out of the
 * button (View Transitions API). Falls back to an instant switch where the API
 * isn't supported or the user prefers reduced motion.
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDark = mounted && resolvedTheme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    const doc = document as ViewTransitionDocument;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const apply = () => {
      // Apply the class synchronously so the transition captures the new state;
      // setTheme then persists the choice.
      const root = document.documentElement;
      root.classList.toggle("dark", next === "dark");
      root.classList.toggle("light", next === "light");
      root.style.colorScheme = next;
      flushSync(() => setTheme(next));
    };

    if (!doc.startViewTransition || reduceMotion || !buttonRef.current) {
      apply();
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    document.documentElement.dataset.themeTransition = "on";
    const transition = doc.startViewTransition(apply);
    transition.ready
      .then(() =>
        document.documentElement
          .animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 700, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
          )
          .finished,
      )
      .finally(() => {
        delete document.documentElement.dataset.themeTransition;
      });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative grid h-9 w-9 shrink-0 place-items-center sm:h-10 sm:w-10 rounded-full border border-[var(--hairline-strong)] text-[var(--ink)] transition-colors hover:bg-[var(--hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <Sun
        aria-hidden
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      />
      <Moon
        aria-hidden
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
      />
    </button>
  );
}
