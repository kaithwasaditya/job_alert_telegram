"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function HomeCta() {
  return (
    <>
      <SignedOut>
        <Link className="button buttonPrimary" href="/sign-in">
          Start tracking <ArrowRight size={18} />
        </Link>
      </SignedOut>
      <SignedIn>
        <Link className="button buttonPrimary" href="/dashboard">
          Open dashboard <ArrowRight size={18} />
        </Link>
      </SignedIn>
    </>
  );
}
