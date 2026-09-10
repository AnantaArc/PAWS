"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, User, Bot } from "lucide-react";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

interface RobotOption {
  id: string;
  name: string;
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/console";
  const [email, setEmail] = useState("operator@paws.local");
  const [password, setPassword] = useState("paws-demo-operator");
  const [operatorName, setOperatorName] = useState("");
  const [robotId, setRobotId] = useState("paws-01");
  const [robots, setRobots] = useState<RobotOption[]>([{ id: "paws-01", name: "PAWS Alpha" }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"local" | "supabase">("local");

  useEffect(() => {
    fetch("/api/auth/login")
      .then((r) => r.json())
      .then((d) => {
        if (d.mode) setMode(d.mode);
        if (Array.isArray(d.robots) && d.robots.length > 0) {
          setRobots(d.robots);
          if (!d.robots.some((r: RobotOption) => r.id === robotId)) {
            setRobotId(d.robots[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        operatorName: operatorName.trim() || undefined,
        robotId,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm animate-risein">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface p-1">
            <Logo size={42} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-text-primary">PAWS Console</h1>
            <p className="text-[12px] text-text-muted">Post-disaster Autonomous Walking Scout</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-5 shadow-xl">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">Sign in</h2>
          <p className="mb-4 text-[12px] text-text-muted">
            Operators command the robot. Observers watch live — and cannot touch controls.
          </p>

          {mode === "local" && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-warn">
              <ShieldAlert size={14} />
              DEMO MODE — local auth. In production this uses Supabase Auth + RLS.
            </div>
          )}

          {/* personalized operator name — shown in the header, used for command attribution */}
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
            <User size={12} /> Operator name <span className="font-normal text-text-faint">(optional)</span>
          </label>
          <input
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            type="text"
            maxLength={40}
            placeholder="e.g. Jash"
            className="mb-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
          />

          {/* which PAWS robot this session drives (per-robot missions) */}
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
            <Bot size={12} /> PAWS robot
          </label>
          <select
            value={robotId}
            onChange={(e) => setRobotId(e.target.value)}
            className="mb-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
          >
            {robots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </select>

          <label className="mb-1 block text-[12px] font-medium text-text-muted">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mb-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
          />
          <label className="mb-1 block text-[12px] font-medium text-text-muted">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent"
          />

          {error && <p className="mb-3 text-[12px] text-critical">{error}</p>}

          <Button type="submit" variant="primary" className="w-full py-2" disabled={busy}>
            {busy ? "Signing in…" : "Launch Console"}
          </Button>
          {busy && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded bg-surface-2">
              <div className="paws-progress-bar h-full bg-accent" />
            </div>
          )}

          {mode === "local" && (
            <div className="mt-4 rounded-md border border-border bg-bg p-3 text-[11px] text-text-muted">
              <div className="mb-1 font-semibold uppercase tracking-wider text-text-faint">Demo accounts</div>
              <div className="flex justify-between">
                <span>operator@paws.local</span>
                <code className="tnum text-accent">paws-demo-operator</code>
              </div>
              <div className="flex justify-between">
                <span>observer@paws.local</span>
                <code className="tnum text-accent">paws-demo-observer</code>
              </div>
            </div>
          )}
        </form>

        <p className="mt-4 text-center text-[12px] text-text-faint">
          <Link href="/" className="hover:text-accent">
            ← Back to PAWS
          </Link>
        </p>
      </div>
    </div>
  );
}
