"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function HeaderAuthNav() {
  return (
    <>
      <Link href="/dashboard">Dashboard</Link>
      <SignedOut>
        <Link className="button buttonPrimary" href="/sign-in">
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
