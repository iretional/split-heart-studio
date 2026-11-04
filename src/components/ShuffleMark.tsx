import { useEffect, useState } from "react";

const MARKS = ["!", "?", "DONE", "loading", "heart"] as const;
type Mark = typeof MARKS[number];

let last: Mark | null = null;

/** Never the same mark twice in a row, so replays visibly differ. */
function pickMark() {
  const choices = MARKS.filter(m => m !== last);
  return choices[Math.floor(Math.random() * choices.length)];
}

/** The middle beat of the Shuffle effect: one mark, chosen each time the effect plays. */
export function ShuffleMark() {
  const [mark] = useState(pickMark);
  useEffect(() => { last = mark; }, [mark]);
  return <span className={"m-layer t-display m-shuffle-bang" + (mark === "DONE" ? " shuffle-word" : "")}>
    {mark === "heart"
      ? <svg className="shuffle-icon" viewBox="0 0 512 512" aria-hidden="true">
          <polygon fill="currentColor" points="362.39 53.23 309.04 106.58 344.02 141.56 244.73 240.84 309.53 305.64 236.27 378.75 279.64 315.02 190.12 225.5 256 159.62 149.61 53.23 0 202.84 256 458.84 512 202.84 362.39 53.23" />
        </svg>
      : mark === "loading"
        ? <svg className="shuffle-icon shuffle-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
        : mark}
  </span>;
}
