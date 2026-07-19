// RollingTones .tmx (TM3) import — format reverse-engineered from real save
// files and single-cell calibration files, see docs/tmx-format.md.
//
// Two container layouts share the "TM3\0" magic:
//   - v2 (RollingTones ~1.4, single/short songs): 21-byte header, then
//     N × 256-byte pages (page count derived from file size).
//   - v1 (older, ~2022): 61-byte header with a 50-slot song chain, then
//     N × 257-byte pages (a leading index byte + 256 cells).
//
// Cells: 0xff = empty; value 0 = the sine/melodic voice; 1 = kick, 2 = snare,
// 3 = closed hi-hat, 4 = open hi-hat (RollingTones integrates drums as grid
// instruments); higher values are additional melodic voices.
//
// Orientation (confirmed by calibration): a cell's byte index is
// `col*16 + row`, where col is the time step (left→right) and row is the
// pitch lane with row 0 at the TOP of the grid.

const GRID = 16;
const MAX_STEPS = 64;
const OUR_PATTERNS = 12; // keep in sync with PATTERN_COUNT in main.js
const OUR_TRACKS = 3;
const DRUM_ROWS = 4;

export function isTmx(bytes) {
  return (
    bytes.length > 21 &&
    bytes[0] === 0x54 && bytes[1] === 0x4d && bytes[2] === 0x33 && bytes[3] === 0
  );
}

// Locate the pages ([Uint8Array(256)]) plus any song chain and the melodic
// waveform, detecting the container from how the byte count divides.
// Confirmed against real files:
//   - 21-byte header + N × 257-byte pages (index byte + 256 cells) for
//     multi-page newer files (e.g. 535 = 21 + 2×257).
//   - 21-byte header + one 256-byte page (no index byte) for single-page
//     newer files (277 = 21 + 256).
//   - 61-byte header (u16 chain length at byte 8, 50-slot chain at byte 10)
//     + N × 257-byte pages for older files (2888 = 61 + 11×257).
function readPages(bytes) {
  const n = bytes.length;
  const slicePages = (headerLen, hasIndexByte) => {
    const pageLen = hasIndexByte ? 257 : 256;
    const count = (n - headerLen) / pageLen;
    const pages = [];
    for (let k = 0; k < count; k++) {
      const base = headerLen + pageLen * k + (hasIndexByte ? 1 : 0);
      pages.push(bytes.slice(base, base + 256));
    }
    return pages;
  };

  // The melodic "Sine" voice's waveform index lives at header byte 12 in the
  // newer format (0 Bip-Sinus, 1 Bip-Tri, 2 Bip-Saw, 3 Bip-Square, 4-7 the
  // normalised variants).
  const waveform = bytes[12] <= 7 ? bytes[12] : 0;

  if ((n - 21) % 257 === 0) {
    return { pages: slicePages(21, true), chain: null, waveform };
  }
  if ((n - 21) % 256 === 0) {
    return { pages: slicePages(21, false), chain: null, waveform };
  }
  if ((n - 61) % 257 === 0) {
    const chainLen = bytes[8] | (bytes[9] << 8);
    const chain = [...bytes.slice(10, 10 + Math.min(chainLen, 50))];
    return { pages: slicePages(61, true), chain, waveform: null };
  }
  throw new Error("unrecognized TM3 layout");
}

// RollingTones' four melodic waveforms (bipolar and normalised share a shape)
// mapped to the nearest Sonic Squares instrument.
const WAVEFORM_INSTRUMENT = ["bell", "triangle", "sawtooth", "square"];

// Tempo: newer files store BPM in the low 10 bits of the speed word (a flag
// bit sits above it); older files stored quarter-BPM. Try each, else default.
function readBpm(bytes) {
  const speed = bytes[4] | (bytes[5] << 8);
  const low = speed & 0x3ff;
  if (low >= 40 && low <= 240) return low;
  const quarter = Math.round(speed / 4);
  if (quarter >= 40 && quarter <= 240) return quarter;
  return 120;
}

// RollingTones' palette: value 0 is the melodic (waveform-selectable) voice;
// values 1-7 are all percussion (confirmed by calibration files). We have
// four drum lanes, so the three extra RollingTones percussion sounds (5-7,
// the yellow/orange/periwinkle instruments) fold onto the nearest lane.
// Our drum rows top-to-bottom: 0 open hat, 1 closed hat, 2 snare, 3 kick.
function routeValue(v) {
  switch (v) {
    case 0: return { track: 0 };   // sine / melody
    case 1: return { drumRow: 3 }; // kick
    case 2: return { drumRow: 2 }; // snare
    case 3: return { drumRow: 1 }; // closed hi-hat
    case 4: return { drumRow: 0 }; // open hi-hat
    case 5: return { drumRow: 2 }; // extra perc → snare (provisional)
    case 6: return { drumRow: 0 }; // extra perc → open hat (provisional)
    case 7: return { drumRow: 1 }; // extra perc → closed hat (provisional)
    default: return { drumRow: 2 };
  }
}

export function tmxToProject(bytes) {
  if (!isTmx(bytes)) throw new Error("not a TM3 file");
  const { pages, chain, waveform } = readPages(bytes);
  const melodyInstrument =
    waveform != null ? WAVEFORM_INSTRUMENT[waveform % 4] : "bell";

  const emptyRow = () => Array(MAX_STEPS).fill(0);
  const packGrid = (g) => g.map((row) => row.join("")).join("|");
  const usedPages = Math.min(pages.length, OUR_PATTERNS);

  const patterns = [];
  for (let k = 0; k < OUR_PATTERNS; k++) {
    const tracks = Array.from({ length: OUR_TRACKS }, () => ({
      grid: Array.from({ length: GRID }, emptyRow),
      ties: Array.from({ length: GRID }, emptyRow),
    }));
    const drumGrid = Array.from({ length: DRUM_ROWS }, emptyRow);
    if (k < usedPages) {
      const cells = pages[k];
      for (let col = 0; col < GRID; col++) {
        for (let row = 0; row < GRID; row++) {
          const v = cells[col * GRID + row];
          if (v === 255) continue;
          const dest = routeValue(v);
          if (dest.drumRow !== undefined) drumGrid[dest.drumRow][col] = 1;
          else tracks[dest.track].grid[row][col] = 1;
        }
      }
    }
    patterns.push({
      tracks: tracks.map((t) => ({ cells: packGrid(t.grid), ties: packGrid(t.ties) })),
      drums: packGrid(drumGrid),
      length: 16,
    });
  }

  // Song chain: v1 carries one; v2 (or a missing/empty chain) plays the
  // pages in order.
  let songChain;
  if (chain && chain.length) songChain = chain.filter((p) => p < usedPages);
  else songChain = Array.from({ length: usedPages }, (_, i) => i);

  return {
    patterns,
    selectedPattern: 0,
    songChain,
    songMode: usedPages > 1,
    bpm: readBpm(bytes),
    swing: 50,
    rootIndex: 0,
    scaleIndex: 0,
    trackSettings: [
      { instrument: melodyInstrument, octave: 0, muted: false },
      { instrument: "musicbox", octave: 0, muted: false },
      { instrument: "marimba", octave: 0, muted: false },
    ],
    drumsMuted: false,
  };
}
