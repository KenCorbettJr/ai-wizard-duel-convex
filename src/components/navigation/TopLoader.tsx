"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const START_EVENT = "app:navigation-start";

/** Start the bar for navigations that don't come from a link tap (router.push). */
export function startTopLoader() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** Instant navigations finish before this, so the bar never flashes. */
const SHOW_DELAY_MS = 120;
/** Give up if a navigation never lands (cancelled, errored). */
const MAX_DURATION_MS = 15_000;

/**
 * Thin progress bar along the top of the screen while the next page loads,
 * so a tap always gets visible feedback even when the route is slow.
 */
export function TopLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const running = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (trickle.current) clearInterval(trickle.current);
    trickle.current = null;
  };

  const done = useEffectEvent(() => {
    if (!running.current) return;
    running.current = false;
    clearTimers();
    setProgress(1);
    timers.current.push(
      setTimeout(() => setVisible(false), 200),
      setTimeout(() => setProgress(0), 450),
    );
  });

  const start = useEffectEvent(() => {
    if (running.current) return;
    running.current = true;
    clearTimers();
    setProgress(0);
    timers.current.push(
      setTimeout(() => {
        setVisible(true);
        setProgress(0.15);
        // Creep toward 90%, slowing down as it goes.
        trickle.current = setInterval(() => {
          setProgress((p) => p + (0.9 - p) * 0.08);
        }, 200);
      }, SHOW_DELAY_MS),
      setTimeout(() => done(), MAX_DURATION_MS),
    );
  });

  const renderedPath = useRef(pathname);

  // The new page has rendered.
  useEffect(() => {
    renderedPath.current = pathname;
    done();
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (hash or query change only): no route load to wait for.
      if (url.pathname === window.location.pathname) return;
      start();
    };
    const onStart = () => start();
    // Browser back/forward: the URL has already changed; skip hash-only moves.
    const onPopState = () => {
      if (window.location.pathname !== renderedPath.current) start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(START_EVENT, onStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(START_EVENT, onStart);
      clearTimers();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full origin-left bg-gold shadow-[0_0_8px_var(--gold)]"
        style={{
          transform: `scaleX(${progress})`,
          transition: progress === 0 ? "none" : "transform 200ms ease-out",
        }}
      />
    </div>
  );
}
