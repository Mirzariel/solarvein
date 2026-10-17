# Karbon dan ekonomi — metode (W4)

Modul: `src/sim/system/carbon.ts`, `economics.ts`; asumsi di `assumptions/{carbon,economics}.ts`.

## Prinsip
- KPI utama: **CO₂e bersih yang dihindari** terhadap pembanding yang melayani hal yang sama (air panas kWh_th pada suhu tuang yang sama, kebutuhan listrik sama, kelembapan ruang sama). Bagian yang sama saling meniadakan, jadi buku besar hanya memuat **selisih**.
- Baris = emisi(pembanding X) − emisi(SolarVein). Positif = dihindari SolarVein, negatif = ditambahkan.
- kWh_th, kWh_e, dan kWh_fuel adalah tipe bermerek berbeda. Setiap baris menampilkan faktor konversinya (`factor`).
- Listrik PV dianggap terpakai sendiri sepenuhnya oleh hotel (menggantikan listrik jaringan). Tidak ada faktor emisi per jam untuk Indonesia, jadi EF konstan.

## Emisi operasi tiap kasus
`E = pemanas·f_pemanas + (parasit + kerja pompa kalor + HPWH/COP − PV)·EF`
- Pemanas hotel yang ada: LPG → bahan bakar = kWh_th/η × 0,227 kg/kWh_fuel; tahanan listrik → kWh_th/η × EF; pompa kalor → kWh_th/COP × EF.
- **B1** pemanas hotel untuk seluruh air panas, tanpa PV.
- **B2** PV standar (luas atap sama) + HPWH untuk SELURUH air panas (COP 3,5).
- **B3** PV/T pada luas sama, hanya air panas: listrik, parasit, dan beban cadangan dari `pvtDhwOnly`.
- **B4** PV standar + pemulihan kalor kondensor AC yang menutup `condenserRecoveryFraction` kebutuhan; pompa pemulihan masuk baris parasit; sisanya pemanas hotel.
- **SolarVein** listrik PV/T − parasit (pompa termasuk) + kalor surya menggantikan pemanas cadangan (beban cadangan dari `dhwBackupKWhTh`) + kerja pompa kalor sumber bila ada.
- Rugi diam tangki sudah ada di dalam energi surya terpakai (beban cadangan lebih besar). Baris `rugi-diam` bernilai 0 dan hanya informasi, agar tidak terhitung dua kali.

## Baris buku besar
`listrik-pv` · `kalor-air-panas` · `selisih-pemanas-b2` (hanya B2) · `parasit` · `pompa-kalor-sumber` · `tertanam-{pvt,bos,pv,hpwh,kit}` · `rugi-diam` · `desikan-hvac` dan `desikan-tertanam` (**dikecualikan dari headline**, tag hipotesis).
`netKgPerYear` = Σ baris headline = `grossAvoided − embodied − parasitic` (embodied dan parasitic dilaporkan sebagai besaran penalti positif).

## Emisi tertanam (tidak pernah nol)
Dibagi umur pakai (20 tahun). SolarVein: PV/T per m² × luas + BOS. Pembanding: PV standar per kWp (luas × 0,2 kWp/m²), HPWH, kit kondensor; B3 memakai PV/T yang sama + 85 % BOS. Pemanas dan AC hotel yang sudah ada sama di semua kasus sehingga tidak dihitung. Unit desikan hanya muncul di baris desikan yang dikecualikan supaya angka utama tidak dihukum oleh sesuatu yang manfaatnya tidak dihitung. **Luas 0 berarti tidak ada sistem terpasang** (BOS ikut 0) sehingga net terhadap B1 tepat 0.

## Balik modal karbon
`emisi tertanam inkremental sepanjang umur / (net + emisi tertanam tahunan)`; Infinity bila net ≤ 0.

## Ekonomi
Penghematan = biaya energi X − biaya energi SolarVein (tarif listrik; LPG: kWh_fuel / 12,8 kWh/kg × harga per kg) − O&M (fraksi × capex inkremental). Capex inkremental = capex SolarVein − capex pembanding (rendah/tengah/tinggi disejajarkan; tidak di bawah 0). Balik modal sederhana = capex / penghematan; Infinity bila penghematan ≤ 0.

## Nilai per kWh_th (`heatUseValues`)
LPG: 0,227/η; HPWH: EF/COP; tahanan listrik: EF/η; desikan: (hemat AC bersih / kalor regenerasi) × EF (bisa ≤ 0); PV lebih dingin: ΔP_PV per W_th × EF. Daftar diurutkan menurun; urutannya hasil hitung, bukan klaim.

## Vonis
Kalimat Indonesia dibangkitkan dari angka: tiap pembanding mendapat satu klausa (SolarVein menghindari / pembanding lebih unggul / selisih hampir nol) dengan baris pendorong terbesar. Tidak ada pemenang bawaan.

## Belum bersumber (TODO R0)
EF jaringan (tahun/wilayah), faktor LPG IPCC, COP HPWH, emisi tertanam PV/PV-T/BOS/HPWH/kit, fraksi pemulihan kondensor, NCV LPG, tarif, harga LPG, capex.
