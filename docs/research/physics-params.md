# Physics parameters for the SolarVein model

Every value carries a source id (`sources.md`). `TIDAK TERVERIFIKASI` = form only, value null. "Derived" = my calculation from verified inputs.

## A. Silica gel RD - water isotherm

**Verified equation and coefficients (Li et al., 2014, `li2014-evergreen-silica-toth`)** - fit to Fuji Davison type RD silica gel POWDER (70 um), measured 25-45 °C, pressure up to about 9 kPa, R2 = 0.989, NRMSE 6.6 %:

```
q*(T,P) = q0 * x / (1 + x^t)^(1/t),   x = K_T * P * exp( Qst / (R_w * T) )
q0  = 0.455 kg/kg        (limiting uptake)
Qst = 2519.6 kJ/kg       (fitted isosteric heat of adsorption)
K_T = 4.5e-12 Pa^-1      (printed as "kPa^-1" in Table 2 - see unit note)
t   = 10.3               (heterogeneity)
R_w = 0.46152 kJ/(kg K)  (8.314/18.015); T in K; P = water-vapour partial pressure
```

Unit note (derived, checked): with P in Pa and K_T = 4.5e-12 the equation reproduces the paper's Fig. 3a at 30 °C (0.136 kg/kg at 1 kPa, 0.27 at 2 kPa, 0.40 at 3 kPa, 0.45 at 4 kPa) and Fig. 4 (about 0.29 at P/Ps 0.5, 0.43 at 0.8). The printed "kPa^-1" is therefore an error. Keep a unit test against these points.

Other verified silica-gel RD properties (same paper, Table 1): BET 573 m2/g; pore volume 0.39 ml/g; apparent density 800 kg/m3; thermal conductivity 0.198 W/m K; cp 0.921 kJ/kg K; **heat of adsorption (H2O) 2800 kJ/kg** (quoted from earlier literature). Dubinin-Astakhov alternative (same table): q0 0.455, Ec 164.9 kJ/kg, gamma 1.443, R2 0.988.

Illustrative equilibrium uptakes from the fit (derived; the fit is only validated to 45 °C, above that it is an extrapolation, and see caveat below):

| T (°C) | q at P/Ps = 0.3 | 0.5 | 0.8 |
|---|---|---|---|
| 30 | 0.17 | 0.29 | 0.43 |
| 45 | 0.17 | 0.28 | 0.42 |
| 60 | 0.16 | 0.27 | 0.41 |
| 70 | 0.16 | 0.26 | 0.40 |

Ideal equilibrium cycle for Denpasar-like air (w = 18 g/kg -> P_w about 2.85 kPa; adsorb at 27 °C, regenerate with the same air heated to T_reg; no heat-exchange or kinetics penalty; **upper bound**, not a bed capacity):

| T_reg (°C) | RH of regeneration air | q_reg | delta q vs adsorb at 27 °C (q = 0.43) |
|---|---|---|---|
| 45 | 30 % | 0.165 | 0.26 kg/kg |
| 50 | 23 % | 0.127 | 0.30 |
| 55 | 18 % | 0.098 | 0.33 |
| 60 | 14 % | 0.076 | 0.35 |
| 70 | 9 % | 0.047 | 0.38 |

So equilibrium physics alone says 50-60 °C regeneration of silica gel with humid tropical air is thermodynamically capable of a large swing; real limits are kinetics, bed heat of sorption, flow rates and extrapolation of the fit.

**Not verified / caveats**
- Chua et al. (2002, `chua2002-silica-isotherm`): Tóth model for type A and RD gel at 298-338 K and 500-7000 Pa (so it covers up to 65 °C) - **coefficients and the temperature-dependent A(T), B(T) polynomials: `TIDAK TERVERIFIKASI`** (paywalled; not seen in any open source). Form only: Tóth with t and Qst.
- Ng et al. (2001, `ng2001-silica-henry`): Henry-type van't Hoff form W = K0 exp[Qst/(R_w T)] p is valid at low loading (`costafilho2005-silica-henry`); **K0, Qst: `TIDAK TERVERIFIKASI`**.
- Pesaran & Mills (1987): isotherm polynomial and surface-diffusivity constants `TIDAK TERVERIFIKASI` (the COBEM paper confirms only that internal surface diffusion limits RD-gel mass transfer).
- A 2018 paper (`mohammed2018-silica-isotherm-review`, secondary) states that Tóth and Freundlich forms break down for relative pressure below about 0.15, which is exactly the regeneration regime (P/Ps 0.1-0.2 at 50-60 °C). Treat model results there as uncertain. Maximum uptake of RD gels 0.38-0.48 kg/kg (secondary) brackets the fitted q0 = 0.455.
- Fit is to powder; commercial beds/wheels (beads, 2-4 mm) are slower (diffusion limited).

## B. Desiccant regeneration temperature

| Material | Regeneration temperature (evidence) | Id |
|---|---|---|
| Silica gel, conventional rotary wheel | 80-120 °C "currently required" (authors' statement) | `oconnor2017-low-regen-wheel` |
| Silica gel (Singapore-air test bed) | authors quote 120 °C as the usual figure; silica-gel adsorption CHILLERS run on 55-90 °C heat, COP 0.2-0.65 | `chua-islam2015-composite`, `li2014b-silica-adsorption-chiller-range` |
| Zeolite 350 °C; alumina/activated carbon 250 °C; clay composites < 100 °C | authors' summary of literature | `chua-islam2015-composite` |
| Silica gel / LiCl / CaCl2 / bentonite composite at about 60 °C | tested at about 60 °C regeneration with 30 °C, 80 % RH inlet (Singapore-like); four-layer composite regeneration at 60 °C close to pure silica gel and silica gel-LiCl; moisture removal +14-22.5 % (varying T) and +10-26.3 % (varying RH) vs pure silica gel | `chua-islam2015-composite` |
| Low-T proof of principle | silica-gel-coated wheel regenerated at 25-40 °C: RH of airstream reduced by up to 67 %, max pressure drop 10.31 Pa (small bench rig, unconventional geometry) | `oconnor2017-low-regen-wheel` |
| Solar-heated air in tropical humid climate | regeneration begins near 40 °C (CPC) and works in a solar simulator (secondary) | `pramuang-exell2007-cpc-regeneration`, `techajunta1999-solar-simulator-tropical` |
| Solid-desiccant cooling cycles, Malaysia simulation | about 80-82 °C (COP about 1.06, two-stage) and about 122 °C (COP about 0.57, single-stage) (secondary) | `dezfouli2014-solar-desiccant-malaysia` |
| LiCl composites, DCHE | 50-60 °C regeneration claimed sufficient in desiccant-coated heat-exchanger literature (seen only in search summaries of ScienceDirect abstracts; not opened) -> `TIDAK TERVERIFIKASI` | - |

Honest reading for the hypothesis: 50-60 °C regeneration is supported only by composite/salt-hybrid desiccants (bench-scale) and by thermodynamics of the silica-gel isotherm; conventional silica-gel wheels are specified at 80-120 °C. So the desiccant branch should be presented as a research hypothesis with a capacity penalty at 35-70 °C, as planned.

## C. Unglazed PV/T thermal and electrical performance

- Model form (ISO 9806:2017, steady-state, for unglazed/WISC collectors; `iea-shc-t60-b1`): thermal power = A [ eta0,b G_b + ... - c1 (Tm - Ta) - c2 (Tm - Ta)^2 - c3 u' (Tm - Ta) + c4 (E_L - sigma Ta^4) - c6 u' G ... ], reduced wind u' = u - 3 m/s. Coefficients must be measured in MPP electrical mode (electrical operation affects thermal efficiency).
- Verified reference point: eta_th,0 = **61 %** of AM1.5 irradiance at T_fluid,mean = T_ambient "as typically found in unglazed or glazed PVT collectors", with 15 % electrical (STC efficiency 15 %), 15 % heat losses and 9 % optical losses (`iea-shc-t60-d5`, p. 4).
- Qualitative (`kim-kim2012-glazed-unglazed-pvt`): glazed has higher thermal efficiency, unglazed higher electrical efficiency.
- Tropical measurement (secondary, `basuhaib2024-kl-pvt`): Kuala Lumpur water PVT peak thermal efficiency 67.4 % with 45.8 °C outlet at 0.5 L/min - i.e. useful heat near 45 °C is easy, 55-60 °C is hard without losing efficiency.
- c1, c2, c3 values for a specific unglazed liquid PV/T: **`TIDAK TERVERIFIKASI`** (datasheets/Solar Keymark certificates not reachable; the T60 D1 Table 5 values eta0 0.8, a1 4.5, a2 0.025 are covered-PVT simulation assumptions, `iea-shc-t60-d1`, not unglazed).
- PV temperature coefficient: field-measured negative **0.30-0.45 %/°C**, smaller for ventilated free-standing frames (`kaldellis2014-pv-tempcoeff`). Use -0.40 %/K central with 0.30-0.45 band. Reference cell temperature (25 °C) vs tropical module temperature is a model choice, not sourced here.
- Stagnation: T60 D5 notes uncovered PVT stagnation stays well below 100 °C (statement seen in a search summary; page not re-checked) - keep as `TIDAK TERVERIFIKASI` unless re-opened.

## D. PV/T as heat-pump source (solar-assisted, night/rain)

- Verified concept (`iea-shc-t60-d5`, `iea-shc-t60-b1`): uninsulated/uncovered (WISC) PVT is suited to operation near and below ambient; 'fluid can be heated up to ambient temperature even in periods without sunshine'; condensation gains can be significant and are a second heat source; sub-ambient operation raises heat-pump COP; icing matters in cold climates (not Indonesia). T60 B1 also notes night radiative-cooling use of unglazed PVT and the absence of a night-time model in TRNSYS (Type 233 developed).
- Field SPF (cold climate, uncovered PVT + ground-source HP, Denmark): SPFsys **5.1** (`iea-shc-t60-a1`) - not transferable to tropics.
- Tropical numbers: Singapore solar-assisted HP water heater simulation, average COP **4-9** for 30-50 °C tank (`hawlader2001-sahp-singapore`, simulation; falls with tank T); measured hotel HP COP **1.5-2.4** in Hong Kong (`lam-chan-2003-hotel-hp`). Air-source HPWH COP at 55-60 °C delivery in tropical hotels: `TIDAK TERVERIFIKASI`. Use 2.5-4 as a clearly labelled assumption band between the two verified extremes, not as a sourced value.
- No published tropical PVT-heat-pump night/rain performance was found.

## E. Desiccant wheel/bed pressure drop and effectiveness

| Value | Context | Id |
|---|---|---|
| 258-390 Pa mean pressure difference | packed test samples at 30 °C / 80 % RH: pure silica gel 353.6 Pa; SiO2 91.1 % + LiCl 8.9 %: 389.7 Pa; best four-layer composite 258.3 Pa (-27 % / -34 % vs comparators) | `chua-islam2015-composite` (Table 3) |
| 10.31 Pa maximum | silica-gel-coated radial-blade wheel, bench | `oconnor2017-low-regen-wheel` |
| 8.2-9.8 g/kg dry air moisture removal capacity at 30 °C / 80 % RH; saturation time 11.6-23 min | same test bed (Singapore-like air) | `chua-islam2015-composite` (Table 3) |
| Commercial desiccant wheel pressure drop (Pa), cycle effectiveness | `TIDAK TERVERIFIKASI` (De Antonellis effectiveness-correlation paper 403; no manufacturer data) | - |

Latent-load context (derived from `nasa-power-denpasar`): outdoor w about 17-19 g/kg; a bed delivering 8-10 g/kg removal (above) is the right order of magnitude for fresh-air pre-dehumidification, but it is a batch test-bed value, not a continuous wheel rating.
