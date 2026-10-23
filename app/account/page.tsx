import Link from "next/link";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getChatGPTUser();
  return <main className="min-h-screen bg-slate-900 p-5 text-white"><section className="mx-auto flex min-h-screen max-w-lg items-center"><div className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl"><p className="mb-2 text-xs font-black tracking-[.2em] text-teal-300">TANDEM TRAILS</p><h1 className="font-serif text-4xl font-black text-amber-100">Your trail account</h1>{user ? <div className="mt-7 space-y-5"><p className="text-slate-300">Signed in as <strong className="text-white">{user.displayName}</strong>.</p><p className="text-sm leading-relaxed text-slate-400">This account can claim and manage the public explorer bio the first time it saves it.</p><div className="flex flex-wrap gap-3"><Link className="ui-btn ui-btn-primary" href="/bio/edit">Edit bio</Link><a className="ui-btn ui-btn-ghost" href={chatGPTSignOutPath("/account")} target="_top">Sign out</a></div></div> : <div className="mt-7 space-y-5"><p className="leading-relaxed text-slate-300">Sign in with ChatGPT to manage the creator bio and keep your account attached to this game.</p><a className="ui-btn ui-btn-primary" href={chatGPTSignInPath("/account")} target="_top">Sign in with ChatGPT</a></div>}<Link className="mt-8 inline-block text-sm text-teal-300 hover:text-amber-200" href="/">← Back to the trail</Link></div></section></main>;
}
