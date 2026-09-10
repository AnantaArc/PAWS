import Link from "next/link";
import { Radio, MapPin, Flame, User, ArrowRight, QrCode, History } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";

const FEATURES = [
  {
    icon: <User size={18} />,
    title: "Three survivor signals, fused",
    body: "Vision, sound and thermal evidence combine into one timestamped, explainable survivor-likelihood score — never a bare number.",
  },
  {
    icon: <MapPin size={18} />,
    title: "Origin-anchored coordinates",
    body: "PAWS reports positions relative to its walk-in anchor, so on-field rescuers get a trail, pins and bearings they can actually navigate indoors.",
  },
  {
    icon: <Flame size={18} />,
    title: "Hazard awareness",
    body: "Gas concentration map and fire-risk temperature detection keep the rescue team out of danger while the robot goes in.",
  },
  {
    icon: <QrCode size={18} />,
    title: "Field rescue link",
    body: "One QR opens a live, read-only mobile view with survivor coordinates — mission control hands the rescuer the exact spot to walk to.",
  },
  {
    icon: <History size={18} />,
    title: "Replay & mission reports",
    body: "Scrub any mission from the archive, then export a full report with the sensor state at every event timestamp.",
  },
  {
    icon: <Radio size={18} />,
    title: "Live mission console",
    body: "Freshness-tracked telemetry, audited commands and a plain-English activity feed — built like an operations tool, not a demo.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-text-primary">
      {/* top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Logo size={36} withText />
          <span className="hidden text-[12px] text-text-faint sm:block">· Rescue Mission Console</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/console"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-slate-950 hover:brightness-110"
          >
            Launch Console <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="mb-5 flex items-center gap-4">
          <Logo size={68} className="paws-float" />
          <div>
            <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-dim px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
              SIH 2026 · PS 26223 · Disaster Management
            </div>
            <p className="text-[11px] tracking-[0.3em] text-text-faint">
              ANANTA ARC · POST-DISASTER AUTONOMOUS WALKING SCOUT
            </p>
          </div>
        </div>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Where survivors are most likely to be —{" "}
          <span className="text-accent">timestamped and explained.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-text-muted">
          PAWS is a 12-DOF autonomous quadruped that walks into disaster zones and streams live sensor intelligence —
          camera, sound, gas, temperature, position — to a responder console. The robot takes the risk; the console
          gives the rescue team the score.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/console"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-slate-950 hover:brightness-110"
          >
            Open Mission Console
          </Link>
          <Link
            href="/replay"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-2.5 text-[14px] font-medium text-text-primary hover:border-accent/50"
          >
            Watch a mission replay
          </Link>
          <Link
            href="/status"
            className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[14px] font-medium text-text-muted hover:text-accent"
          >
            System status
          </Link>
        </div>
      </section>

      {/* features */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dim text-accent">
                {f.icon}
              </div>
              <h3 className="mb-1.5 text-[14px] font-semibold">{f.title}</h3>
              <p className="text-[12.5px] leading-relaxed text-text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-[12px] text-text-faint">
        PAWS Console · Built for NDRF-style field operations · Software demo build v1.0
      </footer>
    </main>
  );
}
