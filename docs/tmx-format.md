# RollingTones `.tmx` save format (reverse-engineered)

Derived from real RollingTones (`cz.hotarekv.rtones`) save files plus
single-cell calibration exports. Two container versions share the `TM3\0`
magic.

## Header

| Offset | Size | Meaning |
| ------ | ---- | ------- |
| 0      | 4    | Magic `54 4d 33 00` — `"TM3\0"` |
| 4      | 2    | Speed word (u16 LE). Newer files store BPM in the low 10 bits (`speed & 0x3ff`; a flag bit sits above): `1144 → 120`, `1174 → 150`. Older files stored quarter-BPM (`600 → 150`). |

Three container layouts have been observed; `readPages` in `src/tmx.js`
detects them by how the byte count divides (checking 257-byte pages before
256-byte, since only the former leaves a whole-number multiple for
multi-page files):

**Newer, multi-page** — 21-byte header + `N` × 257-byte pages (a leading
page-index byte + 256 cells). Page count sits at byte 8 (u16). Example: the
two-page test is 535 = 21 + 2 × 257.

**Newer, single-page** — 21-byte header + one 256-byte page (no index byte).
Example: the calibration files are 277 = 21 + 256.

**Older (~2022)** — 61-byte header + `N` × 257-byte pages. Here byte 8 (u16)
is instead the song-chain length, with a fixed 50-slot chain of page indices
at byte 10. Example: a 2888-byte file = 61 + 11 × 257.

Header byte 12 (newer format) is the melodic voice's **waveform** index:
0 Bipolar Sinus, 1 Bipolar Triangle, 2 Bipolar Sawtooth, 3 Bipolar Square,
4-7 the normalised variants. The importer maps the shape (index mod 4) to the
matching Sonic Squares instrument for the melody track.

Not yet decoded: the scale/key (RollingTones offers e.g. E Harmonic Minor);
imports keep the note row positions but default to the app's own scale.

## Cells (256 bytes, 16×16)

A cell's byte index is **`col*16 + row`**, where `col` is the time step
(left→right) and `row` is the pitch lane with **row 0 at the top**. Confirmed
by calibration: a note at screen bottom-left decodes to `col 0, row 15`;
top-right to `col 15, row 0`.

Cell values (RollingTones integrates drums as grid instruments, so they share
the value space with melodic voices):

| Value | Instrument |
| ----- | ---------- |
| 0xff  | empty |
| 0     | melodic voice (waveform-selectable "Sine") |
| 1     | kick |
| 2     | snare |
| 3     | closed hi-hat |
| 4     | open hi-hat |
| 5,6,7 | three more percussion sounds (yellow/orange/periwinkle palette) |

Confirmed by a calibration file placing values 1–7 across the bottom row:
**every value 1–7 is percussion**; only value 0 is melodic. Sonic Squares has
four drum lanes, so values 5–7 fold onto the nearest lane (provisional until
those three sounds are individually identified).

## Import

`src/tmx.js` (`tmxToProject`) detects the container version, maps value 0 and
5+ to melody tracks and values 1–4 into the Sonic Squares drum grid, and
derives the song chain (v1) or page order (v2). The Import button and
`tools/tmx-import.mjs` both use it.
