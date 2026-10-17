# Motion v2: the visual clock follows the system store

Code: `src/motion/systemEngine.ts` (engine), `systemTarget.ts` (target from the DayResult), `sky.ts` + `WeatherSky.tsx`,
`hooks.ts`, `tokens.ts` (`SYSTEM_MOTION`), binding `src/state/systemEngineBinding.ts`, singleton `src/motion/engine.ts`.
Tests: `systemEngine.test.ts`, `sky.test.ts`. v1 `weather.ts` stays for its tests only; nothing mounts it.

## Data flow
`useSystemStore` (sys, scenario, strategy, hour, modeTarget) -> `targetAt(sys, scenario, strategy, hour)` = cached
`getSystemView(sys).day(...)` stepped with `stepAt` -> `SystemTarget { inputs, climate, hour, modules, router }` ->
`weather.setTarget(target, { kind })`. The engine owns the VISUAL state and publishes one `VisualFrame` per step:

| Field | Meaning |
|---|---|
| `inputs` | `{ ...sys.array.module, irradiance, ambientC, windMs, rainMmH, humidityRatio, inletC, pumpControl }` of this frame |
| `result` | `simulate(inputs, 'pvt-liquid')` (about 0,02 ms), always a real computed state |
| `climate` | `ClimatePoint` at the visual clock (new object per frame) |
| `hour`, `hourOfDay` | scenario hour (continuous, sweeps during a transition) and hour mod 24 |
| `router` | `RouterSnapshot` (mode, pumpOn, valves, allocW, tankSoc, tankTopC, reason; new object per frame) |
| `progress`, `moving`, `epoch` | script progress, any spring running, bumped on every published frame (climate and hour included) |

## Change kinds (`classifyChange` in the binding)
- scripted (~1,1 s): a mode target A/B/C chosen, or scenario / strategy changed.
- follow: hour scrubbing (store sets `modeTarget: 'custom'`) and system edits. All goals at once, w = 22.
- snap: first load, `prefers-reduced-motion`, hidden tab (engine checks at every target change; `visibilitychange` snaps).

## Scripted timeline (T = 1,1 s, `SYSTEM_MOTION`)
Everything is a critically damped spring (no overshoot, velocity kept on retarget); a script only decides WHEN a group's
goal is applied. Retargeting mid-flight restarts the script from the CURRENT visual state, so it is continuous.

| Group | Applied at | Settles |
|---|---|---|
| climate: G, ambient, RH, wind, rain, clock hour, inlet T, tank SoC / top T (w 9,7) | 0 | 0 - 0,55 T |
| router rule, reason, mode, pump command | 0,45 T (window 0,35 - 0,6 T) | switch |
| valves: 4 fractions, w 8,8, rate limit 3 /s | 0,40 T | 0,4 - 1,0 T |
| collected heat Q (scales allocW) | with the climate; a pump START waits for the switch | with the climate |

Real valve actuators take tens of seconds; the stroke is compressed about 30x so the router reads as one gesture.
Valves are renormalised so that Σ = 1 whenever the pump is on; with the pump off they close (`open` spring, w 12) and
`allocW` = 0. `allocW_i = valves_i x Q`, and while moving `Q <= modules x max(0, q_liquid)` of the visual collector,
so heat never exceeds what the computed collector delivers. A pump command with q <= 0 is shown as a stopped collector
(sim `pumpOn` false) while moving; the 'pvt-liquid' collector never rejects heat, so no zero-crossing logic is needed.
Whole frame idle about 1,4 s after the click (spring tails); the sky is done by ~0,6 s.

## Sky (`sky.ts`)
Four layers (opacity only, DOM-direct, no React render): `rain` (sky-rainy tokens: overcast, rain, night base), `dawn`
(sky-sunny stops reversed: sunrise / sunset glow), `sun` (sky-sunny, follows G thinned by humidity), `night` (ink veil <= 7 %).
Time of day from `hourOfDay`, condition from G, rain, RH. `WeatherSky` isolates its host band (`isolation: isolate`)
because `body` paints paper over negative z-index layers.

## API for views
```ts
import { weather, useVisualFrameRef, useVisualSelect, useLiveText, useLiveFrameText, useFrameListener,
         useRouterFrameRef, useClimateFrameRef, useLiveClimate, useLiveRouter } from '../motion';
weather.frame().router!.valves          // inside useFrame / rAF: zero hooks, zero renders
useRouterFrameRef().current.pumpOn      // live getter, no subscription
useFrameListener((f) => { el.style.setProperty('--v', String(f.router!.valves.tank)); });   // imperative DOM, hz 0 = every step
useLiveClimate((c, h) => Math.round(c.irradiance), 15)    // React state, <= 15 Hz, only on change
useLiveRouter((r) => r.mode)
useLiveFrameText(ref, (f) => clockLabel(f.hourOfDay ?? 0))   // textContent, no render
```
`frame.router` / `frame.climate` are fresh immutable objects each step: never mutate them; compare by value.
Dev only: `window.__sv` = `{ engine, store, frame(), setModeTarget('A'|'B'|'C'), setScenario, setStrategy, setHour }`.

## Known limits
- Hour scrubbing across router hysteresis (terik 13 - 16 h: on / off / on / off) flips the pump visibly; that is the computed day.
- Modes B and C both have the pump off (valves closed); they differ in reason, G and tank state, not in valve position.
- A pump start waits ~0,5 s into a transition while the sky is already open (the router decision is the visible event).
