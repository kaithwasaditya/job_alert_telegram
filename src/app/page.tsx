import { ArrowRight, Building2, Send, SlidersHorizontal } from "lucide-react";
import { HomeCta } from "@/app/home-cta";

export default function HomePage() {
  return (
    <main className="page hero">
      <section>
        <p className="eyebrow">First-party ATS monitoring</p>
        <h1>
          Job alerts from <span className="serifAccent">career pages.</span>
        </h1>
        <p>
          Pick representative ATS-backed companies, set SWE/SDE filters, and
          receive matched postings through Telegram. The system polls each
          company once, then fans out relevant alerts to subscribers.
        </p>
        <div className="dashboardActions">
          <HomeCta />
        </div>
      </section>
     <div className="heroStats">
  <div className="stat">
    <Building2 size={16} />
    <strong>4</strong>
    <span>representative companies</span>
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
    <strong>4 ATS</strong>
    <span>major sources</span>
  </div>
</div>
    </main>
  );
}
