import Link from "next/link";

export const metadata = {
  title: "The Trail Journal · Tandem Trails",
  description: "Official Explorer's Log, World Lore, Mechanics Manual, and Developer Chronicle for Tandem Trails.",
};

const WORLDS = [
  {
    name: "Sunleaf Wilds",
    tagline: "A resilient canopy where every mushroom and leaf bounces back.",
    palette: "from-emerald-900/60 to-teal-950/80 border-emerald-500/40 text-emerald-300",
    badge: "World 01",
    description: "Towering moss-draped redwoods and spring-loaded canopy flora. Explorers find their footing here, learning to time cooperative leaps across thorn pits and navigate bouncy forest mushrooms.",
    landmarks: ["First Flight Treetops", "Mushroom Mile", "Canopy Chase", "Bloom Gate"],
    hazard: "Bramble Thorns & Slippery Bark",
  },
  {
    name: "Brass Carnival",
    tagline: "A whimsical fairground turning to the ticking of giant clockwork gears.",
    palette: "from-amber-900/60 to-orange-950/80 border-amber-500/40 text-amber-300",
    badge: "World 02",
    description: "An abandoned dusk-lit midway driven by ancient cogs and pinwheels. Navigating this world demands keen jump timing as rotating gear obstacles test crew synchronization.",
    landmarks: ["Clockwork Entry", "Pinwheel Path", "Midnight Midway", "The Great Wheel"],
    hazard: "Rotating Brass Gears & Narrow Pinwheels",
  },
  {
    name: "Tideglass Reefs",
    tagline: "Subterranean bioluminescent tidepools and crystal currents.",
    palette: "from-cyan-900/60 to-blue-950/80 border-cyan-500/40 text-cyan-300",
    badge: "World 03",
    description: "Sunken coral structures glowing with ambient phosphorescence. Upward bubbling geysers lift agile platformers across cavernous sea troughs and urchin-covered floor drops.",
    landmarks: ["Glasswater Run", "Coral Lift", "Current Crossing", "Pearl Passage"],
    hazard: "Spiny Sea Urchins & Abyssal Trenches",
  },
  {
    name: "Cloudspire Sky",
    tagline: "Ascend past the highest storm bells into the stellar stratosphere.",
    palette: "from-violet-900/60 to-indigo-950/80 border-violet-500/40 text-violet-300",
    badge: "World 04",
    description: "Float through high-altitude updrafts above the clouds. Thunderous storm orbs and crumbling cloud platforms require precise cooperative coordination to activate the grand celestial portal.",
    landmarks: ["Above the Bells", "Starfall Steps", "Gale Arcade", "Skyline Finale"],
    hazard: "Storm Orbs & High-Altitude Updrafts",
  },
];

const CREW = [
  { name: "Scout", role: "Vanguard", color: "#fff172", bg: "bg-yellow-400", desc: "Nimble pathfinder who spots hidden spirit lights and surveys platform gaps." },
  { name: "Spark", role: "Catalyst", color: "#ff8fb0", bg: "bg-pink-400", desc: "Energetic jumper whose rapid cadence helps synchronize pressure-plate timing." },
  { name: "Echo", role: "Navigator", color: "#8cf2e4", bg: "bg-teal-300", desc: "Patient surveyor who bridges wide chasms and keeps the team tethered." },
  { name: "Flare", role: "Anchor", color: "#c6a1ff", bg: "bg-purple-400", desc: "Steadfast guide who ensures every crew member reaches the exit portal safely." },
];

const MECHANICS = [
  {
    title: "The Sync Link & Proximity",
    icon: "⚡",
    description: "When you move within 350px of a teammate, a glowing bridge appears over a tricky gap. Stay close to keep the bridge solid.",
  },
  {
    title: "Dual Pressure Plates",
    icon: "⚖️",
    description: "The ancient trailhead gates are secured by paired ancient plates. Both switches must be depressed to lower the gate and illuminate the path toward the level portal.",
  },
  {
    title: "Spirit Lights & Fireflies",
    icon: "✨",
    description: "Collect all four spirit lights to finish a trail. Two optional fireflies in each level reward curious explorers without blocking the exit.",
  },
  {
    title: "Jump Buffering & Coyote Time",
    icon: "🦘",
    description: "Precision platforming engineered for responsiveness: jump inputs are buffered for 120ms before landing, and a 100ms coyote grace window guarantees smooth platform exits.",
  },
];

const TECH_HIGHLIGHTS = [
  {
    title: "Zero-Dependency Procedural Audio",
    detail: "Synthesized via native Web Audio API oscillators and gain envelopes. Ambient soundscapes and dynamic victory fanfares render in real time without audio file lag.",
  },
  {
    title: "Canvas 2D Game Engine",
    detail: "A requestAnimationFrame physics loop draws the characters, parallax scenery, and effects while syncing room state across devices.",
  },
  {
    title: "Accessible & Responsive Everywhere",
    detail: "Includes screen-reader status updates, custom touch control layouts, keyboard focus indicators, and reduced-motion support.",
  },
];

export default function TrailJournalPage() {
  return (
    <main className="min-h-screen bg-[#071927] text-[#fff4d2] font-sans antialiased selection:bg-yellow-400/30 selection:text-yellow-200">
      {/* Top Bar Header */}
      <header className="border-b border-[#fff3bf2b] bg-[#061826]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-black tracking-[3px] text-[#fff8dc] hover:text-[#ffe26f] transition-colors flex items-center gap-2 group"
          aria-label="Return to Tandem Trails game"
        >
          <span className="text-[#ffe26f] group-hover:-translate-x-1 transition-transform">←</span>
          TANDEM TRAILS
        </Link>
        <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest text-[#aee9cd]">
          <span className="hidden sm:inline">EXPLORER&apos;S LOGBOOK</span>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-full bg-[#123747] border border-[#ffe26a]/40 text-[#ffe26a] hover:bg-[#1a4a5e] transition-all text-[11px]"
          >
            PLAY NOW →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <p className="text-xs font-black tracking-[4px] text-[#aee9cd] uppercase">
            Official Archives & Field Manual
          </p>
          <h1 className="text-4xl sm:text-6xl font-black text-[#fff1bd] tracking-tight font-serif drop-shadow-md">
            The Trail Journal
          </h1>
          <p className="text-base sm:text-lg text-[#cbd8c7] italic font-serif leading-relaxed">
            &ldquo;No path in the Wilds is walked alone. Every gap crossed, gear timed, and portal unlocked is a victory shared between kindred spirits.&rdquo;
          </p>
        </section>

        {/* World Guide */}
        <section aria-labelledby="worlds-heading" className="space-y-6">
          <div className="border-b border-[#ffffff15] pb-3 flex items-baseline justify-between">
            <h2 id="worlds-heading" className="text-xl sm:text-2xl font-black text-[#fff0b5] font-serif">
              The Four Realms
            </h2>
            <span className="text-xs text-[#aee9cd] font-semibold tracking-wider">16 TOTAL EXPEDITIONS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {WORLDS.map((world) => (
              <article
                key={world.name}
                className={`p-6 rounded-2xl bg-gradient-to-br ${world.palette} border backdrop-blur-sm shadow-xl flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#061826]/70 border border-current">
                      {world.badge}
                    </span>
                    <span className="text-[11px] text-[#f8eed3]/70 font-semibold italic">
                      Hazard: {world.hazard}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-serif text-[#fff4d2]">{world.name}</h3>
                  <p className="text-xs font-semibold italic text-[#ffe9a7] mt-1">{world.tagline}</p>
                  <p className="text-sm text-[#cbd8c7] mt-3 leading-relaxed">{world.description}</p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-bold tracking-wider text-[#aee9cd] uppercase mb-2">Key Trails:</p>
                  <div className="flex flex-wrap gap-2">
                    {world.landmarks.map((mark, idx) => (
                      <span key={mark} className="text-[11px] bg-[#071927]/80 px-2.5 py-1 rounded-lg border border-white/10 text-[#f8eed3]">
                        {idx + 1}. {mark}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Mechanics & Strategy */}
        <section aria-labelledby="mechanics-heading" className="space-y-6">
          <div className="border-b border-[#ffffff15] pb-3">
            <h2 id="mechanics-heading" className="text-xl sm:text-2xl font-black text-[#fff0b5] font-serif">
              Mechanics & Co-op Synergy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {MECHANICS.map((mech) => (
              <div key={mech.title} className="p-5 rounded-2xl bg-[#0b2c3b]/70 border border-[#fff0bb22] shadow-lg flex gap-4 items-start">
                <span className="text-3xl p-2 rounded-xl bg-[#061826] border border-[#aee9cd]/30" aria-hidden="true">
                  {mech.icon}
                </span>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#ffe283]">{mech.title}</h3>
                  <p className="text-xs sm:text-sm text-[#cbd8c7] leading-relaxed">{mech.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Crew */}
        <section aria-labelledby="crew-heading" className="space-y-6">
          <div className="border-b border-[#ffffff15] pb-3 flex items-baseline justify-between">
            <h2 id="crew-heading" className="text-xl sm:text-2xl font-black text-[#fff0b5] font-serif">
              The Trail Crew
            </h2>
            <span className="text-xs text-[#aee9cd] font-semibold tracking-wider">UP TO 4 PLAYERS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREW.map((member) => (
              <div key={member.name} className="p-4 rounded-xl bg-[#092231] border border-[#ffe9a222] flex flex-col items-center text-center space-y-2">
                <div
                  className="w-12 h-12 rounded-full border-2 border-white/40 shadow-inner flex items-center justify-center font-black text-slate-900 text-lg"
                  style={{ backgroundColor: member.color }}
                  aria-hidden="true"
                >
                  {member.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#fff4d2]">{member.name}</h3>
                  <span className="text-[10px] font-bold tracking-widest text-[#aee9cd] uppercase">{member.role}</span>
                </div>
                <p className="text-xs text-[#aabdb2] leading-snug">{member.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Developer & Engine Highlights */}
        <section aria-labelledby="tech-heading" className="space-y-6">
          <div className="border-b border-[#ffffff15] pb-3">
            <h2 id="tech-heading" className="text-xl sm:text-2xl font-black text-[#fff0b5] font-serif">
              Engineering Chronicle & Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TECH_HIGHLIGHTS.map((tech) => (
              <div key={tech.title} className="p-5 rounded-xl bg-[#0a1e2d] border border-cyan-500/20 space-y-2">
                <h3 className="font-bold text-sm text-[#8cf2e4]">{tech.title}</h3>
                <p className="text-xs text-[#cbd8c7] leading-relaxed">{tech.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Footer */}
        <section className="text-center p-8 rounded-3xl bg-gradient-to-r from-[#123747] to-[#0d2a37] border border-[#ffe26a]/40 shadow-2xl space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[#fff1bd] font-serif">
            Ready to Embark on the Trail?
          </h2>
          <p className="text-sm text-[#cbd8c7] max-w-md mx-auto">
            Gather your crew, share a room code, and experience pure cooperative platforming from anywhere.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="ui-btn inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-b from-[#ffe982] to-[#f1b93f] text-[#1a2a34] font-black text-sm tracking-wide shadow-lg hover:brightness-110 active:translate-y-0.5 transition-all"
            >
              LAUNCH GAME LOBBY →
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#ffffff15] py-8 text-center text-xs text-[#cbd8c7]/60 space-y-2">
        <p>TANDEM TRAILS · AN ORIGINAL COOPERATIVE PLATFORM ADVENTURE</p>
        <p>Crafted for synchronous teamwork with no sign-in or installation.</p>
      </footer>
    </main>
  );
}
