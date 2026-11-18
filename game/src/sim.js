// Wickfall rules. Pure logic: no DOM and no clock. The caller passes the time step and the
// player's input each tick, and gets back the next game state.
import { createRng } from './rng.js';

export const W = 960;
export const H = 600;
export const MAX_WAVE = 5;
export const START_LIVES = 3;
export const DASH_COOLDOWN = 1.1;

const PLAYER_R = 14;
const EMBER_R = 9;
const WISP_R = 14;
const MOVE_SPEED = 250;
const DASH_SPEED = 760;
const DASH_TIME = 0.18;
const HIT_INVULN = 1.4;
const WAVE_PAUSE = 2.4;
const EMBER_POINTS = 10;
const WAVE_BONUS = 50;
const EMBER_SAFE_DISTANCE = 150;
const WISP_SAFE_DISTANCE = 260;

export function createGame(seed = 1) {
  return {
    seed,
    rng: createRng(seed),
    state: 'title', // title | play | between | won | lost
    wave: 0,
    score: 0,
    lives: START_LIVES,
    timer: 0,
    invuln: 0,
    time: 0,
    player: { x: W / 2, y: H / 2, facing: { x: 0, y: -1 }, dash: 0, cooldown: 0, dir: null },
    embers: [],
    wisps: [],
  };
}

export function step(game, input, dt) {
  switch (game.state) {
    case 'title':
      return input.start ? startRun(game) : game;
    case 'play':
      return tickPlay(game, input, dt);
    case 'between':
      return tickBetween(game, input, dt);
    case 'won':
    case 'lost':
      return input.start ? startRun(createGame(game.seed + 1)) : game;
    default:
      return game;
  }
}

function startRun(game) {
  return spawnWave({ ...game, score: 0, lives: START_LIVES, invuln: 0 }, 1);
}

function spawnWave(game, wave) {
  const embers = Array.from({ length: 4 + 2 * wave }, () => ({
    ...randomPoint(game.rng, game.player, EMBER_SAFE_DISTANCE),
    bob: game.rng() * Math.PI * 2,
  }));
  const wisps = Array.from({ length: wave + 1 }, () => ({
    ...edgePoint(game.rng, game.player),
    vx: 0,
    vy: 0,
    phase: game.rng() * Math.PI * 2,
  }));
  return { ...game, wave, state: 'play', timer: 0, embers, wisps };
}

function randomPoint(rng, avoid, minDistance) {
  let point = { x: 40, y: 60 };
  for (let i = 0; i < 60; i++) {
    point = { x: 40 + rng() * (W - 80), y: 60 + rng() * (H - 120) };
    if (dist(point, avoid) >= minDistance) return point;
  }
  return point;
}

function edgePoint(rng, avoid) {
  let point = { x: -WISP_R, y: H / 2 };
  for (let i = 0; i < 60; i++) {
    const side = Math.floor(rng() * 4);
    const along = rng();
    if (side === 0) point = { x: along * W, y: -WISP_R };
    else if (side === 1) point = { x: along * W, y: H + WISP_R };
    else if (side === 2) point = { x: -WISP_R, y: along * H };
    else point = { x: W + WISP_R, y: along * H };
    if (dist(point, avoid) >= WISP_SAFE_DISTANCE) return point;
  }
  return point;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function movePlayer(p, input, dt) {
  const mx = input.dx ?? 0;
  const my = input.dy ?? 0;
  const mlen = Math.hypot(mx, my);
  const facing = mlen > 0 ? { x: mx / mlen, y: my / mlen } : p.facing;

  let cooldown = Math.max(0, p.cooldown - dt);
  let dash = Math.max(0, p.dash - dt);
  let dir = p.dir;

  if (input.dash && cooldown === 0 && dash === 0) {
    dir = input.aim ?? facing;
    dash = DASH_TIME;
    cooldown = DASH_COOLDOWN;
  }

  let vx;
  let vy;
  if (dash > 0) {
    vx = dir.x * DASH_SPEED;
    vy = dir.y * DASH_SPEED;
  } else {
    const k = mlen > 0 ? MOVE_SPEED / mlen : 0;
    vx = mx * k;
    vy = my * k;
  }

  return {
    ...p,
    x: Math.min(W - PLAYER_R, Math.max(PLAYER_R, p.x + vx * dt)),
    y: Math.min(H - PLAYER_R, Math.max(PLAYER_R, p.y + vy * dt)),
    facing,
    cooldown,
    dash,
    dir,
  };
}

function tickPlay(game, input, dt) {
  const player = movePlayer(game.player, input, dt);
  const time = game.time + dt;
  const invuln = Math.max(0, game.invuln - dt);

  const collected = game.embers.filter((e) => dist(e, player) < PLAYER_R + EMBER_R).length;
  const embers = game.embers.filter((e) => dist(e, player) >= PLAYER_R + EMBER_R);
  const score = game.score + collected * EMBER_POINTS;

  const speed = 50 + 12 * game.wave;
  const wisps = game.wisps.map((w) => advanceWisp(w, player, speed, time, dt));

  const hit = invuln <= 0 && !(player.dash > 0) && wisps.some((w) => dist(w, player) < PLAYER_R + WISP_R);
  const lives = hit ? game.lives - 1 : game.lives;
  const base = {
    ...game,
    player,
    embers,
    wisps,
    score,
    lives,
    invuln: hit ? HIT_INVULN : invuln,
    time,
  };

  if (lives <= 0) return { ...base, state: 'lost' };
  if (embers.length === 0) {
    const bonus = score + WAVE_BONUS * game.wave;
    if (game.wave >= MAX_WAVE) return { ...base, score: bonus, state: 'won' };
    return { ...base, score: bonus, state: 'between', timer: WAVE_PAUSE };
  }
  return base;
}

function advanceWisp(w, player, speed, time, dt) {
  const dx = player.x - w.x;
  const dy = player.y - w.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const weave = Math.sin(time * 2.2 + w.phase) * 0.6;
  const targetX = (ux - uy * weave) * speed;
  const targetY = (uy + ux * weave) * speed;
  const k = Math.min(1, dt * 2.5);
  const vx = w.vx + (targetX - w.vx) * k;
  const vy = w.vy + (targetY - w.vy) * k;
  return { ...w, x: w.x + vx * dt, y: w.y + vy * dt, vx, vy };
}

function tickBetween(game, input, dt) {
  const player = movePlayer(game.player, input, dt);
  const timer = game.timer - dt;
  const base = { ...game, player, timer, time: game.time + dt };
  if (timer > 0) return base;
  return spawnWave(base, game.wave + 1);
}
