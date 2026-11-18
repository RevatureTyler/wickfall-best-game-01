import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, W, H, MAX_WAVE, START_LIVES } from '../game/src/sim.js';
import { createRng } from '../game/src/rng.js';

const DT = 1 / 60;
const NONE = { dx: 0, dy: 0, dash: false, start: false, aim: null };
const START = { ...NONE, start: true };

function playing(seed = 1) {
  return step(createGame(seed), START, DT);
}

test('rng is deterministic and stays in [0, 1)', () => {
  const a = createRng(9);
  const b = createRng(9);
  for (let i = 0; i < 5; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('start key begins wave 1 with embers and wisps', () => {
  const g = playing();
  assert.equal(g.state, 'play');
  assert.equal(g.wave, 1);
  assert.equal(g.embers.length, 6);
  assert.equal(g.wisps.length, 2);
  assert.equal(g.lives, START_LIVES);
});

test('touching an ember scores it and removes it', () => {
  const g = playing();
  const withEmbers = {
    ...g,
    embers: [
      { x: g.player.x, y: g.player.y, bob: 0 },
      { x: 40, y: 60, bob: 0 },
    ],
  };
  const next = step(withEmbers, NONE, DT);
  assert.equal(next.embers.length, 1);
  assert.equal(next.score, g.score + 10);
});

test('a wisp touching the lantern costs a life and grants invulnerability', () => {
  const g = playing();
  const hit = {
    ...g,
    invuln: 0,
    wisps: [{ x: g.player.x, y: g.player.y, vx: 0, vy: 0, phase: 0 }],
  };
  const next = step(hit, NONE, DT);
  assert.equal(next.lives, START_LIVES - 1);
  assert.ok(next.invuln > 0);
});

test('losing the last life ends the run', () => {
  const g = playing();
  const last = {
    ...g,
    lives: 1,
    invuln: 0,
    wisps: [{ x: g.player.x, y: g.player.y, vx: 0, vy: 0, phase: 0 }],
  };
  assert.equal(step(last, NONE, DT).state, 'lost');
});

test('dash starts on cooldown and makes the lantern immune', () => {
  const g = playing();
  const dashed = step(g, { ...NONE, dash: true }, DT);
  assert.ok(dashed.player.dash > 0);
  assert.ok(dashed.player.cooldown > 0);

  const immune = step(
    {
      ...dashed,
      invuln: 0,
      wisps: [{ x: dashed.player.x, y: dashed.player.y, vx: 0, vy: 0, phase: 0 }],
    },
    NONE,
    DT,
  );
  assert.equal(immune.lives, START_LIVES);
});

test('clearing a wave pauses, then starts the next one', () => {
  const g = playing();
  const cleared = step({ ...g, embers: [] }, NONE, DT);
  assert.equal(cleared.state, 'between');
  assert.equal(cleared.score, g.score + 50);

  const next = step({ ...cleared, timer: 0.01 }, NONE, DT);
  assert.equal(next.state, 'play');
  assert.equal(next.wave, 2);
});

test('clearing the final wave wins the run', () => {
  const g = playing();
  const won = step({ ...g, wave: MAX_WAVE, embers: [] }, NONE, DT);
  assert.equal(won.state, 'won');
});

test('start key after a loss begins a fresh run', () => {
  const g = playing();
  const lost = { ...g, state: 'lost', score: 120, lives: 0 };
  const again = step(lost, START, DT);
  assert.equal(again.state, 'play');
  assert.equal(again.wave, 1);
  assert.equal(again.score, 0);
  assert.equal(again.lives, START_LIVES);
});

test('the player stays inside the arena', () => {
  let g = playing();
  for (let i = 0; i < 600; i++) {
    g = step(g, { ...NONE, dx: -1, dy: -1 }, DT);
  }
  assert.ok(g.player.x >= 0 && g.player.x <= W);
  assert.ok(g.player.y >= 0 && g.player.y <= H);
});
