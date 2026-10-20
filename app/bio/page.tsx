import fs from "fs";
import path from "path";
import Link from "next/link";

export default function BioPage() {
  const bioPath = path.join(process.cwd(), "bio.md");
  let bioContent = "No bio provided yet.";
  
  try {
    if (fs.existsSync(bioPath)) {
      bioContent = fs.readFileSync(bioPath, "utf8");
    }
  } catch (e) {
    console.error("Error reading bio.md:", e);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans p-4">
      <div className="max-w-2xl w-full bg-slate-800 p-8 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold mb-6 text-blue-400 border-b border-slate-700 pb-4">Bio</h1>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-300 leading-relaxed">
          {bioContent}
        </div>
        <div className="mt-8 pt-6 border-t border-slate-700">
          <Link 
            href="/" 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold transition-colors inline-block"
          >
            Back to Adventure
          </Link>
        </div>
      </div>
    </div>
  );
}
