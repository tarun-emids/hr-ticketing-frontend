import { useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Traps Tab cycling inside the container while active and restores focus to
// the previously focused element on unmount. Esc handling stays the
// component's own onClose concern.
export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return undefined;

    const container = ref.current;
    const previous = document.activeElement;
    const focusables = () => Array.from(container.querySelectorAll(FOCUSABLE));
    const first = focusables()[0];
    if (first) first.focus();

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) {
        event.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const focusIndex = list.indexOf(document.activeElement);
      const leavingLast = !event.shiftKey && focusIndex >= list.length - 1;
      const leavingFirst = event.shiftKey && focusIndex <= 0;
      if (leavingLast) {
        event.preventDefault();
        firstEl.focus();
      } else if (leavingFirst) {
        event.preventDefault();
        lastEl.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [ref, active]);
}
