// Pitch mapping for the melody grid rows.
//
// Pentatonic scales keep the original Rolling Tones "no wrong notes" feel;
// the seven-note scales trade a little of that safety for stronger flavor.

export const ROWS = 16;
export const VIEW_COLS = 16; // columns visible at once (one page)
export const MAX_STEPS = 64;
export const PATTERN_LENGTHS = [16, 32, 64];

// Scales carry a stable `id` so projects can store the scale by name — the
// list can be reordered freely (now or later) without invalidating saves.
// `group` drives the optgroup dividers in the scale menu.
export const SCALES = [
  { id: "majorPent", label: "Major Pentatonic", group: "Pentatonic & Blues", intervals: [0, 2, 4, 7, 9] },
  { id: "minorPent", label: "Minor Pentatonic", group: "Pentatonic & Blues", intervals: [0, 3, 5, 7, 10] },
  { id: "blues", label: "Blues", group: "Pentatonic & Blues", intervals: [0, 3, 5, 6, 7, 10] },

  { id: "ionian", label: "Major (Ionian)", group: "Major & Modes", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: "dorian", label: "Dorian", group: "Major & Modes", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: "phrygian", label: "Phrygian", group: "Major & Modes", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: "lydian", label: "Lydian", group: "Major & Modes", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: "mixolydian", label: "Mixolydian", group: "Major & Modes", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: "aeolian", label: "Natural Minor (Aeolian)", group: "Major & Modes", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: "locrian", label: "Locrian", group: "Major & Modes", intervals: [0, 1, 3, 5, 6, 8, 10] },

  { id: "harmonicMinor", label: "Harmonic Minor", group: "Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: "melodicMinor", label: "Melodic Minor", group: "Minor", intervals: [0, 2, 3, 5, 7, 9, 11] },

  { id: "hungarianMinor", label: "Hungarian Minor", group: "Exotic", intervals: [0, 2, 3, 6, 7, 8, 11] },
  { id: "phrygianDominant", label: "Phrygian Dominant", group: "Exotic", intervals: [0, 1, 4, 5, 7, 8, 10] },
  { id: "diminishedWH", label: "Whole-Half Diminished", group: "Exotic", intervals: [0, 2, 3, 5, 6, 8, 9, 11] },

  { id: "chromatic", label: "Chromatic", group: "Chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

// Ids in the order used by builds up to v0.1.25, so a saved numeric
// scaleIndex from an older project maps to the right scale after this
// reorder. Do not change — it only describes the past.
export const LEGACY_SCALE_IDS = [
  "majorPent", "minorPent", "blues", "dorian", "harmonicMinor", "hungarianMinor",
  "phrygianDominant", "melodicMinor", "diminishedWH", "ionian", "aeolian",
  "phrygian", "lydian", "mixolydian", "locrian",
];

export function scaleIndexById(id) {
  const i = SCALES.findIndex((s) => s.id === id);
  return i >= 0 ? i : 0;
}

export const ROOT_CHOICES = [
  { label: "C", midi: 48 },
  { label: "C#", midi: 49 },
  { label: "D", midi: 50 },
  { label: "D#", midi: 51 },
  { label: "E", midi: 52 },
  { label: "F", midi: 53 },
  { label: "F#", midi: 54 },
  { label: "G", midi: 43 },
  { label: "G#", midi: 44 },
  { label: "A", midi: 45 },
  { label: "A#", midi: 46 },
  { label: "B", midi: 47 },
];

// Returns an array of MIDI note numbers, one per row, where index 0 is the
// TOP row of the grid (highest pitch) — matching how the grid renders.
export function buildRowNotes(rootMidi, intervals) {
  const notes = [];
  for (let i = 0; i < ROWS; i++) {
    const octave = Math.floor(i / intervals.length);
    const degree = i % intervals.length;
    notes.push(rootMidi + octave * 12 + intervals[degree]);
  }
  return notes.reverse();
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiNoteName(midi) {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}
