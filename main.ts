// Wickfall entry program. Node 24 runs this file directly (type stripping), with no build step.
// It hands the game in: game/ and screenshots/ are copied beside /output (or MAKEFUN_OUTPUT_DIR
// outside the grader), then the dossier the judge reads is written with the vendored buildDossier.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play locally: node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Caps from the scorer's reference/gate.json. Only text_max_bytes changes the bytes written;
// the rest make the scorer refuse a bundle it would refuse anyway.
const SCORER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name: string): void {
  const source = join(repoDir, name);
  if (!existsSync(source)) return;
  cpSync(source, join(outputDir, name), { recursive: true });
}

function stageOutput(): void {
  if (!existsSync(join(repoDir, 'game', 'index.html'))) {
    throw new Error('game/index.html is missing: the entry must ship its game folder beside main.ts');
  }
  mkdirSync(outputDir, { recursive: true });
  copyTree('game');
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  copyTree('screenshots');
}

function writeDossier(): void {
  const dossier = buildDossier(outputDir, SCORER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

stageOutput();
writeDossier();
console.log(`Wrote ${join(outputDir, 'dossier.json')}`);
