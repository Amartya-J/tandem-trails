import Link from "next/link";

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-4 text-center">
      <h1 className="text-6xl font-bold mb-4 text-blue-400">Coming Soon</h1>
      <p className="text-xl text-slate-400 mb-8">Something exciting is in the works. Stay tuned!</p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold transition-colors"
      >
        Back to Adventure
      </Link>
    </div>
  );
}
