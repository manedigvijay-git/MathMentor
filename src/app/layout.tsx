import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MathMentor AI — Learn Mathematics. Don't Just Solve It.",
  description: "MathMentor is a personal mathematics tutor designed to behave like a highly experienced 40-year mathematics teacher.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full antialiased bg-background text-on-surface">{children}</body>
    </html>
  );
}