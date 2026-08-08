"use client";

import { useEffect, useRef, useState } from "react";

const defaultOptions: IntersectionObserverInit = {
  rootMargin: "100px",
  threshold: 0,
};

/**
 * Returns true when the element is in viewport. Use for lazy rendering.
 */
export function useInView(options: IntersectionObserverInit = defaultOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // Se depende de los valores, no del objeto: `options` suele ser un literal nuevo por render.
  const { rootMargin, threshold } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setInView(true);
    }, { rootMargin, threshold });

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return { ref, inView };
}
