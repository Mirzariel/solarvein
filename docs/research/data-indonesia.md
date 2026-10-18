# Indonesia site data for SolarVein

All values trace to ids in `sources.md` / `src/sim/references.ts`. `TIDAK TERVERIFIKASI` = could not be verified from a source I opened (value null). "Derived" = my arithmetic on verified inputs. Retrieval date 17 Oct 2026.

## A. Grid emission factor

| Quantity | Value | Basis / caveat | Source id |
|---|---|---|---|
| Jamali (Jawa-Madura-Bali) grid EF, energy-saving projects (JCM case 1) | **0.87 tCO2/MWh** | ESDM 2019 "Nilai FE GRK" as re-tabulated by JCM (FY2022 table 2-1). Case 2 (JCM cap) = 0.80. Secondary compilation; primary ESDM PDF not retrievable | `jcm-id-ef-2022` |
| Jamali, renewable-energy projects (JCM) | 0.613 (case 1), 0.533 (case 2) tCO2/MWh | JCM rule for RE credits; why lower than 0.87 was not verified | `jcm-id-ef-2022` |
| Indonesia national average carbon intensity 2024 | **680.25 gCO2/kWh** (2023: 680.80; 2022: 675.81; 2017-2024 range 676-694) | OWID/Ember-style national figure, all grids, not Jamali; basis not stated | `owid-energy-2025` |
| Coal share of generation 2024 | 61.5 % | same | `owid-energy-2025` |
| ESDM later-year (2020-2023) FE GRK value; IEA value | `TIDAK TERVERIFIKASI` (null) | gatrik.esdm.go.id is a JS shell; IEA database paywalled | - |
| Generation vs consumption basis | `TIDAK TERVERIFIKASI` | ESDM FE is a combined-margin factor "at generation"; T&D losses (not verified here) would raise kg per kWh consumed | - |

Recommendation for the model: default 0.87 tCO2/MWh (Jamali, the system serving Bali/Jakarta/Yogyakarta) with an explicit sensitivity band 0.613 / 0.68 / 0.87. State that PV/T electricity is credited at the displaced grid factor, and say plainly the factor year (2019 basis) is dated.

## B. LPG

| Quantity | Value | Source id |
|---|---|---|
| CO2 emission factor, stationary combustion (commercial/institutional) | **63,100 kg/TJ** (95 % CI 61,600-65,600) | `ipcc2006-v2c2-stationary` (Table 2.4), `ipcc2006-v2c1-ncv-ef` (Table 1.4) |
| CH4 / N2O (commercial/institutional) | 5 kg/TJ / 0.1 kg/TJ (CO2e about 0.17 kg/GJ with AR5 GWP, 0.3 % of CO2; derived) | `ipcc2006-v2c2-stationary`, `ghgp-gwp-2024` |
| Net calorific value | **47.3 MJ/kg** (= TJ/Gg; CI 44.8-52.2) | `ipcc2006-v2c1-ncv-ef` (Table 1.2) |
| Derived | **2.985 kg CO2 per kg LPG**; **0.2272 kg CO2 per kWh fuel energy (NCV)**; per kWh heat = 0.2272 / boiler efficiency (e.g. eta 0.80 -> 0.284) | derived |
| Boiler efficiency for hotel LPG/electric heaters | `TIDAK TERVERIFIKASI` (model assumption, label as such) | - |

## C. Solar resource (Denpasar, Bali, 8.65°S 115.22°E; Jakarta and Yogyakarta for comparison)

Global Solar Atlas itself is a JS app and was not read; two independent open datasets were used instead (NASA POWER, PVGIS-ERA5). They agree within about 2-4 %.

Denpasar monthly mean daily GHI (kWh/m2/day):

| | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Annual | Nov-Mar |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NASA POWER all-sky (2001-2025) | 5.28 | 5.43 | 5.50 | 5.53 | 5.15 | 4.93 | 5.09 | 5.72 | 6.33 | 6.51 | 6.08 | 5.23 | **5.56** | 5.50 |
| PVGIS-ERA5 (2005-2020) | 5.49 | 5.77 | 5.74 | 5.69 | 5.26 | 4.91 | 5.04 | 5.64 | 6.37 | 6.75 | 6.35 | 5.42 | **5.70** | 5.75 |
| NASA clear-sky | 7.43 | 7.45 | 7.22 | 6.72 | 6.09 | 5.75 | 5.93 | 6.51 | 7.09 | 7.38 | 7.42 | 7.36 | 6.86 | 7.37 |

(`nasa-power-denpasar`, `pvgis-era5-denpasar`; Nov-Mar and PVGIS monthly are day-weighted by me.) Comparison, annual / Nov-Mar GHI: Jakarta 5.38 (PVGIS) or 4.83 (NASA) / 4.60 (NASA); Yogyakarta 5.26 (PVGIS) or 5.16 (NASA) / 4.89 (NASA). Denpasar is the sunniest of the three; Jakarta/Yogyakarta wet-season GHI is 11-16 % below Denpasar (NASA).

Rainy-day behaviour, Denpasar, derived from NASA POWER daily series 2015-2024 (3,653 days; reanalysis, so spatially smoothed - wet-day counts are probably over-estimated, treat as indicative):

| Day class | Days | Mean GHI (kWh/m2/day) | P10-P90 |
|---|---|---|---|
| All days | 3,653 | 5.58 | 4.25-6.81 |
| Wet season Nov-Mar, all | 1,513 | 5.52 | 3.73-6.84 |
| Wet season, rain < 1 mm | 234 | 6.62 | 5.82-7.28 |
| Wet season, 1-10 mm | 840 | 5.71 | 4.36-6.72 |
| Wet season, 10-20 mm | 281 | 4.83 | 3.34-6.08 |
| Wet season, >= 20 mm | 158 | **4.11** | 2.43-5.47 |

- Days per year with rain >= 1 / 5 / 10 / 20 mm: 201 / 105 / 55 / 19 (Nov-Mar: 128 / 78 / 44 / 16 of 151).
- Rain >= 5 mm runs in Nov-Mar: longest 23 consecutive days, mean 3.7 days, 108 runs of >= 3 days in 10 years (about 11 per season).
- GHI < 3 kWh/m2/day on only about 6.2 wet-season days/yr (< 2 on about 1.1). Heavy-rain days still deliver about 4 kWh/m2 (reanalysis; daily-total GHI, not instantaneous), about 63 % of the clear-sky value versus 89 % on dry days.
- Climatological rain 1,589 mm/yr (NASA), 1,173 mm of it Nov-Mar (7.8 mm/day wet season, 4.4 mm/day annual).
- BMKG rainy-day/wet-season statistics: `TIDAK TERVERIFIKASI` (no BMKG page opened).

Implication to state honestly: a rainy day in Bali is dimmer, not dark (about 4 kWh/m2), but nights plus multi-day rain are what the tank carry-over / PVT-as-heat-pump-source story must cover.

## D. Climate (NASA POWER climatology, point cell 313.7 m a.s.l.)

Denpasar cell monthly means: T2M (°C) Jan 25.5, Feb 25.5, Mar 25.7, Apr 25.7, May 25.1, Jun 24.3, Jul 23.5, Aug 23.5, Sep 24.4, Oct 25.7, Nov 26.3, Dec 25.9; annual **25.1**, Nov-Mar 25.8. RH2M annual **83.4 %**, Nov-Mar 84.3 % (range 78.8-85.9 %). Specific humidity QV2M annual 17.0 g/kg, Nov-Mar 17.9 g/kg; humidity ratio w = q/(1-q) = **17.3 g/kg dry air annual, 18.3 g/kg in Jan-Mar** (derived). Dew point about 22 °C (derived). Daily max T2M monthly means 29.4-34.5 °C (Dec 34.5), min 18.7-22.3 °C.

Lowland comparison (NASA POWER): Jakarta annual T 27.3 °C, RH 81.2 %, QV 18.3 g/kg -> w 18.7 g/kg, dew point about 23.8 °C (derived). Yogyakarta T 25.8 °C, RH 82.8 %, w 17.7 g/kg. The Denpasar cell is high (314 m) vs coastal hotels (PVGIS: 33 m) so coastal T is a little warmer: use 27-28 °C for design day, 24-25 °C is only the annual cell mean.

Mains/cold-water temperature, lowland Indonesia: `TIDAK TERVERIFIKASI`. Proxy: annual mean air T 25-27 °C (Denpasar cell to Jakarta). Flag as an assumption; sensitivity +/- 3 K.

## E. Hotel sector

BPS (2023), `bps-hotel-2023`:

| | Establishments | Rooms | Beds |
|---|---|---|---|
| Star hotels, Indonesia | **4,129** | **382,160** | 578,197 |
| Star hotels, Bali | 541 | 54,275 | 76,047 |
| Star hotels, DKI Jakarta | 448 | 57,116 | 74,333 |
| Star hotels, DI Yogyakarta | 193 | 18,818 | 36,668 |
| Star + other accommodation, Indonesia | 29,005 | 747,066 | 1,124,377 |

About 60 % of star hotels are in Java and Bali; 24,867 non-star accommodation businesses (BPS text). Average star hotel = 92.6 rooms (derived). Occupancy (TPK) from BPS: not extracted (`TIDAK TERVERIFIKASI` here).

End-use split (no national audit-based split found; ASEAN Centre for Energy/IFC/GIZ hotel split: `TIDAK TERVERIFIKASI`). Available evidence:

| Evidence | AC share | Hot-water share | Notes | Id |
|---|---|---|---|---|
| Semarang hotel audit (one hotel) | **71.3 %** of electricity | **4.44 %** of electricity | rest lighting+equipment 27.28 %; electricity = 84.44 % of energy cost; hot-water fuel (if diesel/LPG) not in the 4.44 % | `ariwibowo2011-hotel-audit` |
| ESDM (2000) government profile, quoted in the same paper | **48.5 %** | not given | quoted secondhand | `ariwibowo2011-hotel-audit` |
| Hong Kong, 16 hotels (1995 data) | about one third of TOTAL energy | not in abstract | subtropical | `deng-burnett-2000` |
| Bali five-star hotel (636 rooms) | n/a | n/a | optimised AC-heat-recovery + heat pump cut energy for cooling + hot water by 36.7 %, = 6.6 % of total hotel energy, so cooling + hot water considered about 18 % of total (derived; scope ambiguity) | `suamir2015-hp-heat-recovery` |

Use for the pitch: AC dominates hotel electricity (about half to 70 % in audits); hot water is a much smaller but thermally-driven (LPG/electric boiler) load. Do not claim a single national split.

Hot water per occupied room (ASHRAE Handbook SWH table: `TIDAK TERVERIFIKASI`):

| Value | Basis | Id |
|---|---|---|
| **200 L/room/day at 55 °C** | assumed (not measured) for Indonesian five-star hotel by Suamir et al. | `suamir2017-dhw-200l` (secondary) |
| about 75 L/room/day measured (131,000 predicted -> about 164 L/room) | London, about 800 rooms, 60,000 L/day measured; derived per room; non-tropical | `cibse-hotel-hot-water` |
| 260 L/day/room TOTAL water (not hot only) | assumption, Thai hotels | `jingjit-techato-apst` |
| 90-160 L/day per occupant | rule of thumb, no source given | `engtoolbox-hotwater` |

Model default suggestion (my judgement, label as assumption): 100-200 L per occupied room per day at 55-60 °C, with the 75 / 200 / 260 sensitivities above.

## F. Heat-pump and cooling COP

| Equipment | Value | Basis | Id |
|---|---|---|---|
| Measured hotel heat pumps, Hong Kong (pool + hot water supplement) | COP generally **1.5-2.4** | field, subtropical, water-to-water / pool | `lam-chan-2003-hotel-hp` |
| Solar-assisted HP water heater, Singapore | average COP **4-9** for tank 30-50 °C; falls with tank T | simulation; condenser T below DHW target | `hawlader2001-sahp-singapore` |
| Heat pump vs instantaneous electric water heater (Thailand) | about 3x as efficient (COP about 3 equivalent) | secondary, quoted from Thai Ministry of Energy 2009 | `jingjit-techato-apst` |
| Uncovered PVT + ground-source HP, Denmark | SPFsys 5.1 | field, cold climate | `iea-shc-t60-a1` |
| Indonesian single-split AC (MEPS/label, proposed 2020) | CSPF 3.10 (1-star) to 5.00 (5-star) W/W; LBNL proposal 3.72-8.05 W/W | policy values, not field COP | `lbnl-indonesia-ac-meps-2020` |
| Chiller COP (water-/air-cooled), tropical hotels | `TIDAK TERVERIFIKASI` | - | - |
| Condenser heat available | Q_cond = Q_cooling (1 + 1/COP); e.g. COP 3.5 -> 1.29 x cooling load | thermodynamic identity (derived) | - |

## G. Embodied carbon and refrigerants

| Item | Value | Id |
|---|---|---|
| Mono-Si rooftop PV system | **35.8 g CO2e/kWh** (module alone 20.2); derived about **1,050 kg CO2e/kWp** system, about **590 kg CO2e/kWp** module (976 kWh/kWp/yr, 30 yr) | `iea-pvps-t12-2023` |
| Evacuated-tube hybrid PVT (manufacturer LCA) | 0.344 kg CO2e/Wp (= 344 kg/kWp; 122 kg per collector); PV 0.81 kg/Wp quoted there | `zagorulko2024-pvt-lca` |
| Unglazed liquid PV/T per kWp or per m2 | `TIDAK TERVERIFIKASI` (use PV module value + added HX/piping as a stated assumption) | - |
| GWP100 R32 (HFC-32) | 677 (AR5), **771 (AR6)** | `ghgp-gwp-2024` |
| GWP100 R410A (derived, 50/50 mass HFC-32/HFC-125) | 1,923.5 (AR5), 2,255.5 (AR6) | derived from `ghgp-gwp-2024` |

## H. Legionella

- Store hot water at >= 60 °C; deliver >= 50 °C at outlets within 1 min (55 °C healthcare); keep cold < 20 °C: `hse-legionella-hot-cold` (UK HSE, verified).
- WHO recommendation as summarised secondhand: store at 60 °C (whole tank, once a day), tap >= 50 °C: `levesque2004-who-60c-summary`. WHO 2007 manual and ASHRAE 188 text: `TIDAK TERVERIFIKASI`.
- IEA SHC T60 D5 also states 60 °C is required to prevent legionellosis and that unglazed collectors reach it only in high-irradiance climates: `iea-shc-t60-d5`. Consequence: PV/T heat is a preheat stage before the existing heater (design point of SolarVein).

## I. Fresh-air ventilation, hotel guest room

- ASHRAE 62.1-2016 Addendum z, informative Table N-1: hotel bedroom/living room check rate **0.15 cfm/ft2 = 0.73 L/s per m2** (assumes Ev 0.75; not a design value): `ashrae621-addendum-z-2018`.
- Per-person (Rp) and per-area (Ra) components of normative Table 6.2.2.1: `TIDAK TERVERIFIKASI` (paywalled; do not quote 2.5 L/s.person and 0.3 L/s.m2 as sourced).
- Latent load context (derived from section D): outdoor air at w = 17-19 g/kg versus a typical supply/room condition near 8-10 g/kg (the latter NOT sourced) - the dehumidification need is large, which motivates the desiccant branch.
