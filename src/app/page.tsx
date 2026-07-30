import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight, Building2, Send, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page hero">
      <section>
        <h1>Job alerts from company career pages.</h1>
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
      <section className="heroPanel" aria-label="Product summary">
        <div className="metricGrid">
          <div className="metric">
            <Building2 size={22} />
            <strong>11</strong>
            <span>seed companies</span>
          </div>
          <div className="metric">
            <SlidersHorizontal size={22} />
            <strong>4</strong>
            <span>alert windows</span>
          </div>
          <div className="metric">
            <Send size={22} />
            <strong>Telegram</strong>
            <span>MVP delivery channel</span>
          </div>
          <div className="metric">
            <ArrowRight size={22} />
            <strong>ATS</strong>
            <span>Greenhouse and Lever first</span>
          </div>
        </div>
      </section>
    </main>
  );
}
