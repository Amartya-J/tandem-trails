"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BioResponse = { content?: string };

export default function BioPage() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/bio")
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load bio");
        const data = await response.json() as BioResponse;
        setContent(data.content || "No bio provided yet.");
      })
      .catch(() => setError(true));
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 p-4 font-sans text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-2xl items-center">
        <div className="w-full rounded-2xl bg-slate-800 p-6 shadow-xl sm:p-8">
          <header className="mb-6 flex items-center justify-between border-b border-slate-700 pb-4">
            <h1 className="text-4xl font-bold text-blue-400">Bio</h1>
            <Link href="/bio/edit" className="ui-btn ui-btn-sm ui-btn-ghost text-slate-300">EDIT BIO</Link>
          </header>
          {error ? (
            <p className="rounded-field border border-error/60 bg-error/15 p-3 text-sm text-error">The bio could not be loaded. Please try again.</p>
          ) : content === null ? (
            <div className="flex min-h-40 items-center justify-center"><span className="text-sm text-primary" aria-live="polite">Loading bio…</span></div>
          ) : (
            <article className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300 sm:text-base">{content}</article>
          )}
          <footer className="mt-8 border-t border-slate-700 pt-6"><Link href="/" className="ui-btn ui-btn-primary">Back to Adventure</Link></footer>
        </div>
      </section>
    </main>
  );
}
