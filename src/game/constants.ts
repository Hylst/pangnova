// ─── Game Constants ───────────────────────────────────────────────────────────

export const LOGICAL_WIDTH   = 800;
export const LOGICAL_HEIGHT  = 600;

export const PLAYER_SPEED    = 320;
export const PLAYER_WIDTH    = 58;
export const PLAYER_HEIGHT   = 30;
export const PLAYER_Y_OFFSET = 12;

export const GRAVITY_BASE    = 380;

// Ball sizes per tier
export const BALL_RADII: Record<number, number> = { 3: 48, 2: 29, 1: 16 };

// Ball base horizontal speeds
export const BALL_SPEEDS: Record<number, number> = { 3: 85, 2: 125, 1: 168 };

// Fallback ball colors (overridden per theme)
export const BALL_COLORS: Record<number, string[]> = {
  3: ['#ff2d55','#ff6b00','#ffcc00'],
  2: ['#00e5ff','#bf5fff','#39ff14'],
  1: ['#ff2d55','#00e5ff','#ffcc00'],
};

export const HOOK_SPEED      = 970;
export const HOOK_WIDTH      = 3;

export const MAX_LIVES       = 3;
export const COMBO_WINDOW    = 3.0;

export const FLOOR_Y         = LOGICAL_HEIGHT - 44;
export const CEILING_Y       = 52;

// Scoring
export const BASE_SCORE: Record<number, number> = { 3: 100, 2: 250, 1: 500 };

// ─── Level definitions (20 defined + infinite scaling) ───────────────────────
export interface LevelDef {
  ballCount:  number;
  speedMult:  number;
  gravMult:   number;
  mixed:      boolean;
  fastBall:   boolean;
  hasTier1:   boolean;   // small balls spawn from start
  bonus:      boolean;   // "bonus round" — no death, just score
  bossWave:   boolean;   // 1 giant ball that splits 4 times
}

export const LEVEL_DEFS: LevelDef[] = [
  // L1 — Tutorial
  { ballCount:1, speedMult:1.00, gravMult:1.00, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:false },
  // L2
  { ballCount:1, speedMult:1.05, gravMult:1.02, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:false },
  // L3
  { ballCount:2, speedMult:1.10, gravMult:1.04, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:false },
  // L4
  { ballCount:2, speedMult:1.15, gravMult:1.06, mixed:false, fastBall:true,  hasTier1:false, bonus:false, bossWave:false },
  // L5 — BOSS
  { ballCount:1, speedMult:1.10, gravMult:1.05, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:true  },
  // L6
  { ballCount:2, speedMult:1.20, gravMult:1.08, mixed:true,  fastBall:false, hasTier1:false, bonus:false, bossWave:false },
  // L7
  { ballCount:3, speedMult:1.25, gravMult:1.10, mixed:false, fastBall:true,  hasTier1:false, bonus:false, bossWave:false },
  // L8
  { ballCount:3, speedMult:1.30, gravMult:1.12, mixed:true,  fastBall:false, hasTier1:false, bonus:false, bossWave:false },
  // L9
  { ballCount:2, speedMult:1.25, gravMult:1.10, mixed:false, fastBall:false, hasTier1:true,  bonus:false, bossWave:false },
  // L10 — BOSS
  { ballCount:1, speedMult:1.20, gravMult:1.10, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:true  },
  // L11
  { ballCount:3, speedMult:1.35, gravMult:1.14, mixed:true,  fastBall:true,  hasTier1:false, bonus:false, bossWave:false },
  // L12
  { ballCount:3, speedMult:1.40, gravMult:1.17, mixed:true,  fastBall:true,  hasTier1:false, bonus:false, bossWave:false },
  // L13
  { ballCount:4, speedMult:1.45, gravMult:1.20, mixed:true,  fastBall:false, hasTier1:true,  bonus:false, bossWave:false },
  // L14
  { ballCount:4, speedMult:1.50, gravMult:1.22, mixed:true,  fastBall:true,  hasTier1:false, bonus:false, bossWave:false },
  // L15 — BOSS
  { ballCount:1, speedMult:1.35, gravMult:1.15, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:true  },
  // L16
  { ballCount:4, speedMult:1.55, gravMult:1.25, mixed:true,  fastBall:true,  hasTier1:true,  bonus:false, bossWave:false },
  // L17
  { ballCount:4, speedMult:1.62, gravMult:1.28, mixed:true,  fastBall:true,  hasTier1:false, bonus:false, bossWave:false },
  // L18
  { ballCount:5, speedMult:1.68, gravMult:1.30, mixed:true,  fastBall:true,  hasTier1:true,  bonus:false, bossWave:false },
  // L19
  { ballCount:5, speedMult:1.75, gravMult:1.33, mixed:true,  fastBall:true,  hasTier1:true,  bonus:false, bossWave:false },
  // L20 — BOSS
  { ballCount:2, speedMult:1.50, gravMult:1.20, mixed:false, fastBall:false, hasTier1:false, bonus:false, bossWave:true  },
];

export function getLevelDef(level: number): LevelDef {
  const idx = Math.min(level - 1, LEVEL_DEFS.length - 1);
  const def = LEVEL_DEFS[idx];
  if (level > LEVEL_DEFS.length) {
    const extra = level - LEVEL_DEFS.length;
    return {
      ...def,
      speedMult: Math.min(def.speedMult + extra * 0.04, 2.8),
      gravMult:  Math.min(def.gravMult  + extra * 0.02, 1.8),
      ballCount: Math.min(def.ballCount + Math.floor(extra / 3), 6),
      bossWave: extra % 5 === 0,
    };
  }
  return def;
}

// Shake presets
export const SHAKE_HIT   = { intensity: 16, duration: 0.45 };
export const SHAKE_POP   = { intensity: 5,  duration: 0.18 };
export const SHAKE_LEVEL = { intensity: 10, duration: 0.55 };
export const SHAKE_BOSS  = { intensity: 22, duration: 0.6  };

// Power-up types
export type PowerUpType = 'shield' | 'slow' | 'multishot' | 'freeze' | 'score2x';

export const POWERUP_COLORS: Record<PowerUpType, string> = {
  shield:     '#00e5ff',
  slow:       '#aa44ff',
  multishot:  '#ffcc00',
  freeze:     '#aaddff',
  score2x:    '#ff44aa',
};
