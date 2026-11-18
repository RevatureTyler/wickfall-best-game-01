// Wickfall entry point: input, the fixed-step loop, sound cues, and the screenshot modes the
// entry's shots.json uses (?shot=start|play|end&seed=N draws one fixed frame, no loop).
import { createGame, step, W, H } from './sim.js';
import { render } from './render.js';
import { unlockAudio, sfx } from './audio.js';

const DT = 1 / 60;
const NONE = { dx: 0, dy: 0, dash: false, start: false, aim: null };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed')) || 1;

const MOVE_KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};
const held = new Set();
const pending = { start: false, dash: false, aim: null };
let game = createGame(seed);

window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (MOVE_KEYS[e.code]) {
    held.add(MOVE_KEYS[e.code]);
    e.preventDefault();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) {
      pending.dash = true;
      pending.start = true;
    }
  }
  if (e.code === 'Enter' && !e.repeat) pending.start = true;
});

window.addEventListener('keyup', (e) => {
  if (MOVE_KEYS[e.code]) held.delete(MOVE_KEYS[e.code]);
});

canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) * W) / rect.width;
  const y = ((e.clientY - rect.top) * H) / rect.height;
  const dx = x - game.player.x;
  const dy = y - game.player.y;
  const d = Math.hypot(dx, dy);
  pending.start = true;
  pending.dash = true;
  pending.aim = d > 1 ? { x: dx / d, y: dy / d } : null;
});

function currentInput() {
  const dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  const dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
  const input = { dx, dy, start: pending.start, dash: pending.dash, aim: pending.aim };
  pending.start = false;
  pending.dash = false;
  pending.aim = null;
  return input;
}

function announce(prev, next) {
  if (next.embers.length < prev.embers.length && next.state === 'play') sfx.collect();
  if (next.lives < prev.lives) sfx.hit();
  if (!(prev.player.dash > 0) && next.player.dash > 0) sfx.dash();
  if (prev.state !== next.state) {
    if (next.state === 'between') sfx.wave();
    if (next.state === 'won') sfx.win();
    if (next.state === 'lost') sfx.lose();
  }
}

function advance(dt) {
  const next = step(game, currentInput(), dt);
  announce(game, next);
  game = next;
}

function shotState(name) {
  let g = createGame(seed);
  if (name === 'start') return g;
  g = step(g, { ...NONE, start: true }, DT);
  if (name === 'play') {
    for (let i = 0; i < 60; i++) g = step(g, { ...NONE, dx: -1, dy: 0 }, DT);
    return g;
  }
  for (let i = 0; i < 60 * 180 && (g.state === 'play' || g.state === 'between'); i++) {
    g = step(g, NONE, DT);
  }
  return g;
}

if (shot) {
  render(ctx, shotState(shot));
} else {
  let last = performance.now();
  let accumulator = 0;
  const frame = (now) => {
    accumulator += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (accumulator >= DT) {
      advance(DT);
      accumulator -= DT;
    }
    render(ctx, game);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
