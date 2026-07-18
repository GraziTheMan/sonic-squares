// Minimal Standard MIDI File writer — no dependencies.
//
// Format 1, two tracks: melody on channel 1 and percussion on channel 10
// (the GM drum channel), so DAWs import them as separate instrument lanes.
// The melody track leads with a tempo meta event so the file opens at the
// composed BPM, not a DAW default.
//
// Export takes a list of pattern segments played back to back, so a song
// chain becomes one continuous file. Cell values carry velocity: 1 = normal,
// 2 = accent. Melody cells joined by ties export as one long note; untied
// neighbours stay separate 16ths. Swing shifts offbeat 16ths later, matching
// what the audio engine plays. Muted rows are skipped — the file contains
// what you hear.

const PPQ = 128; // ticks per quarter note
const TICKS_PER_STEP = PPQ / 4; // a step is a 16th note

const VELOCITY = { 1: 88, 2: 118 };

function varLen(value) {
  // MIDI variable-length quantity, 7 bits per byte, MSB flags continuation.
  const bytes = [value & 0x7f];
  while ((value >>= 7)) {
    bytes.unshift((value & 0x7f) | 0x80);
  }
  return bytes;
}

// Melody: walk each row merging tied runs into single long notes.
function melodySegmentEvents(seg, rowNotes, audible, swingTicks, offset, events) {
  const { grid, tieGrid, steps } = seg;
  const tickOf = (s) => offset + s * TICKS_PER_STEP + (s % 2 ? swingTicks : 0);
  for (let row = 0; row < grid.length; row++) {
    if (!audible[row]) continue;
    let step = 0;
    while (step < steps) {
      if (!grid[row][step]) {
        step++;
        continue;
      }
      let end = step;
      while (end < steps - 1 && tieGrid[row][end] && grid[row][end + 1]) end++;
      const note = rowNotes[row];
      const velocity = VELOCITY[grid[row][step]] ?? VELOCITY[1];
      events.push({ tick: tickOf(step), off: false, note, velocity, channel: 0 });
      events.push({ tick: tickOf(end + 1), off: true, note, velocity: 0, channel: 0 });
      step = end + 1;
    }
  }
}

// Drums: every active cell is its own hit.
function drumSegmentEvents(seg, drumNotes, audible, swingTicks, offset, events) {
  const { drumGrid, steps } = seg;
  const tickOf = (s) => offset + s * TICKS_PER_STEP + (s % 2 ? swingTicks : 0);
  for (let row = 0; row < drumGrid.length; row++) {
    if (!audible[row]) continue;
    for (let step = 0; step < steps; step++) {
      if (!drumGrid[row][step]) continue;
      const note = drumNotes[row];
      const velocity = VELOCITY[drumGrid[row][step]] ?? VELOCITY[1];
      events.push({ tick: tickOf(step), off: false, note, velocity, channel: 9 });
      events.push({ tick: tickOf(step + 1), off: true, note, velocity: 0, channel: 9 });
    }
  }
}

function sortEvents(events) {
  // Sort by time; note-offs before note-ons at the same tick so a note
  // repeated on consecutive steps retriggers instead of truncating itself.
  return events.sort(
    (a, b) => a.tick - b.tick || (a.off ? -1 : 1) - (b.off ? -1 : 1)
  );
}

// Delta-encode events into an MTrk chunk. `prefix` holds already-encoded
// tick-zero events (tempo, program change).
function trackChunk(events, totalTicks, prefix = []) {
  const track = [...prefix];
  let lastTick = 0;
  for (const ev of events) {
    track.push(...varLen(ev.tick - lastTick));
    lastTick = ev.tick;
    track.push((ev.off ? 0x80 : 0x90) | ev.channel, ev.note, ev.velocity);
  }
  track.push(...varLen(Math.max(totalTicks, lastTick) - lastTick), 0xff, 0x2f, 0x00);
  return [
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (track.length >> 24) & 0xff, (track.length >> 16) & 0xff,
    (track.length >> 8) & 0xff, track.length & 0xff,
    ...track,
  ];
}

// segments: [{ grid, tieGrid, drumGrid, steps }] played back to back.
export function songToMidi({
  segments,
  rowNotes,
  drumNotes,
  bpm,
  swing = 0.5, // ratio 0.5 (straight) … 0.75
  melodyAudible,
  drumAudible,
}) {
  const swingTicks = Math.round((swing - 0.5) * 2 * TICKS_PER_STEP);
  const melody = [];
  const drums = [];
  let offset = 0;
  for (const seg of segments) {
    melodySegmentEvents(seg, rowNotes, melodyAudible, swingTicks, offset, melody);
    drumSegmentEvents(seg, drumNotes, drumAudible, swingTicks, offset, drums);
    offset += seg.steps * TICKS_PER_STEP;
  }
  sortEvents(melody);
  sortEvents(drums);

  // Tempo meta event: microseconds per quarter note.
  const usPerQuarter = Math.round(60_000_000 / bpm);
  const melodyPrefix = [
    0x00, 0xff, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff,
    // Program change: music box (GM patch 11) suits the bell timbre.
    0x00, 0xc0, 10,
  ];

  const melodyTrack = trackChunk(melody, offset, melodyPrefix);
  const drumTrack = trackChunk(drums, offset);

  return new Uint8Array([
    // MThd: format 1, two tracks, PPQ division.
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, (PPQ >> 8) & 0xff, PPQ & 0xff,
    ...melodyTrack,
    ...drumTrack,
  ]);
}

export function downloadMidi(bytes, filename = "tone-matrix.mid") {
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
