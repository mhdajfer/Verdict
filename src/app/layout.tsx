import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IdentityProvider } from "@/components/IdentityProvider";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Verdict",
  description: "Sentiment-tagged polls & all-time leaderboards for your circle.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <IdentityProvider>
          <div className="app-frame">{children}</div>
          <BottomNav />
        </IdentityProvider>
      </body>
    </html>
  );
}
