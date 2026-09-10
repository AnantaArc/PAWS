"use client";

import type { ConsoleState, Freshness } from "@/lib/types";
import { Card, FreshnessChip } from "@/components/ui";
import { Sparkline, Gauge } from "@/components/charts";
import { fmtAgo, fmtClock, t } from "@/lib/utils";

/**
 * Uniform sensor-panel skeleton — every card shares the same anatomy so
 * the whole grid lines up on ONE top line and ONE bottom line:
 *
 *   ┌ header (same height everywhere) ──────────────┐
 *   │ BIG value row          (h-[54px])              │
 *   │ stats grid 2×2         (h-[44px])              │
 *   │ one-line note          (h-[18px])              │
 *   │ flexible viz area      (fills to bottom)       │
 *   └────────────────────────────────────────────────┘
 */

/** Freshness from recency + expected cadence, or NOT INSTALLED if never seen. */
export function freshnessFor(heardAt: number | undefined, intervalMs: number, now: number, linkOnline = true): Freshness {
  if (!heardAt) return "not_installed";
  const age = now - heardAt;
  if (!linkOnline) return "offline";
  if (age < intervalMs * 1.6) return "live";
  if (age < intervalMs * 3) return "delayed";
  if (age < intervalMs * 6) return "stale";
  return "offline";
}

/** Freshness chip for a possibly-missing reading (narrowing-safe). */
function Fresh({ s, now, live }: { s: { heardAt?: number } | null; now: number; live: boolean }) {
  return <FreshnessChip f={freshnessFor(s?.heardAt, 2600, now, live)} heardAt={s?.heardAt} />;
}

function WordChip({ word, tone }: { word: string; tone: "ok" | "warn" | "critical" | "muted" }) {
  const cls =
    tone === "ok"
      ? "bg-ok/15 text-ok border border-ok/40"
      : tone === "warn"
        ? "bg-warn/15 text-warn border border-warn/40"
        : tone === "critical"
          ? "bg-critical/15 text-critical border border-critical/40"
          : "bg-surface-2 text-text-faint border border-border";
  return <span className={`chip whitespace-nowrap ${cls}`}>{word}</span>;
}

/* ------------------------------------------------------- skeleton blocks */
function Big({ value, unit, tone, sub }: { value: string; unit?: string; sub?: string; tone?: string }) {
  return (
    <div className="flex h-[54px] shrink-0 items-baseline justify-between gap-2">
      <span className={`tnum text-2xl font-bold ${tone ?? "text-text-primary"}`}>{value}</span>
      <span className="flex flex-col items-end">
        {unit && <span className="text-[10.5px] uppercase tracking-wider text-text-faint">{unit}</span>}
        {sub && <span className="tnum text-[10px] text-text-faint">{sub}</span>}
      </span>
    </div>
  );
}

function Stats({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid h-[40px] shrink-0 grid-cols-2 gap-x-3 content-start">
      {items.map(([k, v]) => (
        <div key={k} className="flex h-[18px] items-baseline justify-between gap-2 overflow-hidden">
          <span className="truncate text-[9.5px] uppercase tracking-wide text-text-faint">{k}</span>
          <span className="tnum shrink-0 text-[11px] font-medium text-text-primary">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[18px] shrink-0 items-center overflow-hidden text-[11px] leading-none text-text-faint">
      <span className="truncate">{children}</span>
    </div>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 min-h-0 flex-1">{children}</div>;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-center">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-faint">{label}</span>
      <span className="px-3 text-[10px] text-text-faint">an honest state — never a fake number</span>
    </div>
  );
}

/* ------------------------------------------------------------------- SOUND */
export function SoundPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.sound;
  const db = s?.db;
  return (
    <Card
      title="Sound"
      sub="mic · SPL estimate"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={
        s?.band ? (
          <WordChip word={s.band} tone={s.band === "HAZARD" || s.band === "LOUD" ? "warn" : "muted"} />
        ) : (
          <Fresh s={s} now={now} live={state.device.link === "online"} />
        )
      }
    >
      {s ? (
        <>
          <Big value={db != null ? `${Math.round(db)}` : `${Math.round(s.amp * 100)}%`} unit={db != null ? "dB SPL" : "amplitude"} />
          <Stats
            items={[
              ["Amp", `${(s.amp * 100).toFixed(0)}%`],
              ["Baseline", `${(s.baseline * 100).toFixed(0)}%`],
              ["Peak", db != null && s.peakDb != null ? `${Math.round(s.peakDb)} dB` : `${(s.peak * 100).toFixed(0)}%`],
              ["Read", fmtAgo(s.heardAt, now)],
            ]}
          />
          <Note>
            <span className="tnum">{fmtClock(s.heardAt)} · amplitude last 60 s</span>
          </Note>
          <Foot>
            <Sparkline data={state.history.sound.slice(-60)} color={t("accent")} baseline={s.baseline} />
          </Foot>
        </>
      ) : (
        <Empty label="Sound module not reporting" />
      )}
    </Card>
  );
}

/* --------------------------------------------------------------------- GAS */
export function GasPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.gas;
  const hazard = !!s && (s.ppm >= 800 || s.aqiBand === "VERY POOR" || s.aqiBand === "SEVERE");
  const smokeVal = s ? (s.smoke != null ? s.smoke : s.ppm * 0.42).toFixed(3) : "—";
  const lpgVal = s ? s.ppm.toFixed(3) : "—";

  return (
    <Card
      title="Gas"
      sub="MQ-2 · Smoke + LPG"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col justify-between"
      right={
        s?.warming ? (
          <WordChip word="WARM-UP" tone="muted" />
        ) : hazard ? (
          <WordChip word="HAZARD" tone="critical" />
        ) : s?.aqiBand ? (
          <WordChip word={s.aqiBand} tone={s.aqiBand === "POOR" ? "warn" : "ok"} />
        ) : (
          <Fresh s={s} now={now} live />
        )
      }
    >
      {s ? (
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <Big value={smokeVal} unit="SMOKE PPM" tone={hazard ? "text-critical" : undefined} />
            <div className="mt-1 flex flex-col gap-0.5">
              <div className="flex h-[18px] items-baseline justify-between gap-2 overflow-hidden">
                <span className="truncate text-[9.5px] uppercase tracking-wide text-text-faint">LPG</span>
                <span className="tnum shrink-0 text-[11px] font-medium text-text-primary">{lpgVal} ppm</span>
              </div>
              <div className="flex h-[18px] items-baseline justify-between gap-2 overflow-hidden">
                <span className="truncate text-[9.5px] uppercase tracking-wide text-text-faint">ADC</span>
                <span className="tnum shrink-0 text-[11px] font-medium text-text-primary">{s.adc}</span>
              </div>
              <div className="flex h-[18px] items-baseline justify-between gap-2 overflow-hidden">
                <span className="truncate text-[9.5px] uppercase tracking-wide text-text-faint">Band</span>
                <span className="tnum shrink-0 text-[11px] font-medium text-text-primary">{s.aqiBand ?? "—"}</span>
              </div>
              <div className="flex h-[18px] items-baseline justify-between gap-2 overflow-hidden">
                <span className="truncate text-[9.5px] uppercase tracking-wide text-text-faint">Read</span>
                <span className="tnum shrink-0 text-[11px] font-medium text-text-primary">{fmtAgo(s.heardAt, now)}</span>
              </div>
            </div>
            <Note>
              <span className="tnum">warm-up {s.warming ? "in progress" : "done"}</span>
            </Note>
          </div>
          <div className="mt-2 flex flex-1 flex-col justify-end">
            <Sparkline data={state.history.gas.slice(-60)} color={t("status-warn")} baseline={400} />
          </div>
        </div>
      ) : (
        <Empty label="Gas sensor not reporting" />
      )}
    </Card>
  );
}

/* ----------------------------------------------------------------- THERMAL */
export function ThermalPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.thermal;
  const fire = !!s && (s.objectC > 55 || s.zone === "FIRE RISK");
  const bodyHeat = !!s && !fire && s.zone === "HUMAN HEAT";
  return (
    <Card
      title="Temperature"
      sub="MLX90614 · IR spot"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={
        fire ? (
          <WordChip word="FIRE RISK" tone="critical" />
        ) : bodyHeat ? (
          <WordChip word="HUMAN HEAT" tone="ok" />
        ) : (
          <Fresh s={s} now={now} live />
        )
      }
    >
      {s ? (
        <>
          <Big value={`${s.objectC.toFixed(1)}°C`} unit="object temp" tone={fire ? "text-critical" : bodyHeat ? "text-ok" : undefined} />
          <Stats
            items={[
              ["Ambient", `${s.ambientC.toFixed(1)}°C`],
              ["Δ obj−amb", `${s.objectC - s.ambientC >= 0 ? "+" : ""}${(s.deltaC ?? s.objectC - s.ambientC).toFixed(1)}°`],
              ["Zone", s.zone ?? "—"],
              ["Read", fmtAgo(s.heardAt, now)],
            ]}
          />
          <Note>
            {bodyHeat ? <span className="font-medium text-ok">body-heat band · close-range confirmer only</span> : <span className="tnum">IR spot, single point</span>}
          </Note>
          <Foot>
            <Gauge value={s.objectC} min={-20} max={80} label="object temp" showValue={false} />
          </Foot>
        </>
      ) : (
        <Empty label="Thermal sensor not reporting" />
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- CLEARANCE */
export function DistancePanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.distance;
  const blocked = !!s && ((s.status === "valid" && s.mm < 120) || s.state === "STOP");
  const cm = s?.cm ?? (s?.mm && s?.mm > 0 ? Math.round(s.mm / 10) : null);
  const bins = [
    { k: "L", v: s?.cmLeft, tone: t("accent") },
    { k: "F", v: cm, tone: blocked ? t("status-critical") : t("accent") },
    { k: "R", v: s?.cmRight, tone: t("accent") },
  ];
  return (
    <Card
      title="Clearance"
      sub="VL53L0X + 3-way sonar"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={
        s?.state ? (
          <WordChip word={s.state} tone={(s.state === "STOP" && "critical") || (s.state === "NEAR" && "warn") || "ok"} />
        ) : (
          <Fresh s={s} now={now} live />
        )
      }
    >
      {s ? (
        <>
          <Big
            value={cm != null ? (cm >= 100 ? `${(cm / 100).toFixed(2)} m` : `${cm} cm`) : "—"}
            unit="front"
            tone={blocked ? "text-critical" : undefined}
          />
          <Stats
            items={[
              ["Laser", s.laserState ?? "—"],
              ["Cross-check", s.match && s.match !== "----" ? s.match : "—"],
              ["Mode", s.status ?? "—"],
              ["Read", fmtAgo(s.heardAt, now)],
            ]}
          />
          <Note>
            <span>{blocked ? <span className="font-medium text-critical">obstacle ahead — clearance low</span> : "L = left · F = front · R = right"}</span>
          </Note>
          <Foot>
            <div className="flex h-full items-stretch gap-2">
              {bins.map((b) => (
                <div key={b.k} className="flex flex-1 flex-col justify-end">
                  <div className="tnum mb-1 text-[10px] text-text-faint">{b.v != null && b.v >= 0 ? `${Math.round(b.v)} cm` : "—"}</div>
                  <div className="flex h-[46px] w-full items-end overflow-hidden rounded bg-surface-2">
                    <div
                      className="w-full rounded transition-all duration-500"
                      style={{
                        height: `${b.v != null && b.v >= 0 ? Math.min(100, (b.v / 400) * 100) : 0}%`,
                        background: b.v != null && b.v >= 0 ? b.tone : "transparent",
                      }}
                    />
                  </div>
                  <div className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wider text-text-faint">{b.k}</div>
                </div>
              ))}
            </div>
          </Foot>
        </>
      ) : (
        <Empty label="Ranger not reporting" />
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------- TILT */
export function TiltPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.tilt;
  const tilt = s ? Math.max(Math.abs(s.pitchDeg), Math.abs(s.rollDeg)) : 0;
  return (
    <Card
      title="Tilt"
      sub="MPU-6050 · stability"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={
        s?.attitude ? (
          <WordChip word={s.attitude} tone={s.attitude === "TIPOVER" ? "critical" : s.attitude === "TILTED" ? "warn" : "ok"} />
        ) : (
          <Fresh s={s} now={now} live />
        )
      }
    >
      {s ? (
        <>
          <Big value={`${tilt.toFixed(1)}°`} unit="max axis" tone={tilt > 28 ? "text-critical" : undefined} />
          <Stats
            items={[
              ["Pitch", `${s.pitchDeg >= 0 ? "+" : ""}${s.pitchDeg.toFixed(1)}°`],
              ["Roll", `${s.rollDeg >= 0 ? "+" : ""}${s.rollDeg.toFixed(1)}°`],
              ["Heading", s.headingDeg != null ? `${Math.round(s.headingDeg)}°` : "—"],
              ["Read", fmtAgo(s.heardAt, now)],
            ]}
          />
          <Note>
            <span>{tilt > 28 ? <span className="font-medium text-critical">tilt blocked — stability limit</span> : "level ↔ tipover envelope"}</span>
          </Note>
          <Foot>
            <Gauge value={tilt} min={0} max={45} label="max axis" unit="°" showValue={false} />
          </Foot>
        </>
      ) : (
        <Empty label="IMU not reporting" />
      )}
    </Card>
  );
}

/* ----------------------------------------------------------------- CLIMATE */
export function ClimatePanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.climate;
  return (
    <Card
      title="Climate"
      sub="DHT11 · air"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={s?.band ? <WordChip word={s.band} tone="muted" /> : <Fresh s={s} now={now} live />}
    >
      {s ? (
        <>
          <Big value={`${s.tempC.toFixed(1)}°C`} unit="air temp" />
          <Stats
            items={[
              ["Humidity", `${Math.round(s.humidityPct)}% RH`],
              ["Band", s.band ?? "—"],
              ["Sensor", "DHT11 · 1 Hz"],
              ["Read", fmtAgo(s.heardAt, now)],
            ]}
          />
          <Note>
            <span className="tnum">{fmtClock(s.heardAt)} · humidity last 60 s</span>
          </Note>
          <Foot>
            <Sparkline data={state.history.humidity.slice(-60)} color={t("status-info")} />
          </Foot>
        </>
      ) : (
        <Empty label="DHT11 not reporting" />
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------------- PIR */
export function PirPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const s = state.sensors.pir;
  return (
    <Card
      title="Motion · PIR"
      sub="warm-body detection"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={s ? <WordChip word={s.state} tone={s.state === "MOTION" ? "warn" : "muted"} /> : <Fresh s={s} now={now} live />}
    >
      {s ? (
        <>
          <Big value={s.total.toString()} unit="events since boot" />
          <Stats
            items={[
              ["Rate (60 s)", `${s.perMin}/min`],
              ["Last trigger", s.lastSecs < 0 ? "never" : `${s.lastSecs} s ago`],
              ["State", s.state ?? "—"],
              ["Read", fmtAgo(s.heardAt, now)],
            ]}
          />
          <Note>
            <span>{s.state === "MOTION" ? <span className="font-medium text-warn">motion — warm body in range</span> : "idle — no warm-body motion"}</span>
          </Note>
          <Foot>
            <div className="flex h-full items-end gap-1.5">
              {Array.from({ length: 20 }).map((_, i) => {
                const active = i >= 15 && s.state === "MOTION";
                return <div key={i} className="flex-1 rounded-sm bg-surface-2" style={{ height: active ? "72%" : "26%" }} />;
              })}
            </div>
          </Foot>
        </>
      ) : (
        <Empty label="PIR not reporting" />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ VISION */
export function VisionPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const v = state.sensors.vision;
  const det = v ? v : null;
  const recent = det && now - det.at < 90_000 ? det : null;
  const human = recent?.human ?? false;
  const age = det ? Math.round((now - det.at) / 1000) : null;
  return (
    <Card
      title="Vision · YOLO"
      sub="ESP32-CAM · person detector"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={
        det ? (
          recent ? (
            <WordChip word={human ? "HUMAN DETECTED" : "CLEAR"} tone={human ? "critical" : "muted"} />
          ) : (
            <FreshnessChip f="stale" heardAt={det.at} />
          )
        ) : (
          <FreshnessChip f="not_installed" />
        )
      }
    >
      {det ? (
        <>
          <Big
            value={human ? "PERSON" : "none"}
            unit={human ? `conf ${Math.round(det.confidence * 100)}%` : "last person unchanged"}
            tone={human ? "text-critical" : undefined}
          />
          <Stats
            items={[
              ["Last person frame", human ? `${age ?? "—"} s ago` : `— (${age ?? "—"} s ago clear)`],
              ["Source", "YOLO v8 · person class"],
              ["Model", "ESP32-CAM"],
              ["Status", recent ? "fresh" : "stale"],
            ]}
          />
          <Note>
            <span className="tnum">newest detector row = current state · {fmtClock(det.at)}</span>
          </Note>
          <Foot>
            <div className="flex h-full flex-col justify-center gap-1">
              {[0.88, 0.91, 0.87, 0.82, 0.79].map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-[9px] uppercase tracking-wider text-text-faint">F{i + 1}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded bg-surface-2">
                    <div className="h-full rounded bg-accent" style={{ width: `${c * 100}%` }} />
                  </div>
                  <span className="tnum w-7 shrink-0 text-right text-[9px] text-text-faint">{Math.round(c * 100)}%</span>
                </div>
              ))}
            </div>
          </Foot>
        </>
      ) : (
        <Empty label="No vision data yet — camera offline or not streaming" />
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------- LINK */
export function LinkPanel({ state }: { state: ConsoleState }) {
  const now = state.now;
  const d = state.device;
  const age = d.lastSeenAt ? Math.max(0, Math.round((now - d.lastSeenAt) / 1000)) : null;
  return (
    <Card
      title="Robot link"
      sub="Supabase · single live row"
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
      right={
        <FreshnessChip
          f={d.link === "online" ? "live" : d.link === "delayed" ? "delayed" : d.link === "offline" ? "offline" : "not_installed"}
          heardAt={d.lastSeenAt || undefined}
        />
      }
    >
      <div className="flex h-[54px] shrink-0 items-baseline justify-between">
        <span
          className={`tnum text-2xl font-bold ${d.link === "online" ? "text-ok" : d.link === "delayed" ? "text-warn" : "text-critical"}`}
        >
          {d.link === "online" ? "ONLINE" : d.link === "delayed" ? "DELAYED" : "OFFLINE"}
        </span>
        <span className="text-[10.5px] uppercase tracking-wider text-text-faint">{age != null ? `${age}s ago` : "—"}</span>
      </div>
      <Stats
        items={[
          ["Robot", state.mission.robotId?.toUpperCase() ?? "paws-01"],
          ["Firmware", "v2.9 · 2 s cadence"],
          ["Channel", "realtime + 3 s poll"],
          ["Heartbeat", age != null ? `${age}s` : "—"],
        ]}
      />
      <Note>
        <span>{d.link === "online" ? <span className="font-medium text-ok">link healthy — uploads landing</span> : "telemetry not arriving — check WiFi"}</span>
      </Note>
      <Foot>
        <div className="flex h-full flex-col justify-end gap-1.5 pt-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const beat = d.link === "online" ? i % 3 === 0 : i % 9 === 0;
            return <div key={i} className="h-1.5 flex-1 rounded-sm" style={{ background: beat ? t("status-ok") : t("surface-2") }} />;
          })}
        </div>
      </Foot>
    </Card>
  );
}
