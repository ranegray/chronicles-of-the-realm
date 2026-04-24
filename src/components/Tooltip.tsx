import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  placement?: "top" | "bottom";
  as?: "span" | "div";
  className?: string;
  style?: CSSProperties;
}

interface BubbleRect {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

export function Tooltip({
  content,
  children,
  delay = 220,
  placement = "top",
  as = "span",
  className,
  style
}: Props) {
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<BubbleRect | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<number | null>(null);
  const Wrapper = as;

  function show() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setVisible(false);
    setRect(null);
  }

  useLayoutEffect(() => {
    if (!visible) return;
    const anchor = anchorRef.current;
    const bubble = bubbleRef.current;
    if (!anchor || !bubble) return;
    const anchorBox = anchor.getBoundingClientRect();
    const bubbleBox = bubble.getBoundingClientRect();
    const margin = 10;
    let resolved: "top" | "bottom" = placement;
    if (placement === "top" && anchorBox.top - bubbleBox.height - margin < 0) resolved = "bottom";
    if (placement === "bottom" && anchorBox.bottom + bubbleBox.height + margin > window.innerHeight) resolved = "top";
    const top = resolved === "top"
      ? anchorBox.top - bubbleBox.height - margin
      : anchorBox.bottom + margin;
    let left = anchorBox.left + anchorBox.width / 2 - bubbleBox.width / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - bubbleBox.width - 6));
    setRect({ left, top, placement: resolved });
  }, [visible, placement, content]);

  const wrapperClass = `tooltip-anchor${className ? ` ${className}` : ""}`;

  const bubbleStyle: CSSProperties = rect
    ? { left: rect.left, top: rect.top }
    : { visibility: "hidden", left: 0, top: 0 };
  const bubblePlacement = rect?.placement ?? placement;

  return (
    <Wrapper
      ref={anchorRef as never}
      className={wrapperClass}
      style={style}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && createPortal(
        <span
          ref={bubbleRef}
          role="tooltip"
          className={`tooltip-bubble tooltip-bubble-${bubblePlacement}`}
          style={bubbleStyle}
        >
          {content}
        </span>,
        document.body
      )}
    </Wrapper>
  );
}
