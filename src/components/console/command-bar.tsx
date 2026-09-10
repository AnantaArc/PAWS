"use client";

import { useState } from "react";
import { OctagonAlert, Play, Anchor, RefreshCw } from "lucide-react";
import type { Command, ConsoleState } from "@/lib/types";
import type { Role } from "@/lib/auth";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const STAGES: Array<Command["current"]> = ["queued", "delivered", "acknowledged", "done", "failed"];

/** The command lifecycle: queued → delivered → acknowledged → done/failed. */
export function CommandBar({
  state,
  role,
  onCommand,
}: {
  state: ConsoleState;
  role: Role;
  onCommand: (t: Command["type"], params?: Record<string, string>) => Promise<void>;
}) {
  const [busyType, setBusyType] = useState<string | null>(null);
  const observer = role !== "operator";

  async function fire(t: Command["type"], params?: Record<string, string>) {
    setBusyType(t);
    await onCommand(t, params);
    setBusyType(null);
  }

  const latest = state.commands.slice(0, 3);
  const link = state.device.link;

  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-muted">Command</h3>
        <span
          className={cn(
            "text-[11px] font-medium",
            link === "online" ? "text-ok" : link === "delayed" ? "text-warn" : "text-critical"
          )}
        >
          {link === "online" ? "ROBOT LINK OK" : link === "delayed" ? "LINK DELAYED" : "ROBOT OFFLINE — commands disabled"}
        </span>
      </header>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <Button
          variant="danger"
          disabled={observer || link === "offline"}
          onClick={() => fire("estop")}
          className="px-5 py-2 text-[14px] font-bold"
        >
          <OctagonAlert size={16} /> E-STOP
        </Button>
        <Button variant="success" disabled={observer || link === "offline"} onClick={() => fire("resume")}>
          <Play size={14} /> Resume
        </Button>
        <Button disabled={observer || link === "offline"} onClick={() => fire("re_anchor")}>
          <Anchor size={14} /> Re-anchor origin
        </Button>
        <Button disabled={observer || link === "offline"} onClick={() => fire("set_mode", { mode: "search" })}>
          <RefreshCw size={14} /> Mode: Search
        </Button>
        {observer && <span className="ml-auto text-[11px] italic text-text-faint">observer session — commands disabled</span>}
      </div>

      {/* lifecycle strip */}
      <div className="border-t border-border px-4 py-2.5">
        {latest.length === 0 ? (
          <p className="text-[11px] text-text-faint">No commands issued yet.</p>
        ) : (
          <div className="space-y-1.5">
            {latest.map((c) => (
              <CommandRow key={c.id} cmd={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CommandRow({ cmd }: { cmd: Command }) {
  const label: Record<string, string> = {
    estop: "EMERGENCY STOP",
    resume: "Resume mission",
    re_anchor: "Re-anchor origin",
    set_mode: "Set mode",
  };
  const activeIdx = STAGES.indexOf(cmd.current === "failed" ? "failed" : cmd.current === "done" ? "done" : cmd.current);
  const failed = cmd.current === "failed";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-bg/40 px-2.5 py-1.5">
      <span className={cn("text-[11.5px] font-bold", cmd.type === "estop" ? "text-critical" : "text-text-primary")}>
        {label[cmd.type]}
      </span>
      <div className="flex items-center gap-1">
        {(["queued", "delivered", "acknowledged", "done"] as const).map((s, i) => {
          const reached = failed ? i < 3 : i <= activeIdx;
          return (
            <span key={s} className="flex items-center gap-1">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                  failed && s === "acknowledged"
                    ? "bg-critical/20 text-critical"
                    : reached
                      ? "bg-ok/15 text-ok"
                      : "bg-surface-2 text-text-faint"
                )}
              >
                {s}
              </span>
              {i < 3 && <span className="h-px w-2 bg-border" />}
            </span>
          );
        })}
        {failed && <span className="rounded bg-critical/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-critical">failed</span>}
      </div>
      <span className="tnum ml-auto text-[10px] text-text-faint">by {cmd.issuedBy}</span>
    </div>
  );
}
