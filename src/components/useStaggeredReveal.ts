import { useEffect, useRef, useState } from "react";

/**
 * Display-only pacing helpers. None of these touch store/game state — they
 * only decide how quickly already-computed state gets *shown*.
 */

/** Tracks the OS/browser "prefers-reduced-motion" setting reactively. */
export function usePrefersReducedMotion(): boolean {
  const getMatch = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [reduced, setReduced] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    // Safari < 14 only supports addListener/removeListener.
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  return reduced;
}

/**
 * Reveals items 0..total one at a time, `intervalMs` apart, whenever `total`
 * grows. Existing items already on screen are never re-animated: only the
 * newly appended tail is staggered in. Respects prefers-reduced-motion by
 * jumping straight to `total`. Call `skip()` to reveal everything immediately
 * (e.g. on user click).
 */
export function useStaggeredReveal(total: number, intervalMs = 250) {
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(total);
  const revealedRef = useRef(total);

  useEffect(() => {
    // If the underlying collection shrank (e.g. a fresh combat log), never
    // let the ref exceed the new total.
    if (revealedRef.current > total) {
      revealedRef.current = total;
      setRevealed(total);
    }

    if (reducedMotion || revealedRef.current >= total) {
      revealedRef.current = total;
      setRevealed(total);
      return;
    }

    const timer = window.setInterval(() => {
      revealedRef.current = Math.min(total, revealedRef.current + 1);
      setRevealed(revealedRef.current);
      if (revealedRef.current >= total) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [total, intervalMs, reducedMotion]);

  const skip = () => {
    revealedRef.current = total;
    setRevealed(total);
  };

  return { revealed, isRevealing: revealed < total, skip };
}

/** Classic usePrevious: the value this hook held on the previous render. */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Returns true for `durationMs` whenever `level` increases versus its
 * previous value. Used to pulse a meter without the meter component itself
 * knowing anything about pacing.
 */
export function useLevelIncreasePulse(level: number, durationMs = 600): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const previous = usePrevious(level);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    if (previous !== undefined && level > previous) {
      setPulsing(true);
      const t = window.setTimeout(() => setPulsing(false), durationMs);
      return () => window.clearTimeout(t);
    }
  }, [level, previous, durationMs, reducedMotion]);

  return pulsing;
}
