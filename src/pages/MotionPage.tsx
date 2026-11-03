import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { TopBar } from "../components/Shell";
import { Checkbox, Segmented } from "../components/ui";
import type { Studio } from "../studio/useStudio";

type Effect = "blinky" | "glitch" | "glitch-strong" | "glitch-mild" | "trail" | "stroke" | "shuffle" | "crash" | "slide" | "color" | "build";

/** Frames are at 24 fps, measured off the reference video. */
const EFFECTS: { id: Effect; name: string; frames: number; description: string }[] = [
  { id: "blinky", name: "BLINKY", frames: 6, description: "Half, off, on, half, on" },
  { id: "glitch", name: "GLITCH", frames: 27, description: "Bands slide into place, then the edges jitter" },
  { id: "glitch-strong", name: "GLITCH 1 STRONG", frames: 6, description: "Bands slide into place, with no jitter after" },
  { id: "glitch-mild", name: "GLITCH 1 MILD", frames: 6, description: "Glitch 1 at half the travel. The app uses this one" },
  { id: "trail", name: "TRAIL", frames: 9, description: "A brightening streak settles into place" },
  { id: "stroke", name: "STROKE-N-FILL", frames: 19, description: "The outline flickers, then it fills" },
  { id: "shuffle", name: "SHUFFLE", frames: 16, description: "Crossed box, alert, hatching, solid" },
  { id: "crash", name: "CRASH-N-BLINK", frames: 16, description: "Lands oversized, shrinks, then blinks" },
  { id: "slide", name: "SLIDE-N-BLINK", frames: 16, description: "Rises from below, then blinks" },
  { id: "color", name: "COLOR FLASH", frames: 17, description: "Runs through colors before settling" },
  { id: "build", name: "BUILD ON", frames: 26, description: "Scattered cells fill in the square" },
];

const SPEEDS = ["1x", "0.5x", "0.25x"] as const;
type Speed = typeof SPEEDS[number];
const SPEED_SCALE: Record<Speed, number> = { "1x": 1, "0.5x": 2, "0.25x": 4 };

/** The reference video repeats every 41 frames. */
const LOOP_MS = 41 / 24 * 1000;
const TEXT = "Aa";
const BUILD_CELLS = 25;
/** Build On cells appear between frames 13 and 25, in a fixed scattered order. */
const buildDelay = (i: number) => 13 + (i * 8 + (i % 3) * 5) % 13;

function Square({ effect }: { effect: Effect }) {
  const cls = "m-square m-" + effect;
  switch (effect) {
    case "glitch":
    case "glitch-strong":
    case "glitch-mild":
      return <span className={effect === "glitch" ? cls : "m-square m-glitch-in" + (effect === "glitch-mild" ? " m-glitch-mild" : "")}>{[1, 2, 3, 4].map(n => <span key={n} className={"m-layer t-body-strong m-band-" + n}>{TEXT}</span>)}</span>;
    case "trail":
      return <span className={cls}><span className="m-layer m-trail-tail" /><span className="m-layer t-body-strong m-trail-face">{TEXT}</span></span>;
    case "shuffle":
      return <span className={cls}>
        <span className="m-layer m-shuffle-x" />
        <span className="m-layer t-display m-shuffle-bang">!</span>
        <span className="m-layer m-shuffle-hatch" />
        <span className="m-layer t-body-strong m-shuffle-face">{TEXT}</span>
      </span>;
    case "build":
      return <span className={cls}>
        <span className="m-build-grid">{Array.from({ length: BUILD_CELLS }, (_, i) => <i key={i} style={{ "--m-delay": buildDelay(i) } as CSSProperties} />)}</span>
        <span className="m-layer t-body-strong m-build-face">{TEXT}</span>
      </span>;
    default:
      return <span className={cls + " t-body-strong"}>{TEXT}</span>;
  }
}

export function MotionPage({ studio, onMenu }: { studio: Studio; onMenu: () => void }) {
  const [runs, setRuns] = useState<Record<string, number>>({});
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1x");
  const scale = SPEED_SCALE[speed];

  const replay = (id: Effect) => setRuns(r => ({ ...r, [id]: (r[id] ?? 0) + 1 }));
  const replayAll = useCallback(() => setRuns(r => Object.fromEntries(EFFECTS.map(e => [e.id, (r[e.id] ?? 0) + 1]))), []);

  useEffect(() => {
    if (!loop) return;
    const timer = setInterval(replayAll, LOOP_MS * scale);
    return () => clearInterval(timer);
  }, [loop, scale, replayAll]);

  return <>
    <TopBar title="Motion" subtitle={`${EFFECTS.length} styles`} studio={studio} onMenu={onMenu} showSave={false} />
    <div className="motion-body" style={{ "--m-speed": scale } as CSSProperties}>
      <div className="motion-controls">
        <button className="btn btn-primary" onClick={replayAll}>Replay all</button>
        <Checkbox label="Loop" checked={loop} onChange={setLoop} />
        <Segmented<Speed> label="Speed" value={speed} options={SPEEDS} onChange={setSpeed} />
        <span className="t-caption muted">Hover or press a card to replay it</span>
      </div>
      <div className="motion-grid">
        {EFFECTS.map(e => <button key={e.id} className="motion-card" onClick={() => replay(e.id)} onMouseEnter={() => replay(e.id)}>
          <span className="m-stage"><Square key={runs[e.id] ?? 0} effect={e.id} /></span>
          <span className="t-label">{e.name}</span>
          <span className="t-caption muted">{e.description}</span>
          <span className="t-caption muted">{Math.round(e.frames / 24 * 1000)} ms</span>
        </button>)}
      </div>
    </div>
  </>;
}
