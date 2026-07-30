import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alert Bot",
  description: "Track first-party career pages and receive matched job alerts on Telegram."
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
              <span>Alert Bot</span>
            </Link>
            <nav className="nav">
              <Link href="/dashboard">Dashboard</Link>
              <SignedOut>
                <Link className="button buttonPrimary" href="/sign-in">
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </nav>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
