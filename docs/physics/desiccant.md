# Desiccant research path (W3) - status: research hypothesis, not validated

Code: `src/sim/system/desiccant.ts` (`isothermUptake`, `evaluateDesiccant`, `desiccantSweep`). Assumptions: `assumptions/desiccant.ts`.

## Model
1. **Isotherm (RD silica gel).** Pesaran & Mills (1987, SERI/TP-252-2952, App. A, eq. A-1, *terbit*, text checked): `RH = 0.0078 - 0.05759 W + 24.16554 W^2 - 124.478 W^3 + 204.226 W^4` (W kg/kg, 25 C data, W_max 0.40). Heat of adsorption `Qst = 3500 - 12400 W` (W <= 0.05), `2950 - 1400 W` (W > 0.05) kJ/kg. Temperature shift (*asumsi*): `RH(W,T) = RH25(W) exp[-((Qst-L)/Rw)(1/T - 1/298.15)]`, L = 2442 kJ/kg. Chua et al. (2002) / Ng et al. (2001) coefficients could not be verified from an accessible text and are NOT used.
2. **Swing.** `q_proc = q(RH_proc, T_proc)`, `q_regen = q(RH_regen(regenC), regenC)`; `effSwing = max(0, q_proc - q_regen) * cycleEffectiveness`.
3. **Moisture [kg/h]** = min of: bed `effSwing * m_bed * 60/cycleMin` (cycleMin = one phase, two beds alternate); process air above the supply target `m_p*3600*(w_p - w_sup)`; equilibrium approach `eps * m_p*3600*(w_p - w_eq)` with `w_eq` at the mean bed temperature `(T_in+T_out)/2`; and what the regeneration air can carry (outlet RH <= 0.95, outlet >= inlet + 3 K, desorption + bed reheat taken from that stream). Water out of process = water into regeneration air by construction.
4. **Process outlet.** `h_out = h_in + dw (Qst - h_v) + bed carry-over`: adsorption is almost isenthalpic, dried air leaves HOTTER (about +2-4 K per g/kg removed).
5. **Regeneration heat** = `m_r cp (regenC - T_in)`. Desorption heat and bed/metal reheat (0.5 kg metal/kg gel, no recovery) come out of this same stream, so they are not added again. `thermalCop = latent / regenHeat`.
6. **Electricity.** Reference: `coilRef = m_p (h_in - h_sup)/COP_ref` (supply = dew point + 5 K, dew point from the hotel). Desiccant: after-cooler (COP_aft) removes the bed heat and, pro rata to the latent duty removed, the dry sensible cooling; the remainder goes to a coil at COP_ref; plus fans on both streams `(m_p+m_r)/rho * dP/eta`, pump, PV penalty. `netSaving = coilRef - route`.
7. **Verdict.** tidak-layak: swing < 0.01 or net <= 0. marginal: net < 15 % of coilRef or thermal COP < 0.3. layak otherwise. Composite salt-in-matrix: silica curve reused as reference only, tag *hipotesis*, never above marginal.

## Sweep (ambient 30 C/75 %, 0.5 kg/s process and regeneration air, 40 kg/bed, 10 min phase, eps 0.45, 250 Pa/stream, fan 0.6, COP 3.0/6.0, supply dew point 11 C, PV penalty 0, pump 0; coil reference 7.5 kW_e)

| Regen air | regenC | RH regen % | swing (eff.) kg/kg | water kg/h (need 21.6) | thermal COP | heat kW_th | net We | verdict |
|---|---|---|---|---|---|---|---|---|
| ambient | 35 | 57 | 0.033 (0.015) | 0.5 | 0.14 | 2.6 | -348 | tidak-layak |
| ambient | 40 | 43 | 0.079 (0.035) | 4.7 | 0.60 | 5.2 | +197 | marginal |
| ambient | 45 | 33 | 0.156 (0.070) | 6.9 | 0.60 | 7.8 | +491 | marginal |
| ambient | 50 | 26 | 0.217 (0.098) | 8.7 | 0.56 | 10.4 | +724 | marginal |
| ambient | 55 | 20 | 0.250 (0.113) | 10.2 | 0.53 | 13.0 | +919 | marginal |
| ambient | 60 | 16 | 0.272 (0.122) | 11.3 | 0.49 | 15.7 | +1078 | marginal |
| ambient | 65 | 13 | 0.288 (0.130) | 12.3 | 0.46 | 18.3 | +1205 | layak |
| ambient | 70 | 10 | 0.301 (0.135) | 13.1 | 0.42 | 20.9 | +1302 | layak |
| exhaust | 35 | 28 | 0.182 (0.082) | 5.0 | 0.66 | 5.1 | +304 | marginal |
| exhaust | 40 | 22 | 0.231 (0.104) | 8.6 | 0.75 | 7.7 | +807 | marginal |
| exhaust | 45 | 17 | 0.260 (0.117) | 10.9 | 0.72 | 10.2 | +1151 | layak |
| exhaust | 50 | 13 | 0.280 (0.126) | 12.0 | 0.63 | 12.8 | +1300 | layak |
| exhaust | 55 | 10 | 0.295 (0.133) | 12.9 | 0.57 | 15.4 | +1416 | layak |
| exhaust | 60 | 8 | 0.307 (0.138) | 13.6 | 0.51 | 17.9 | +1502 | layak |
| exhaust | 65 | 6 | 0.318 (0.143) | 14.3 | 0.47 | 20.5 | +1576 | layak |
| exhaust | 70 | 5 | 0.329 (0.148) | 14.8 | 0.43 | 23.1 | +1633 | layak |

## Conclusion (English)
At 35 C with ambient regeneration air the bed barely regenerates (effective swing 0.015) and the unit costs more electricity than it saves. From about 40 C the model shows a small electricity gain, but only because the regeneration heat is counted as free and the after-cooler is assumed twice as efficient as the reference coil (COP 6 vs 3). The gain disappears when the after-cooler COP is below about 1.3-1.4x the coil COP, with 500 Pa per stream (ambient air, 45-55 C), or with a PV penalty of a few hundred watts, and it never exceeds about 17 % of the reference coil at 55 C with ambient air. Even at 55 C the bed removes only half of the required moisture, and each kWh_th of regeneration heat saves about 0.07 kWh_e, so DHW preheat is the better use of the same heat. Using hotel exhaust air or regenerating at 60-70 C (not PV/T-friendly) improves the picture; this is a simulation under stated assumptions, not a validated result.

**Review flag:** the council expected the compressor route to be at least as good for 35-55 C. With COP 3.0/6.0 and zero PV penalty the model disagrees from 40 C (regression tests lock the break-even instead of forcing the expectation).

## Ringkasan (Indonesia)
Pada 35 C dengan udara ambien, desikan hampir tidak teregenerasi dan justru menambah pemakaian listrik; dari sekitar 40 C muncul penghematan kecil, tetapi hanya jika panas regenerasi dianggap gratis dan after-cooler dua kali lebih efisien daripada koil acuan. Jalur ini tetap Hipotesis riset · belum divalidasi, dan pemanasan air (DHW) memberi nilai per kWh termal yang lebih baik.
