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

**Unconfirmed:** whether the 256 cells are row-major with rows = pitch and
columns = time (or transposed), which end is the low note, and whether any
rows are percussion. Calibration plan: save files with (1) a single cell in
a known corner, (2) the same plus one more known cell, (3) a change of
tempo/instrument only — then diff.

## Importer

`tools/tmx-import.mjs` converts a `.tmx` into a `.tonematrix.json` project
(instruments 0–2 → tracks 1–3, instrument 3 folded into track 3; first 8 of
the pages, chain filtered accordingly; assumed orientation as above).
