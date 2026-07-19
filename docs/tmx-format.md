# RollingTones `.tmx` save format (reverse-engineered)

Derived from real RollingTones (`cz.hotarekv.rtones`) save files plus
single-cell calibration exports. Two container versions share the `TM3\0`
magic.

## Header

| Offset | Size | Meaning |
| ------ | ---- | ------- |
| 0      | 4    | Magic `54 4d 33 00` — `"TM3\0"` |
| 4      | 2    | Speed word (u16 LE). Newer files store BPM in the low 10 bits (`speed & 0x3ff`; a flag bit sits above): `1144 → 120`, `1174 → 150`. Older files stored quarter-BPM (`600 → 150`). |

## v2 container (RollingTones ~1.4)

21-byte header, then `N` × 256-byte pages. Page count = `(size − 21) / 256`.
No per-page index byte, no explicit song chain (pages play in order). Example
calibration files are 277 bytes = 21 + 256 (one page).

## v1 container (older, ~2022)

61-byte header, then `N` × 257-byte pages (a leading page-index byte + 256
cells). Page count = `(size − 61) / 257`. The header carries a song chain: a
u16 length at byte 8 and a fixed 50-slot array of page indices at byte 10; a
u8 page count sits at byte 60. Example: a 2888-byte file = 61 + 257 × 11.

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
| 0     | sine / melodic voice |
| 1     | kick |
| 2     | snare |
| 3     | closed hi-hat |
| 4     | open hi-hat |
| 5+    | additional melodic voices (yellow/orange palette — provisional) |

## Import

`src/tmx.js` (`tmxToProject`) detects the container version, maps value 0 and
5+ to melody tracks and values 1–4 into the Sonic Squares drum grid, and
derives the song chain (v1) or page order (v2). The Import button and
`tools/tmx-import.mjs` both use it.
