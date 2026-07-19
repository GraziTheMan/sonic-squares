// RollingTones .tmx (TM3) import — format reverse-engineered, see
// docs/tmx-format.md.
//
// Confirmed: TM3 magic, u16 speed, u16 chain length + 50-slot chain of page
// indices, u8 page count, 257-byte pages (index byte + 256 cells, 0xff
// empty / low values = instrument). Cells are stored one TIME STEP per
// 16-byte row with pitch/instrument lanes across — drums live in the bottom
// lanes and fire "all at once" per step when viewed unrotated.
//
// Still provisional pending calibration files: which lane is the top row,
// and which instrument values are percussion.

const GRID = 16;
const MAX_STEPS = 64;
const OUR_PATTERNS = 12; // keep in sync with PATTERN_COUNT in main.js
const OUR_TRACKS = 3;

export function isTmx(bytes) {
  return (
    bytes.length > 61 &&
    bytes[0] === 0x54 && bytes[1] === 0x4d && bytes[2] === 0x33 && bytes[3] === 0
  );
}

export function tmxToProject(bytes) {
  if (!isTmx(bytes)) throw new Error("not a TM3 file");
  const speed = bytes[4] | (bytes[5] << 8);
  const chainLen = bytes[8] | (bytes[9] << 8);
  const chain = [...bytes.slice(10, 10 + Math.min(chainLen, 50))];
  const pageCount = bytes[60];
  if (bytes.length < 61 + 257 * pageCount) throw new Error("truncated TM3 file");

  const emptyRow = () => Array(MAX_STEPS).fill(0);
  const packGrid = (g) => g.map((row) => row.join("")).join("|");
  const usedPages = Math.min(pageCount, OUR_PATTERNS);

  const patterns = [];
  for (let k = 0; k < OUR_PATTERNS; k++) {
    const tracks = Array.from({ length: OUR_TRACKS }, () => ({
      grid: Array.from({ length: GRID }, emptyRow),
      ties: Array.from({ length: GRID }, emptyRow),
    }));
    if (k < usedPages) {
      const cells = bytes.slice(61 + 257 * k + 1, 61 + 257 * k + 257);
      for (let step = 0; step < GRID; step++) {
        for (let lane = 0; lane < GRID; lane++) {
          const v = cells[step * GRID + lane];
          if (v === 255) continue;
          const track = Math.min(v, OUR_TRACKS - 1);
          tracks[track].grid[lane][step] = 1;
        }
      }
    }
    patterns.push({
      tracks: tracks.map((t) => ({ cells: packGrid(t.grid), ties: packGrid(t.ties) })),
      drums: Array.from({ length: 4 }, () => Array(MAX_STEPS).fill(0).join("")).join("|"),
      length: 16,
    });
  }

  return {
    patterns,
    selectedPattern: 0,
    songChain: chain.filter((p) => p < usedPages),
    songMode: chain.length > 0,
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
}
