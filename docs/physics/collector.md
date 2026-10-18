# Kolektor `pvt-liquid` (v2)

**Apa ini.** Perangkat keras PV/T yang sama dengan v1 (laminasi PV berkaca depan tanpa celah udara, "kelas unglazed",
pelat penyerap + penukar panas cair, insulasi belakang), tetapi **hanya memanen**: tidak pernah membuang panas dan tidak
pernah berstatus `reject`. Model: satu node terlumping, tunak; persamaan dasar di `docs/PHYSICS.md`.

- `pumpControl: 'auto'`: pompa menyala hanya bila panen layak (`harvestWorth`: ada `heatLoadAvailable`, q > 20 W, dan
  q/η_boiler ≥ 5× daya pompa). Bila panel lebih dingin daripada cairan, pompa mati, `qLiquidW = 0`: kolektor tidak
  mendinginkan tangki.
- `pumpControl: 'on'`: pompa menyala apa pun kondisinya (dipakai pengendali sistem). Bila panel lebih dingin daripada
  cairan, `qLiquidW < 0` dan muncul advisory `COLLECTOR_COOLS_LOOP`; itu rugi yang harus dihindari pengendali.

## η_th dan η_e tidak pernah konstan

G = 800 W/m², udara 31 °C, angin 1,5 m/s, 2 L/mnt, A = 1,7 m², pompa `on`. η_th = qLiquidW / (G·A), η_e = P_e / (G·A).

| T_masuk [°C] | T_sel [°C] | η_th | η_e |
|---:|---:|---:|---:|
| 28 | 34,8 | 0,584 | 0,193 |
| 35 | 40,7 | 0,488 | 0,189 |
| 40 | 44,9 | 0,419 | 0,186 |
| 45 | 49,1 | 0,349 | 0,183 |
| 50 | 53,2 | 0,277 | 0,180 |
| 55 | 57,4 | 0,205 | 0,177 |

η_th turun sekitar 0,07 per +5 K suhu masuk (rugi depan dan belakang tumbuh dengan suhu panel); η_e turun karena sel
menghangat (β = 0,35 %/K). Tes `collector-v2.test.ts` mengunci kedua tren.

## Sumber pompa kalor (malam / hujan)

G = 0, udara 26 °C, T_masuk 15 °C, 2 L/mnt, pompa `on`. Arah: lingkungan → cairan (`qLiquidW > 0`), residual neraca ≈ 0.

| Angin | Kering [W/m²] | Hujan 10 mm/jam [W/m²] |
|---:|---:|---:|
| 1 m/s | 82 | 138 |
| 2 m/s | 104 | 156 |

Rentang yang diharapkan dewan fisika: 50-150 W/m². Kering masuk rentang; hujan menambah sekitar 52-56 W/m²
(entalpi tetes ≈ suhu udara, suhu langit efektif naik ke ≈ T_amb − 1 K) dan pada angin 2 m/s sedikit melewati 150.
Hasil ini adalah **bukti kelayakan model, bukan validasi**: koefisien konveksi Watmuff untuk sisi depan, ε_hujan = 0,5
dan depresi langit 6 K (kering) bersifat asumsi. Nilai pemakaian harus dihitung dari kerja pompa kalor (Q_kond/COP),
bukan dari bahan bakar yang dihindari; itu tugas modul sistem.

## Batas atas kondensasi (opsional, belum divalidasi)

Bila `humidityRatio` diberikan dan suhu kaca hasil solusi di bawah titik embun udara, `qCondensationUpperW` melaporkan
**batas atas, belum divalidasi** untuk pelepasan kalor laten: analogi Lewis, h_m = h_c/(ρ·c_p·Le^(2/3)) dengan Le = 0,87,
ṁ = h_m·ρ·A·(w_udara − w_jenuh(T_kaca)), q = ṁ·h_fg. Nilai ini **tidak masuk neraca energi** (kaca tidak dihangatkan
oleh kondensat dalam solusi, sehingga ia melebih-lebihkan) dan bernilai 0 bila kaca ≥ titik embun atau `humidityRatio`
tidak ada. Contoh (RH 90 % pada 26 °C, angin 1 m/s, kondisi sumber di atas): ±115 W/m² kalor laten sebagai batas atas,
dibandingkan 82 W/m² gain sensibel. Jangan dipakai sebagai nilai rencana.

## Keterbatasan

- Satu node terlumping dan tunak: tidak ada inersia termal panel, sehingga transien pagi/sore tidak tertangkap.
- Laminasi kelas unglazed: rugi depan besar pada T_masuk tinggi; η_th pada 50 °C hanya ±0,28.
- Rugi belakang U = 1 W/(m²·K) tetap; angin dan kelembapan sisi belakang tidak dimodelkan.
- Hujan: hanya panas sensibel, tanpa penguapan film; pita ketidakpastian ε_hujan 0,3-1,0 (lihat PHYSICS.md §2.3).
- Kondensasi hanya batas atas satu arah, bukan bagian dari angka yang ditampilkan.
