# Apa yang sudah ada / apa yang baru (prior art)

Scope note: this search was a bounded web search (about 40 queries), not a systematic review. Items marked (S) were seen only as abstract/title/search summary; (V) were opened. Absence of a hit is "not found by me", not proof of absence.

## What already exists

**PV/T for hot water, including tropics.** PV/T hot-water systems are established. Task 60 (IEA SHC) treats uncovered liquid PVT as a standard collector class, with typical thermal efficiency about 61 % at ambient fluid temperature (V, `iea-shc-t60-d5`). Tropical studies exist: a modelled 10 kWp PV/T for a Singapore student hostel (S, `dubey-tay2013-pvt-singapore`), a Kuala Lumpur water-PVT test reaching 67.4 % and 45.8 °C outlet (S, `basuhaib2024-kl-pvt`), a Comoros simulation (S, `maoulida2022-pvt-comoros`) and a residential review (S, `bandaru2021-pvt-review`). I found no hotel-scale PV/T DHW study for Indonesia.

**PV/T with air-conditioning.** A Singapore numerical study couples PV/T with a refrigeration system for air-conditioning and hot water (S, title-level, `dubey-subiantoro2018-pvt-ac-hotwater`). So "PV/T plus cooling plus hot water in the tropics" is not unexplored.

**PV/T and desiccant dehumidification.** PV/T-regenerated desiccant wheels have been modelled (S): a silica-gel wheel with a glazed PV/T (`guo2022-pvt-desiccant`) and a concentrating PV/T with a desiccant AHU (`calise2014-cpvt-desiccant`). Solar regeneration of silica gel in humid tropics was tested in Thailand (S, `techajunta1999-solar-simulator-tropical`, `pramuang-exell2007-cpc-regeneration`). Low-temperature regeneration evidence is mostly composite desiccants at about 60 °C on a Singapore-air bench (V, `chua-islam2015-composite`) and a 25-40 °C bench wheel (V, `oconnor2017-low-regen-wheel`); conventional silica-gel wheels are quoted at 80-120 °C.

**PV/T heat pumps.** Uncovered PVT as heat-pump source, including below ambient and without sun, is described by Task 60 (V, `iea-shc-t60-d5`, `iea-shc-t60-b1`); field SPF 5.1 in Denmark (V, `iea-shc-t60-a1`); Singapore solar-assisted HP simulations COP 4-9 (V abstract, `hawlader2001-sahp-singapore`). Nothing tropical on night/rain operation was found.

**Condenser heat recovery in hotels.** A Bali five-star hotel study found AC heat recovery plus heat pump saves 36.7 % of cooling + hot-water energy (6.6 % of total hotel energy) versus separate boiler and AC (V abstract, `suamir2015-hp-heat-recovery`, `suamir2017-waste-heat-recovery`). This is exactly baseline B4, and it is strong competition: it needs no roof.

**Control of PV/T heat among loads.** Hybrid/model-predictive controllers that select operating modes for PVT plus storage exist for residential HVAC (S, `fiorentini2015-mpc-pvt-pcm`); multi-source heat-pump controllers with PVT were seen in search results (not opened).

## What is not new

- PV/T DHW preheating itself; unglazed PV/T as a heat-pump source; PV/T-regenerated desiccant as a concept; AC condenser recovery for hotel hot water; Tóth isotherm for silica gel; MPC or rule-based mode selection.
- Claims that PV/T cools PV: the benefit is real but small (about 0.3-0.45 %/K, `kaldellis2014-pv-tempcoeff`) and must be netted against heat-demand timing.

## What is genuinely differentiating (and must be proven, not assumed)

1. **Value-ranked allocation of one low-grade heat stream across DHW, desiccant regeneration, storage and bypass**, with an explicit exchange rate between them (kg CO2e avoided per kWh_th at the temperature actually delivered). I found no study that allocates unglazed PV/T heat across hot water and desiccant dehumidification by marginal value in a hotel.
2. **Equal-service comparison against four baselines**, including B2 (PV + heat-pump water heater + efficient HVAC) and B4 (condenser recovery). Prior PV/T papers compare against a boiler or PV alone; the B4 comparison is the honest test and may well favour B4 for the DHW share.
3. **Humid-tropic hotel context with a rain/night chain**: tank carry-over, PV/T as heat-pump source, condenser recovery, evaluated with Indonesian grid and LPG factors and wet-season irradiance (about 4 kWh/m2 on heavy-rain days in Denpasar, derived from `nasa-power-denpasar`).
4. **Honest low-temperature desiccant penalty at 35-70 °C**, rather than assuming wheel performance at 80-120 °C.

## Risks to the claim

The desiccant branch rests on bench-scale composite results; unglazed collectors struggle to reach 55-60 °C (hence preheat-only DHW); and B4 may capture most hotel DHW for free. The defensible novelty is the allocation-and-accounting framework and its transparency, not any single component.
