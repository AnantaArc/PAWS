# PAWS Console

**P.A.W.S. — Post-disaster Autonomous Walking Scout** · SIH 2026 · PS 26223 · Disaster Management (Hardware)

The mission console for a 12-DOF autonomous quadruped rescue robot. PAWS walks into disaster zones and streams
camera, sound, gas, temperature, clearance, tilt and position intelligence; this console fuses it into three
**explainable scores** — Survivor Likelihood, Hazard, Accessibility — and hands the rescue team a live,
auditable, timestamped picture of where survivors are most likely located.

Production-grade: real authentication with roles, honest data states everywhere, audited commands, mission
replay, a field-rescuer QR link, and a documented Supabase deployment path.

---

## Quickstart (localhost, zero configuration)

Requires **Node.js 18.17+** (recommended: 20 LTS). No cloud keys, no accounts, no robot needed.

```bash
cd paws-console
npm install
npm run dev
```

Open **http://localhost:3000** and sign in:

| Role      | Email                | Password             |
| --------- | -------------------- | -------------------- |
| Operator  | `operator@paws.local`  | `paws-demo-operator` |
| Observer  | `observer@paws.local`  | `paws-demo-observer` |

> **What you're seeing:** the console boots in **LOCAL DEMO MODE** — a scripted robot simulator drives the
> exact same ingest pipeline the real ESP32 will use, so every panel, score, alert, command lifecycle, map,
> feed, replay, report and field QR is fully live. All simulated data carries an honest **SIMULATED** badge.

### Tour (60 seconds)

1. **Console** — camera + detection boxes, survivor-likelihood score card with the three-source breakdown and
   plain-English "why", position map with origin-anchored trail (switch to the **Gas map** tab), sensor panels
   with freshness chips, command bar, and the one combined activity feed.
2. **Watch the trail heat up** — the scripted mission passes two "survivors": pink pins appear, the trail
   colours by score, gas climbs near the corner, a loud sound event fires, thermal shows a body-heat delta.
3. **Press E-STOP** — watch the command walk `queued → delivered → acknowledged → done` in the command bar and
   the robot visibly stop on the map. Resume, re-anchor (origin resets to (0,0)) — all audited in the feed.
4. **Share the field link** — the QR bubble (bottom-right) expands into a scan-ready QR. Open it on a phone:
   the **Field Rescue View** shows survivor coordinates, a mini-map where you tap "you are here" to get
   distance + bearing, and a live rescue-relevant log. Read-only, always.
5. **Replay** the mission (menu top-left sidebar link / `/replay`), then open **Mission Summary** from the
   feed on any mission: a print-ready report with every event and the **sensor snapshot at that exact time**.
6. **Settings** — tune fusion weights live and watch the score react (operator only).

### Run tests

```bash
npm test
```

(Fusion v2 scoring rules + contract behaviour are covered by unit tests.)

---

## Two modes, one codebase

| | LOCAL DEMO MODE (default) | SUPABASE MODE (production) |
|---|---|---|
| Data | In-memory store + robot simulator | Postgres + RLS, persistent |
| Auth | Demo accounts (badged) | Supabase Auth (email+password) |
| Realtime | SSE from the in-process store | Same SSE endpoint, DB-backed |
| Camera | Simulated placeholder (badged) | Live MJPEG via `NEXT_PUBLIC_CAM_URL` + YOLO rows |
| Setup | nothing | `.env` → uncomment Supabase block, paste service-role key |

Switch by **one click on the header chip** (LIVE ↔ DEMO, works live, survives reloads) or by editing
`.env` → `DATA_MODE=supabase`. Our reference deployment: **Supabase project in Mumbai (ap-south-1)**,
**Vercel functions in `bom1`** — the lowest-latency pair for India.

### Connecting the real robot (9 Sep +)

The ESP32 posts telemetry to `/api/ingest` — same contract the simulator uses (see `src/lib/types.ts`,
frozen at **v2.1**):

```
POST /api/ingest
Headers: x-device-token: <INGEST_DEVICE_TOKEN>   (default: paws-device-token)
Body:    JSON per TelemetryPayload in src/lib/types.ts
```

Sample:

```json
{
  "deviceId": "paws-01",
  "ts": 1788735680637,
  "seq": 42,
  "heartbeat": true,
  "sound":     { "amp": 0.4, "baseline": 0.07, "peak": 0.4, "heardAt": 1788735680637 },
  "gas":       { "ppm": 410, "adc": 840, "heardAt": 1788735680637 },
  "thermal":   { "objectC": 33.8, "ambientC": 24.9, "heardAt": 1788735680637 },
  "distance":  { "mm": 840, "status": "valid", "source": "vl53l0x", "heardAt": 1788735680637 },
  "tilt":      { "pitchDeg": 2.1, "rollDeg": -1.4, "heardAt": 1788735680637 },
  "position":  {
    "xM": 3.42, "yM": 5.61, "headingDeg": 74, "driftM": 0.6,
    "mode": "estimated_imu_odometry",
    "origin": { "xM": 0, "yM": 0, "setAt": 1788735680637 },
    "heardAt": 1788735680637
  },
  "camera": { "frameId": 14, "ts": 1788735680637, "hasFrame": true, "width": 640, "height": 480, "jpegBytes": 30000 }
}
```

Any sensor can be omitted — the console shows an honest **NOT INSTALLED** state. Invalid payloads are rejected
(422). Wrong device token = 401.

### Supabase mode — one paste, then the ESP32 just works

1. **Supabase → SQL Editor → paste the whole `supabase/schema.sql` → Run.** It is 100% idempotent and creates
   everything: all tables + indexes, the demo login accounts, RLS (anon can do nothing but call
   `device_ingest`; operators write; observers read), and the Realtime hookup.
2. Copy `.env.example` → `.env`, set `DATA_MODE=supabase` + the three Supabase keys (Project Settings → API),
   restart `npm run dev`. The header chip should read **SUPABASE MODE**.
3. Sign in with `operator@paws.local` / `paws-demo-operator` (the schema created it — no dashboard clicks).
4. **Connect the ESP32 with only {project URL + anon key}** — it POSTs to
   `{URL}/rest/v1/rpc/device_ingest` (see `docs/esp32-direct-ingest.ino`). The device token lives in the
   `device_tokens` table (`paws-device-token` by default). The console's catch-up processor turns each raw
   row into scores, detections, trail points and feed events — no service key ever leaves the server.

   No robot yet? `node scripts/seed-ingest.js` drives the same contract locally.

### Deploying to Vercel

1. Push this repo to GitHub, import into Vercel (framework: Next.js).
2. Add env vars (`.env.example` list) incl. `DATA_MODE=supabase` + Supabase keys.
3. Run `supabase/schema.sql` in your project's SQL editor (Mumbai).
4. Create two auth users; set `user_metadata.role = operator | observer` (and `name`). A DB trigger keeps
   `profiles` in sync. Policies in `schema.sql` enforce read-all / write-operator RLS; the browser never sees
   the service-role key.
5. Point the robot's `x-device-token` at your deployment URL. Done — the same contract, now persistent.

---

## Repository layout

```
paws-console/
├── src/
│   ├── app/                  # pages + API routes (Next.js App Router)
│   │   ├── console/          #   the live mission console
│   │   ├── field/            #   Field Rescue View (QR / phone)
│   │   ├── replay/           #   mission replay scrubber
│   │   ├── report/[id]/      #   print-ready mission summary
│   │   ├── settings/         #   live fusion weight tuning
│   │   ├── status/           #   public health page
│   │   └── api/              #   ingest, state, stream (SSE), auth, commands…
│   ├── lib/
│   │   ├── types.ts          #   FROZEN telemetry/domain contract v2.1
│   │   ├── contract.ts       #   zod runtime validation (ingest gate)
│   │   ├── fusion/engine.ts  #   explainable fusion v2 (unit-tested)
│   │   ├── store/            #   MemoryStore (demo) + SupabaseStore (prod), one interface
│   │   ├── simulator.ts      #   scripted robot over the real ingest path
│   │   ├── detection/        #   pluggable detection providers
│   │   └── auth.ts           #   sessions (local HMAC + Supabase Auth)
│   └── components/           #  panels, map, charts, feed, console UI
├── supabase/schema.sql       # full schema + RLS + realtime publication
├── tests/                    # fusion + contract unit tests (vitest)
├── ARCHITECTURE.md           # deep-dive: data flow, fusion, honesty rules
└── .env.example              # every knob, documented
```

## Honesty rules (the design contract)

- Nothing is displayed that a sensor didn't produce. Simulated data is badged **SIMULATED**.
- No evidence ⇒ survivor score is **exactly 0** — never an invented number.
- Precision = the sensor's precision: millimetres from a 1 mm ToF ranger, 0.1 °C from the MLX90614, integers
  for ADC. No `231.32424`-style noise.
- Every panel has explicit states: LIVE / DELAYED / STALE / OFFLINE / NOT INSTALLED. Colour = status only.
- Every score stores its inputs + weight version + a plain-English reason. Every command is audited
  (who, when, what the robot confirmed).
