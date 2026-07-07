import { cn } from "@/lib/utils";

// Art graphic pojok hero — awan peach lembut + bukit mint + dedaunan (DESIGN.md §2). Dekoratif.
const leaf = (x: number, y: number, rot: number, h: number, fill: string) => (
  <path
    transform={`translate(${x} ${y}) rotate(${rot})`}
    d={`M0 0C-${h * 0.18} -${h * 0.32} -${h * 0.16} -${h * 0.78} 0 -${h} ${h * 0.16} -${h * 0.78} ${h * 0.18} -${h * 0.32} 0 0Z`}
    fill={fill}
  />
);

export function GardenCorner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 150 110"
      width="150"
      height="110"
      className={cn("h-auto w-40", className)}
      aria-hidden
      focusable={false}
      fill="none"
    >
      {/* awan peach lembut */}
      <path
        d="M58 72c0-20 20-27 37-22 8-9 28-7 32 5 15 0 21 12 17 24l6 31H42c0-20 4-32 16-38Z"
        fill="var(--warm-soft)"
      />
      {/* bukit mint di belakang */}
      <path d="M86 110c-2-22 14-32 30-30 18 2 34 12 34 30Z" fill="var(--primary-soft)" />
      {/* dedaunan naik dari bawah */}
      {leaf(54, 110, -30, 30, "var(--primary)")}
      {leaf(70, 110, -16, 40, "var(--primary-deep)")}
      {leaf(88, 110, 6, 46, "var(--primary)")}
      {leaf(108, 110, 20, 38, "var(--primary-bright)")}
      {leaf(126, 110, 30, 32, "var(--primary-deep)")}
    </svg>
  );
}
