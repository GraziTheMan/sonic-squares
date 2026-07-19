#!/usr/bin/env node
// Convert a RollingTones .tmx save into a Tone Matrix .tonematrix.json
// project from the command line. The same parser powers the in-app Import
// button, which accepts .tmx directly — this script is for batch use.
//
// Usage: node tools/tmx-import.mjs song.tmx > song.tonematrix.json

import { readFileSync } from "node:fs";
import { tmxToProject } from "../src/tmx.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: node tools/tmx-import.mjs <file.tmx>");
  process.exit(1);
}
const project = tmxToProject(new Uint8Array(readFileSync(path)));
console.error(
  `pages -> patterns, chain ${project.songChain.length} entries, bpm ${project.bpm}`
);
console.log(JSON.stringify(project, null, 2));
