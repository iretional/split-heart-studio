import { ALL_KEYCODES } from "../keyLabels";

export type StepKind = "Tap" | "Press" | "Release" | "Wait" | "Text";
export type MacroStep = { id: number; kind: StepKind; value: string };
export type Macro = { id: number; name: string; steps: MacroStep[]; waitMs: number; tapMs: number };

export const macroId = (name: string) => "macro_" + (name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "new");

const SYMBOLS: Record<string, string> = {
  " ": "SPACE", "/": "FSLH", "\\": "BSLH", ".": "DOT", ",": "COMMA", ";": "SEMI", "'": "SQT", "-": "MINUS", "=": "EQUAL", "[": "LBKT", "]": "RBKT", "`": "GRAVE",
  "!": "EXCL", "@": "AT", "#": "HASH", "$": "DLLR", "%": "PRCNT", "^": "CARET", "&": "AMPS", "*": "STAR", "(": "LPAR", ")": "RPAR", "_": "UNDER", "+": "PLUS",
  ":": "COLON", "\"": "DQT", "?": "QMARK", "<": "LT", ">": "GT", "{": "LBRC", "}": "RBRC", "|": "PIPE", "~": "TILDE",
};

function charCode(c: string) {
  if (/[a-z]/.test(c)) return c.toUpperCase();
  if (/[A-Z]/.test(c)) return `LS(${c})`;
  if (/[0-9]/.test(c)) return "N" + c;
  return SYMBOLS[c] ?? null;
}

const zmkName = (label: string) => ALL_KEYCODES.find(k => k.label === label)?.zmk ?? label.toUpperCase().replace(/\s+/g, "");

/** Text steps become taps; each space gets its own line, matching the design's devicetree sample. */
function textLines(text: string) {
  const lines: string[] = [];
  let run: string[] = [];
  const flush = () => { if (run.length) lines.push(`<&macro_tap ${run.map(c => "&kp " + c).join(" ")}>`); run = []; };
  for (const c of text) {
    const code = charCode(c);
    if (!code) continue;
    if (code === "SPACE") { flush(); lines.push("<&macro_tap &kp SPACE>"); } else run.push(code);
  }
  flush();
  return lines;
}

export function macroCode(m: Macro) {
  const id = macroId(m.name);
  const lines = m.steps.flatMap(s => {
    if (s.kind === "Wait") return [`<&macro_wait_time ${parseInt(s.value, 10) || 0}>`];
    if (s.kind === "Text") return textLines(s.value);
    return [`<&macro_${s.kind.toLowerCase()} &kp ${zmkName(s.value)}>`];
  });
  const body = lines.length ? lines.map((l, i) => `    ${i ? "," : "="} ${l}`).join("\n") + ";" : "    = <>;";
  return `${id}: ${id} {\n  compatible = "zmk,behavior-macro";\n  #binding-cells = <0>;\n  wait-ms = <${m.waitMs}>;\n  tap-ms = <${m.tapMs}>;\n  bindings\n${body}\n};`;
}

let nextId = Date.now();
export const newId = () => ++nextId;
const step = (kind: StepKind, value: string): MacroStep => ({ id: newId(), kind, value });

/** Sample drafts from the design, shown only in demo mode. */
export const demoMacros = (): Macro[] => [
  { id: newId(), name: "Select line", waitMs: 30, tapMs: 30, steps: [step("Tap", "Home"), step("Press", "L Shift"), step("Tap", "End"), step("Release", "L Shift"), step("Wait", "30 ms"), step("Text", "// ")] },
  { id: newId(), name: "Meeting link", waitMs: 30, tapMs: 30, steps: [step("Text", "meet.example.com")] },
];
export const defaultStepValue = (kind: StepKind) => kind === "Wait" ? "30 ms" : kind === "Text" ? "" : kind === "Tap" ? "A" : "L Shift";
