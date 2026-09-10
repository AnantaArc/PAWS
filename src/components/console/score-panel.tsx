"use client";

import type { ConsoleState } from "@/lib/types";
import { Card, LevelBadge } from "@/components/ui";
import { Sparkline, TrendBar } from "@/components/charts";
import { fmtAgo, t } from "@/lib/utils";

const SRC_COLOR: Record<string, { color: string; key: "vision" | "sound" | "thermal" }> = {
  vision: { color: t("accent"), key: "vision" },
  sound: { color: t("status-info"), key: "sound" },
  thermal: { color: t("status-ok"), key: "thermal" },
};

export function ScorePanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const last = state.scoreHistory.slice(-1)[0];
  const reasons = last?.survivor.reasons ?? ["No evidence yet — score is 0 until a signal arrives."];
  const hist = state.scoreHistory.slice(-90);

  if (!last) {
    return (
      <Card title="Survivor Likelihood" sub="fusion v2 · explainable" className="flex h-full flex-col">
        <div className="flex h-full items-center justify-center text-[12px] text-text-faint">
          Waiting for the first telemetry tick…
        </div>
      </Card>
    );
  }

  // Weights come from the SAVED per-mission weights (settings screen),
  // normalised to 100% so the labels always match the engine, live.
  const w = last.weights;
  const wTotal = w.vision + w.sound + w.thermal || 1;
  const pct = (x: number) => Math.round((x / wTotal) * 100);

  const sources = [
    { key: "vision", label: "VISION", v: last.survivor.breakdown.vision.value, note: last.survivor.breakdown.vision.note, weightPct: pct(w.vision) },
    { key: "sound", label: "SOUND", v: last.survivor.breakdown.sound.value, note: last.survivor.breakdown.sound.note, weightPct: pct(w.sound) },
    { key: "thermal", label: "THERMAL", v: last.survivor.breakdown.thermal.value, note: last.survivor.breakdown.thermal.note, weightPct: pct(w.thermal) },
  ];

  return (
    <Card
      title="Survivor Likelihood"
      sub={`fusion v${last.weights.version} · timestamped ${fmtAgo(last.ts, now)}`}
      right={<LevelBadge level={last.survivor.level} />}
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col p-4"
    >
      <div className="flex shrink-0 items-end justify-between">
        <div>
          <span className="tnum text-5xl font-extrabold leading-none text-text-primary">
            {last.survivor.value.toFixed(2)}
          </span>
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-text-faint">/ 1.00</span>
        </div>
        <div className="w-28">
          <Sparkline data={hist.map((h) => h.survivor.value)} height={44} color={t("accent")} />
        </div>
      </div>

      {/* three independent sources — the deck's "not just numbers" */}
      <div className="mt-4 space-y-2.5">
        {sources.map((s) => (
          <div key={s.key} title={s.note}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold tracking-wide text-text-muted">
                {s.label} <span className="ml-1 text-text-faint">({s.weightPct}% weight)</span>
              </span>
              <span className="tnum font-bold text-text-primary">{s.v.toFixed(2)}</span>
            </div>
            <TrendBar value={s.v} color={SRC_COLOR[s.key].color} />
          </div>
        ))}
      </div>

      {/* why — plain English, always (scrolls inside the fixed card) */}
      <div className="scroll-thin mt-4 min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-bg/50 p-2.5">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint">Why this score</div>
        <ul className="space-y-1">
          {reasons.map((r, i) => (
            <li key={i} className="break-words text-[11.5px] leading-snug text-text-muted">
              {r}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
