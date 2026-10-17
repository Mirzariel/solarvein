import { Panel, SectionHeader } from '../ui';
import { useMediaQuery } from '../hooks';
import { SECTION } from './nav';
import ControlPanel from './ControlPanel';
import Instrumentation from './Instrumentation';
import Rincian from './Assumptions';
import { LabMini, LabStrip } from './lab/LabStrip';
import { LabSchematic } from './lab/LabSchematic';
import { SceneBar } from './lab/SceneBar';

/**
 * 07 - Lab: ruang instrumen. Skema sistem hidup (langkah yang dipilih) lengket di samping kontrol; keluaran dalam
 * tab; rincian rekayasa dilipat. Semua angka berasal dari simulasi yang sama dengan bagian lain.
 */
export default function Lab() {
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const idx = SECTION.lab;
  return (
    <section id="lab" aria-labelledby="lab-title" className="scroll-mt-14 border-t border-line bg-sunken/60 pb-24 pt-24 lg:pb-32 lg:pt-36">
      <div className="page-wrap">
        <SectionHeader
          id="lab-title"
          index={{ n: idx?.n ?? '07', label: idx?.label ?? 'Lab' }}
          title={
            <>
              <span className="inline-block">Atur kondisinya.</span> <span className="inline-block">Baca hasilnya.</span>
            </>
          }
          lead="Geser satu nilai; skema, grafik, dan angka tahunan dihitung ulang dari model yang sama."
        />

        <div className="grid-12 mt-14 items-start gap-y-8 lg:mt-20">
          {/* skema hidup + L1 */}
          <div className="col-span-12 lg:hidden">
            <SceneBar idSuffix="-m" />
          </div>
          <div className="sticky top-14 z-20 col-span-12 -mx-4 bg-sunken px-4 pb-3 pt-3 sm:-mx-6 sm:px-6 lg:top-[88px] lg:col-span-7 lg:m-0 lg:bg-transparent lg:p-0">
            <div className="rounded-[20px] bg-surface p-3 shadow-e2 sm:p-6">
              <div className="hidden lg:block">
                <SceneBar />
              </div>
              <div className="lg:mt-4">
                <LabSchematic compact={!wide} className="h-auto max-h-[36svh] w-full lg:max-h-none" />
              </div>
            </div>
            <div className="mt-2 lg:hidden">
              <LabMini />
            </div>
            <div className="mt-6 hidden lg:block">
              <LabStrip />
            </div>
          </div>

          {/* kontrol */}
          <div className="col-span-12 lg:col-span-5">
            <Panel aria-label="Kontrol simulasi" className="rounded-[20px]! border-0! p-5 shadow-e2 sm:p-7">
              <ControlPanel />
            </Panel>
            <div className="mt-6 lg:hidden">
              <LabStrip />
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Instrumentation />
        </div>
        <div className="mt-16">
          <Rincian />
        </div>
      </div>
    </section>
  );
}
