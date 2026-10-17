import type { AssumptionEntry } from '../contract';

/** Asumsi mode sumber pompa kalor dari loop PV/T (opsi riset, dibandingkan dengan B2) (W2a). */
export const HEATPUMP_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'hp-carnot-fraksi',
    title: 'Fraksi Carnot',
    body: 'COP = fraksi × T_kondensor / (T_kondensor − T_evaporator) dalam kelvin. Unit kecil berpendingin cairan biasanya mencapai 0,4–0,5 dari Carnot. Dengan 0,45, mengangkat sumber 15 °C ke air 58 °C menghasilkan COP sekitar 3,1.',
    value: '0,45 (rentang 0,40–0,50)',
    tag: 'asumsi',
     // TODO(R0)
  },
  {
    id: 'hp-pendekatan-hx',
    title: 'Selisih pendekatan evaporator dan kondensor',
    body: 'Evaporator berada 3 K di bawah suhu fluida sumber dan kondensor 3 K di atas suhu air tujuan (penukar panas pelat). Selisih yang lebih besar menurunkan COP.',
    value: '3 K + 3 K (rentang 3–5 K)',
    tag: 'asumsi',
  },
  {
    id: 'hp-pembanding-b2',
    title: 'Pembanding B2',
    body: 'Pemanas air pompa kalor udara (B2) mencapai COP sekitar 3,5–4,5. Mode sumber PV/T pada malam atau hujan kemungkinan marginal terhadap B2; nilai tambahnya dinilai dari kerja kompresor, bukan dari bahan bakar yang dihindari.',
    tag: 'hipotesis',
  },
];
