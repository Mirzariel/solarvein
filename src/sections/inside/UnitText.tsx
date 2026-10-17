import { Fragment } from 'react';

/** Renders "W_th" / "kW_e" with a real subscript (never the literal underscore). */
export function UnitText({ unit }: { unit: string }) {
  const parts = unit.split(/_(th|e)\b/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <sub key={i} className="ml-px text-[0.7em]">
            {p}
          </sub>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
