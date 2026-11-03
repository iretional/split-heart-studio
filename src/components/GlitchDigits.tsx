import { useState, type CSSProperties } from "react";
import { randomDir, reducedMotion } from "./useHoverSelectFx";

const BANDS = [1, 2, 3, 4];

/** Text whose characters glitch in when the text changes, only the ones that differ from before. */
export function GlitchDigits({ text, className }: { text: string; className?: string }) {
  const [run, setRun] = useState({ text, changed: [] as number[], n: 0, dir: 1 });
  if (run.text !== text) setRun({ text, changed: reducedMotion() ? [] : [...text].flatMap((c, i) => c === run.text[i] ? [] : [i]), n: run.n + 1, dir: randomDir() });
  const last = run.changed[run.changed.length - 1];
  return <span className={className}>{[...text].map((c, i) => {
    const changing = run.changed.includes(i);
    return <span key={i} className={"digit" + (changing ? " fx-select" : "")}>
      <span className="digit-face">{c}</span>
      {changing && BANDS.map(n => <span key={run.n + "-" + n} aria-hidden="true" className={"digit-band fx-band-" + n} style={{ "--fx-dir": run.dir } as CSSProperties}
        onAnimationEnd={n === 4 && i === last ? () => setRun(r => ({ ...r, changed: [] })) : undefined}>{c}</span>)}
    </span>;
  })}</span>;
}
