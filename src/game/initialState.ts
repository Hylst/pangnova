import { GameState, Ball, Player, DifficultyConfig, ScreenShake } from './types';
import {
  LOGICAL_WIDTH, FLOOR_Y, CEILING_Y,
  BALL_RADII, BALL_SPEEDS, MAX_LIVES,
  PLAYER_HEIGHT, PLAYER_Y_OFFSET,
  getLevelDef,
} from './constants';
import { getTheme } from './themes';

let _uid = 100;
export function uid() { return _uid++; }

export function makeBall(
  x: number, y: number,
  vx: number, vy: number,
  tier: number,
  colorIdx: number,
  level = 1,
  speedBoost = 1,
  isBoss = false,
): Ball {
  const theme = getTheme(level);
  const palette = theme.ballPalette[3 - tier] ?? theme.ballPalette[0];
  const color  = palette[colorIdx % palette.length];
  const colorB = palette[(colorIdx + 1) % palette.length];
  return {
    id: uid(), x, y,
    vx: vx * speedBoost, vy,
    radius:  isBoss ? BALL_RADII[tier] * 1.45 : BALL_RADII[tier],
    tier, color, glowColor: color,
    flash: 0,
    rotation:  Math.random() * Math.PI * 2,
    rotSpeed:  (Math.random() - 0.5) * 4,
    trail: [], pulsePhase: Math.random() * Math.PI * 2,
    bounceSfxCooldown: 0, wobble: 0,
    isBoss, frozen: 0, colorAlt: colorB,
  };
}

export function makeLevelBalls(level: number): Ball[] {
  const balls: Ball[] = [];
  const def   = getLevelDef(level);
  const theme = getTheme(level);

  if (def.bossWave) {
    balls.push(makeBall(
      LOGICAL_WIDTH / 2, CEILING_Y + BALL_RADII[3] * 1.5 + 10,
      BALL_SPEEDS[3] * def.speedMult * 0.7, 0,
      3, 0, level, 1, true,
    ));
    return balls;
  }

  const count = def.ballCount;
  for (let i = 0; i < count; i++) {
    const tier    = def.mixed && i % 2 === 1 ? 2 : (def.hasTier1 && i === count - 1 ? 1 : 3);
    const spd     = BALL_SPEEDS[tier] * def.speedMult;
    const dir     = (i % 2 === 0) ? 1 : -1;
    const xFrac   = count === 1 ? 0.5 : 0.15 + (0.7 * i) / Math.max(count - 1, 1);
    const x       = LOGICAL_WIDTH * xFrac;
    const y       = CEILING_Y + BALL_RADII[tier] + 10;
    const fast    = def.fastBall && i === 0 ? 1.32 : 1;
    const cIdx    = (i + Math.floor(level / 2)) % (theme.ballPalette[3 - tier]?.length ?? 3);
    balls.push(makeBall(x, y, spd * dir, 0, tier, cIdx, level, fast));
  }
  return balls;
}

export function makeDifficulty(level: number): DifficultyConfig {
  const def = getLevelDef(level);
  return {
    level,
    ballCount:    def.ballCount,
    speedMult:    def.speedMult,
    gravityMult:  def.gravMult,
    hasMixed:     def.mixed,
    hasSpeedBall: def.fastBall,
    bossWave:     def.bossWave,
    bpm:          110 + level * 3.5,
  };
}

export function makeInitialPlayer(): Player {
  return {
    x: LOGICAL_WIDTH / 2,
    y: FLOOR_Y - PLAYER_HEIGHT / 2 - PLAYER_Y_OFFSET,
    lives: MAX_LIVES,
    invincible: 0, thrustTime: 0, velX: 0,
    shield: 0, slow: 0, multishot: 0, freeze: 0, score2x: 0,
  };
}

export function makeZeroShake(): ScreenShake {
  return { x: 0, y: 0, intensity: 0, duration: 0 };
}

export function makeInitialState(): GameState {
  _uid = 100;
  return {
    phase:           'onboarding',
    prevPhase:       'title',
    score: 0, level: 1,
    combo: 0, comboTimer: 0, comboDisplay: 0, maxCombo: 0,
    player:           makeInitialPlayer(),
    balls: [], hooks: [], powerUps: [],
    nextId: 1,
    flashParticles: [], ambientParticles: [],
    scorePopups: [], pulseRings: [],
    shake:            makeZeroShake(),
    levelTimer: 0, titleTimer: 0,
    difficulty:       makeDifficulty(1),
    highScore: 0,
    bgScrollX: 0, bgScrollY: 0,
    levelFlash: 0, themeTransition: 0,
    onboardStep: 0, onboardTimer: 0,
    bossIntroTimer: 0,
    totalBallsPopped: 0, timeAlive: 0,
    glitchTimer: 0,
  };
}

// ─── Étapes d'accueil (en français) ──────────────────────────────────────────
export const ONBOARD_STEPS = [
  {
    title: 'BIENVENUE DANS PANG GENESIS',
    body: 'Éliminez toutes les boules pour valider chaque niveau. Les boules se divisent en plus petites quand elles sont touchées !',
    icon: '🎮',
    action: 'Appuyez sur ESPACE ou touchez pour continuer',
    demo: 'none' as const,
  },
  {
    title: 'DEPLACEZ VOTRE NAVETTE',
    body: 'Utilisez les flèches ← → (ou A / D) pour déplacer votre navette de gauche à droite le long du sol.',
    icon: '🚀',
    action: 'Appuyez sur ESPACE ou touchez pour continuer',
    demo: 'move' as const,
  },
  {
    title: 'TIREZ LE CROCHET',
    body: 'Appuyez sur ESPACE (ou ↑ / W) pour lancer un rayon de crochet vertical. Un tir à la fois !',
    icon: '⚡',
    action: 'Appuyez sur ESPACE ou touchez pour continuer',
    demo: 'shoot' as const,
  },
  {
    title: 'LES BOULES SE DIVISENT !',
    body: 'Les grosses boules (Niveau 3) se divisent en deux moyennes. Les moyennes en deux petites. Les petites disparaissent !',
    icon: '💥',
    action: 'Appuyez sur ESPACE ou touchez pour continuer',
    demo: 'split' as const,
  },
  {
    title: 'ENCHAÎNEZ LES COMBOS',
    body: 'Éliminez plusieurs boules rapidement pour construire un multiplicateur COMBO et gagner des points bonus !',
    icon: '🔥',
    action: 'Appuyez sur ESPACE ou touchez pour continuer',
    demo: 'combo' as const,
  },
  {
    title: 'RÉCOLTEZ LES PUISSANCES',
    body: 'Les boules détruites laissent parfois tomber des bonus : Bouclier 🛡, Ralentissement ⏱, Multi-Tir 🌟, Gel ❄, Score ×2 💎',
    icon: '⭐',
    action: 'Appuyez sur ESPACE pour commencer !',
    demo: 'powerup' as const,
  },
];
