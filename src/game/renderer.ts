import { GameState, Ball, Player, PowerUp, AmbientParticle } from './types';
import {
  LOGICAL_WIDTH, LOGICAL_HEIGHT,
  FLOOR_Y, CEILING_Y,
  PLAYER_WIDTH, PLAYER_HEIGHT,
  HOOK_WIDTH, MAX_LIVES, BALL_RADII,
  POWERUP_COLORS,
} from './constants';
import { LevelTheme, getTheme } from './themes';
import { ONBOARD_STEPS } from './initialState';

// ─── Colour helpers ───────────────────────────────────────────────────────────
const _rgbCache: Record<string, string> = {};
function rgb(hex: string): string {
  if (_rgbCache[hex]) return _rgbCache[hex];
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return _rgbCache[hex] = `${r},${g},${b}`;
}

// ─── Background image cache ───────────────────────────────────────────────────
const _bgImages: Record<string, HTMLImageElement | null> = {};
function getBgImage(src: string): HTMLImageElement | null {
  if (src in _bgImages) return _bgImages[src];
  _bgImages[src] = null;
  const img = new Image();
  img.src = src;
  img.onload = () => { _bgImages[src] = img; };
  return null;
}

// clamp helper
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, state: GameState, theme: LevelTheme, time: number) {
  // 1. Base dark fill
  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // 2. Theme background image
  if (theme.bgImage) {
    const img = getBgImage(theme.bgImage);
    if (img) {
      // Subtle parallax pan
      const panX = Math.sin(time * 0.04) * 20;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.drawImage(img, panX - 20, -10, LOGICAL_WIDTH + 40, LOGICAL_HEIGHT + 20);
      ctx.restore();
    }
  }

  // 3. Theme tint overlay
  ctx.fillStyle = theme.bgTint;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // 4. Procedural nebula blobs
  for (let n = 0; n < theme.nebulaColors.length; n++) {
    const nx = LOGICAL_WIDTH  * (0.2 + n * 0.3) + Math.sin(time * 0.06 + n) * 28;
    const ny = LOGICAL_HEIGHT * (0.25 + n * 0.22) + Math.cos(time * 0.045 + n) * 20;
    const nr = 130 + n * 55;
    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    ng.addColorStop(0, `rgba(${theme.nebulaColors[n]},0.22)`);
    ng.addColorStop(1, `rgba(${theme.nebulaColors[n]},0)`);
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = ng; ctx.fill();
  }

  // 5. Parallax stars
  for (let i = 0; i < 70; i++) {
    const sx = ((Math.sin(i * 127.1) * 0.5 + 0.5) * LOGICAL_WIDTH * 2 - (state.bgScrollX * (0.3 + (i%3)*0.2)) % LOGICAL_WIDTH + LOGICAL_WIDTH) % LOGICAL_WIDTH;
    const sy = (Math.sin(i * 311.7) * 0.5 + 0.5) * LOGICAL_HEIGHT;
    const flicker = 0.5 + 0.5 * Math.sin(time * (1.5 + (i%4)) + i);
    const sz = 1.0 + (i % 3) * 0.5;
    ctx.globalAlpha = (0.3 + 0.4 * flicker) * (i < 30 ? 0.5 : i < 55 ? 0.75 : 1.0);
    ctx.beginPath(); ctx.arc(sx, sy, sz * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 6. Grid with theme color
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = theme.gridColor.replace('rgba','').replace(/[\(\)]/g,'');
  ctx.strokeStyle = theme.accentA;
  ctx.globalAlpha = 0.055;
  ctx.lineWidth = 1;
  const gox = (state.bgScrollX * 0.7) % 40;
  const goy = (state.bgScrollY * 0.4) % 40;
  for (let gx = -gox; gx < LOGICAL_WIDTH + 40; gx += 40) {
    ctx.beginPath(); ctx.moveTo(gx, CEILING_Y); ctx.lineTo(gx, FLOOR_Y); ctx.stroke();
  }
  for (let gy = CEILING_Y - goy; gy < FLOOR_Y + 40; gy += 40) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(LOGICAL_WIDTH, gy); ctx.stroke();
  }
  ctx.restore();

  // 7. Glitch effect (cyber theme)
  if (state.glitchTimer > 0) {
    const gh = 4 + Math.random() * 20;
    const gy2 = Math.random() * LOGICAL_HEIGHT;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.drawImage(ctx.canvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, Math.random() * 8 - 4, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = `rgba(0,255,80,0.15)`;
    ctx.fillRect(0, gy2, LOGICAL_WIDTH, gh);
    ctx.restore();
  }

  // 8. Theme transition wipe
  if (state.themeTransition > 0) {
    ctx.save();
    ctx.globalAlpha = state.themeTransition * 0.9;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
  }

  // 9. Scanlines
  if (theme.scanlineAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = theme.scanlineAlpha;
    ctx.fillStyle = '#000';
    for (let sy2 = 0; sy2 < LOGICAL_HEIGHT; sy2 += 3) ctx.fillRect(0, sy2, LOGICAL_WIDTH, 1);
    ctx.restore();
  }

  // 10. Level flash
  if (state.levelFlash > 0) {
    ctx.save();
    ctx.globalAlpha = state.levelFlash * 0.4;
    ctx.fillStyle = theme.accentA;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
  }
}

// ─── Arena (floor / ceiling) ──────────────────────────────────────────────────
function drawArena(ctx: CanvasRenderingContext2D, theme: LevelTheme, time: number) {
  const ca = rgb(theme.ceilColor);
  const fa = rgb(theme.floorColor);

  // Ceiling
  const cg = ctx.createLinearGradient(0, CEILING_Y - 16, 0, CEILING_Y + 8);
  cg.addColorStop(0, `rgba(${ca},0)`);
  cg.addColorStop(1, `rgba(${ca},0.75)`);
  ctx.fillStyle = cg; ctx.fillRect(0, CEILING_Y - 16, LOGICAL_WIDTH, 24);
  ctx.fillStyle = `rgba(${ca},${0.75 + 0.15 * Math.sin(time * 2.8)})`;
  ctx.fillRect(0, CEILING_Y, LOGICAL_WIDTH, 2);

  // Floor tiles
  const tW = 40;
  for (let t = 0; t < LOGICAL_WIDTH / tW + 1; t++) {
    const phase = Math.sin(time * 1.8 + t * 0.6);
    const bright = 0.38 + 0.18 * phase;
    const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 32);
    fg.addColorStop(0, `rgba(${fa},${bright})`);
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(t * tW, FLOOR_Y, tW - 1, 32);
  }
  ctx.fillStyle = `rgba(${fa},${0.65 + 0.15 * Math.sin(time * 2.2)})`;
  ctx.fillRect(0, FLOOR_Y, LOGICAL_WIDTH, 2);

  // Vignette
  const vig = ctx.createRadialGradient(LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2, 140, LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2, LOGICAL_WIDTH * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(${theme.vignetteColor},0.55)`);
  ctx.fillStyle = vig; ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

// ─── Ambient FX particles ──────────────────────────────────────────────────────
function drawAmbient(ctx: CanvasRenderingContext2D, particles: AmbientParticle[]) {
  for (const p of particles) {
    const alpha = Math.min(1, p.life / (p.maxLife * 0.3)) * Math.min(1, p.life / p.maxLife * 2);
    if (alpha < 0.02) continue;
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    const c = rgb(p.color);
    if (p.type === 'bubbles') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${c},0.8)`; ctx.lineWidth = 1; ctx.stroke();
    } else if (p.type === 'snow') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    } else if (p.type === 'rain') {
      ctx.strokeStyle = `rgba(${c},0.6)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + 10); ctx.stroke();
    } else if (p.type === 'embers' || p.type === 'sparks') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6; ctx.fill();
    } else if (p.type === 'motes') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c},0.5)`; ctx.fill();
    } else if (p.type === 'glitch') {
      ctx.fillStyle = `rgba(0,255,80,${alpha * 0.6})`;
      ctx.fillRect(p.x, p.y, 20 + Math.random() * 60, p.r);
    }
    ctx.restore();
  }
}

// ─── Ball ─────────────────────────────────────────────────────────────────────
function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, _theme: LevelTheme) {
  const { x, y, radius: r, color, flash, rotation, trail, pulsePhase, wobble, isBoss, frozen } = ball;
  const c = rgb(color);

  // Trail
  for (let i = 0; i < trail.length; i++) {
    const tp = trail[i];
    const tFrac = (i + 1) / trail.length;
    const a = tFrac * 0.38 * Math.max(0, 1 - tp.age / 0.3);
    if (a < 0.02) continue;
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(tp.x, tp.y, r * tFrac * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }

  const pulse = 1 + 0.12 * Math.sin(pulsePhase);
  const auraR = r * 2.5 * pulse;
  const aura  = ctx.createRadialGradient(x, y, r * 0.15, x, y, auraR);
  aura.addColorStop(0, `rgba(${c},${0.28 + flash * 0.35})`);
  aura.addColorStop(0.5, `rgba(${c},${0.09 + flash * 0.12})`);
  aura.addColorStop(1, `rgba(${c},0)`);
  ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2);
  ctx.fillStyle = aura; ctx.fill();

  const sX = 1 + wobble * 0.20;
  const sY = 1 - wobble * 0.14;
  ctx.save(); ctx.translate(x, y); ctx.scale(sX, sY);

  // Body
  const body = ctx.createRadialGradient(-r * 0.30, -r * 0.28, r * 0.04, 0, 0, r);
  body.addColorStop(0, 'rgba(255,255,255,0.90)');
  body.addColorStop(0.22, color);
  body.addColorStop(0.75, `rgba(${c},0.82)`);
  body.addColorStop(1, `rgba(${c},0.6)`);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = body; ctx.fill();

  // Frozen overlay
  if (frozen > 0) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180,230,255,0.55)'; ctx.fill();
  }

  // Inner ring (boss has double)
  ctx.save(); ctx.rotate(rotation);
  ctx.strokeStyle = `rgba(255,255,255,${0.20 + flash * 0.25})`;
  ctx.lineWidth = isBoss ? 2.5 : 1.5;
  ctx.setLineDash([r * 0.4, r * 0.28]);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2); ctx.stroke();
  if (isBoss) {
    ctx.rotate(Math.PI / 8);
    ctx.strokeStyle = `rgba(${rgb(ball.colorAlt)},0.35)`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.44, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();

  // Rim
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = flash > 0.1 ? '#ffffff' : `rgba(${c},0.9)`;
  ctx.lineWidth   = 1.8 + flash * 3 + (isBoss ? 2 : 0);
  ctx.shadowColor = isBoss ? ball.colorAlt : color;
  ctx.shadowBlur  = 20 + flash * 22 + (isBoss ? 15 : 0);
  ctx.stroke(); ctx.shadowBlur = 0;

  // Speculars
  ctx.beginPath(); ctx.arc(-r*0.30, -r*0.27, r*0.22, 0, Math.PI*2);
  ctx.fillStyle = `rgba(255,255,255,${0.52 + flash*0.22})`; ctx.fill();
  ctx.beginPath(); ctx.arc(r*0.22, r*0.24, r*0.08, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();

  // Boss crown
  if (isBoss) {
    ctx.font = `bold ${(r * 0.46)|0}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,255,255,0.35)`; ctx.fillText('★', 0, 2);
  }

  ctx.restore();
}

// ─── Player ───────────────────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, theme: LevelTheme, time: number) {
  const { x, y, invincible, thrustTime, velX, shield, freeze, multishot } = player;
  if (invincible > 0 && Math.floor(time * 10) % 2 === 0) return;

  const [colTop, colMid, colBot, colGlow] = theme.playerColor;
  const w = PLAYER_WIDTH, h = PLAYER_HEIGHT;
  const bw = w / 2, tw = w * 0.32, hh = h / 2;
  const lean = clamp(velX / 320, -1, 1) * 0.20;

  ctx.save(); ctx.translate(x, y);
  ctx.transform(1, 0, lean, 1, 0, 0);

  // Multishot side flames
  if (multishot > 0) {
    for (const ox of [-22, 22]) {
      const mFH = 5 + 4 * Math.sin(thrustTime * 20 + ox);
      const mG = ctx.createLinearGradient(ox, hh, ox, hh + mFH + 4);
      mG.addColorStop(0, `rgba(${rgb(theme.accentB)},0.8)`);
      mG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.ellipse(ox, hh + mFH/2, 6, mFH/2 + 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = mG; ctx.fill();
    }
  }

  // Main engine flame
  const flameH = 9 + 7 * Math.sin(thrustTime * 18);
  const flameW = bw * 0.58;
  const fg = ctx.createLinearGradient(0, hh, 0, hh + flameH + 7);
  fg.addColorStop(0, `rgba(${rgb(colGlow)},0.95)`);
  fg.addColorStop(0.45, `rgba(${rgb(colGlow)},0.65)`);
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(-flameW, hh); ctx.quadraticCurveTo(0, hh + flameH + 7, flameW, hh);
  ctx.fillStyle = fg; ctx.fill();

  // Hull body
  ctx.beginPath();
  ctx.moveTo(-tw, -hh); ctx.lineTo(tw, -hh); ctx.lineTo(bw, hh); ctx.lineTo(-bw, hh);
  ctx.closePath();
  const hull = ctx.createLinearGradient(0, -hh, 0, hh);
  hull.addColorStop(0, colTop); hull.addColorStop(0.35, colMid); hull.addColorStop(1, colBot);
  ctx.fillStyle = hull; ctx.fill();
  ctx.strokeStyle = colTop; ctx.lineWidth = 1.8;
  ctx.shadowColor = colGlow; ctx.shadowBlur = 22; ctx.stroke(); ctx.shadowBlur = 0;

  // Wing lines
  ctx.strokeStyle = `rgba(${rgb(colTop)},0.45)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-tw*0.6, -hh*0.2); ctx.lineTo(-bw*0.88, hh*0.72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tw*0.6, -hh*0.2);  ctx.lineTo(bw*0.88, hh*0.72);  ctx.stroke();

  // Cockpit
  const dg = ctx.createRadialGradient(-tw*0.12, -hh*0.35, 1, 0, -hh*0.12, tw*0.52);
  dg.addColorStop(0, 'rgba(200,240,255,0.92)'); dg.addColorStop(0.5, `rgba(${rgb(theme.accentA)},0.55)`); dg.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.beginPath(); ctx.ellipse(0, -hh*0.14, tw*0.50, hh*0.40, 0, 0, Math.PI * 2);
  ctx.fillStyle = dg; ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,0.40)`; ctx.lineWidth = 1; ctx.stroke();

  // Shield visual
  if (shield > 0) {
    const _sp = Math.min(1, shield / 8); void _sp;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(bw, hh) * 1.55, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,229,255,${0.35 + 0.25 * Math.sin(thrustTime * 6)})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
    ctx.setLineDash([10, 6]); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
  }

  // Freeze visual
  if (freeze > 0) {
    ctx.beginPath(); ctx.arc(0, 0, Math.max(bw, hh) * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(170,221,255,${0.5 + 0.3 * Math.sin(thrustTime*8)})`;
    ctx.lineWidth = 2; ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.restore();

  // Ground shadow
  ctx.save(); ctx.globalAlpha = 0.22;
  const sg = ctx.createRadialGradient(x, FLOOR_Y, 0, x, FLOOR_Y, bw * 1.3);
  sg.addColorStop(0, `rgba(${rgb(colGlow)},0.5)`); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.ellipse(x, FLOOR_Y, bw * 1.3, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = sg; ctx.fill(); ctx.restore();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
function drawHook(ctx: CanvasRenderingContext2D, hook: { x: number; tipY: number; baseY: number; age: number; wide: boolean }, theme: LevelTheme) { // eslint-disable-line
  const { x, tipY, baseY, age, wide } = hook;
  const pulse = 0.82 + 0.18 * Math.sin(age * 28);
  const hc = rgb(theme.hookColor);
  const hg = rgb(theme.hookGlow);

  ctx.save();

  // Outer glow beam
  ctx.strokeStyle = `rgba(${hg},${0.3 * pulse})`;
  ctx.lineWidth = HOOK_WIDTH + (wide ? 10 : 7);
  ctx.lineCap = 'round';
  ctx.shadowColor = theme.hookGlow; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, tipY); ctx.stroke();

  // Core
  ctx.shadowBlur = 8; ctx.strokeStyle = theme.hookColor; ctx.lineWidth = HOOK_WIDTH;
  ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, tipY); ctx.stroke();

  // Inner white
  ctx.shadowBlur = 3; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
  ctx.stroke();

  // Energy nodes
  const nodeSep = 20;
  const nodeOff = (age * 650) % nodeSep;
  ctx.fillStyle = `rgba(${hc},0.75)`;
  ctx.shadowColor = theme.hookColor; ctx.shadowBlur = 14;
  for (let ny = baseY - nodeOff; ny > tipY; ny -= nodeSep) {
    ctx.beginPath(); ctx.arc(x, ny, 2.8 * pulse, 0, Math.PI * 2); ctx.fill();
  }

  // Arrowhead
  ctx.shadowBlur = 26; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 8, tipY + 13); ctx.lineTo(x, tipY); ctx.lineTo(x + 8, tipY + 13); ctx.stroke();

  // Tip orb
  const tg = ctx.createRadialGradient(x, tipY, 0, x, tipY, 16);
  tg.addColorStop(0, `rgba(${hc},0.95)`); tg.addColorStop(1, `rgba(${hg},0)`);
  ctx.beginPath(); ctx.arc(x, tipY, 16, 0, Math.PI * 2); ctx.fillStyle = tg; ctx.fill();

  ctx.restore();
}

// ─── Power-up ─────────────────────────────────────────────────────────────────
const PU_ICONS: Record<string, string> = {
  shield: '🛡', slow: '⏱', multishot: '🌟', freeze: '❄', score2x: '💎',
};
function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp) {
  const color = POWERUP_COLORS[pu.type];
  const c = rgb(color);
  const pulse = 1 + 0.18 * Math.sin(pu.pulse);
  const alpha = Math.min(1, pu.life * 0.5);

  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(pu.x, pu.y); ctx.rotate(pu.spin);

  // Glow orb
  const og = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * pulse);
  og.addColorStop(0, `rgba(${c},0.5)`); og.addColorStop(1, `rgba(${c},0)`);
  ctx.beginPath(); ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = og; ctx.fill();

  // Hexagon body
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a)*16*pulse, Math.sin(a)*16*pulse);
    else ctx.lineTo(Math.cos(a)*16*pulse, Math.sin(a)*16*pulse);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${c},0.25)`;
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.fill(); ctx.stroke();

  // Icon
  ctx.shadowBlur = 0; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(PU_ICONS[pu.type] ?? '?', 0, 1);

  ctx.restore();
}

// ─── Heart ────────────────────────────────────────────────────────────────────
function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, filled: boolean, pulse: number) {
  const s = (size / 20) * (filled ? 1 + pulse * 0.07 : 1);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0,-4); ctx.bezierCurveTo(0,-9,-10,-9,-10,-2); ctx.bezierCurveTo(-10,4,0,10,0,10);
  ctx.bezierCurveTo(0,10,10,4,10,-2); ctx.bezierCurveTo(10,-9,0,-9,0,-4); ctx.closePath();
  if (filled) {
    const hg = ctx.createLinearGradient(0,-9,0,10);
    hg.addColorStop(0,'#ff6688'); hg.addColorStop(1,'#cc1144');
    ctx.fillStyle = hg; ctx.shadowColor='#ff3366'; ctx.shadowBlur=14; ctx.fill();
  } else {
    ctx.strokeStyle='rgba(80,80,100,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
  }
  ctx.restore();
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, theme: LevelTheme, time: number) {
  const { score, level, combo, comboTimer, comboDisplay, player, highScore, difficulty } = state;
  const ca = theme.accentA;

  // HUD bg strip
  const hg = ctx.createLinearGradient(0, 0, 0, CEILING_Y);
  hg.addColorStop(0, 'rgba(2,4,12,0.96)');
  hg.addColorStop(1, 'rgba(2,4,12,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, LOGICAL_WIDTH, CEILING_Y);

  // Score
  ctx.save();
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(150,170,220,0.7)'; ctx.fillText('SCORE', 14, 12);
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.fillStyle = '#ddeeff'; ctx.shadowColor = ca; ctx.shadowBlur = 14;
  ctx.fillText(score.toString().padStart(8,'0'), 14, 36);
  ctx.restore();

  // Theme name + level
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = `rgba(${rgb(ca)},0.6)`;
  ctx.fillText(theme.name, LOGICAL_WIDTH/2, 12);
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = ca; ctx.shadowColor = ca; ctx.shadowBlur = 20;
  ctx.fillText(`LV ${level}`, LOGICAL_WIDTH/2, 35);
  ctx.restore();

  // Hi-score
  if (highScore > 0) {
    ctx.save();
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(180,150,220,0.5)';
    ctx.fillText(`MEILLEUR ${highScore.toString().padStart(8,'0')}`, LOGICAL_WIDTH/2, 2);
    ctx.restore();
  }

  // Speed indicator
  const spd = Math.round(difficulty.speedMult * 100);
  const spdColor = spd > 160 ? '#ff3a3a' : spd > 130 ? '#ffcc00' : '#44ff88';
  ctx.save();
  ctx.font = '10px "Courier New", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = spdColor; ctx.shadowColor = spdColor; ctx.shadowBlur = 8;
  ctx.fillText(`VITESSE ${spd}%`, 14, 2);
  ctx.restore();

  // Lives
  const heartPulse = 0.5 + 0.5 * Math.sin(time * 2.5);
  const hSize = 20, hGap = 10;
  const hStartX = LOGICAL_WIDTH - 14 - MAX_LIVES * (hSize + hGap);
  ctx.save();
  ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(180,140,160,0.6)'; ctx.fillText('VIES', LOGICAL_WIDTH - 14, 2);
  ctx.restore();
  for (let i = 0; i < MAX_LIVES; i++) {
    drawHeart(ctx, hStartX + i*(hSize+hGap) + hSize/2, 34, hSize, i < player.lives, heartPulse);
  }

  // Power-up timers
  const pups: Array<[string, number, string]> = [
    ['🛡', player.shield,    '#00e5ff'],
    ['⏱', player.slow,      '#aa44ff'],
    ['🌟', player.multishot, '#ffcc00'],
    ['❄', player.freeze,    '#aaddff'],
    ['💎', player.score2x,  '#ff44aa'],
  ].filter(([,t]) => (t as number) > 0) as Array<[string, number, string]>;

  for (let i = 0; i < pups.length; i++) {
    const [icon, t, col] = pups[i];
    const px2 = 14 + i * 50;
    const py2 = FLOOR_Y + 8;
    ctx.save();
    ctx.font = '16px serif'; ctx.textAlign = 'center';
    ctx.fillText(icon as string, px2 + 10, py2 + 10);
    // Bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(px2, py2 + 18, 36, 4);
    ctx.fillStyle = col as string; ctx.shadowColor = col as string; ctx.shadowBlur = 6;
    ctx.fillRect(px2, py2 + 18, 36 * Math.min(1, (t as number) / 10), 4);
    ctx.restore();
  }

  // Combo
  if (comboDisplay > 0 && combo > 1) {
    const alpha = Math.min(1, comboDisplay * 1.5);
    const scale = 1 + 0.28 * Math.abs(Math.sin(time * 15)) * (comboTimer / COMBO_WINDOW_IMPORT);
    const cols = ['#00e5ff','#ffcc00','#ff2d55','#bf5fff','#39ff14','#ff8800'];
    const cc   = cols[Math.min(combo - 2, cols.length - 1)];
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(LOGICAL_WIDTH/2, CEILING_Y + 58); ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillText(`${combo}× COMBO !`, 2, 2);
    ctx.fillStyle = cc; ctx.shadowColor = cc; ctx.shadowBlur = 28;
    ctx.fillText(`${combo}× COMBO !`, 0, 0);
    // Bar
    const bw2 = 160, fill = comboTimer / COMBO_WINDOW_IMPORT;
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-bw2/2, 24, bw2, 5);
    const bg = ctx.createLinearGradient(-bw2/2, 0, bw2/2, 0);
    bg.addColorStop(0, cc); bg.addColorStop(1, '#ffffff');
    ctx.fillStyle = bg; ctx.shadowColor = cc; ctx.shadowBlur = 10;
    ctx.fillRect(-bw2/2, 24, bw2 * fill, 5);
    ctx.restore();
  }

  // Score popups
  for (const popup of state.scorePopups) {
    const a  = Math.min(1, popup.life / popup.maxLife * 2.5);
    const sc = popup.scale ?? 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(popup.x, popup.y); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${18 * sc}px "Courier New", monospace`;
    ctx.fillStyle = popup.color; ctx.shadowColor = popup.color; ctx.shadowBlur = 16;
    ctx.fillText(popup.text, 0, 0); ctx.restore();
  }
}

// small constant to avoid circular import
const COMBO_WINDOW_IMPORT = 3.0;

// ─── Overlays ─────────────────────────────────────────────────────────────────
function drawOnboarding(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const step = ONBOARD_STEPS[Math.min(state.onboardStep, ONBOARD_STEPS.length - 1)];
  const cx = LOGICAL_WIDTH / 2, cy = LOGICAL_HEIGHT / 2;

  // Full overlay
  ctx.fillStyle = 'rgba(2,4,20,0.88)'; ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Progress dots
  for (let i = 0; i < ONBOARD_STEPS.length; i++) {
    const dx = cx - ((ONBOARD_STEPS.length - 1) / 2) * 20 + i * 20;
    ctx.beginPath(); ctx.arc(dx, cy - 170, 5, 0, Math.PI * 2);
    ctx.fillStyle = i === state.onboardStep ? '#ffffff' : 'rgba(255,255,255,0.25)';
    ctx.fill();
  }

  // Panel
  const pw = 560, ph = 300;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,40,0.92)';
  roundRect(ctx, cx - pw/2, cy - ph/2, pw, ph, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,120,255,0.45)'; ctx.lineWidth = 1.5;
  ctx.shadowColor = '#4466ff'; ctx.shadowBlur = 20;
  roundRect(ctx, cx - pw/2, cy - ph/2, pw, ph, 16);
  ctx.stroke(); ctx.restore();

  // Icon
  ctx.font = '48px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(step.icon, cx, cy - 90);

  // Title
  ctx.save();
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 16;
  ctx.fillText(step.title, cx, cy - 42);
  ctx.restore();

  // Body
  const words = step.body.split(' ');
  const lines: string[] = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (test.length > 52) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);

  ctx.save();
  ctx.font = '15px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(180,200,240,0.9)'; ctx.shadowBlur = 0;
  for (let li = 0; li < lines.length; li++) ctx.fillText(lines[li], cx, cy + li * 22 - 6);
  ctx.restore();

  // Demo animation
  drawOnboardDemo(ctx, step.demo, cx, cy + 80, time);

  // Action prompt
  const blink = 0.55 + 0.45 * Math.sin(time * 3.8);
  ctx.save(); ctx.globalAlpha = blink;
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textAlign = 'center'; ctx.fillStyle = '#88aaff'; ctx.shadowColor = '#4466ff'; ctx.shadowBlur = 10;
  ctx.fillText(step.action, cx, cy + 128);
  ctx.restore();

  // Step counter
  ctx.font = '11px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(100,120,180,0.6)';
  ctx.fillText(`${state.onboardStep + 1} / ${ONBOARD_STEPS.length}`, cx, cy + 148);
}

function drawOnboardDemo(ctx: CanvasRenderingContext2D, demo: string, cx: number, cy: number, time: number) {
  ctx.save();
  switch (demo) {
    case 'move': {
      const sx = cx + Math.sin(time * 1.8) * 80;
      // Ship silhouette
      ctx.fillStyle = 'rgba(170,200,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(sx - 14, cy); ctx.lineTo(sx + 14, cy); ctx.lineTo(sx + 20, cy + 12); ctx.lineTo(sx - 20, cy + 12);
      ctx.closePath(); ctx.fill();
      // Arrow keys hint
      for (const [ox, lbl] of [[-35, '◀'], [35, '▶']] as [number, string][]) {
        ctx.fillStyle = 'rgba(100,140,255,0.6)'; ctx.font = '14px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(lbl, cx + ox, cy + 30);
      }
      break;
    }
    case 'shoot': {
      const py = cy + Math.sin(time * 0.8) * 4;
      ctx.strokeStyle = 'rgba(200,230,255,0.8)'; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(cx, py - 50); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(170,200,255,0.7)';
      ctx.beginPath(); ctx.moveTo(cx - 14, py); ctx.lineTo(cx + 14, py); ctx.lineTo(cx + 20, py + 12); ctx.lineTo(cx - 20, py + 12); ctx.closePath(); ctx.fill();
      break;
    }
    case 'split': {
      const t = (time % 2) / 2;
      const r0 = 20;
      if (t < 0.5) {
        ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI*2);
        ctx.strokeStyle = '#ff3a6e'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        const off = (t - 0.5) * 2 * 55;
        for (const ox of [-1, 1]) {
          ctx.beginPath(); ctx.arc(cx + ox * off, cy, 12, 0, Math.PI*2);
          ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
      break;
    }
    case 'combo': {
      const c2 = Math.floor(time * 1.2) % 5 + 1;
      ctx.font = `bold ${24 + c2 * 2}px "Courier New", monospace`;
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 20;
      ctx.fillText(`${c2}× COMBO!`, cx, cy + 8);
      break;
    }
    case 'powerup': {
      const icons = ['🛡','⏱','🌟','❄','💎'];
      const idx = Math.floor(time * 0.8) % icons.length;
      ctx.font = '32px serif'; ctx.textAlign = 'center'; ctx.fillText(icons[idx], cx, cy + 12);
      break;
    }
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBossIntro(ctx: CanvasRenderingContext2D, state: GameState, theme: LevelTheme, time: number) {
  const t = 1 - state.bossIntroTimer / 2.5;
  const cx = LOGICAL_WIDTH / 2, cy = LOGICAL_HEIGHT / 2;
  ctx.fillStyle = `rgba(20,0,0,${0.7 * t})`; ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.save(); ctx.globalAlpha = Math.min(1, t * 2);
  const sc = 1 + 0.15 * Math.sin(time * 8);
  ctx.translate(cx, cy - 30); ctx.scale(sc, sc);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 68px "Courier New", monospace';
  ctx.fillStyle = '#ff2d55'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 50;
  ctx.fillText('⚠ BOSS ⚠', 0, 0);
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillStyle = theme.accentA; ctx.shadowColor = theme.accentA; ctx.shadowBlur = 20;
  ctx.fillText('VAGUE EN COURS', 0, 52);
  ctx.restore();
}

function drawPausedOverlay(ctx: CanvasRenderingContext2D, time: number) {
  const cx = LOGICAL_WIDTH / 2, cy = LOGICAL_HEIGHT / 2;
  ctx.fillStyle = 'rgba(2,4,20,0.72)'; ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.save();
  const sc = 0.98 + 0.02 * Math.sin(time * 2);
  ctx.translate(cx, cy); ctx.scale(sc, sc);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 30;
  ctx.fillText('⏸ EN PAUSE', 0, 0);
  ctx.font = '15px "Courier New", monospace';
  ctx.fillStyle = 'rgba(160,200,255,0.8)'; ctx.shadowBlur = 0;
  ctx.fillText('Appuyez sur ECHAP ou P pour reprendre', 0, 46);
  ctx.restore();
}

function drawLevelUp(ctx: CanvasRenderingContext2D, state: GameState, theme: LevelTheme, time: number) {
  const cx = LOGICAL_WIDTH/2, cy = LOGICAL_HEIGHT/2;
  ctx.fillStyle = 'rgba(2,5,12,0.58)'; ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);
  const p = 1 + 0.06 * Math.sin(time * 5);
  ctx.save(); ctx.translate(cx, cy - 12); ctx.scale(p, p);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 58px "Courier New", monospace';
  ctx.fillStyle = theme.accentA; ctx.shadowColor = theme.accentA; ctx.shadowBlur = 44;
  ctx.fillText('NIVEAU VALIDÉ !', 0, 0);
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 18;
  ctx.fillText(`NIVEAU ${state.level + 1} → ${getTheme(state.level + 1).name}`, 0, 46);
  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, state: GameState, theme: LevelTheme, time: number) {
  const cx = LOGICAL_WIDTH/2, cy = LOGICAL_HEIGHT/2;
  const vig = ctx.createRadialGradient(cx, cy, 80, cx, cy, LOGICAL_WIDTH * 0.78);
  vig.addColorStop(0, 'rgba(2,4,20,0.5)'); vig.addColorStop(1, 'rgba(2,4,20,0.9)');
  ctx.fillStyle = vig; ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);

  // Orbiting demo balls
  const dc = ['#ff2d55','#00e5ff','#ffcc00','#bf5fff','#39ff14'];
  for (let i = 0; i < 5; i++) {
    const a = time * 0.5 + (i * Math.PI * 2) / 5;
    const rx = 190 + 35 * Math.sin(time * 0.28 + i);
    const ry =  58 + 18 * Math.cos(time * 0.38 + i);
    const bx = cx + Math.cos(a) * rx, by = cy - 140 + Math.sin(a * 0.85) * ry;
    const br = BALL_RADII[3] * (0.28 + 0.14 * i);
    const fb: Ball = { id:-i, x:bx, y:by, vx:0, vy:0, radius:br, tier:3, color:dc[i], glowColor:dc[i], flash:0.2+0.15*Math.sin(time*3+i), rotation:time*1.2+i, rotSpeed:0, trail:[], pulsePhase:time*2.5+i*1.2, bounceSfxCooldown:0, wobble:0, isBoss:false, frozen:0, colorAlt:dc[(i+1)%5] };
    drawBall(ctx, fb, theme);
  }

  // Title
  ctx.save();
  const pulse = 0.97 + 0.03 * Math.sin(time * 2.0);
  ctx.translate(cx, cy - 60); ctx.scale(pulse, pulse);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 82px "Courier New", monospace';
  ctx.fillStyle = 'rgba(80,120,255,0.25)'; ctx.fillText('PANG', 3, 3);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#5588ff'; ctx.shadowBlur = 55;
  ctx.fillText('PANG', 0, 0);
  ctx.font = 'bold 34px "Courier New", monospace';
  ctx.fillStyle = theme.accentA; ctx.shadowColor = theme.accentA; ctx.shadowBlur = 28;
  ctx.fillText('NOVA', 0, 56);
  ctx.restore();

  // Divider
  const dg = ctx.createLinearGradient(cx-200, 0, cx+200, 0);
  dg.addColorStop(0,'rgba(80,120,255,0)'); dg.addColorStop(0.5,`rgba(${rgb(theme.accentA)},0.6)`); dg.addColorStop(1,'rgba(80,120,255,0)');
  ctx.fillStyle = dg; ctx.fillRect(cx-200, cy+12, 400, 1.5);

  const blink = 0.55 + 0.45 * Math.sin(time * 3.6);
  ctx.save(); ctx.globalAlpha = blink;
  ctx.font = 'bold 18px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = theme.accentA; ctx.shadowColor = theme.accentA; ctx.shadowBlur = 14;
  ctx.fillText('▶  APPUYEZ SUR ESPACE POUR JOUER  ◀', cx, cy + 38);
  ctx.restore();
  ctx.font = '13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(100,130,200,0.85)'; ctx.shadowBlur = 0;
  ctx.fillText('← → DÉPLACER   |   ESPACE / ↑ TIRER   |   M MUET   |   P PAUSE', cx, cy + 72);

  // Crédits créateur
  ctx.font = '11px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(120,140,200,0.55)'; ctx.shadowBlur = 0;
  ctx.fillText('Créé par Hylst — Geoffroy avec l\'aide d\'une IA', cx, cy + 92);

  if (state.highScore > 0) {
    ctx.fillStyle = 'rgba(180,150,255,0.7)'; ctx.font = '14px "Courier New", monospace';
    ctx.fillText(`MEILLEUR  ${state.highScore.toString().padStart(8,'0')}`, cx, cy + 112);
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const cx = LOGICAL_WIDTH/2, cy = LOGICAL_HEIGHT/2;
  ctx.fillStyle = 'rgba(2,2,10,0.86)'; ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.fillStyle = '#ff2d55'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 44;
  ctx.fillText('PARTIE TERMINÉE', cx, cy - 52);
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillStyle = '#c0d8ff'; ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 12;
  ctx.fillText(`SCORE  ${state.score.toString().padStart(8,'0')}`, cx, cy + 4);
  if (state.maxCombo > 1) {
    ctx.font = '15px "Courier New", monospace'; ctx.fillStyle = 'rgba(255,200,80,0.8)'; ctx.shadowBlur = 6;
    ctx.fillText(`COMBO MAX  ×${state.maxCombo}`, cx, cy + 30);
  }
  if (state.score >= state.highScore && state.highScore > 0) {
    const hp = 0.88 + 0.12 * Math.sin(time * 4);
    ctx.save(); ctx.scale(hp, hp);
    ctx.font = 'bold 18px "Courier New", monospace'; ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 22;
    ctx.fillText('★ NOUVEAU RECORD ! ★', cx / hp, (cy + 58) / hp);
    ctx.restore();
  }
  const bl = 0.5 + 0.5 * Math.sin(time * 3.5);
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillStyle = `rgba(180,210,255,${bl})`; ctx.shadowBlur = 0;
  ctx.fillText('APPUYEZ SUR ESPACE POUR REJOUER', cx, cy + 82);
  ctx.restore();

  // Crédits
  ctx.font = '10px "Courier New", monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(100,120,180,0.45)';
  ctx.fillText('Hylst — Geoffroy avec l\'aide d\'une IA', cx, cy + 110);
}

function drawDead(ctx: CanvasRenderingContext2D) {
  const cx = LOGICAL_WIDTH/2, cy = LOGICAL_HEIGHT/2;
  const vgn = ctx.createRadialGradient(cx, cy, 50, cx, cy, LOGICAL_WIDTH);
  vgn.addColorStop(0,'rgba(160,0,0,0)'); vgn.addColorStop(1,'rgba(100,0,0,0.5)');
  ctx.fillStyle = vgn; ctx.fillRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='bold 54px "Courier New", monospace';
  ctx.fillStyle='#ff2d55'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=44;
  ctx.fillText('TÔCHÉ !', cx, cy); ctx.restore();
}

// ─── Pulse rings ──────────────────────────────────────────────────────────────
function drawPulseRings(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const r of state.pulseRings) {
    const a = (r.life / r.maxLife) * 0.8;
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = r.color; ctx.lineWidth = 2.5 * (r.life / r.maxLife);
    ctx.shadowColor = r.color; ctx.shadowBlur = 18;
    ctx.stroke(); ctx.restore();
  }
}

// ─── Flash particles ──────────────────────────────────────────────────────────
function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.flashParticles) {
    const a = p.life / p.maxLife;
    ctx.save(); ctx.globalAlpha = a * (p.type === 'smoke' ? 0.5 : 1);
    if (p.type === 'smoke') {
      const c = rgb(p.color);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(${c},${a*0.4})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = p.type === 'star' ? 22 : 7;
      ctx.fill();
    }
    ctx.restore();
  }
}

// ─── Main render ──────────────────────────────────────────────────────────────
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
) {
  const theme = getTheme(state.level);

  ctx.save();
  ctx.translate(state.shake.x, state.shake.y);
  ctx.clearRect(-30, -30, LOGICAL_WIDTH + 60, LOGICAL_HEIGHT + 60);

  drawBackground(ctx, state, theme, time);

  if (state.phase !== 'onboarding' && state.phase !== 'title' && state.phase !== 'gameover') {
    drawArena(ctx, theme, time);
    drawAmbient(ctx, state.ambientParticles);
    drawPulseRings(ctx, state);

    for (const ball of state.balls) drawBall(ctx, ball, theme);
    for (const hook of state.hooks) drawHook(ctx, hook, theme);
    for (const pu of state.powerUps)  drawPowerUp(ctx, pu);

    drawParticles(ctx, state);

    if (state.phase === 'playing' || state.phase === 'dead' || state.phase === 'boss_intro') {
      drawPlayer(ctx, state.player, theme, time);
    }
  }

  ctx.restore(); // end shake

  // Phase-specific overlays (no shake)
  if (state.phase === 'onboarding') {
    drawBackground(ctx, state, theme, time);
    drawOnboarding(ctx, state, time);
  } else if (state.phase === 'title') {
    drawBackground(ctx, state, theme, time);
    drawTitle(ctx, state, theme, time);
  } else if (state.phase === 'boss_intro') {
    drawBossIntro(ctx, state, theme, time);
    drawHUD(ctx, state, theme, time);
  } else if (state.phase === 'levelup') {
    drawLevelUp(ctx, state, theme, time);
    drawHUD(ctx, state, theme, time);
  } else if (state.phase === 'dead') {
    drawDead(ctx);
    drawHUD(ctx, state, theme, time);
  } else if (state.phase === 'paused') {
    drawPausedOverlay(ctx, time);
    drawHUD(ctx, state, theme, time);
  } else if (state.phase === 'gameover') {
    drawBackground(ctx, state, theme, time);
    drawGameOver(ctx, state, time);
  } else {
    drawHUD(ctx, state, theme, time);
  }
}
