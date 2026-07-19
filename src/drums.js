// Percussion rows, ordered top-to-bottom as they render in the drum grid.
//
// `gm` is the General MIDI channel-10 note for each sound — the default for
// export, but remappable in the UI since some hardware and soundfonts put
// kick/snare elsewhere.
//
// Ordered high→low so the kit reads top (crash/hats) to bottom (snare/kick).
// The four original lanes kept their ids so older saved drum grids migrate by
// name (see loadPattern in main.js).

export const DRUMS = [
  { id: "crash", label: "Crash", gm: 49 },
  { id: "hatOpen", label: "Open Hat", gm: 46 },
  { id: "hatClosed", label: "Closed Hat", gm: 42 },
  { id: "tambourine", label: "Tambourine", gm: 54 },
  { id: "clap", label: "Clap", gm: 39 },
  { id: "snare", label: "Snare", gm: 38 },
  { id: "kick", label: "Kick", gm: 36 },
];

export const DRUM_ROWS = DRUMS.length;

export function defaultDrumMap() {
  return DRUMS.map((d) => d.gm);
}
