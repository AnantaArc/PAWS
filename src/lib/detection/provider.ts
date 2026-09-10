import type { Detection } from "@/lib/types";
import { uid } from "@/lib/utils";

/**
 * DETECTION PROVIDER
 * ------------------
 * The ingest pipeline asks a provider for detections on each frame.
 *  - simulated : scripted detections matching the simulator's script
 *                (honestly badged SIMULATED in the UI)
 *  - server    : POSTs the frame to DETECTION_SERVICE_URL and expects
 *                { detections: [{ label, confidence, bbox }] }
 * Swap by env — no other code changes. (On-device FOMO remains finale roadmap.)
 */
export interface DetectionProvider {
  readonly name: "simulated" | "server";
  detect(input: {
    frameId: number;
    ts: number;
    position?: { xM: number; yM: number };
  }): Promise<Detection[]>;
}

/**
 * Scripted detection windows — RECURRING: the pattern repeats every
 * RECUR_FRAMES frames (~2 min lap), so the demo never goes quiet.
 * Frames are numbered 1..RECUR_FRAMES; a person appears at survivor A
 * then again at survivor B, exactly like a real search lap.
 */
const RECUR_FRAMES = 59;
const SCRIPTS: Array<{
  atFrame: number; // frame number within each lap (1-based → frameId % RECUR_FRAMES)
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  position?: { xM: number; yM: number };
}> = [
  // Detection A — "person at the back wall" (survivor A spot)
  { atFrame: 14, confidence: 0.86, bbox: { x: 0.44, y: 0.18, w: 0.14, h: 0.5 }, position: { xM: 3.4, yM: 5.6 } },
  { atFrame: 15, confidence: 0.88, bbox: { x: 0.45, y: 0.17, w: 0.14, h: 0.52 }, position: { xM: 3.4, yM: 5.6 } },
  { atFrame: 16, confidence: 0.87, bbox: { x: 0.44, y: 0.18, w: 0.14, h: 0.5 }, position: { xM: 3.4, yM: 5.6 } },
  // Detection B — "second person near the gas zone" (survivor B spot)
  { atFrame: 49, confidence: 0.79, bbox: { x: 0.52, y: 0.22, w: 0.12, h: 0.46 }, position: { xM: -1.2, yM: 3.1 } },
  { atFrame: 50, confidence: 0.81, bbox: { x: 0.52, y: 0.21, w: 0.12, h: 0.48 }, position: { xM: -1.2, yM: 3.1 } },
];

function frameInLap(frameId: number): number {
  return ((frameId - 1) % RECUR_FRAMES) + 1;
}

export class SimulatedDetectionProvider implements DetectionProvider {
  readonly name = "simulated" as const;

  async detect(input: {
    frameId: number;
    ts: number;
    position?: { xM: number; yM: number };
  }): Promise<Detection[]> {
    const found = SCRIPTS.filter((s) => s.atFrame === frameInLap(input.frameId));
    return found.map((s, i) => ({
      id: uid("det"),
      ts: input.ts + i,
      label: "person" as const,
      confidence: Math.round(s.confidence * 100) / 100,
      bbox: s.bbox,
      position: s.position ?? input.position,
      source: "vision" as const,
    }));
  }
}

export class ServerDetectionProvider implements DetectionProvider {
  readonly name = "server" as const;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async detect(input: {
    frameId: number;
    ts: number;
    position?: { xM: number; yM: number };
  }): Promise<Detection[]> {
    // The deployment posts the frame here; the local build never calls this
    // unless configured. Timeout + graceful fallback keep the console alive.
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frameId: input.frameId, ts: input.ts }),
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        detections?: Array<{ label: string; confidence: number; bbox: { x: number; y: number; w: number; h: number } }>;
      };
      return (data.detections ?? [])
        .filter((d) => d.label === "person" && d.confidence > 0.4)
        .map((d) => ({
          id: uid("det"),
          ts: input.ts,
          label: "person" as const,
          confidence: Math.round(d.confidence * 100) / 100,
          bbox: d.bbox,
          position: input.position,
          source: "vision" as const,
        }));
    } catch {
      return [];
    }
  }
}

export function getDetectionProvider(): DetectionProvider {
  const mode = process.env.DETECTION_PROVIDER ?? "simulated";
  if (mode === "server" && process.env.DETECTION_SERVICE_URL) {
    return new ServerDetectionProvider(process.env.DETECTION_SERVICE_URL);
  }
  return new SimulatedDetectionProvider();
}
