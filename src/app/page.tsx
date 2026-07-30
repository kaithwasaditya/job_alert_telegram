import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight, Building2, Send, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page hero">
      <section>
        <p className="eyebrow">First-party ATS monitoring</p>
        <h1>
          Job alerts from <span className="serifAccent">career pages.</span>
        </h1>
        <p>
          Pick the companies you care about, set location and keyword filters,
          and receive matched postings through Telegram. The system polls each
          company once, then fans out relevant alerts to subscribers.
        </p>
        <div className="dashboardActions">
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
        </div>
      </section>
     <div className="heroStats">
  <div className="stat">
    <Building2 size={16} />
    <strong>11</strong>
    <span>seed companies</span>
  </div>
  <div className="stat">
    <SlidersHorizontal size={16} />
    <strong>4</strong>
    <span>alert windows</span>
  </div>
  <div className="stat">
    <Send size={16} />
    <strong>Telegram</strong>
    <span>delivery channel</span>
  </div>
  <div className="stat">
    <ArrowRight size={16} />
    <strong>ATS</strong>
    <span>Greenhouse & Lever</span>
  </div>
</div>
    </main>
  );
}
