"use client";

import Link from "next/link";
import { LogOut, History, Settings2, Activity } from "lucide-react";
import type { ConsoleState } from "@/lib/types";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/logo";
import { cn, fmtDuration } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export function Header({
  state,
  user,
  onEndMission,
  onLogout,
}: {
  state: ConsoleState;
  user: SessionUser;
  onEndMission: () => void;
  onLogout: () => void;
}) {
  const m = state.mission;
  const elapsed = (m.endedAt ?? state.now) - m.startedAt;
  const link = state.device.link;
  const sim = state.simulated;

  return (
    <header className="flex items-center gap-4 border-b border-border bg-surface px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <Logo size={32} withText />
      </div>

      <div className="hidden items-center gap-4 border-l border-border pl-4 md:flex">
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-text-faint">Mission</div>
          <div className="tnum max-w-[220px] truncate text-[13px] font-semibold">{m.name}</div>
        </div>
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-text-faint">Status</div>
          <div
            className={cn(
              "text-[13px] font-bold uppercase tracking-wide",
              m.status === "running" ? "text-ok" : m.status === "paused" ? "text-warn" : "text-text-muted"
            )}
          >
            {m.status}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-text-faint">Elapsed</div>
          <div className="tnum text-[13px] font-semibold text-accent">{fmtDuration(elapsed)}</div>
        </div>
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-text-faint">Robot</div>
          <div
            className={cn(
              "tnum text-[13px] font-semibold",
              link === "online" ? "text-ok" : link === "delayed" ? "text-warn" : "text-critical"
            )}
          >
            {link === "online" ? "ONLINE" : link === "delayed" ? "DELAYED" : "OFFLINE"}
          </div>
        </div>
      </div>

      <nav className="ml-auto hidden items-center gap-1 lg:flex">
        {[
          { href: "/replay", icon: <History size={14} />, label: "Replay" },
          { href: "/settings", icon: <Settings2 size={14} />, label: "Settings" },
          { href: "/status", icon: <Activity size={14} />, label: "Status" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-accent"
          >
            {l.icon}
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 lg:ml-2">
        {sim && (
          <span className="chip sim-badge" title="A scripted robot drives this data — the real ESP32 uploads the same way">
            SIMULATED DATA
          </span>
        )}
        <span className="chip hidden border border-border bg-surface-2 text-text-muted sm:inline-flex" title="Last telemetry received">
          <span className={cn("h-1.5 w-1.5 rounded-full", link === "online" ? "animate-pulse bg-ok" : "bg-critical")} />
          {state.device.lastSeenAt ? `${Math.max(0, Math.round((state.now - state.device.lastSeenAt) / 1000))}s` : "—"}
        </span>
        <button
          onClick={async () => {
            if (user.role === "observer") return;
            const res = await fetch("/api/mode", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ mode: state.mode === "local" ? "supabase" : "local" }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => null);
              window.alert(d?.error ?? "Mode switch failed");
              return;
            }
            window.location.reload();
          }}
          disabled={user.role === "observer"}
          title={user.role === "observer" ? "Observer role: mode changes disabled" : "One-click switch: live Supabase data ↔ simulated demo loop (Wi-Fi fallback)"}
          className={cn(
            "chip border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            user.role !== "observer" && "cursor-pointer",
            state.mode === "local"
              ? "bg-warn/15 text-warn border-warn/30 hover:bg-warn/25"
              : "bg-ok/15 text-ok border-ok/30 hover:bg-ok/25"
          )}
        >
          {state.mode === "local" ? "LOCAL DEMO MODE" : "SUPABASE MODE"}
        </button>
        <span className="chip hidden border border-border bg-surface-2 text-text-muted md:inline-flex" title="Operator name (typed at login)">
          {user.name}
        </span>
        <span
          className="chip hidden border border-ok/30 bg-ok/10 text-ok sm:inline-flex"
          title="The PAWS robot this session is driving (selected at login)"
        >
          ROBOT {user.robotId.toUpperCase()}
        </span>
        <span className="chip hidden border border-border bg-surface-2 text-text-muted lg:inline-flex">
          {user.role.toUpperCase()}
        </span>
        {user.role === "operator" && (m.status === "running" || m.status === "paused") && (
          <button
            onClick={onEndMission}
            className="rounded-md border border-border px-2.5 py-1.5 text-[11.5px] font-medium text-text-muted hover:border-warn/50 hover:text-warn"
          >
            End mission
          </button>
        )}
        <ThemeToggle />
        <button onClick={onLogout} className="text-text-faint hover:text-critical" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
