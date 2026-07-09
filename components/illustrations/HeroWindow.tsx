import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Hero visual (DESIGN.md §2 warna): jendela terbuka menghadap harapan —
// langit peach, matahari, bukit hijau, pohon — + kartu chat mengambang.
// SVG dekoratif (aria-hidden); kartu chat = teks nyata (dibaca screen reader).
// Reduced-motion: .float-card dimatikan global di globals.css.
export function HeroWindow({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[440px]", className)}>
      <svg
        viewBox="0 0 440 440"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        focusable={false}
        fill="none"
      >
        <defs>
          <clipPath id="hw-glass">
            <rect x="164" y="84" width="162" height="200" rx="12" />
          </clipPath>
        </defs>

        {/* blob dekoratif di belakang jendela */}
        <ellipse cx="150" cy="120" rx="92" ry="82" fill="var(--primary-soft)" />
        <circle cx="360" cy="270" r="96" fill="var(--warm-soft)" />

        {/* daun panel terbuka (di belakang bingkai, engsel di tepi kiri) */}
        <path
          d="M150 82 L98 100 L98 288 L150 300 Z"
          fill="var(--primary-soft)"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M106 158 L144 148" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M106 208 L144 198" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M106 258 L144 248" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />

        {/* bingkai jendela (hijau tua) + kaca (langit peach) */}
        <rect x="150" y="70" width="190" height="228" rx="22" fill="var(--ink)" />
        <rect x="164" y="84" width="162" height="200" rx="12" fill="var(--surface-peach)" />

        {/* pemandangan di dalam kaca */}
        <g clipPath="url(#hw-glass)">
          {/* matahari + sinar */}
          <circle cx="232" cy="142" r="24" fill="var(--warm-butter)" />
          <path d="M206 116 L197 104" stroke="var(--primary-deep)" strokeWidth="3" strokeLinecap="round" />
          <path d="M223 106 L219 92" stroke="var(--primary-deep)" strokeWidth="3" strokeLinecap="round" />
          <path d="M245 106 L249 92" stroke="var(--primary-deep)" strokeWidth="3" strokeLinecap="round" />
          <path d="M262 116 L271 104" stroke="var(--primary-deep)" strokeWidth="3" strokeLinecap="round" />

          {/* bukit hijau berlapis */}
          <path
            d="M164 246 C190 222 224 234 258 242 S326 232 326 246 L326 284 L164 284 Z"
            fill="var(--primary)"
          />
          <path
            d="M164 264 C196 248 232 258 276 254 S326 258 326 264 L326 284 L164 284 Z"
            fill="var(--primary-deep)"
          />

          {/* pohon di bukit */}
          <rect x="287" y="230" width="5" height="28" rx="2.5" fill="var(--ink)" />
          <circle cx="289" cy="226" r="15" fill="var(--ink-2)" />
          <circle cx="280" cy="235" r="9" fill="var(--primary)" />
          <circle cx="298" cy="235" r="8" fill="var(--primary)" />
        </g>

        {/* palang jendela (4 bidang) */}
        <rect x="242" y="84" width="6" height="200" fill="var(--ink)" />
        <rect x="164" y="181" width="162" height="6" fill="var(--ink)" />

        {/* ambang + tanaman pot */}
        <rect x="150" y="296" width="200" height="16" rx="8" fill="var(--ink)" />
        <path d="M322 296 L318 282 L342 282 L338 296 Z" fill="var(--ink-2)" />
        <path d="M330 282 C324 272 322 264 328 258" stroke="var(--primary-deep)" strokeWidth="4" strokeLinecap="round" />
        <path d="M330 282 C336 274 340 268 336 260" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {/* kartu chat mengambang (teks nyata, bukan SVG) */}
      <div className="float-card absolute -bottom-3 left-0 w-[min(280px,84%)] rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-lift)] sm:-left-4">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft">
            <MessageCircle className="size-4 text-primary-ink" strokeWidth={2} aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-ink">
            Hai, aku Lindra — aku di sini menemani. Kamu yang pegang kendali.
          </p>
        </div>
      </div>
    </div>
  );
}
