"use client";

import { useEffect, useRef } from "react";

const THEME_STORAGE_KEY = "portfolio-theme";

export default function ThemeToggle() {
  const waveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const theme = savedTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    return () => {
      if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
    };
  }, []);

  function toggleTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const buttonBounds = event.currentTarget.getBoundingClientRect();
    const root = document.documentElement;
    const nextTheme =
      root.dataset.theme === "light" ? "dark" : "light";
    root.style.setProperty(
      "--theme-wave-x",
      `${buttonBounds.left + buttonBounds.width / 2}px`,
    );
    root.style.setProperty(
      "--theme-wave-y",
      `${buttonBounds.top + buttonBounds.height / 2}px`,
    );
    root.style.setProperty(
      "--theme-wave-color",
      nextTheme === "light" ? "#f5f6f2" : "#080a0c",
    );
    root.dataset.themeTransition = "false";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

    void root.offsetWidth;
    root.dataset.themeTransition = "true";

    if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
    waveTimeoutRef.current = setTimeout(() => {
      delete root.dataset.themeTransition;
      waveTimeoutRef.current = null;
    }, 2300);
  }

  return (
    <>
      <svg aria-hidden="true" className="theme-filter-defs">
        <defs>
          <filter
            id="theme-wave-distortion"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feTurbulence
              baseFrequency="0.008 0.02"
              numOctaves="1"
              result="wave-noise"
              seed="8"
              type="fractalNoise"
            >
              <animate
                attributeName="baseFrequency"
                dur="2.2s"
                repeatCount="1"
                values="0.008 0.02;0.018 0.045;0.008 0.02"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="wave-noise"
              scale="24"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <button
        aria-label="Toggle light and dark theme"
        className="theme-toggle"
        onClick={toggleTheme}
        title="Toggle light and dark theme"
        type="button"
      >
        <svg aria-hidden="true" className="theme-icon-sun" fill="none" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="3.25" />
          <path d="M10 1.75v2m0 12.5v2m8.25-8.25h-2m-12.5 0h-2m14.08-5.83-1.42 1.42M5.59 14.41l-1.42 1.42m11.66 0-1.42-1.42M5.59 5.59 4.17 4.17" />
        </svg>
        <svg aria-hidden="true" className="theme-icon-moon" fill="none" viewBox="0 0 20 20">
          <path d="M16.8 12.1A7.2 7.2 0 0 1 7.9 3.2a7.25 7.25 0 1 0 8.9 8.9Z" />
        </svg>
      </button>
    </>
  );
}
