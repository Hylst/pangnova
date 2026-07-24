import { GameState, Ball, InputState, FlashParticle, AmbientParticle, PowerUp } from './types';
import {
  LOGICAL_WIDTH, FLOOR_Y, CEILING_Y,
  GRAVITY_BASE, BALL_RADII, BALL_SPEEDS,
  PLAYER_SPEED, PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_Y_OFFSET,
  HOOK_SPEED, COMBO_WINDOW, BASE_SCORE,
  SHAKE_HIT, SHAKE_POP, SHAKE_LEVEL, SHAKE_BOSS,
  POWERUP_COLORS, PowerUpType,
} from './constants';
import {
  makeBall, makeLevelBalls, makeInitialPlayer,
  makeDifficulty, uid, ONBOARD_STEPS, makeInitialState,
} from './initialState';
import { getTheme } from './themes';
import {
  sfxShoot, sfxPop, sfxCombo, sfxDeath,
  sfxLevelClear, sfxBounce, sfxWallBounce, sfxPowerUp, sfxBossRoar,
} from './audio';

// ─── helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp   = (a: number, b: number, t: number)  => a + (b - a) * t;

function shake(s: GameState, intensity: number, duration: number) {
  if (intensity > s.shake.intensity) {
    s.shake.intensity = intensity;
    s.shake.duration  = duration;
  }
}

function particle(
  s: GameState, x: number, y: number, color: string,
  n = 12, type: FlashParticle['type'] = 'spark',
  speedScale = 1,
) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (type === 'smoke' ? 40 + Math.random() * 70 : 110 + Math.random() * 220) * speedScale;
    const life = type === 'smoke' ? 0.9 + Math.random() * 0.5 : 0.35 + Math.random() * 0.4;
    s.flashParticles.push({
      id: uid(), x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - (type === 'smoke' ? 35 : 0),
      r: type === 'smoke' ? 7 + Math.random() * 10 : 2 + Math.random() * 5,
      color, life, maxLife: life, type,
    });
  }
}

function pulseRing(s: GameState, x: number, y: number, color: string, maxR: number) {
  s.pulseRings.push({ id: uid(), x, y, radius: 0, maxR, color, life: 0.55, maxLife: 0.55 });
}

function scorePopup(s: GameState, x: number, y: number, text: string, color: string, sc = 1) {
  s.scorePopups.push({ id: uid(), x, y, text, color, life: 1.4, maxLife: 1.4, vy: -60, scale: sc });
}

function spawnPowerUp(s: GameState, x: number, y: number, level: number) {
  const chance = 0.22 + level * 0.01;
  if (Math.random() > chance) return;
  const types: PowerUpType[] = ['shield','slow','multishot','freeze','score2x'];
  const t = types[Math.floor(Math.random() * types.length)];
  s.powerUps.push({ id: uid(), x, y, vy: -60, type: t, life: 8, spin: 0, pulse: Math.random() * Math.PI * 2 });
}

function spawnAmbient(s: GameState, theme: ReturnType<typeof getTheme>, dt: number) {
  const fx = theme.specialFX;
  if (fx === 'none') return;
  const rate = fx === 'rain' ? 0.02 : fx === 'embers' ? 0.05 : 0.08;
  if (Math.random() > rate * dt * 60) return;
  const color = theme.accentA;
  const p: AmbientParticle = {
    id: uid(), life: 0, maxLife: 0, x: 0, y: 0, vx: 0, vy: 0, r: 2, color, type: fx,
  };
  if (fx === 'rain') {
    Object.assign(p, { x: Math.random() * LOGICAL_WIDTH, y: CEILING_Y, vx: -1, vy: 320 + Math.random() * 120, r: 1, life: 1.2, maxLife: 1.2 });
  } else if (fx === 'embers') {
    Object.assign(p, { x: Math.random() * LOGICAL_WIDTH, y: FLOOR_Y, vx: (Math.random()-0.5)*30, vy: -(40+Math.random()*80), r: 2+Math.random()*2, life: 2+Math.random(), maxLife: 2+Math.random() });
  } else if (fx === 'snow') {
    Object.assign(p, { x: Math.random() * LOGICAL_WIDTH, y: CEILING_Y, vx: (Math.random()-0.5)*20, vy: 30+Math.random()*50, r: 1.5+Math.random()*2, life: 4+Math.random()*2, maxLife: 6 });
  } else if (fx === 'bubbles') {
    Object.assign(p, { x: Math.random() * LOGICAL_WIDTH, y: FLOOR_Y, vx: (Math.random()-0.5)*15, vy: -(30+Math.random()*60), r: 3+Math.random()*6, life: 3+Math.random()*2, maxLife: 5 });
  } else if (fx === 'motes') {
    Object.assign(p, { x: Math.random()*LOGICAL_WIDTH, y: CEILING_Y+Math.random()*(FLOOR_Y-CEILING_Y), vx:(Math.random()-0.5)*12, vy:(Math.random()-0.5)*12, r:2+Math.random()*3, life:3+Math.random()*3, maxLife:6 });
  } else if (fx === 'sparks') {
    Object.assign(p, { x: Math.random()*LOGICAL_WIDTH, y: FLOOR_Y, vx:(Math.random()-0.5)*60, vy:-(80+Math.random()*120), r:1.5, life:0.6+Math.random()*0.4, maxLife:1 });
  } else if (fx === 'glitch') {
    Object.assign(p, { x: Math.random()*LOGICAL_WIDTH, y: CEILING_Y+Math.random()*(FLOOR_Y-CEILING_Y), vx:0, vy:0, r:1+Math.random()*2, life:0.1+Math.random()*0.2, maxLife:0.3 });
  }
  s.ambientParticles.push(p);
}

// ─── Main update ──────────────────────────────────────────────────────────────
export function update(
  state: GameState,
  dt: number,
  input: InputState,
  audioEnabled: boolean,
): GameState {
  dt = Math.min(dt, 0.05);
  const s = state;

  // Scroll background
  s.bgScrollX = (s.bgScrollX + dt * 14) % 800;
  s.bgScrollY += dt * 5;

  // Screen shake
  if (s.shake.duration > 0) {
    s.shake.duration -= dt;
    const mag = s.shake.intensity * Math.max(0, s.shake.duration / 0.5);
    s.shake.x = (Math.random() - 0.5) * mag;
    s.shake.y = (Math.random() - 0.5) * mag;
  } else { s.shake.x = 0; s.shake.y = 0; s.shake.intensity = 0; }

  if (s.levelFlash > 0) s.levelFlash -= dt * 2.5;
  if (s.themeTransition > 0) s.themeTransition -= dt * 1.5;
  if (s.glitchTimer > 0) s.glitchTimer -= dt;

  const theme = getTheme(s.level);

  // Ambient FX
  spawnAmbient(s, theme, dt);
  updateAmbient(s, dt, theme.specialFX);

  // ── ONBOARDING ────────────────────────────────────────────────────────────
  if (s.phase === 'onboarding') {
    s.onboardTimer += dt;
    if (input.fire) {
      input.fire = false;
      s.onboardStep++;
      s.onboardTimer = 0;
      if (s.onboardStep >= ONBOARD_STEPS.length) {
        s.phase = 'title';
        s.onboardStep = 0;
      }
    }
    return s;
  }

  // ── TITLE ────────────────────────────────────────────────────────────────
  if (s.phase === 'title') {
    s.titleTimer += dt;
    if (input.fire) {
      s.phase = 'playing';
      s.balls = makeLevelBalls(1);
      s.player = makeInitialPlayer();
      s.difficulty = makeDifficulty(1);
      s.level = 1; s.score = 0;
    }
    return s;
  }

  // ── BOSS INTRO ────────────────────────────────────────────────────────────
  if (s.phase === 'boss_intro') {
    s.bossIntroTimer -= dt;
    if (s.bossIntroTimer <= 0) {
      s.phase = 'playing';
      s.balls = makeLevelBalls(s.level);
      s.hooks = [];
    }
    return s;
  }

  // ── PAUSED ────────────────────────────────────────────────────────────────
  if (s.phase === 'paused') {
    if (input.pause || input.fire) { input.pause = false; input.fire = false; s.phase = 'playing'; }
    return s;
  }

  // ── LEVEL UP ─────────────────────────────────────────────────────────────
  if (s.phase === 'levelup') {
    s.levelTimer -= dt;
    if (s.levelTimer <= 0) {
      const nextLv = s.level + 1;
      s.level = nextLv;
      s.difficulty = makeDifficulty(nextLv);
      const def = s.difficulty;
      // Check theme change
      const prevTheme = getTheme(nextLv - 1);
      const newTheme  = getTheme(nextLv);
      if (prevTheme.id !== newTheme.id) s.themeTransition = 1;
      s.levelFlash = 1;

      if (def.bossWave) {
        s.phase = 'boss_intro';
        s.bossIntroTimer = 2.5;
        shake(s, SHAKE_BOSS.intensity, SHAKE_BOSS.duration);
        if (audioEnabled) sfxBossRoar();
      } else {
        s.phase = 'playing';
        s.balls = makeLevelBalls(nextLv);
        s.hooks = [];
      }
    }
    return s;
  }

  // ── GAMEOVER ─────────────────────────────────────────────────────────────
  if (s.phase === 'gameover') {
    if (input.fire) {
      const hs = Math.max(s.highScore, s.score);
      Object.assign(s, makeInitialState());
      s.highScore = hs;
      s.phase = 'title';
    }
    return s;
  }

  // ── DEAD (brief pause) ────────────────────────────────────────────────────
  if (s.phase === 'dead') {
    s.levelTimer -= dt;
    updateParticles(s, dt);
    if (s.levelTimer <= 0) {
      if (s.player.lives <= 0) {
        s.phase = 'gameover';
        s.highScore = Math.max(s.highScore, s.score);
      } else {
        s.phase = 'playing';
        s.hooks = [];
        s.player.invincible = 3.0;
        s.player.x = LOGICAL_WIDTH / 2;
        s.player.shield = 0;
      }
    }
    return s;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PLAYING
  // ═══════════════════════════════════════════════════════════════════════════

  const { player } = s;
  if (input.pause) { input.pause = false; s.phase = 'paused'; return s; }

  // Pause / unpause
  s.timeAlive += dt;

  const gravity = GRAVITY_BASE * s.difficulty.gravityMult * (player.freeze > 0 ? 0.15 : 1);
  const slowMult = player.slow > 0 ? 0.45 : 1;

  // ── Power-up timers ───────────────────────────────────────────────────────
  if (player.shield    > 0) player.shield    -= dt;
  if (player.slow      > 0) player.slow      -= dt;
  if (player.multishot > 0) player.multishot -= dt;
  if (player.freeze    > 0) player.freeze    -= dt;
  if (player.score2x   > 0) player.score2x   -= dt;

  // ── Player invincibility ──────────────────────────────────────────────────
  if (player.invincible > 0) player.invincible -= dt;

  // ── Movement ──────────────────────────────────────────────────────────────
  const halfW = PLAYER_WIDTH / 2;
  const targetVX = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  player.velX = lerp(player.velX, targetVX * PLAYER_SPEED, Math.min(1, dt * 14));
  player.x += player.velX * dt;
  player.x = clamp(player.x, halfW, LOGICAL_WIDTH - halfW);
  player.y = FLOOR_Y - PLAYER_HEIGHT / 2 - PLAYER_Y_OFFSET;
  player.thrustTime += dt;

  // ── Fire hook ─────────────────────────────────────────────────────────────
  const maxHooks = player.multishot > 0 ? 3 : 1;
  if (input.fire && s.hooks.length < maxHooks) {
    const offsets = player.multishot > 0 ? [-28, 0, 28] : [0];
    for (const ox of offsets.slice(0, maxHooks - s.hooks.length + 1)) {
      const hx = clamp(player.x + ox, 8, LOGICAL_WIDTH - 8);
      const alreadyThere = s.hooks.some(h => Math.abs(h.x - hx) < 5);
      if (!alreadyThere) {
        s.hooks.push({
          id: uid(), x: hx,
          tipY: player.y - PLAYER_HEIGHT / 2,
          baseY: player.y - PLAYER_HEIGHT / 2,
          active: true, age: 0,
          wide: player.multishot > 0,
        });
      }
    }
    if (audioEnabled) sfxShoot();
    input.fire = false;
  } else { input.fire = false; }

  // ── Update hooks ──────────────────────────────────────────────────────────
  s.hooks = s.hooks.filter(h => h.active);
  for (const hook of s.hooks) {
    hook.tipY -= HOOK_SPEED * dt;
    hook.age  += dt;
    if (hook.tipY <= CEILING_Y) hook.active = false;
  }

  // ── Update balls ──────────────────────────────────────────────────────────
  const ballsToAdd: Ball[]  = [];
  const ballRemove          = new Set<number>();
  const hookRemove          = new Set<number>();

  for (const ball of s.balls) {
    const frozen = ball.frozen > 0;
    if (frozen) { ball.frozen -= dt; continue; }

    ball.vy += gravity * slowMult * dt;
    ball.x  += ball.vx * slowMult * dt;
    ball.y  += ball.vy * slowMult * dt;
    ball.rotation += ball.rotSpeed * dt;
    ball.pulsePhase += dt * 2.8;
    if (ball.bounceSfxCooldown > 0) ball.bounceSfxCooldown -= dt;
    if (ball.wobble > 0) ball.wobble -= dt * 5;

    // Trail
    ball.trail.push({ x: ball.x, y: ball.y, age: 0 });
    if (ball.trail.length > 14) ball.trail.shift();
    for (const tp of ball.trail) tp.age += dt;

    // Wall
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius; ball.vx = Math.abs(ball.vx); ball.wobble = 0.55;
      if (audioEnabled && ball.bounceSfxCooldown <= 0) { sfxWallBounce(); ball.bounceSfxCooldown = 0.12; }
    }
    if (ball.x + ball.radius >= LOGICAL_WIDTH) {
      ball.x = LOGICAL_WIDTH - ball.radius; ball.vx = -Math.abs(ball.vx); ball.wobble = 0.55;
      if (audioEnabled && ball.bounceSfxCooldown <= 0) { sfxWallBounce(); ball.bounceSfxCooldown = 0.12; }
    }

    // Floor
    if (ball.y + ball.radius >= FLOOR_Y) {
      ball.y = FLOOR_Y - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      ball.wobble = 0.9;
      const minKick = BALL_SPEEDS[ball.tier] * s.difficulty.speedMult * 1.05;
      if (Math.abs(ball.vy) < minKick) ball.vy = -minKick;
      if (audioEnabled && ball.bounceSfxCooldown <= 0) { sfxBounce(); ball.bounceSfxCooldown = 0.15; }
      particle(s, ball.x, FLOOR_Y, ball.color, 4 + ball.tier, 'spark', 0.5);
    }

    // Ceiling
    if (ball.y - ball.radius <= CEILING_Y) {
      ball.y = CEILING_Y + ball.radius; ball.vy = Math.abs(ball.vy);
    }

    if (ball.flash > 0) ball.flash -= dt * 5;
  }

  // ── Hook vs Ball ─────────────────────────────────────────────────────────
  for (const hook of s.hooks) {
    if (!hook.active) continue;
    for (const ball of s.balls) {
      if (ballRemove.has(ball.id)) continue;
      if (ball.frozen > 0) continue;
      const dx = Math.abs(hook.x - ball.x);
      const inV = hook.tipY <= ball.y + ball.radius && hook.baseY >= ball.y - ball.radius;
      const hitRadius = ball.radius + (hook.wide ? 8 : 0);
      if (dx <= hitRadius && inV) {
        ballRemove.add(ball.id);
        hookRemove.add(hook.id);
        hook.active = false;

        // Scoring
        s.combo++; s.comboTimer = COMBO_WINDOW; s.comboDisplay = 2.2;
        if (s.combo > s.maxCombo) s.maxCombo = s.combo;
        s.totalBallsPopped++;
        const mult = s.combo * (player.score2x > 0 ? 2 : 1);
        const pts  = BASE_SCORE[ball.tier] * mult * (ball.isBoss ? 5 : 1);
        s.score += pts;

        // VFX
        shake(s, SHAKE_POP.intensity + ball.tier * 3 + (ball.isBoss ? 12 : 0), SHAKE_POP.duration);
        particle(s, ball.x, ball.y, ball.glowColor, 18 + ball.tier * 5, 'spark');
        particle(s, ball.x, ball.y, '#ffffff', 5, 'spark');
        particle(s, ball.x, ball.y, ball.glowColor, 10, 'smoke');
        pulseRing(s, ball.x, ball.y, ball.glowColor, ball.radius * (ball.isBoss ? 6 : 3.5));
        if (ball.isBoss) pulseRing(s, ball.x, ball.y, ball.colorAlt, ball.radius * 5);

        const popColor = mult >= 6 ? '#ff44aa' : mult >= 4 ? '#ffcc00' : mult >= 2 ? '#00e5ff' : '#ffffff';
        const popScale = 0.85 + Math.min(mult * 0.12, 0.7);
        scorePopup(s, ball.x, ball.y - ball.radius,
          mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, popColor, popScale);

        if (audioEnabled) { sfxPop(ball.tier, ball.isBoss); if (s.combo >= 2) sfxCombo(s.combo); }

        // Power-up drop
        spawnPowerUp(s, ball.x, ball.y, s.level);

        // Split
        if (ball.tier > 1) {
          const nt  = (ball.tier - 1) as 1 | 2 | 3;
          const nr  = BALL_RADII[nt];
          const spd = BALL_SPEEDS[nt] * s.difficulty.speedMult;
          const vy  = -Math.abs(ball.vy) * 0.62;
          const ci  = Math.floor(Math.random() * (getTheme(s.level).ballPalette[3 - nt]?.length ?? 3));
          ballsToAdd.push(makeBall(clamp(ball.x - nr, nr, LOGICAL_WIDTH - nr), ball.y, -Math.abs(spd), vy, nt, ci, s.level));
          ballsToAdd.push(makeBall(clamp(ball.x + nr, nr, LOGICAL_WIDTH - nr), ball.y,  Math.abs(spd), vy, nt, (ci+1)%3, s.level));
        } else if (ball.isBoss && ball.tier === 3) {
          // Boss splits into 4
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const spd2 = BALL_SPEEDS[2] * s.difficulty.speedMult;
            ballsToAdd.push(makeBall(
              clamp(ball.x + Math.cos(angle) * 40, BALL_RADII[2], LOGICAL_WIDTH - BALL_RADII[2]),
              ball.y, Math.cos(angle) * spd2, Math.sin(angle) * spd2 - 80,
              2, i, s.level,
            ));
          }
        }
        break;
      }
    }
  }

  s.balls = s.balls.filter(b => !ballRemove.has(b.id));
  s.hooks = s.hooks.filter(h => !hookRemove.has(h.id) && h.active);
  s.balls.push(...ballsToAdd);

  // ── Power-up collection ────────────────────────────────────────────────────
  const puRemove = new Set<number>();
  for (const pu of s.powerUps) {
    pu.y  += pu.vy * dt;
    pu.vy += 180 * dt;  // gravity
    pu.spin   += dt * 2.5;
    pu.pulse  += dt * 3;
    pu.life   -= dt;
    if (pu.life <= 0 || pu.y > FLOOR_Y + 30) { puRemove.add(pu.id); continue; }

    // Player pickup
    const dx = pu.x - player.x;
    const dy = pu.y - player.y;
    if (Math.sqrt(dx*dx + dy*dy) < PLAYER_WIDTH * 0.8) {
      puRemove.add(pu.id);
      applyPowerUp(s, pu, audioEnabled);
    }
  }
  s.powerUps = s.powerUps.filter(p => !puRemove.has(p.id));

  // ── Player vs Ball ─────────────────────────────────────────────────────────
  if (player.invincible <= 0 && player.shield <= 0) {
    for (const ball of s.balls) {
      if (ball.frozen > 0) continue;
      const dx = ball.x - player.x;
      const dy = ball.y - player.y;
      if (Math.sqrt(dx*dx + dy*dy) < ball.radius + PLAYER_WIDTH * 0.36) {
        player.lives--;
        s.hooks = []; s.combo = 0; s.comboTimer = 0;
        s.phase = 'dead'; s.levelTimer = 1.5;
        shake(s, SHAKE_HIT.intensity, SHAKE_HIT.duration);
        particle(s, player.x, player.y, '#ffffff', 22, 'spark');
        particle(s, player.x, player.y, '#88aaff', 14, 'smoke');
        pulseRing(s, player.x, player.y, '#ff2d55', PLAYER_WIDTH * 4);
        if (audioEnabled) sfxDeath();
        break;
      }
    }
  } else if (player.shield > 0) {
    for (const ball of s.balls) {
      const dx = ball.x - player.x;
      const dy = ball.y - player.y;
      if (Math.sqrt(dx*dx + dy*dy) < ball.radius + PLAYER_WIDTH * 0.45) {
        // Shield deflects
        ball.vx = -ball.vx;
        ball.vy = -Math.abs(ball.vy) * 0.8;
        particle(s, player.x, player.y, '#00e5ff', 10, 'spark');
        player.shield -= 1.5; // shield takes damage
        break;
      }
    }
  }

  // ── Combo timer ────────────────────────────────────────────────────────────
  if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 0; }
  if (s.comboDisplay > 0) s.comboDisplay -= dt;

  // Glitch timer for cyber theme
  if (theme.specialFX === 'glitch' && Math.random() < 0.005) {
    s.glitchTimer = 0.08 + Math.random() * 0.12;
  }

  // Particles
  updateParticles(s, dt);

  // ── Level clear ────────────────────────────────────────────────────────────
  if (s.balls.length === 0 && s.phase === 'playing') {
    s.phase = 'levelup';
    s.levelTimer = 2.4;
    s.hooks = []; s.powerUps = [];
    const bonus = 500 * s.level + (s.combo > 3 ? s.combo * 100 : 0);
    s.score += bonus;
    shake(s, SHAKE_LEVEL.intensity, SHAKE_LEVEL.duration);
    scorePopup(s, LOGICAL_WIDTH/2, FLOOR_Y - 80, `NIVEAU VALIDÉ +${bonus}`, '#39ff14', 1.3);
    if (audioEnabled) sfxLevelClear();
  }

  return s;
}

function applyPowerUp(s: GameState, pu: PowerUp, audioEnabled: boolean) {
  const { player } = s;
  const color = POWERUP_COLORS[pu.type];
  if (audioEnabled) sfxPowerUp(pu.type);
  pulseRing(s, pu.x, pu.y, color, 80);
  particle(s, pu.x, pu.y, color, 14, 'spark');

  switch (pu.type) {
    case 'shield':    player.shield    = 8;  scorePopup(s, pu.x, pu.y - 20, '🛡 BOUCLIER', color); break;
    case 'slow':      player.slow      = 6;  scorePopup(s, pu.x, pu.y - 20, '⏱ RALENTI',   color); break;
    case 'multishot': player.multishot = 8;  scorePopup(s, pu.x, pu.y - 20, '🌟 MULTI-TIR',  color); break;
    case 'freeze':
      player.freeze = 4;
      for (const b of s.balls) { b.frozen = 3.5; }
      scorePopup(s, pu.x, pu.y - 20, '❄ GEL', color);
      break;
    case 'score2x':   player.score2x   = 10; scorePopup(s, pu.x, pu.y - 20, '💎 SCORE ×2', color); break;
  }
}

function updateParticles(s: GameState, dt: number) {
  for (const p of s.flashParticles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.type === 'smoke' ? -25 : 280) * dt;
    p.vx *= p.type === 'smoke' ? 0.97 : 0.985;
    p.life -= dt;
  }
  s.flashParticles = s.flashParticles.filter(p => p.life > 0);

  for (const p of s.scorePopups) {
    p.y += p.vy * dt; p.vy *= 0.92; p.life -= dt;
  }
  s.scorePopups = s.scorePopups.filter(p => p.life > 0);

  for (const r of s.pulseRings) {
    r.radius = r.maxR * (1 - r.life / r.maxLife); r.life -= dt;
  }
  s.pulseRings = s.pulseRings.filter(r => r.life > 0);
}

function updateAmbient(s: GameState, dt: number, fx: string) {
  for (const p of s.ambientParticles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (fx === 'embers') { p.vx += (Math.random()-0.5) * 10 * dt; p.vy -= 5 * dt; }
  }
  s.ambientParticles = s.ambientParticles.filter(p => p.life > 0);
  if (s.ambientParticles.length > 200) s.ambientParticles = s.ambientParticles.slice(-200);
}
