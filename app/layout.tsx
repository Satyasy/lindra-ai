import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// SELF-HOST (DESIGN.md §1.5) — tanpa CDN font pihak ketiga,
// kunjungan siswa tidak boleh bocor ke luar
const generalSans = localFont({
  src: [
    { path: "../public/fonts/GeneralSans-Regular.woff2", weight: "400" },
    { path: "../public/fonts/GeneralSans-Medium.woff2", weight: "500" },
    { path: "../public/fonts/GeneralSans-Semibold.woff2", weight: "600" },
    { path: "../public/fonts/GeneralSans-Bold.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Lindra",
  description: "Satu pintu masuk untuk cerita yang tidak tahu harus dibawa ke mana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${generalSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
