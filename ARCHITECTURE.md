# PAWS Console — Architecture

```
┌────────────────────┐        POST /api/ingest          ┌─────────────────────────────┐
│  ESP32 + ESP32-CAM │ ───────────────────────────────► │  Next.js app (Vercel, bom1) │
│  firmware          │   x-device-token auth            │                             │
└────────────────────┘   (frozen contract v2.1)         │  /api/ingest                │
                                                        │   ├ zod validate            │
┌────────────────────┐                                   │   ├ DetectionProvider       │
│  Simulator (dev)   │ ── same payload, same path ─────► │   │  simulated | server      │
└────────────────────┘                                   │   ├ FusionEngine v2         │
                                                        │   └ ConsoleStore.write      │
┌────────────────────┐                                   └──────────────┬──────────────┘
│  Operator browser  │ ◄───────────── SSE /api/stream ───────────────────┤
│  (console, dark/   │                                               ┌───▼──────────────┐
│   light themes)    │                                        local  │ MemoryStore      │
├────────────────────┤ ◄──────────── fetch /api/state           supabase │ (demo, simulator)│
│  Field rescuer     │                                        ┌───▼──────────────┐
│  phone (QR link)   │ ◄────── poll /api/field/state?token=    │ SupabaseStore    │
└────────────────────┘                                              │ Postgres + RLS │
                                                                    └────────────────┘
```

## Data flow (one mission tick)

1. **Source** — the ESP32 posts a small telemetry envelope (sound, gas, thermal, distance, tilt,
   position, camera) with a device token. In local demo mode the Simulator posts the identical envelope
   through the identical `/api/ingest` route — which is why software never waits on hardware.
2. **Ingest gate** — `zod` validates every byte (schema mirrored 1:1 in `src/lib/contract.ts`); bad or
   unauthenticated payloads never reach the store. Rate-limited by the platform; token required.
3. **Detection** — camera frames go to a pluggable `DetectionProvider`: `simulated` (today, badged
   SIMULATED) or `server` (YOLO at the deployment; swap is one env var, zero code changes). On-device
   FOMO stays finale roadmap.
4. **Fusion** — the engine (pure, unit-tested function) computes three explainable scores:
   - **Survivor Likelihood** — weighted evidence from vision / sound / thermal, each decayed by its
     half-life; **no evidence ⇒ exactly 0**.
   - **Hazard** — gas ppm scale + fire-risk temperature (> 55 °C).
   - **Accessibility** — clearance (< 120 mm = hard stop), tilt (> 28° = hard stop), link (loss = 0);
     hard stops floor the value to ≤ 0.2; link loss zeroes it.
   Every score stores inputs, weight version and plain-English reasons: nothing is a black box.
5. **Write** — one interface, two stores: `MemoryStore` (demo) and `SupabaseStore` (Postgres + RLS +
   realtime-ready). The rest of the app cannot tell them apart.
6. **Render** — clients subscribe to `/api/stream` (SSE) for a compact snapshot on every change; the
   Field Rescue View polls a tiny read-only payload authed by a signed, expiring field token.

## Security model

| Boundary | Mechanism |
|---|---|
| Human login | Supabase Auth (email+password); demo mode uses clearly-badged local accounts |
| Role | `operator` (full control) vs `observer` (read-only) — enforced server-side in every mutating route, not just hidden in the UI |
| Data | RLS policies: everyone reads, only operators write; service key never leaves the server |
| Robot | Per-device token at ingest; invalid = 401 |
| Field link | HMAC-signed token, 4 h expiry, read-only scope, per-mission |
| Commands | Full audit: who issued, every stage, robot-confirmed notes |

## Honesty model (what makes this *not* a demo)

- Every panel has an explicit state: LIVE / DELAYED / STALE / OFFLINE / NOT INSTALLED / SIMULATED.
- Precision equals the sensor: 1 mm ToF ranger, 0.1 °C IR thermopile, integer ADC.
- Position is **origin-anchored relative coordinates** with an explicit quality label
  (`estimated_imu_odometry`, growing drift halo) — no fake GPS, no bearing claims from a single mic.
- Sound is amplitude only; "sound event" ≠ "voice", and the UI says so.
- The score explains itself: three sources, weights, reasons, timestamps.

## Key modules

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | Frozen contract v2.1 (the single source of truth) |
| `src/lib/contract.ts` | Zod runtime gates |
| `src/lib/fusion/engine.ts` | Explainable fusion (tested in `tests/fusion.test.ts`) |
| `src/lib/store/{memory,supabase}.ts` | Local demo / production persistence |
| `src/lib/simulator.ts` | Scripted robot over the real ingest path |
| `src/app/api/*` | ingest · state · stream · auth · command · mission · weights · field |
| `src/components/map.tsx` | Origin map: heat trail, gas overlay, pins, drift halo |

## Deployment (Supabase mode)

1. Supabase project in **Mumbai (ap-south-1)**, run `supabase/schema.sql`.
2. Vercel project in **bom1**, env vars per `.env.example`, `DATA_MODE=supabase`.
3. Create auth users with `user_metadata.role` (`operator`/`observer`); trigger syncs `profiles`.
4. The ESP32 posts to `<vercel-url>/api/ingest` with `x-device-token`.
