// Web MIDI output: play the sequencer through external hardware or soft
// synths. Notes are sent with DOMHighResTimeStamp timestamps derived from
// the AudioContext clock, so external gear gets the same lookahead-accurate
// timing as the built-in synth.

export class MidiOut {
  constructor() {
    this.supported = typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
    this.access = null;
    this.port = null;
    this.onchange = null; // called when devices are plugged/unplugged
  }

  async init() {
    if (!this.supported) return false;
    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.onstatechange = () => this.onchange?.();
      return true;
    } catch {
      this.supported = false;
      return false;
    }
  }

  outputs() {
    return this.access ? [...this.access.outputs.values()].map((o) => ({ id: o.id, name: o.name })) : [];
  }

  select(id) {
    this.allOff();
    this.port = id ? this.access?.outputs.get(id) ?? null : null;
  }

  get active() {
    return !!this.port;
  }

  // Convert an AudioContext time to a Web MIDI (performance.now-based)
  // timestamp.
  timestamp(when, ctx) {
    return performance.now() + Math.max(0, (when - ctx.currentTime) * 1000);
  }

  note(channel, note, velocity, when, durSec, ctx) {
    if (!this.port) return;
    const at = this.timestamp(when, ctx);
    this.port.send([0x90 | channel, note, velocity], at);
    this.port.send([0x80 | channel, note, 0], at + durSec * 1000);
  }

  allOff() {
    if (!this.port) return;
    for (const ch of [0, 9]) this.port.send([0xb0 | ch, 123, 0]); // All Notes Off
  }
}
