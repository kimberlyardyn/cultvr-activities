"use client";

import { useEffect, useState } from "react";

interface RevealTextProps {
  text: string;
  className?: string;
  /** Delay in ms before the animation starts */
  startDelay?: number;
  /** Time in ms between each character appearing */
  charDelay?: number;
}

export function RevealText({
  text,
  className = "",
  startDelay = 400,
  charDelay = 45,
}: RevealTextProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev >= text.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, charDelay);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [text, startDelay, charDelay]);

  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, index) => (
        <span
          key={index}
          className="inline-block transition-all duration-500"
          style={{
            opacity: index < visibleCount ? 1 : 0,
            transform:
              index < visibleCount ? "translateY(0)" : "translateY(8px)",
            transitionDelay: `${index * 15}ms`,
          }}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
