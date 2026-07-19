# RollingTones `.tmx` save format (reverse-engineered)

Findings from a real save file (`1.9.2022.a.tmx`, 2888 bytes, RollingTones
`cz.hotarekv.rtones`). Everything below was derived from one dense song
file; items marked **unconfirmed** need single-cell calibration files to
pin down.

## Layout

| Offset | Size | Meaning |
| ------ | ---- | ------- |
| 0      | 4    | Magic `54 4d 33 00` — `"TM3\0"` |
| 4      | 2    | u16 LE, `600` in sample. Tempo/speed — **unconfirmed**, plausibly steps per minute (600/4 = 150 BPM) |
| 6      | 2    | `0f 02` in sample — **unknown** (scale? instrument? drum kit?) |
| 8      | 2    | u16 LE, song chain length (`42` in sample) |
| 10     | 50   | Song chain: fixed 50-slot array of page indices (u8). Entries beyond the length are stale garbage from earlier edits |
| 60     | 1    | u8 page count (`11` in sample) |
| 61     | 257×N | Pages |

Total size = 61 + 257 × pageCount (matches exactly: 61 + 257×11 = 2888).

## Page (257 bytes)

| Offset | Size | Meaning |
| ------ | ---- | ------- |
| 0      | 1    | Page index (0-based, matches position) |
| 1      | 256  | 16×16 cell grid, one byte per cell |

Cell values: `0xff` = empty; `0x00`–`0x03` = note using one of four
instruments/colors (only 0–3 observed in the sample).

Orientation (per observed drum-lane behaviour, still to be confirmed by
calibration): the 256 cells are stored one **time step per 16-byte row**,
with pitch/instrument **lanes across** — i.e. `cells[step*16 + lane]`.
Drum-style lanes cluster at high lane indices (bottom of the screen), which
matches RollingTones integrating drums as instruments inside the grid.

**Still unconfirmed:** which lane index is the top row, exact top/bottom
pitch direction, which instrument values are percussion, and the meaning of
header bytes 6-7. Calibration plan: save files with (1) a single cell in a
known corner, (2) the same plus one more known cell, (3) a change of
tempo/instrument only — then diff.

## Importer

`tools/tmx-import.mjs` converts a `.tmx` into a `.tonematrix.json` project
(instruments 0–2 → tracks 1–3, instrument 3 folded into track 3; first 8 of
the pages, chain filtered accordingly; assumed orientation as above).
