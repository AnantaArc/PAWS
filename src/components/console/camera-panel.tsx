"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings, RefreshCw, AlertTriangle, Check, Camera, Radio, Tv } from "lucide-react";
import type { ConsoleState, Freshness } from "@/lib/types";
import { Card, FreshnessChip } from "@/components/ui";
import { fmtClock, fmtAgo, t } from "@/lib/utils";

/**
 * Camera panel (v2.9).
 *  - Supports iFrame Stream (native browser player — 100% reliable for ESP32-CAM).
 *  - Supports direct MJPEG stream (e.g. http://10.107.67.208:81/stream).
 *  - Supports Server Proxy Mode (for HTTPS app deployments).
 *  - Supports Snapshot Mode (polls http://10.107.67.208/capture every 1s).
 */
const DEFAULT_CAM_URL = process.env.NEXT_PUBLIC_CAM_URL || "";

type RenderMode = "iframe" | "direct" | "proxy" | "snapshot";

export function CameraPanel({ state, simulated }: { state: ConsoleState; simulated: boolean }) {
  const now = state.now;
  const frame = state.sensors.camera;
  const det = state.latestDetection;
  const detRecent = det && now - det.ts < 60_000 ? det : null;
  const camAge = frame?.hasFrame ? now - frame.ts : null;

  const [camUrl, setCamUrl] = useState<string>(DEFAULT_CAM_URL);
  const [editingUrl, setEditingUrl] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [mode, setMode] = useState<RenderMode>("iframe");
  const [streamError, setStreamError] = useState(false);
  const [snapTick, setSnapTick] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("paws-cam-url");
    const savedMode = localStorage.getItem("paws-cam-mode") as RenderMode | null;
    if (saved) setCamUrl(saved);
    else if (DEFAULT_CAM_URL) setCamUrl(DEFAULT_CAM_URL);
    if (savedMode === "iframe" || savedMode === "direct" || savedMode === "proxy" || savedMode === "snapshot") {
      setMode(savedMode);
    }
  }, []);

  // In Snapshot mode, poll the camera snapshot endpoint every 1 second
  useEffect(() => {
    if (mode !== "snapshot" || !camUrl) return;
    const interval = setInterval(() => {
      setSnapTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, camUrl]);

  const streaming = Boolean(camUrl);

  // Derives snapshot URL if user entered a stream URL
  const snapshotUrl = useMemo(() => {
    if (!camUrl) return "";
    let base = camUrl;
    if (base.endsWith("/stream")) {
      base = base.replace(/\/stream$/, "/capture");
    }
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}_t=${snapTick}`;
  }, [camUrl, snapTick]);

  const activeSrc = useMemo(() => {
    if (!camUrl) return "";
    if (mode === "snapshot") return snapshotUrl;
    if (mode === "proxy") return `/api/camera-proxy?url=${encodeURIComponent(camUrl)}`;
    return camUrl;
  }, [camUrl, mode, snapshotUrl]);

  const status: Freshness = useMemo(() => {
    if (streamError) return "offline";
    if (streaming) return "live";
    if (!frame?.hasFrame) return "offline";
    if (simulated) return "simulated";
    if (camAge !== null && camAge > 6000) return "stale";
    return "live";
  }, [frame, camAge, simulated, streaming, streamError]);

  function handleSaveUrl() {
    const trimmed = inputUrl.trim();
    setCamUrl(trimmed);
    localStorage.setItem("paws-cam-url", trimmed);
    localStorage.setItem("paws-cam-mode", mode);
    setEditingUrl(false);
    setStreamError(false);
  }

  return (
    <Card
      title="Camera"
      sub={
        streaming
          ? `ESP32-CAM (${mode.toUpperCase()} MODE) · YOLO overlay from Supabase`
          : simulated
            ? "SIMULATED FEED — click gear icon to configure camera URL"
            : "Robot camera · server-side detection"
      }
      right={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setInputUrl(camUrl);
              setEditingUrl(!editingUrl);
            }}
            className="rounded p-1 text-text-faint hover:bg-surface-2 hover:text-text-primary"
            title="Configure Camera Stream / Snapshots"
          >
            <Settings size={14} />
          </button>
          <FreshnessChip f={status} heardAt={frame?.ts} />
        </div>
      }
      pad={false}
      className="flex h-full flex-col"
      bodyClass="flex min-h-0 flex-1 flex-col"
    >
      <div className="relative min-h-0 flex-1 w-full overflow-hidden bg-black/70 flex items-center justify-center">
        {editingUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-surface overflow-y-auto">
            <h4 className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-accent">ESP32-CAM Stream Settings</h4>
            <p className="mb-2 text-[10.5px] text-text-muted">
              Stream URL (e.g. <code className="text-accent">http://10.107.67.208:81/stream</code>)
            </p>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://10.107.67.208:81/stream"
              className="mb-3 w-full rounded border border-border bg-bg px-3 py-1 text-[11.5px] text-text-primary outline-none focus:border-accent"
            />
            
            <div className="mb-3 flex w-full flex-col gap-1 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">Mode Selector</span>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setMode("iframe")}
                  className={`rounded py-1 text-[9.5px] font-bold uppercase border ${mode === "iframe" ? "border-accent bg-accent/20 text-accent" : "border-border text-text-muted"}`}
                >
                  Native iFrame
                </button>
                <button
                  type="button"
                  onClick={() => setMode("direct")}
                  className={`rounded py-1 text-[9.5px] font-bold uppercase border ${mode === "direct" ? "border-accent bg-accent/20 text-accent" : "border-border text-text-muted"}`}
                >
                  Direct Img
                </button>
                <button
                  type="button"
                  onClick={() => setMode("proxy")}
                  className={`rounded py-1 text-[9.5px] font-bold uppercase border ${mode === "proxy" ? "border-accent bg-accent/20 text-accent" : "border-border text-text-muted"}`}
                >
                  Proxy Stream
                </button>
                <button
                  type="button"
                  onClick={() => setMode("snapshot")}
                  className={`rounded py-1 text-[9.5px] font-bold uppercase border ${mode === "snapshot" ? "border-accent bg-accent/20 text-accent" : "border-border text-text-muted"}`}
                >
                  Snapshot 1s
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                className="flex items-center gap-1 rounded bg-accent px-3 py-1 text-[11px] font-bold text-slate-950"
              >
                <Check size={12} /> Save Settings
              </button>
              <button
                onClick={() => setEditingUrl(false)}
                className="rounded border border-border px-3 py-1 text-[11px] text-text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : streaming ? (
          /* live stream player */
          <div className="relative h-full w-full flex items-center justify-center bg-slate-950 overflow-hidden">
            {mode === "iframe" ? (
              /* iframe embeds the browser's native video stream player — 100% match to standalone tab */
              <iframe
                src={camUrl}
                title="ESP32-CAM stream"
                className="h-full w-full border-0 bg-black overflow-hidden"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeSrc}
                alt="PAWS camera feed"
                className="h-full w-full object-contain"
                unselectable="on"
                onLoad={() => {
                  setStreamError(false);
                }}
                onError={() => {
                  setStreamError(true);
                }}
              />
            )}
            {streamError && mode !== "iframe" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
                <AlertTriangle size={22} className="mb-1 text-warn animate-pulse" />
                <span className="text-[11.5px] font-bold text-warn uppercase tracking-wider">Stream Connection Blocked</span>
                <p className="mt-1 text-[10px] leading-relaxed text-text-faint max-w-[260px]">
                  Switch to Native iFrame Mode below to play the exact stream player from your browser tab.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setMode("iframe");
                      localStorage.setItem("paws-cam-mode", "iframe");
                      setStreamError(false);
                    }}
                    className="flex items-center gap-1 rounded bg-accent/20 border border-accent/40 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/30"
                  >
                    <Tv size={11} /> Switch to Native iFrame Mode
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* simulated scene: dark floor grid placeholder */
          <svg viewBox="0 0 400 300" className="h-full w-full">
            <defs>
              <linearGradient id="camFloor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c2333" />
                <stop offset="100%" stopColor="#0a0d16" />
              </linearGradient>
            </defs>
            <rect width="400" height="300" fill="url(#camFloor)" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={i * 55} y1="0" x2={i * 55} y2="300" stroke="#ffffff" strokeOpacity="0.04" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line key={i} x1="0" y1={i * 55} x2="400" y2={i * 55} stroke="#ffffff" strokeOpacity="0.04" />
            ))}
            <text x="12" y="282" fontSize="10" fill="#8fa3bf" opacity="0.7">
              {simulated ? "SIMULATED FRAME — click gear to enter ESP32-CAM URL" : "NO CURRENT FRAME"}
            </text>
          </svg>
        )}

        {detRecent && !editingUrl && (
          <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full pointer-events-none">
            <rect
              x={detRecent.bbox.x * 400}
              y={detRecent.bbox.y * 300}
              width={detRecent.bbox.w * 400}
              height={detRecent.bbox.h * 300}
              fill="none"
              stroke={t("accent")}
              strokeWidth="2.5"
            />
            <rect
              x={detRecent.bbox.x * 400}
              y={Math.max(0, detRecent.bbox.y * 300 - 22)}
              width="118"
              height="20"
              fill={t("accent")}
              rx="2"
            />
            <text x={detRecent.bbox.x * 400 + 6} y={Math.max(12, detRecent.bbox.y * 300 - 7)} fontSize="11" fontWeight="700" fill="#06222b">
              PERSON {Math.round(detRecent.confidence * 100)}%
            </text>
          </svg>
        )}

        {!editingUrl && (
          <>
            <div className="absolute left-2 top-2 pointer-events-none">
              <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-ok backdrop-blur-sm">
                ● {status.toUpperCase()}
              </span>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-2 text-[10px] text-text-muted pointer-events-none">
              {detRecent && (
                <span className="tnum rounded bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                  PERSON {Math.round(detRecent.confidence * 100)}% · {fmtAgo(detRecent.ts, now)}
                </span>
              )}
              {frame?.hasFrame && (
                <span className="tnum rounded bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                  FRAME {String(frame.frameId).padStart(4, "0")} · {fmtClock(frame.ts)}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
