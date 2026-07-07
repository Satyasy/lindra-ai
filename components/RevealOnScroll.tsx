"use client";

import { useEffect } from "react";

// Menandai .reveal jadi terlihat saat masuk viewport (fade-up, DESIGN.md §2.4).
// Elemen yang sudah di viewport awal langsung is-visible (tanpa kedip). Saat
// reduced-motion: tidak menandai reveal-ready sama sekali → konten tampil penuh.
export function RevealOnScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const root = document.documentElement;
    root.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    const els = document.querySelectorAll<HTMLElement>(".reveal");
    els.forEach((el) => {
      // Sudah di layar saat load → tampilkan langsung, hindari kedip hero.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add("is-visible");
      } else {
        io.observe(el);
      }
    });

    return () => {
      io.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
