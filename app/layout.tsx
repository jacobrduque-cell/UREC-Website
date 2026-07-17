import type { Metadata } from "next";
import { JetBrains_Mono, Lato } from "next/font/google";
import "./globals.css";

// Canvas's real typography is Lato end to end, no serif display face —
// Fraunces/Inter were the pre-Phase-7 identity and are no longer used.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "UREC Platform",
  description: "UC Berkeley Undergraduate Real Estate Club — Deal Library and Member Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
