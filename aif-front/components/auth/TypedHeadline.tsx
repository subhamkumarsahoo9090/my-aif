"use client";

import { useEffect, useState } from "react";

export default function TypedHeadline({
  text,
  as: Tag = "h2",
  className,
}: {
  text: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(text.length);
      return;
    }
    if (count >= text.length) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), 46);
    return () => window.clearTimeout(timer);
  }, [count, text]);

  const done = count >= text.length;

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {done ? null : (
          <span className="ml-0.5 inline-block h-[0.85em] w-0.5 animate-pulse bg-white align-[-0.08em]" />
        )}
      </span>
    </Tag>
  );
}
