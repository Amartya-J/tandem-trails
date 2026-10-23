"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BioEditor({ displayName }: { displayName: string }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bio").then(response => response.json() as Promise<{ content?: string }>).then(data => setContent(data.content || "")).catch(() => setStatus("Could not load the bio."));
  }, []);

  const saveBio = async () => {
    setSaving(true); setStatus(null);
    try {
      const response = await fetch("/api/bio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await response.json() as { error?: string };
      setStatus(response.ok ? "Saved to your trail account." : data.error || "Could not save the bio.");
    } catch { setStatus("Could not save the bio."); } finally { setSaving(false); }
  };

  return <main className="min-h-screen bg-slate-900 p-4 text-white"><section className="mx-auto flex min-h-screen max-w-2xl items-center"><div className="w-full rounded-2xl bg-slate-800 p-6 shadow-xl sm:p-8"><p className="text-xs font-black tracking-[.16em] text-teal-300">SIGNED IN AS {displayName.toUpperCase()}</p><h1 className="mt-2 border-b border-slate-700 pb-4 text-4xl font-bold text-blue-400">Edit your Bio</h1><textarea className="ui-textarea mt-6 h-72 w-full bg-slate-900 font-mono text-sm leading-relaxed text-slate-200" value={content} onChange={event => setContent(event.target.value)} placeholder="Write your story here…" maxLength={20_000} /><div className="mt-6 flex items-center justify-between gap-4"><Link href="/bio" className="ui-btn ui-btn-ghost">Cancel</Link><div className="flex items-center gap-3">{status && <span className="text-sm text-teal-200" role="status">{status}</span>}<button type="button" onClick={saveBio} disabled={saving} className="ui-btn ui-btn-primary">{saving ? "Saving…" : "Save Bio"}</button></div></div></div></section></main>;
}
