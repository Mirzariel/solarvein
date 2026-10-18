# Desiccant research path (W3) - status: research hypothesis, not validated

Code: `src/sim/system/desiccant.ts` (`isothermUptake`, `evaluateDesiccant`, `desiccantSweep`). Assumptions: `assumptions/desiccant.ts`.

## Model
1. **Isotherm (RD silica gel).** Pesaran & Mills (1987, SERI/TP-252-2952, App. A, eq. A-1, *terbit*, text checked): `RH = 0.0078 - 0.05759 W + 24.16554 W^2 - 124.478 W^3 + 204.226 W^4` (W kg/kg, 25 C data, W_max 0.40). Heat of adsorption `Qst = 3500 - 12400 W` (W <= 0.05), `2950 - 1400 W` (W > 0.05) kJ/kg. Temperature shift (*asumsi*): `RH(W,T) = RH25(W) exp[-((Qst-L)/Rw)(1/T - 1/298.15)]`, L = 2442 kJ/kg. Chua et al. (2002) / Ng et al. (2001) coefficients could not be verified from an accessible text and are NOT used.
2. **Swing.** `q_proc = q(RH_proc, T_proc)`, `q_regen = q(RH_regen(regenC), regenC)`; `effSwing = max(0, q_proc - q_regen) * cycleEffectiveness`.
3. **Moisture [kg/h]** = min of: bed `effSwing * m_bed * 60/cycleMin` (cycleMin = one phase, two beds alternate); process air above the supply target `m_p*3600*(w_p - w_sup)`; equilibrium approach `eps * m_p*3600*(w_p - w_eq)` with `w_eq` at the mean bed temperature `(T_in+T_out)/2`; and what the regeneration air can carry (outlet RH <= 0.95, outlet >= inlet + 3 K, desorption + bed reheat taken from that stream). Water out of process = water into regeneration air by construction.
4. **Process outlet.** `h_out = h_in + dw (Qst - h_v) + bed carry-over`: adsorption is almost isenthalpic, dried air leaves HOTTER (about +2-4 K per g/kg removed).
5. **Regeneration heat** = `m_r cp (regenC - T_in)`. Desorption heat and bed/metal reheat (0.5 kg metal/kg gel, no recovery) come out of this same stream, so they are not added again. `thermalCop = latent / regenHeat`.
6. **Electricity.** Reference: `coilRef = m_p (h_in - h_sup)/COP_ref` (supply = dew point + 5 K, dew point from the hotel). Desiccant: after-cooler (COP_aft) removes the bed heat and, pro rata to the latent duty removed, the dry sensible cooling; the remainder goes to a coil at COP_ref; plus fans on both streams `(m_p+m_r)/rho * dP/eta`, pump, PV penalty. `netSaving = coilRef - route`.
7. **Operating flag.** `operating = false` when the bed removes < 0.01 kg/h, swing < 0.01 or less than 5 % of the required moisture: the unit would not be started, so net = 0 and the fan penalty is not charged (note "Tidak beroperasi pada suhu ini"). A unit that operates and loses keeps its negative net. **Break-even COP ratio** = after-cooler/coil COP ratio where net = 0 (exact closed form of the bisection, since only the after-cooler term depends on it); `copRatioSensitivity(base, ratios)` gives net per ratio. **PV penalty** is supplied by the caller (day.ts) relative to what the collector would do otherwise; standalone sweeps use 0, so net is an upper bound.
8. **Per-kg figures.** `perKgWater.coilRefKWhE` and `.desiccantKWhE` are both divided by the REQUIRED moisture removal (fresh-air humidity above the supply target, e.g. 48 kg/h), the duty the reference coil carries; the desiccant figure includes its residual coil, after-cooler, fans, pump and PV penalty. Their difference equals `netSavingWe / required`. Typical magnitude about 0.3 kWh_e/kg. **`nearBreakEven`** is true while operating with |net| < 2 % of the coil electricity (UI: "≈ impas").
9. **Verdict.** tidak-layak: not operating or net <= 0. marginal: net < 15 % of coilRef or thermal COP < 0.3. layak otherwise. Composite salt-in-matrix: silica curve reused as reference only, tag *hipotesis*, never above marginal.

## Sweep (DEFAULT_SYSTEM: hotel-100, fresh air 1.1 kg/s, supply dew point 11 C; 300 kg/bed, 20 min phase, eps 0.45, 200 Pa/stream, fan 0.5, regeneration air 1.0 kg/s; ambient 30 C/75 %; COP_ref 3.0; PV penalty 0, pump 0; coil reference 16.5 kW_e)
Net = kW_e saved at after-cooler/coil COP ratio 1.3 / 1.5 / 2.0 (letter = verdict: t tidak-layak, m marginal, l layak). BE = break-even ratio.

| Regen air | regenC | RH % | swing (eff.) | water / need kg/h | thermal COP | heat kW_th | net kW_e at 1.3 / 1.5 / 2.0 | BE |
|---|---|---|---|---|---|---|---|---|
| ambient | 35 | 57 | 0.033 (0.015) | 0 / 48 | - | 5 | not operating | - |
| ambient | 40 | 43 | 0.079 (0.035) | 8 / 48 | 0.49 | 10 | -0.90 t / -0.59 t / -0.09 t | 2.13 |
| ambient | 45 | 33 | 0.156 (0.070) | 15 / 48 | 0.63 | 16 | -0.72 t / -0.15 t / +0.78 m | 1.56 |
| ambient | 50 | 26 | 0.217 (0.098) | 18 / 48 | 0.60 | 21 | -0.74 t / -0.00 t / +1.21 m | 1.50 |
| ambient | 55 | 20 | 0.250 (0.113) | 22 / 48 | 0.56 | 26 | -0.80 t / +0.10 m / +1.55 m | 1.48 |
| ambient | 60 | 16 | 0.272 (0.122) | 24 / 48 | 0.52 | 31 | -0.89 t / +0.15 m / +1.83 m | 1.47 |
| ambient | 65 | 13 | 0.288 (0.130) | 26 / 48 | 0.49 | 37 | -1.00 t / +0.15 m / +2.04 m | 1.47 |
| ambient | 70 | 10 | 0.301 (0.135) | 28 / 48 | 0.46 | 42 | -1.14 t / +0.13 m / +2.18 m | 1.48 |
| exhaust | 35 | 28 | 0.182 (0.082) | 10 / 48 | 0.66 | 10 | -0.40 t / -0.06 t / +0.50 m | 1.54 |
| exhaust | 40 | 22 | 0.231 (0.104) | 17 / 48 | 0.75 | 15 | -0.22 t / +0.39 m / +1.39 m | 1.37 |
| exhaust | 45 | 17 | 0.260 (0.117) | 24 / 48 | 0.78 | 20 | -0.05 t / +0.84 m / +2.29 m | 1.31 |
| exhaust | 50 | 13 | 0.280 (0.126) | 26 / 48 | 0.68 | 26 | -0.16 t / +0.87 m / +2.53 l | 1.33 |
| exhaust | 55 | 10 | 0.295 (0.133) | 28 / 48 | 0.61 | 31 | -0.29 t / +0.85 m / +2.71 l | 1.35 |
| exhaust | 60 | 8 | 0.307 (0.138) | 30 / 48 | 0.56 | 36 | -0.45 t / +0.80 m / +2.83 l | 1.37 |
| exhaust | 65 | 6 | 0.318 (0.143) | 31 / 48 | 0.51 | 41 | -0.61 t / +0.74 m / +2.92 l | 1.38 |
| exhaust | 70 | 5 | 0.329 (0.148) | 32 / 48 | 0.47 | 46 | -0.78 t / +0.65 m / +2.98 l | 1.40 |

## Conclusion (English)
DHW first. At PV/T temperatures (35-55 C) the desiccant path is break-even at best: with ambient regeneration air the unit does not operate at 35 C, loses electricity up to a COP ratio of about 1.5 at 45-55 C, and gains only 0.1 kW_e (under 1 % of the 16.5 kW_e coil) at ratio 1.5 and 55 C, with the PV penalty still at 0 (upper bound). The bed removes at most about half of the required moisture, and the 20-40 kW_th of regeneration heat it needs is worth more as hot water. The research levers are hotel exhaust-air regeneration (break-even ratio 1.3-1.4 from 40 C) and a high-temperature after-cooler with a COP ratio of 2 or more; both are simulation results under stated assumptions, not validated. The silica-gel isotherm temperature shift and the cycle effectiveness (0.3-0.6) are assumptions.

## Ringkasan (Indonesia)
Pada suhu PV/T 35-55 C jalur desikan paling banter impas: dengan udara ambien unit tidak beroperasi pada 35 C dan baru menghemat listrik bila after-cooler minimal sekitar 1,5 kali lebih efisien daripada koil acuan, itu pun kecil. Pemanasan air didahulukan; regenerasi dengan udara buang hotel dan after-cooler suhu tinggi adalah tuas riset, dan seluruh jalur tetap Hipotesis riset · belum divalidasi.
