"use client";

import { Fragment, useEffect, useRef, useState } from "react";

export default function ScrollRevealText({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const words = children.trim().split(/\s+/);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span className={`scroll-reveal-text ${className}`} data-visible={visible} ref={textRef}>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={`${index}-${word}`}>
            <span
              className="scroll-reveal-word"
              style={{ animationDelay: `${Math.min(index, 16) * 38}ms` }}
            >
              {word}
            </span>
            {index < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
