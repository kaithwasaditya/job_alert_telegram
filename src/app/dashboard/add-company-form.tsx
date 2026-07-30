"use client";

import { Link2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { addCompanyFromUrl } from "./actions";

export function AddCompanyForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="stack"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await addCompanyFromUrl(formData);
          setMessage(result.message);
        });
      }}
    >
      <div className="field">
        <label htmlFor="company-url">Careers page URL</label>
        <div className="formRow">
          <input id="company-url" name="url" placeholder="https://company.com/careers" />
          <button className="button buttonPrimary" disabled={isPending} type="submit">
            <Plus size={17} />
            Add
          </button>
        </div>
      </div>
      {message ? (
        <p className="muted">
          <Link2 size={14} /> {message}
        </p>
      ) : null}
    </form>
  );
}
