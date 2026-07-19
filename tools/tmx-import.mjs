#!/usr/bin/env node
// Convert a RollingTones .tmx save into a Tone Matrix .tonematrix.json
// project. Format knowledge reverse-engineered from sample files — see
// docs/tmx-format.md, including which parts are still unconfirmed.
//
// Usage: node tools/tmx-import.mjs song.tmx > song.tonematrix.json

import { readFileSync } from "node:fs";

const GRID = 16;
const MAX_STEPS = 64;
const OUR_PATTERNS = 8;
const OUR_TRACKS = 3;

const path = process.argv[2];
if (!path) {
  console.error("usage: node tools/tmx-import.mjs <file.tmx>");
  process.exit(1);
}
const data = readFileSync(path);

if (data.slice(0, 4).toString("latin1") !== "TM3\0") {
  console.error("not a RollingTones TM3 file");
  process.exit(1);
}

const speed = data.readUInt16LE(4); // e.g. 600 — believed to be steps/minute
const chainLen = data.readUInt16LE(8);
const chain = [...data.slice(10, 10 + chainLen)];
const pageCount = data[60];
const pages = [];
for (let k = 0; k < pageCount; k++) {
  const off = 61 + 257 * k;
  pages.push([...data.slice(off + 1, off + 257)]);
}
console.error(
  `TM3: speed=${speed} pages=${pageCount} chain=${chainLen} entries (${chain.join(" ")})`
);

// ---- Map onto a Tone Matrix project -----------------------------------------
// ASSUMPTIONS pending calibration files: cells are row-major with rows as
// pitch (row 0 = top/highest) and columns as time; values 0-2 map to our
// three tracks, value 3 folds into track 3.

const emptyRow = () => Array(MAX_STEPS).fill(0);
const packGrid = (g) => g.map((row) => row.join("")).join("|");

const usedPages = Math.min(pageCount, OUR_PATTERNS);
if (pageCount > OUR_PATTERNS) {
  console.error(`note: only the first ${OUR_PATTERNS} of ${pageCount} pages fit; chain filtered.`);
}

const patterns = [];
for (let k = 0; k < OUR_PATTERNS; k++) {
  const tracks = Array.from({ length: OUR_TRACKS }, () => ({
    grid: Array.from({ length: GRID }, emptyRow),
    ties: Array.from({ length: GRID }, emptyRow),
  }));
  if (k < usedPages) {
    const cells = pages[k];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const v = cells[r * GRID + c];
        if (v === 255) continue;
        const track = Math.min(v, OUR_TRACKS - 1);
        tracks[track].grid[r][c] = 1;
      }
    }
  }
  patterns.push({
    tracks: tracks.map((t) => ({ cells: packGrid(t.grid), ties: packGrid(t.ties) })),
    drums: Array.from({ length: 4 }, () => Array(MAX_STEPS).fill(0).join("")).join("|"),
    length: 16,
  });
}

const project = {
  patterns,
  selectedPattern: 0,
  songChain: chain.filter((p) => p < usedPages),
  songMode: true,
  bpm: Math.min(240, Math.max(40, Math.round(speed / 4))),
  swing: 50,
  rootIndex: 0,
  scaleIndex: 0,
  trackSettings: [
    { instrument: "bell", octave: 0, muted: false },
    { instrument: "musicbox", octave: 0, muted: false },
    { instrument: "marimba", octave: 0, muted: false },
  ],
  drumsMuted: false,
};

console.log(JSON.stringify(project, null, 2));
