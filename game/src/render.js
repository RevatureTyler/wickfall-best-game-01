// Draws one frame of Wickfall onto a 2D canvas. It reads the game state and changes nothing.
import { W, H, MAX_WAVE, START_LIVES, DASH_COOLDOWN } from './sim.js';

const INK = '#f4efe1';
const AMBER = '#ffc857';
const EMBER_ORANGE = '#ff8a3d';
const VIOLET = '#b15cff';
const VIOLET_CORE = '#f0d9ff';
const MUTED = '#b3abd0';
const PANEL = 'rgba(9, 7, 24, 0.88)';
const FONT_TITLE = 'Georgia, "Times New Roman", serif';
const FONT_UI = 'system-ui, "Segoe UI", Arial, sans-serif';

const STARS = makeStars(110);

function makeStars(count) {
  let seed = 4242;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => ({
    x: next() * W,
    y: next() * H,
    r: 0.4 + next() * 1.3,
    phase: next() * Math.PI * 2,
  }));
}

export function render(ctx, g) {
  ctx.save();
  drawBackdrop(ctx, g.time);
  if (g.state !== 'title') {
    drawEmbers(ctx, g);
    drawWisps(ctx, g);
    drawLantern(ctx, g);
    drawHud(ctx, g);
  }
  if (g.state === 'title') drawTitle(ctx);
  if (g.state === 'between') drawBanner(ctx, g);
  if (g.state === 'won' || g.state === 'lost') drawEnd(ctx, g);
  ctx.restore();
}

function drawBackdrop(ctx, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1c1545');
  sky.addColorStop(1, '#070611');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (const s of STARS) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 1.3 + s.phase);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255, 200, 87, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6.5, 6.5, W - 13, H - 13);
}

function drawEmbers(ctx, g) {
  for (const e of g.embers) {
    const r = 9 * (0.85 + 0.15 * Math.sin(g.time * 4 + e.bob));
    const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3);
    glow.addColorStop(0, 'rgba(255, 200, 87, 0.55)');
    glow.addColorStop(1, 'rgba(255, 200, 87, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWisps(ctx, g) {
  for (const w of g.wisps) {
    const speed = Math.hypot(w.vx, w.vy) || 1;
    const tx = -w.vx / speed;
    const ty = -w.vy / speed;

    ctx.fillStyle = 'rgba(177, 92, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(w.x + ty * 9, w.y - tx * 9);
    ctx.lineTo(w.x + tx * 26, w.y + ty * 26);
    ctx.lineTo(w.x - ty * 9, w.y + tx * 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = VIOLET;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = VIOLET_CORE;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLantern(ctx, g) {
  const p = g.player;
  const ready = 1 - p.cooldown / DASH_COOLDOWN;

  if (ready < 1) {
    ctx.strokeStyle = 'rgba(255, 200, 87, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready);
    ctx.stroke();
  }
  if (p.dash > 0) {
    ctx.strokeStyle = 'rgba(255, 244, 208, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  const blink = g.invuln > 0 && Math.floor(g.time * 16) % 2 === 0;
  if (blink) return;

  const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 48);
  glow.addColorStop(0, 'rgba(255, 200, 87, 0.6)');
  glow.addColorStop(1, 'rgba(255, 200, 87, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff4d0';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = EMBER_ORANGE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + p.facing.x * 14, p.y + p.facing.y * 14);
  ctx.lineTo(p.x + p.facing.x * 24, p.y + p.facing.y * 24);
  ctx.stroke();
}

function drawHud(ctx, g) {
  ctx.fillStyle = 'rgba(9, 7, 24, 0.72)';
  ctx.fillRect(0, 0, W, 40);

  ctx.textBaseline = 'middle';
  ctx.font = `700 16px ${FONT_UI}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(`WAVE ${g.wave} / ${MAX_WAVE}`, 18, 21);

  for (let i = 0; i < START_LIVES; i++) {
    ctx.fillStyle = i < g.lives ? AMBER : 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(178 + i * 22, 21, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.fillText(`EMBERS LEFT  ${g.embers.length}`, W / 2, 21);

  ctx.textAlign = 'right';
  ctx.fillText(`SCORE  ${g.score}`, W - 18, 21);

  const ready = Math.min(1, 1 - g.player.cooldown / DASH_COOLDOWN);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(18, H - 26, 160, 10);
  ctx.fillStyle = ready >= 1 ? AMBER : EMBER_ORANGE;
  ctx.fillRect(18, H - 26, 160 * ready, 10);
  ctx.textAlign = 'left';
  ctx.font = `600 12px ${FONT_UI}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('DASH  Space or click', 18, H - 38);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = 'rgba(255, 200, 87, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.stroke();
}

function centerText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, y);
}

function drawTitle(ctx) {
  panel(ctx, 130, 110, 700, 380);
  centerText(ctx, 'WICKFALL', 165, `700 66px ${FONT_TITLE}`, AMBER);
  centerText(ctx, 'Gather every ember before the shadow tide reaches the shore.', 225, `400 19px ${FONT_UI}`, INK);
  centerText(ctx, 'Move: WASD or arrow keys', 275, `400 16px ${FONT_UI}`, MUTED);
  centerText(ctx, 'Dash: Space, or click toward the cursor. Dashing makes you untouchable.', 300, `400 16px ${FONT_UI}`, MUTED);
  centerText(ctx, `Clear a wave by collecting all its embers. Clear ${MAX_WAVE} waves to win. You have ${START_LIVES} lives.`, 330, `400 16px ${FONT_UI}`, MUTED);
  centerText(ctx, 'Press Enter or click to light the lantern', 410, `700 20px ${FONT_UI}`, AMBER);
}

function drawBanner(ctx, g) {
  panel(ctx, 280, 220, 400, 150);
  centerText(ctx, `WAVE ${g.wave} CLEARED`, 265, `700 30px ${FONT_TITLE}`, AMBER);
  centerText(ctx, `Wave ${g.wave + 1} rises in ${Math.max(0, g.timer).toFixed(1)}s`, 320, `400 18px ${FONT_UI}`, INK);
}

function drawEnd(ctx, g) {
  const won = g.state === 'won';
  panel(ctx, 210, 150, 540, 300);
  centerText(ctx, won ? 'THE SHORE IS LIT' : 'THE TIDE TAKES THE SHORE', 200, `700 40px ${FONT_TITLE}`, won ? AMBER : VIOLET_CORE);
  centerText(ctx, won ? `All ${MAX_WAVE} waves cleared.` : `Lost on wave ${g.wave} of ${MAX_WAVE}.`, 254, `400 18px ${FONT_UI}`, INK);
  centerText(ctx, `Final score  ${g.score}`, 300, `700 28px ${FONT_UI}`, INK);
  centerText(ctx, won ? 'Press Enter or click to play again' : 'Press Enter or click to try again', 370, `700 18px ${FONT_UI}`, AMBER);
}
