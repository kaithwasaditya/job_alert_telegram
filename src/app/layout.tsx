import { ClerkProvider } from "@clerk/nextjs";
import { BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeaderAuthNav } from "@/app/header-auth-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alert Bot",
  description: "Track first-party career pages and receive matched job alerts on Telegram.",
  icons: {
    icon: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="topbar">
            <Link href="/" className="brand" aria-label="Alert Bot home">
              <span className="brandIcon">
                <BellRing size={20} />
              </span>
              <span className="serifAccent">Alert Bot</span>
            </Link>
            <nav className="nav">
              <HeaderAuthNav />
            </nav>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
