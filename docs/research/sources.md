# SolarVein research sources

Rule applied: only sources actually found and opened through WebSearch/WebFetch/HTTP APIs in this session (17 Oct 2026). Unknown = `TIDAK TERVERIFIKASI` (value left null). Confidence: **verified-from-source** (value read in the source itself) or **secondary** (seen only through a secondary/summary channel, or the source itself is a secondary compilation). Derived numbers (my arithmetic) are flagged as such. The same ids are used in `src/sim/references.ts`.

Entries: 51. Verified-from-source: 33. Secondary: 18.

## A. Emission factors (grid, LPG, refrigerants)

### `jcm-id-ef-2022`

- **APA 7:** Global Environment Centre Foundation (GEC). (2022). 令和4年度JCM設備補助事業 電力CO2排出係数一覧表 [FY2022 JCM Equipment Subsidy Programme: Electricity CO2 emission factors table; Table 2-1 and Table 2-2, Indonesia]. Published 6 April 2022. Data source cited therein: Directorate General of Electricity, Ministry of Energy and Mineral Resources (ESDM), Indonesia, Nilai FE GRK Sistem Ketenagalistrikan Tahun 2019.
- **URL/DOI:** https://gec.jp/innovation/R4/T.CO2EmissionFactor_20220406.pdf
- **Supports:** Secondary (JCM) listing of ESDM-derived Indonesian grid CO2 emission factors: Jamali system 0.87 tCO2/MWh (energy-saving projects, case 1) and 0.80 (case 2 cap); 0.613 / 0.533 for renewable-energy projects.
- **Values / location:**
  - Table 2-1 (energy-saving projects), row 22 Jamali (Bali, Banten, DI Yogyakarta, DKI Jakarta, Jawa Barat, Jawa Tengah, Jawa Timur): Case 1 = 0.87 tCO2/MWh; Case 2 = 0.80 tCO2/MWh.
  - Table 2-2 (renewable energy projects), Jamali: Case 1 = 0.613; Case 2 = 0.533 tCO2/MWh. (The meaning of the JCM 'cases' and why RE values are lower was NOT verified.)
  - Footnote: factors are ESDM 'GHG Emission Factor, Electricity Interconnection System' of year 2019 (gatrik.esdm.go.id, file nilai-fe-grk-sistem-ketenagalistrikan-tahun-2019.pdf). The primary ESDM PDF could NOT be downloaded (site is a JS app returning HTML).
- **Confidence:** secondary

### `owid-energy-2025`

- **APA 7:** Our World in Data. (2025). Energy dataset [Data set, variable carbon_intensity_elec, country = Indonesia]. GitHub. https://github.com/owid/energy-data
- **URL/DOI:** https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv
- **Supports:** Indonesia national-average electricity carbon intensity 2017-2024 (about 676-694 gCO2/kWh) and coal share of generation (about 61.5 percent in 2024).
- **Values / location:**
  - carbon_intensity_elec (gCO2/kWh): 2017 688.49; 2018 684.06; 2019 693.81; 2020 685.15; 2021 684.41; 2022 675.81; 2023 680.80; 2024 680.25.
  - coal_share_elec 2024 = 61.48 percent; fossil_share_elec 2024 = 81.91 percent; electricity_generation 2024 = 371.54 TWh.
  - National average (all Indonesian grids), NOT Jamali-specific; basis (generation, life-cycle or direct) not stated in the file I opened.
- **Confidence:** verified-from-source

### `ipcc2006-v2c1-ncv-ef`

- **APA 7:** Garg, A., Kainou, K., & Pulles, T. (2006). Chapter 1: Introduction. In H. S. Eggleston, L. Buendia, K. Miwa, T. Ngara, & K. Tanabe (Eds.), 2006 IPCC guidelines for national greenhouse gas inventories: Vol. 2. Energy (Tables 1.2 and 1.4). Institute for Global Environmental Strategies (IGES).
- **URL/DOI:** https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf
- **Supports:** LPG default net calorific value 47.3 TJ/Gg (= MJ/kg), carbon content 17.2 kg/GJ and CO2 emission factor 63,100 kg/TJ (95 percent CI 61,600-65,600).
- **Values / location:**
  - Table 1.2 (PDF p. 18): Liquefied Petroleum Gases NCV = 47.3 TJ/Gg (= 47.3 MJ/kg); 95 percent CI 44.8-52.2.
  - Table 1.4 (printed p. 1.22): LPG default carbon content 17.2 kg/GJ; default oxidation factor 1; effective CO2 EF = 63,100 kg/TJ; CI 61,600-65,600.
  - Derived (my arithmetic): 63.1 kg/GJ x 47.3 MJ/kg = 2.985 kg CO2 per kg LPG; 63.1 kg/GJ / 277.78 kWh/GJ = 0.2272 kg CO2 per kWh of fuel (NCV).
- **Confidence:** verified-from-source

### `ipcc2006-v2c2-stationary`

- **APA 7:** Gómez, D. R., Watterson, J. D., Americano, B. B., Ha, C., Marland, G., Matsika, E., Namayanga, L. N., Osman-Elasha, B., Saka, J. D. K., & Treanton, K. (2006). Chapter 2: Stationary combustion. In H. S. Eggleston, L. Buendia, K. Miwa, T. Ngara, & K. Tanabe (Eds.), 2006 IPCC guidelines for national greenhouse gas inventories: Vol. 2. Energy (Table 2.4). Institute for Global Environmental Strategies (IGES).
- **URL/DOI:** https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf
- **Supports:** Stationary-combustion default emission factors for LPG in the commercial/institutional category: CO2 63,100 kg/TJ, CH4 5 kg/TJ, N2O 0.1 kg/TJ (net calorific basis).
- **Values / location:**
  - Table 2.4 (commercial/institutional; PDF p. 20), Liquefied Petroleum Gases: CO2 63,100 (61,600-65,600) kg/TJ; CH4 5 (1.5-15) kg/TJ; N2O 0.1 (0.03-0.3) kg/TJ.
  - Table 2.2/2.3 (energy industries / manufacturing) give the same CO2 factor with CH4 1 and N2O 0.1 kg/TJ.
- **Confidence:** verified-from-source

### `ghgp-gwp-2024`

- **APA 7:** Greenhouse Gas Protocol. (2024). IPCC global warming potential values (Version 2.0, August 2024; adapted from IPCC AR4, AR5 and AR6). World Resources Institute & World Business Council for Sustainable Development.
- **URL/DOI:** https://ghgprotocol.org/sites/default/files/2024-08/Global-Warming-Potential-Values%20%28August%202024%29.pdf
- **Supports:** 100-year GWPs: HFC-32 = 675 (AR4), 677 (AR5), 771 (AR6); HFC-125 = 3,500 / 3,170 / 3,740; HFC-134a = 1,430 / 1,300 / 1,530; HFC-143a = 4,470 / 4,800 / 5,810; CH4 fossil 30 (AR5) / 29.8 (AR6); N2O 265 / 273.
- **Values / location:**
  - HFC-32: AR4 675, AR5 677, AR6 771. HFC-125: 3,500 / 3,170 / 3,740. HFC-134a: 1,430 / 1,300 / 1,530.
  - R-410A blend GWP is NOT listed in this source. Derived by me, assuming the 50/50 mass fraction of HFC-32/HFC-125 (composition itself not verified in these sources): AR5 = 0.5x677 + 0.5x3170 = 1,923.5; AR6 = 0.5x771 + 0.5x3740 = 2,255.5.
- **Confidence:** verified-from-source

## B. Solar resource and climate

### `nasa-power-denpasar`

- **APA 7:** NASA Langley Research Center. (2026). Prediction of Worldwide Energy Resources (POWER) project: Climatology API v2.10.1 and daily point API (ALLSKY_SFC_SW_DWN, CLRSKY_SFC_SW_DWN, T2M, T2M_MAX, T2M_MIN, RH2M, QV2M, PRECTOTCORR; point 8.65°S, 115.22°E; climatology Jan 2001-Dec 2025; daily 2015-2024) [Data set]. Retrieved 17 October 2026.
- **URL/DOI:** https://power.larc.nasa.gov/api/temporal/climatology/point
- **Supports:** Denpasar-cell GHI (annual mean 5.56 kWh/m2/day), monthly GHI, temperature, RH, specific humidity and precipitation; daily statistics of GHI vs rainfall (derived by me from the daily series).
- **Values / location:**
  - See data-indonesia.md section C/D for the monthly tables. Grid-cell elevation reported by the API = 313.7 m (cell mean, so T2M is cooler than coastal Denpasar). Reanalysis rain is smoothed: wet-day counts are likely over-estimated.
- **Confidence:** verified-from-source

### `pvgis-era5-denpasar`

- **APA 7:** European Commission, Joint Research Centre. (n.d.). Photovoltaic Geographical Information System (PVGIS) v5.3: Monthly radiation, MRcalc tool, PVGIS-ERA5 database, 2005-2020, horizontal plane [Data set]. Retrieved 17 October 2026.
- **URL/DOI:** https://re.jrc.ec.europa.eu/api/v5_3/MRcalc
- **Supports:** Denpasar (8.65°S, 115.22°E, PVGIS elevation 33 m), Jakarta and Yogyakarta monthly horizontal irradiation 2005-2020; annual mean GHI 5.70 / 5.38 / 5.26 kWh/m2/day.
- **Values / location:**
  - Denpasar mean daily GHI by month (kWh/m2/day): Jan 5.49, Feb 5.77, Mar 5.74, Apr 5.69, May 5.26, Jun 4.91, Jul 5.04, Aug 5.64, Sep 6.37, Oct 6.75, Nov 6.35, Dec 5.42; annual 5.70; Nov-Mar 5.75.
  - Jakarta (6.2°S, 106.85°E): annual 5.38; Nov 5.52, Dec 4.81, Jan 4.83, Feb 4.96, Mar 5.28. Yogyakarta (7.8°S, 110.37°E): annual 5.26; Nov 5.42, Dec 4.71, Jan 5.02, Feb 5.26, Mar 5.20.
  - Derived by me: monthly means of the 16-year H(h)_m series divided by days in month.
- **Confidence:** verified-from-source

## C. Hotel sector, end-use split, hot-water demand

### `bps-hotel-2023`

- **APA 7:** Badan Pusat Statistik. (2023). Statistik hotel dan akomodasi lainnya di Indonesia 2023 [Hotel and other accommodation statistics in Indonesia 2023] (Publication No. 06300.2319). BPS-Statistics Indonesia.
- **URL/DOI:** https://www.bps.go.id/id/publication/2023/12/29/d9c277bd3ad62674f53e454a/hotel-and-other-accommodation-statistics-in-indonesia-2023.html
- **Supports:** Indonesia 2023: 4,129 star hotels with 382,160 rooms and 578,197 beds; all accommodation 29,005 establishments with 747,066 rooms; Bali, DKI Jakarta, DI Yogyakarta star-hotel counts.
- **Values / location:**
  - Lampiran 8 (p. 62): star hotels Indonesia 4,129 establishments / 382,160 rooms / 578,197 beds; Bali 541 / 54,275 / 76,047; DKI Jakarta 448 / 57,116 / 74,333; DI Yogyakarta 193 / 18,818 / 36,668; Jawa Barat 598 / 54,235; Jawa Timur 349 / 34,460.
  - Lampiran 4 (p. 58): star hotels + other accommodation Indonesia 29,005 establishments / 747,066 rooms / 1,124,377 beds; Bali 3,895 / 91,161 / 123,977.
  - Text p. 6: non-star accommodation 24,867 businesses in 2023; about 60 percent of star hotels are in Java and Bali.
- **Confidence:** verified-from-source

### `ariwibowo2011-hotel-audit`

- **APA 7:** Ariwibowo, D. (2011). Audit energi pada sebuah hotel [Energy audit of a hotel]. Gema Teknologi, 16(3), 131-134.
- **URL/DOI:** https://ejournal.undip.ac.id/index.php/gema_teknologi/article/download/4710/4266
- **Supports:** One Semarang hotel audit: electricity split AC 71.3 percent, lighting and electrical equipment 27.28 percent, hot-water supply 4.44 percent; EUI 420.9 kWh/m2/yr versus 300 benchmark; cites ESDM (2000) AC share 48.5 percent.
- **Values / location:**
  - Abstract and p. 131-132: electric end-use split AC 71.3 %, lighting + equipment 27.28 %, hot-water supply system 4.44 % (shares of ELECTRICITY only; the hotel also buys diesel and water, electricity = 84.44 percent of energy cost).
  - IKE (EUI) 420.867 kWh/m2/yr versus the 300 kWh/m2/yr standard for hotels (Departemen Pertambangan dan Energi, 2000); AC share 48.5 percent quoted from that government study.
  - Single hotel, 65 percent assumed occupancy, rooms 7,079 m2. Not representative; hot-water fuel (if diesel/LPG) is outside the 4.44 percent.
- **Confidence:** verified-from-source

### `deng-burnett-2000`

- **APA 7:** Deng, S., & Burnett, J. (2000). Study of energy performance of hotel buildings in Hong Kong. Energy and Buildings, 31(1), 7-12. https://doi.org/10.1016/S0378-7788(98)00067-X
- **URL/DOI:** https://research.polyu.edu.hk/en/publications/study-of-energy-performance-of-hotel-buildings-in-hong-kong/
- **Supports:** 16 Hong Kong quality hotels (1995 data): electricity dominates and roughly one third of total energy goes to air conditioning.
- **Values / location:**
  - Abstract only (full text not opened): electricity largest share; about one third of total energy for air conditioning. No hot-water percentage given in the abstract.
- **Confidence:** verified-from-source

### `suamir2015-hp-heat-recovery`

- **APA 7:** Suamir, I. N., Ardita, I. N., & Dewi, N. I. K. (2015). Integration of heat pump and heat recovery of central AC system for energy use reduction of hotel industry. Proceedings of the 24th IIR International Congress of Refrigeration, Yokohama, Japan, 16-22 August 2015.
- **URL/DOI:** https://iifiir.org/en/fridoc/integration-of-heat-pump-and-heat-recovery-of-central-ac-system-for-31216
- **Supports:** Indonesian five-star hotel (636 rooms, 30 apartments, 25 meeting rooms): optimized heat pump + AC heat-recovery integration cut energy for space cooling plus hot water by 36.7 percent (about 6.6 percent of total hotel energy) and AC+hot-water energy cost by 34.4 percent versus separate boiler + AC (baseline B4-like).
- **Values / location:**
  - Abstract (IIR record and PNB repository record): 36.7 % reduction of energy for space cooling and hot-water supply, equal to about 6.6 % of the hotel's total energy; energy-cost reduction 34.4 %.
  - Implication: cooling + hot-water supply together are only about 18 percent of hotel energy (6.6/0.367 = 18.0 percent; my arithmetic, assumes the two percentages refer to the same baseline).
- **Confidence:** verified-from-source

### `suamir2017-waste-heat-recovery`

- **APA 7:** Suamir, I. N., Ardita, I. N., & Wirajati, I. G. A. B. (2017). Waste heat recovery from central AC system for hot water supply: A case study for hotel building application in Indonesia. Advanced Science Letters, 23(12), 12206-12210. https://doi.org/10.1166/asl.2017.10603
- **URL/DOI:** https://repository.pnb.ac.id/id/eprint/5856
- **Supports:** Same 636-room Indonesian five-star hotel case; AC condenser/heat-pump heat recovery for hot water; 36.7 percent energy reduction for cooling + hot water.
- **Values / location:**
  - Abstract opened (PNB repository record): 36.7 % / 6.6 % / 34.4 % as above. The attached PDF is only a similarity report, so full text was NOT read.
- **Confidence:** verified-from-source

### `suamir2017-dhw-200l`

- **APA 7:** Suamir, I. N., Ardita, I. N., & Wirajati, I. G. A. B. (2017). Waste heat recovery from central AC system for hot water supply: A case study for hotel building application in Indonesia. Advanced Science Letters, 23(12), 12206-12210. https://doi.org/10.1166/asl.2017.10603
- **URL/DOI:** https://doi.org/10.1166/asl.2017.10603
- **Supports:** Assumed (not measured) hot-water demand of 200 L/room/day at 55 °C supply temperature for an Indonesian five-star hotel.
- **Values / location:**
  - 200 L/room/day at 55 °C, assumed from similar Indonesian hotels (authors had no measured data). Seen ONLY in a search-result summary of the full text; full text not opened -> secondary.
- **Confidence:** secondary

### `cibse-hotel-hot-water`

- **APA 7:** CIBSE Journal. (n.d.). Hotel study reveals predicted hot water use is double the reality. CIBSE Journal.
- **URL/DOI:** https://www.cibsejournal.com/technical/hotel-study-reveals-predicted-hot-water-use-is-double-the-reality/
- **Supports:** Measured hot-water use in a central London hotel (about 800 rooms) was 60,000 L/day versus 131,000 L/day predicted by standard assumptions (about 75 versus 164 L/room/day).
- **Values / location:**
  - Measured 60,000 L/day vs 131,000 L/day predicted (article). Per-room figures 75 and 164 L/room/day are MY arithmetic (assuming 800 rooms, 'about'); occupancy not given; non-tropical (London).
  - Family hotel: measured use 55 percent below predicted (no litres given).
- **Confidence:** verified-from-source

### `jingjit-techato-apst`

- **APA 7:** Jingjit, S., & Techato, K. (n.d.). Economic analysis of water heating technology in Thailand. Asia-Pacific Journal of Science and Technology, 21(4), Article APST-21-04-09.
- **URL/DOI:** https://so01.tci-thaijo.org/index.php/APST/article/view/121457
- **Supports:** Thai hotel sector: 3,989 hotels / 316,439 rooms (2014; 80 rooms per hotel); assumed 260 L/day/room TOTAL water (two persons per room); heat pump about 3x as efficient as instantaneous electric heater (cited from Thai Ministry of Energy 2009).
- **Values / location:**
  - Assumption, not measurement: 260 L per day per room (total water, hot-only share not given); 90 percent of rooms have AC and instantaneous water heater.
  - Heat pump 'three times as efficient as comparable IWH', at least 66 percent energy saving (their refs [3],[8], not opened).
- **Confidence:** verified-from-source

### `engtoolbox-hotwater`

- **APA 7:** The Engineering ToolBox. (2003). Hot water consumption vs. occupants. https://www.engineeringtoolbox.com/hot-water-consumption-person-d_91.html
- **URL/DOI:** https://www.engineeringtoolbox.com/hot-water-consumption-person-d_91.html
- **Supports:** Rule-of-thumb hotel hot-water use of 90-160 L/day per occupant (20-35 gal), peak 45 L/h per occupant; temperature basis not stated, no primary source given.
- **Values / location:**
  - Hotels row: 90-160 L/day/occupant; peak 45 L/h/occupant; storage 30 L/occupant. Weak source (no ASHRAE attribution on the page).
- **Confidence:** secondary

## D. Heat pumps, AC, condenser heat recovery

### `lbnl-indonesia-ac-meps-2020`

- **APA 7:** Lawrence Berkeley National Laboratory. (2020). Cooling efficiency in Indonesia: Recent achievements and future outlook (Policy brief, February 2020). Energy Technologies Area, LBNL.
- **URL/DOI:** https://eta-publications.lbl.gov/sites/default/files/policy_brief_cooling_efficiency_in_indonesia_final.pdf
- **Supports:** Indonesia single-split AC MEPS/label scheme in CSPF (Btu/(W h)): 1 star (MEPS) 10.58, 2 star 11.60, 3 star 12.96, 4 star 14.33, 5 star 17.06 (proposed decree 2020); LBNL-proposed revision 12.68-27.46.
- **Values / location:**
  - Table 1: CSPF 10.58 / 11.60 / 12.96 / 14.33 / 17.06 Btu/(W h) = 3.10 / 3.40 / 3.80 / 4.20 / 5.00 W/W (my conversion, /3.412). Covers single-split up to 27,000 Btu/h (8 kW).
  - Table 2 (LBNL proposed revision): 12.68 / 15.43 / 20.79 / 24.96 / 27.46 Btu/(W h) = 3.72 / 4.52 / 6.09 / 7.32 / 8.05 W/W. Best available products CSPF about 30-34 Btu/(W h) (8.8-10 W/W).
  - A 2023 ministerial value (CSPF >= 3.4) was seen only in a search snippet -> not used.
- **Confidence:** verified-from-source

### `lam-chan-2003-hotel-hp`

- **APA 7:** Lam, J. C., & Chan, W. W. (2003). Energy performance of air-to-water and water-to-water heat pumps in hotel applications. Energy Conversion and Management, 44(10), 1625-1631. https://doi.org/10.1016/S0196-8904(02)00182-6
- **URL/DOI:** https://research.polyu.edu.hk/en/publications/energy-performance-of-air-to-water-and-water-to-water-heat-pumps-/
- **Supports:** Measured Hong Kong hotel heat pumps (pool heating and hot-water supplement) generally operated at COP 1.5-2.4; air-to-water pool unit 49.1 MWh heat from 24.6 MWh electricity; payback about 2 years.
- **Values / location:**
  - Abstract: COP generally 1.5-2.4; water-to-water units estimated 952 MWh heat from 544 MWh electricity per year (COP about 1.75); payback about 2 years. Subtropical (Hong Kong), not a tropical-lowland, and not a DHW air-source unit.
- **Confidence:** verified-from-source

### `hawlader2001-sahp-singapore`

- **APA 7:** Hawlader, M. N. A., Chou, S. K., & Ullah, M. Z. (2001). The performance of a solar assisted heat pump water heating system. Applied Thermal Engineering, 21(10), 1049-1065.
- **URL/DOI:** https://irep.iium.edu.my/22832/
- **Supports:** Simulated Singapore solar-assisted heat-pump water heater (collector as evaporator): average COP about 4-9 for condenser-tank water 30-50 °C, collector efficiency 40-75 percent; COP falls as tank temperature rises.
- **Values / location:**
  - Abstract (IIUM repository): average COP about 4 to 9; collector efficiency 40-75 %; tank 30-50 °C; payback about 2 years. Model/simulation, not field measurement; condenser temperatures below the 55-60 °C DHW need.
- **Confidence:** verified-from-source

### `iea-shc-t60-a1`

- **APA 7:** Baggenstos, A., Zenhäusern, D., et al. (2020). Existing PVT systems and solutions (IEA SHC Task 60 Report A1). IEA Solar Heating and Cooling Programme.
- **URL/DOI:** https://www.iea-shc.org/Data/Sites/1/publications/IEA-SHC-Task60-A1-Existing-PVT-Systems-and-Solutions.pdf
- **Supports:** Catalogue of PVT installations incl. Stenløse (Denmark): 165 m2 uncovered PVT + 1,500 m horizontal ground loop heat pump, system SPF 5.1 (cold climate).
- **Values / location:**
  - Fact sheet 3.21: Stenløse football club, uncovered PVT 165 m2 gross, brine/water heat pump on 1,500 m horizontal pipes, buffer 850 L, SPFsys = 5.1; heat demand 50,000 kWh/a. Cold climate, ground-source: NOT transferable to the tropics, only shows PVT as HP source in practice.
- **Confidence:** verified-from-source

## E. Embodied carbon (PV, PV/T)

### `iea-pvps-t12-2023`

- **APA 7:** Stucki, M., Götz, M., de Wild-Scholten, M., & Frischknecht, R. (2024). Environmental life cycle assessment of electricity from PV systems: 2023 data update (IEA PVPS Task 12 fact sheet, May 2024). IEA Photovoltaic Power Systems Programme.
- **URL/DOI:** https://iea-pvps.org/wp-content/uploads/2024/05/Slides_IEA-PVPS-T12_Fact-Sheet-update-2023_v2.0.pdf
- **Supports:** Rooftop 3 kWp mono-Si system 35.8 g CO2-eq/kWh (module only 20.2 g/kWh), 976 kWh/kWp/yr, 30-yr panel life, IPCC 2021 GWP100; multi-Si 43.6; CdTe 25.2.
- **Values / location:**
  - Slides 7 and 10: GHG 35.8 (mono-Si system), 43.6 (multi-Si), 35.5 (CIS), 25.2 (CdTe) g CO2-eq/kWh AC; mono-Si module alone 20.2 g/kWh. Basis: 976 kWh/kWp/yr incl. degradation 0.7 %/yr; 30-yr panel, 15-yr inverter; European reference system, 2022 production mix.
  - Derived by me (not in source): 35.8 g/kWh x 976 kWh/kWp/yr x 30 yr = about 1,050 kg CO2e/kWp (whole system); module only 20.2 x 976 x 30 = about 590 kg CO2e/kWp. Scale to Indonesian yield if yield differs.
- **Confidence:** verified-from-source

### `zagorulko2024-pvt-lca`

- **APA 7:** Zagorulko, M., Mellor, A., & Murrell, A. (2024). Quantifying the environmental implications of solar thermal technologies: A comprehensive examination of life cycle impacts and payback periods. Proceedings of EuroSun 2024. International Solar Energy Society. https://doi.org/10.18086/eurosun.2024.07.19
- **URL/DOI:** https://proceedings.ises.org/conference/eurosun2024/papers/eurosun2024-0078-Zagorulko.pdf
- **Supports:** Embedded carbon of a (manufacturer's) evacuated-tube hybrid PVT collector: 0.344 kg CO2e/Wp (122 kg CO2e per collector), thermal-only 0.172 kg/Wp, versus 0.81 kg/Wp quoted for PV modules; carbon payback 3.25 yr (PVT).
- **Values / location:**
  - Abstract and Section 3.2: VirtuPVT 0.344 kgCO2eq/Wp; 122 kgCO2 per declared unit; VirtuHOT 0.172 kgCO2eq/Wp; PV 0.81 kgCO2eq/Wp 'published data'. Authors are the manufacturer (Naked Energy), evacuated-tube (NOT unglazed liquid PV/T), natural-gas displacement 0.210 kgCO2eq/kWh. Use only as an order-of-magnitude PVT estimate.
- **Confidence:** verified-from-source

## F. Legionella and ventilation

### `hse-legionella-hot-cold`

- **APA 7:** Health and Safety Executive. (n.d.). Legionnaires' disease: Hot and cold water systems. Health and Safety Executive, Great Britain.
- **URL/DOI:** https://www.hse.gov.uk/legionnaires/hot-and-cold.htm
- **Supports:** Hot water stored at 60 °C or above; delivered at 50 °C (55 °C in healthcare) within 1 minute at outlets; cold water below 20 °C where possible; scald risk above 44 °C.
- **Values / location:**
  - Verbatim values: 'Hot water should be stored at least at 60°C'; outlets reach 50°C (55°C in healthcare premises) within 1 minute; cold below 20°C. National (UK) guidance, consistent with WHO but WHO text itself was NOT opened.
- **Confidence:** verified-from-source

### `levesque2004-who-60c-summary`

- **APA 7:** Lévesque, B., Lavoie, M., & Joly, J. (2004). Residential water heater temperature: 49 or 60 degrees Celsius? Canadian Journal of Infectious Diseases, 15(1), 11-12. https://doi.org/10.1155/2004/109051
- **URL/DOI:** https://pmc.ncbi.nlm.nih.gov/articles/PMC2094925/
- **Supports:** Secondary summary of WHO guidance: water heated and stored at 60 °C (whole tank at least once a day) and reaching the tap at 50 °C or more (WHO 2002 addendum cited, not opened).
- **Values / location:**
  - 'the WHO recommends that water be heated and stored at 60°C'; tap at least 50°C. Secondary: WHO 'Legionella and the prevention of legionellosis' (2007) not opened (403/blocked).
- **Confidence:** secondary

### `ashrae621-addendum-z-2018`

- **APA 7:** ASHRAE. (2018). Addendum z to ANSI/ASHRAE Standard 62.1-2016: Ventilation for acceptable indoor air quality (Informative Appendix N, Table N-1, Check table for VRP). ASHRAE.
- **URL/DOI:** https://www.ashrae.org/File%20Library/Technical%20Resources/Standards%20and%20Guidelines/Standards%20Addenda/62.1-2016/62_1_2016_z_20180628.pdf
- **Supports:** Informative check value for hotel bedroom/living room combined outdoor-air rate 0.15 cfm/ft2 = 0.73 L/s per m2 (assumes Ev = 0.75; not for design).
- **Values / location:**
  - Table N-1: Hotels, Motels, Resorts, Dormitories - Bedroom/living room: Rc = 0.15 cfm/ft2 and 0.73 L/s.m2. Rp/Ra values of the normative Table 6.2.2.1 were NOT obtained from a source I opened (TIDAK TERVERIFIKASI).
- **Confidence:** verified-from-source

## G. Silica-gel isotherm and desiccant regeneration

### `li2014-evergreen-silica-toth`

- **APA 7:** Li, A., Ismail, A. B., Thu, K., & Shahzad, M. W. (2014). Formulation of water equilibrium uptakes on silica gel and ferroaluminophosphate zeolite for adsorption cooling and desalination applications. Evergreen, 1(2), 37-45. https://doi.org/10.5109/1495162
- **URL/DOI:** https://catalog.lib.kyushu-u.ac.jp/opac_download_md/1495162/p037.pdf
- **Supports:** Regressed Tóth parameters for Fuji Davison type RD silica-gel powder-water, 25-45 °C, up to about 9 kPa: q0 = 0.455 kg/kg, Qst = 2519.6 kJ/kg, K_T = 4.5e-12, t = 10.3 (R2 0.989); silica-gel RD properties (heat of adsorption 2800 kJ/kg, cp 0.921 kJ/kg K, density 800 kg/m3, 573 m2/g).
- **Values / location:**
  - Eq. 7 (Tóth): q*/q0 = K_T P exp(Qst/RT) / {1 + [K_T P exp(Qst/RT)]^t}^(1/t).
  - Table 2: Tóth q0 0.455 kg/kg; Qst 2519.6 kJ/kg; K_T 4.5e-12 (printed 'kPa^-1'); t 10.3; R2 0.989; NRMSE 6.6 %. DA model: q0 0.455, Ec 164.9 kJ/kg, gamma 1.443, R2 0.988.
  - Table 1 (RD powder): BET 573 m2/g; mean particle 70 um; pore volume 0.39 ml/g; apparent density 800 kg/m3; k 0.198 W/m K; heat of adsorption (H2O) 2800 kJ/kg; cp 0.921 kJ/kg K.
  - UNIT CHECK (my calculation): with Qst in kJ/kg, R = 0.4615 kJ/kg K and P in Pa, K_T = 4.5e-12 reproduces Fig. 3a (30 °C: 0.136 kg/kg at 1 kPa, 0.27 at 2, 0.40 at 3, 0.45 at 4 kPa) and Fig. 4 (0.29 at P/Ps 0.5, 0.43 at 0.8). Hence the printed unit 'kPa^-1' is an error; K_T is per Pa. Own data of the authors for RD POWDER; deviates slightly from Ng et al. (2001) granules.
- **Confidence:** verified-from-source

### `chua2002-silica-isotherm`

- **APA 7:** Chua, H. T., Ng, K. C., Chakraborty, A., Oo, N. M., & Othman, M. A. (2002). Adsorption characteristics of silica gel + water systems. Journal of Chemical & Engineering Data, 47(5), 1177-1181. https://doi.org/10.1021/je0255067
- **URL/DOI:** https://doi.org/10.1021/je0255067
- **Supports:** Water uptake on two Fuji Davison silica gels (type A and RD) measured at 298-338 K and 500-7000 Pa; Tóth isotherm fits all data; enthalpies of adsorption computed. Coefficients not accessible to me.
- **Values / location:**
  - Abstract (via OpenAlex/Crossref): temperature 298-338 K, pressure 500-7000 Pa, volumetric method, Tóth model fits within experimental error. NUMERIC COEFFICIENTS: TIDAK TERVERIFIKASI (full text paywalled).
- **Confidence:** verified-from-source

### `ng2001-silica-henry`

- **APA 7:** Ng, K. C., Chua, H. T., Chung, C. Y., Loke, C. H., Kashiwagi, T., Akisawa, A., & Saha, B. B. (2001). Experimental investigation of the silica gel-water adsorption isotherm characteristics. Applied Thermal Engineering, 21(16), 1631-1642. https://doi.org/10.1016/S1359-4311(01)00039-4
- **URL/DOI:** https://doi.org/10.1016/S1359-4311(01)00039-4
- **Supports:** Henry-type (van't Hoff) isotherm found suitable for silica gel-water under adsorption-chiller conditions (abstract as seen in a search result). No coefficient values obtained.
- **Values / location:**
  - Abstract summary only (IIR record seen in search): 'Henry-type equation is found to be suitable'. Coefficients TIDAK TERVERIFIKASI. Form W = K0 exp(Qst/(Rw T)) p confirmed via Costa Filho & Brum (2005).
- **Confidence:** secondary

### `costafilho2005-silica-henry`

- **APA 7:** Costa Filho, M. A. F., & Brum, N. C. L. (2005). On the dynamics of humidity adsorption. Proceedings of COBEM 2005, 18th International Congress of Mechanical Engineering, Ouro Preto, MG, Brazil, 6-11 November 2005. ABCM.
- **URL/DOI:** https://abcm.org.br/app/webroot/anais/cobem/2005/PDF/COBEM2005-2632.pdf
- **Supports:** Henry-law/van't Hoff form of the silica-gel water isotherm (W = K0 exp[Qst/(Rw T)] p) attributed to Ng et al. (2001); Pesaran and Mills (1987) surface-diffusion model for RD gel (mass-transfer limited by intra-particle diffusion).
- **Values / location:**
  - Eq. (1)-(4) of the paper: W* = K p; K = K0 exp[Qst/(Rw T)]. No numerical K0, Qst given. Pesaran-Mills RD surface-diffusivity correlation exists (Eq. 5) but the printed constants were garbled in my extraction -> not used.
- **Confidence:** verified-from-source

### `mohammed2018-silica-isotherm-review`

- **APA 7:** Mohammed, R. H., Mesalhy, O., Abdelkareem, M., Su, M., & Chow, L. C. (2018). Revisiting the adsorption equilibrium equations of silica-gel/water for adsorption cooling applications. International Journal of Refrigeration, 86, 40-47. https://doi.org/10.1016/j.ijrefrig.2017.10.038
- **URL/DOI:** https://doi.org/10.1016/j.ijrefrig.2017.10.038
- **Supports:** Reported (search-result summary of abstract) that Freundlich and Tóth cannot estimate uptake at relative pressure below 0.15 and that maximum uptakes are 0.38 (RD-2060) and 0.48 kg/kg (type RD).
- **Values / location:**
  - Seen in search snippets only (abstract not opened): Tóth/Freundlich invalid below P/Ps ~0.15; max uptake RD-2060 0.38, type-RD 0.48 kg/kg. IMPORTANT caution for regeneration at low RH (P/Ps 0.1-0.2 at 50-60 °C).
- **Confidence:** secondary

### `chua-islam2015-composite`

- **APA 7:** Chua, K. J., & Islam, M. R. (2015). On the experimental study of composite desiccants for energy efficient air dehumidification. IIUM Engineering Journal, 16(2), 1-11. https://doi.org/10.31436/iiumej.v16i2.600
- **URL/DOI:** https://journals.iium.edu.my/ejournal/index.php/iiumej/article/download/600/420/2432
- **Supports:** Silica-gel/bentonite/LiCl/CaCl2 composites tested at about 60 °C regeneration under Singapore-like air (30 °C, 80 % RH); four-layer composite had 14-22.5 % (varying T) and 10-26.3 % (varying RH) higher moisture removal than pure silica gel; its regeneration at 60 °C was close to pure silica gel and silica gel-LiCl.
- **Values / location:**
  - Abstract and Section 4: composite SiO2 64.85 % + bentonite 21.53 % + LiCl 6.81 % + CaCl2 6.81 % best; regeneration capacity at 60 °C close to silica gel and silica gel-LiCl; pressure drop 27 % and 34 % lower than the comparison materials.
  - Table 3 (30 °C, 80 % RH, test bed): pure silica gel moisture removal capacity 8.168 g/kg dry air, saturation time 18.5 min, mass uptake 28.5 %, mean pressure difference 353.6 Pa; SiO2 91.1 % + LiCl 8.9 %: 9.808 g/kg, 389.7 Pa.
  - Intro (authors' statement): silica gel typical regeneration 120 °C (extracted text), zeolite 350 °C, alumina/activated carbon 250 °C, clay composites below 100 °C. PDF text extraction garbled some degree signs: only values quoted in the abstract are relied on.
- **Confidence:** verified-from-source

### `oconnor2017-low-regen-wheel`

- **APA 7:** O'Connor, D., Calautit, J. K., & Hughes, B. R. (2017). A novel design of a rotary desiccant system for reduced dehumidification regeneration air temperature. Energy Procedia, 142, 253-258. https://doi.org/10.1016/j.egypro.2017.12.040
- **URL/DOI:** https://strathprints.strath.ac.uk/67893/
- **Supports:** Silica-gel-coated radial-blade wheel regenerated at only 25-40 °C: maximum pressure drop 10.31 Pa, relative-humidity reduction up to 67 percent; states current systems need 80-120 °C.
- **Values / location:**
  - Abstract: regeneration air 25-40 °C in 5 °C steps; max pressure drop 10.31 Pa; RH reduction up to 67 %; 'current systems typically need 80-120 °C'. Small bench rig, unconventional geometry, not a commercial wheel.
- **Confidence:** verified-from-source

### `li2014b-silica-adsorption-chiller-range`

- **APA 7:** Li, A., Ismail, A. B., Thu, K., & Shahzad, M. W. (2014). Formulation of water equilibrium uptakes on silica gel and ferroaluminophosphate zeolite for adsorption cooling and desalination applications. Evergreen, 1(2), 37-45. https://doi.org/10.5109/1495162
- **URL/DOI:** https://catalog.lib.kyushu-u.ac.jp/opac_download_md/1495162/p037.pdf
- **Supports:** Silica gel-water adsorption chillers usually operate at heat-source temperature 55-90 °C with COP 0.2-0.65 (Introduction, citing prior chiller literature).
- **Values / location:**
  - Introduction: heat source 55-90 °C; COP 0.2-0.65 (adsorption CHILLER, not a desiccant wheel).
- **Confidence:** verified-from-source

### `techajunta1999-solar-simulator-tropical`

- **APA 7:** Techajunta, S., Chirarattananon, S., & Exell, R. H. B. (1999). Experiments in a solar simulator on solid desiccant regeneration and air dehumidification for air conditioning in a tropical humid climate. Renewable Energy, 17(4), 549-568. https://doi.org/10.1016/S0960-1481(98)00776-9
- **URL/DOI:** https://doi.org/10.1016/S0960-1481(98)00776-9
- **Supports:** Thai laboratory study: solar-heated air can regenerate silica gel in a tropical humid climate; regeneration rate rises with irradiation and falls with airflow (search-result summary; abstract not opened).
- **Values / location:**
  - No numbers used. Title/metadata verified via Crossref; findings from search summary only.
- **Confidence:** secondary

### `pramuang-exell2007-cpc-regeneration`

- **APA 7:** Pramuang, S., & Exell, R. H. B. (2007). The regeneration of silica gel desiccant by air from a solar heater with a compound parabolic concentrator. Renewable Energy, 32(1), 173-182. https://doi.org/10.1016/j.renene.2006.02.009
- **URL/DOI:** https://doi.org/10.1016/j.renene.2006.02.009
- **Supports:** Thai CPC air heater regenerated silica gel; regeneration could begin at about 40 °C and depended mostly on solar radiation (search-result summary; not opened).
- **Values / location:**
  - No numbers used beyond 'regeneration starts near 40 °C' (secondary).
- **Confidence:** secondary

### `dezfouli2014-solar-desiccant-malaysia`

- **APA 7:** Dezfouli, M. M. S., Mat, S., Pirasteh, G., Sahari, K. S. M., Sopian, K., & Ruslan, M. H. (2014). Simulation analysis of the four configurations of solar desiccant cooling system using evaporative cooling in tropical weather in Malaysia. International Journal of Photoenergy, 2014, Article 843617. https://doi.org/10.1155/2014/843617
- **URL/DOI:** https://doi.org/10.1155/2014/843617
- **Supports:** Simulation: required regeneration temperature and COP vary by configuration (about 80-82 °C and COP about 1.06 for a two-stage ventilation cycle; about 122 °C and COP about 0.57 for single-stage) - search-result summary of Table 7, not opened.
- **Values / location:**
  - Secondary; indicates that conventional desiccant cooling cycles need well above 60 °C in humid tropics, whereas SolarVein only targets dehumidification of fresh air.
- **Confidence:** secondary

## H. PV/T collector performance, PV temperature coefficient, PVT heat pumps

### `iea-shc-t60-d5`

- **APA 7:** Lämmle, M., Herrando, M., & Ryan, G. (2020). Basic concepts of PVT collector technologies, applications and markets (IEA SHC Task 60 Report D5). IEA Solar Heating and Cooling Programme. https://doi.org/10.18777/ieashc-task60-2020-0002
- **URL/DOI:** https://task60.iea-shc.org/Data/Sites/1/publications/IEA-SHC-Task60-D5-Basic-Concepts-of-PVT-Technologies.pdf
- **Supports:** Typical thermal efficiency eta_th,0 = 61 percent at T_fluid,mean = T_ambient 'as typically found in unglazed or glazed PVT collectors'; AM1.5 energy split 9 % optical loss / 15 % heat loss / 61 % heat / 15 % electricity (STC eff. 15 %); uncovered (WISC) PVT can be a heat-pump source down to sub-ambient and 'even in periods without sunshine'; DHW needs 60 °C to prevent Legionellosis, deliverable by unglazed collectors only in high-irradiance climates.
- **Values / location:**
  - Page 4 energy-flow assumptions: eta_th,0 = 61 % (Tfluid = Tamb), electricity 15 %, heat losses 15 %, optical 9 %.
  - Uncovered PVT: 'Uninsulated PVT collectors are beneficial for operation near and below ambient temperatures' and 'the fluid can be heated up to ambient temperature even in periods without sunshine'.
  - DHW paragraph: 60 °C required to prevent legionellosis; delivery 45-60 °C; 'These temperatures can be provided with unglazed collectors in high irradiance climates'.
- **Confidence:** verified-from-source

### `iea-shc-t60-b1`

- **APA 7:** Kramer, K., et al. (2020). Status quo of PVT characterization (IEA SHC Task 60 Report B1). IEA Solar Heating and Cooling Programme. https://doi.org/10.18777/ieashc-task60-2020-0004
- **URL/DOI:** https://www.iea-shc.org/Data/Sites/1/publications/IEA-SHC-Task60-B1-Status-Quo-Report-PVT-Characterization.pdf
- **Supports:** ISO 9806:2017 thermal power model for unglazed/WISC collectors (steady-state and quasi-dynamic); thermal coefficients should be determined in MPP electrical mode; no dedicated PVT standard; condensation gains on uncovered PVT as heat-pump source; night-cooling use and missing TRNSYS night model.
- **Values / location:**
  - ISO 9806:2017 SST form: Q = A[eta0,b G_b + ... - c1(Tm-Ta) - c2(Tm-Ta)^2 - c3 u'(Tm-Ta) + c4(EL-sigma Ta^4) - c6 u' G - ...], u' = u - 3 m/s; no numeric unglazed-PVT coefficients are tabulated in the text I read.
  - Condensation 'significant' for unglazed WISC PVT with heat pump; frosting/icing relevant only in cold climates.
- **Confidence:** verified-from-source

### `iea-shc-t60-d1`

- **APA 7:** Zenhäusern, D., et al. (2020). Key performance indicators for PVT systems (IEA SHC Task 60 Report D1). IEA Solar Heating and Cooling Programme. https://doi.org/10.18777/ieashc-task60-2020-0007
- **URL/DOI:** https://www.iea-shc.org/Data/Sites/1/publications/IEA-SHC-Task60-D1-Key-Performance-Indicators.pdf
- **Supports:** Simulation assumptions for a COVERED PVT collector (Table 5): eta0 = 0.8 (open-circuit), a1 = 4.5 W/m2K, a2 = 0.025 W/m2K2, electrical STC efficiency 15 % - NOT an unglazed collector.
- **Values / location:**
  - Table 5 (valid at open circuit): PVT 15 % / 0.8 / 4.5 / 0.025; thermal collector 0.85 / 4 / 0.01 (as extracted; column order in the PDF text was garbled). Use only as a modelling comparison for glazed PVT.
- **Confidence:** verified-from-source

### `kaldellis2014-pv-tempcoeff`

- **APA 7:** Kaldellis, J. K., Kapsali, M., & Kavadias, K. A. (2014). Temperature and wind speed impact on the efficiency of PV installations: Experience obtained from outdoor measurements in Greece. Renewable Energy, 66, 612-624. https://doi.org/10.1016/j.renene.2013.12.041
- **URL/DOI:** https://ideas.repec.org/a/eee/renene/v66y2014icp612-624.html
- **Supports:** Field-measured PV efficiency (power) temperature coefficient negative, between 0.30 and 0.45 %/°C (lower for ventilated free-standing frames; mc-Si, South Greece).
- **Values / location:**
  - Abstract: coefficient 0.30-0.45 %/°C (negative), one year of data from an 81 kWp unventilated BIPV array and a 150 kWp open-rack array. Consistent with the -0.3 to -0.45 %/K range requested.
- **Confidence:** verified-from-source

### `kim-kim2012-glazed-unglazed-pvt`

- **APA 7:** Kim, J.-H., & Kim, J.-T. (2012). Comparison of electrical and thermal performances of glazed and unglazed PVT collectors. International Journal of Photoenergy, 2012, Article 957847. https://doi.org/10.1155/2012/957847
- **URL/DOI:** https://doi.org/10.1155/2012/957847
- **Supports:** Outdoor measurements: glazed liquid PVT has higher thermal efficiency, unglazed has higher electrical efficiency (qualitative; Crossref abstract opened, numbers not obtained).
- **Values / location:**
  - Qualitative only. Numeric efficiencies TIDAK TERVERIFIKASI (full text 403).
- **Confidence:** verified-from-source

### `hengel2020-pvt-hp`

- **APA 7:** Hengel, F., Heschl, C., Inschlag, F., & Klanatsky, P. (2020). System efficiency of PVT collector-driven heat pumps. International Journal of Thermofluids, 5-6, Article 100034. https://doi.org/10.1016/j.ijft.2020.100034
- **URL/DOI:** https://doi.org/10.1016/j.ijft.2020.100034
- **Supports:** TRNSYS study of PVT waste heat regenerating a horizontal ground heat exchanger for a heat pump (COP and SPF factors identified); abstract only.
- **Values / location:**
  - Abstract only; no COP numbers extracted.
- **Confidence:** verified-from-source

## I. Prior art (PV/T hot water, PV/T + desiccant, allocation/control)

### `dubey-tay2013-pvt-singapore`

- **APA 7:** Dubey, S., & Tay, A. A. O. (2013). The theoretical modelling and optimization of a 10 kWp photovoltaic thermal system for a student hostel in Singapore. International Journal of Green Energy, 11(3), 225-239. https://doi.org/10.1080/15435075.2013.769880
- **URL/DOI:** https://doi.org/10.1080/15435075.2013.769880
- **Supports:** Prior art: modelled 10 kWp PV/T system for hot water + electricity at a student hostel in tropical Singapore (title/metadata verified via Crossref; content not opened).
- **Values / location:**
  - Title-level evidence only.
- **Confidence:** secondary

### `dubey-subiantoro2018-pvt-ac-hotwater`

- **APA 7:** Dubey, S., & Subiantoro, A. (2018). Numerical study of integrated solar photovoltaic-thermal module with a refrigeration system for air-conditioning and hot water production under the tropical climate conditions of Singapore. International Journal of Air-Conditioning and Refrigeration, 26(3), Article 1850021. https://doi.org/10.1142/S2010132518500219
- **URL/DOI:** https://doi.org/10.1142/S2010132518500219
- **Supports:** Prior art: PVT module + refrigeration system for air-conditioning and hot water in Singapore (title/metadata verified via Crossref; abstract not opened).
- **Values / location:**
  - Title-level evidence only.
- **Confidence:** secondary

### `basuhaib2024-kl-pvt`

- **APA 7:** Basuhaib, A., Selvaraj, J., Hasanuzzaman, M., Anjum, T., & Kumar, L. (2024). Experimental investigation the effect of different operating parameters and optimized the water-based PVT system for domestic applications. Solar Energy, 268, Article 112278. https://doi.org/10.1016/j.solener.2023.112278
- **URL/DOI:** https://doi.org/10.1016/j.solener.2023.112278
- **Supports:** Kuala Lumpur outdoor test of water PVT: peak thermal efficiency 67.4 percent, outlet water 45.8 °C at 0.5 L/min (search-result summary; abstract not opened).
- **Values / location:**
  - Secondary; order-of-magnitude evidence that tropical water PVT outlet is about 45 °C at best efficiency (hence preheating, not final DHW).
- **Confidence:** secondary

### `maoulida2022-pvt-comoros`

- **APA 7:** Maoulida, F., Djedjig, R., Kassim, M. A., & El Ganaoui, M. (2022). Numerical study for the evaluation of the effectiveness and benefits of using photovoltaic-thermal (PV/T) system for hot water and electricity production under a tropical African climate: Case of Comoros. Energies, 16(1), Article 240. https://doi.org/10.3390/en16010240
- **URL/DOI:** https://doi.org/10.3390/en16010240
- **Supports:** Simulated 12 m2 PV/T + 200 L tank in tropical Comoros, overall efficiency up to about 70 percent (search-result summary; not opened).
- **Values / location:**
  - Secondary; simulation only.
- **Confidence:** secondary

### `bandaru2021-pvt-review`

- **APA 7:** Bandaru, S. H., Becerra, V., Khanna, S., Radulovic, J., Hutchinson, D., & Khusainov, R. (2021). A review of photovoltaic thermal (PVT) technology for residential applications: Performance indicators, progress, and opportunities. Energies, 14(13), Article 3853. https://doi.org/10.3390/en14133853
- **URL/DOI:** https://doi.org/10.3390/en14133853
- **Supports:** Review (search-result summary): PVT suitable for tropical/sub-tropical climates; thermal efficiency 45-48 % (closed circuit) and 49-52 % (open circuit), electrical 9-11 %.
- **Values / location:**
  - Secondary; summary values seen in a search snippet only.
- **Confidence:** secondary

### `guo2022-pvt-desiccant`

- **APA 7:** Guo, J., Bilbao, J. I., & Sproul, A. B. (2022). Parametric number of transfer unit analysis of a photovoltaic thermal coupled desiccant dehumidifier. Energy Conversion and Management, 255, Article 115339. https://doi.org/10.1016/j.enconman.2022.115339
- **URL/DOI:** https://doi.org/10.1016/j.enconman.2022.115339
- **Supports:** Prior art: PV/T collector coupled to a silica-gel desiccant wheel; optimum NTU depends on regeneration temperature (about 50 and 80 °C compared) - search-result summary, abstract not opened.
- **Values / location:**
  - Secondary; NTU values not used.
- **Confidence:** secondary

### `calise2014-cpvt-desiccant`

- **APA 7:** Calise, F., Dentice d'Accadia, M., Roselli, C., Sasso, M., & Tariello, F. (2014). Desiccant-based AHU interacting with a CPVT collector: Simulation of energy and environmental performance. Solar Energy, 103, 574-594. https://doi.org/10.1016/j.solener.2013.11.001
- **URL/DOI:** https://doi.org/10.1016/j.solener.2013.11.001
- **Supports:** Prior art: simulation of a desiccant air-handling unit driven by a concentrating PV/T collector (wheel regeneration 40-70 °C; CPVT covered about 60 percent of regeneration load in winter) - search-result summary.
- **Values / location:**
  - Secondary; concentrating collector, Mediterranean climate.
- **Confidence:** secondary

### `fiorentini2015-mpc-pvt-pcm`

- **APA 7:** Fiorentini, M., Cooper, P., Ma, Z., & Robinson, D. A. (2015). Hybrid model predictive control of a residential HVAC system with PVT energy generation and PCM thermal storage. Energy Procedia, 83, 21-30. https://doi.org/10.1016/j.egypro.2015.12.192
- **URL/DOI:** https://doi.org/10.1016/j.egypro.2015.12.192
- **Supports:** Prior art: hierarchical/hybrid MPC choosing operating modes for a PVT-driven residential HVAC with PCM storage (title/metadata verified via Crossref; abstract seen in a search summary).
- **Values / location:**
  - Secondary; residential, not hotel, no desiccant, no value-ranked allocation.
- **Confidence:** secondary

### `rambhad2016-desiccant-review`

- **APA 7:** Rambhad, K. S., Walke, P. V., & Tidke, D. J. (2016). Solid desiccant dehumidification and regeneration methods: A review. Renewable and Sustainable Energy Reviews, 59, 73-83. https://doi.org/10.1016/j.rser.2015.12.264
- **URL/DOI:** https://doi.org/10.1016/j.rser.2015.12.264
- **Supports:** Review (search-result summary): recovered heat from flat-plate PV/T collectors identified as a potentially efficient regeneration source; silica gel regenerates at moderate temperature (50-90 °C).
- **Values / location:**
  - Secondary.
- **Confidence:** secondary

## J. Searched for but NOT verified (do not use as numbers)

| Item | Why unverified | What was found instead |
|---|---|---|
| ESDM/DJK Gatrik primary PDF 'Nilai FE GRK Sistem Ketenagalistrikan' (2019 or later) | gatrik.esdm.go.id returns a JS app shell (HTML) to curl/WebFetch; no later-year file found | JCM table (`jcm-id-ef-2022`) quoting the 2019 values |
| IEA grid emission factor for Indonesia | IEA Emission Factors database is paywalled; Ember page returned HTTP 403 | OWID dataset (`owid-energy-2025`) |
| Chua et al. (2002) and Ng et al. (2001) isotherm COEFFICIENTS | Elsevier/ACS full text paywalled/blocked (403) | Li et al. (2014) Tóth fit for RD powder (`li2014-evergreen-silica-toth`) |
| Pesaran & Mills (1987) isotherm / diffusivity constants | OSTI unreachable (connection refused); only secondary form in COBEM 2005 with garbled constants | form only |
| WHO (2007) Legionella manual text; ASHRAE 188 / Guideline 12 | WHO IRIS 403 / Cloudflare; ASHRAE standards paywalled | HSE (`hse-legionella-hot-cold`), secondary WHO summary; ASHRAE Guideline 12 '140 °F storage' seen only in vendor snippets |
| ASHRAE Handbook HVAC Applications, Service Water Heating, hotel L/room/day | paywalled | `suamir2017-dhw-200l` (assumption), `cibse-hotel-hot-water` (London measured), `engtoolbox-hotwater` (weak) |
| ASHRAE 62.1 normative Table 6.2.2.1 hotel Rp/Ra | paywalled | only Informative Table N-1 combined rate (`ashrae621-addendum-z-2018`) |
| Mains/cold-water temperature in lowland Indonesia | no source found (PDAM/utility data not found) | NASA POWER annual mean air temperature as a proxy only |
| BMKG rainy-day counts / wet-season statistics | not searched to completion; no BMKG page opened | NASA POWER reanalysis rain (smoothed; derived stats) |
| Chiller COP (water-cooled / air-cooled) in tropical hotels | only vendor snippets | Indonesian split-AC CSPF from LBNL (`lbnl-indonesia-ac-meps-2020`) |
| HPWH (air-source) measured COP in tropical hotels | none found | Hong Kong measured 1.5-2.4 (`lam-chan-2003-hotel-hp`); Singapore solar-assisted simulation 4-9 (`hawlader2001-sahp-singapore`) |
| Unglazed liquid PV/T ISO 9806 coefficients (eta0, c1, c2, c3) | Solar Keymark/SPF reports not reachable; paywalled papers | IEA SHC T60 D5: eta_th,0 about 61 % at Tfluid = Tamb |
| PV/T (liquid, unglazed) embodied carbon per m2 | no flat-plate unglazed LCA opened | evacuated-tube PVT 0.344 kgCO2e/Wp (`zagorulko2024-pvt-lca`); PV module from IEA PVPS |
| Desiccant wheel (commercial) pressure drop and cycle effectiveness | no manufacturer/peer-reviewed table opened | bench values: 10.31 Pa (`oconnor2017-low-regen-wheel`), 258-390 Pa packed samples (`chua-islam2015-composite`) |
| Condenser heat = 1.25 x cooling capacity (seen in a search summary) | source not opened | physics identity Q_cond = Q_evap (1 + 1/COP), no citation needed |
