// ─── Entity Types ─────────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number }
export interface TrailPoint { x: number; y: number; age: number }

export interface Ball {
  id:         number;
  x:          number;
  y:          number;
  vx:         number;
  vy:         number;
  radius:     number;
  tier:       number;
  color:      string;
  glowColor:  string;
  flash:      number;
  rotation:   number;
  rotSpeed:   number;
  trail:      TrailPoint[];
  pulsePhase: number;
  bounceSfxCooldown: number;
  wobble:     number;
  isBoss:     boolean;     // boss ball (extra large, more splits)
  frozen:     number;      // seconds remaining frozen
  colorAlt:   string;      // secondary color for boss rings
}

export interface Hook {
  id:     number;
  x:      number;
  tipY:   number;
  baseY:  number;
  active: boolean;
  age:    number;
  wide:   boolean;   // multishot power-up makes it wide
}

export interface Player {
  x:          number;
  y:          number;
  lives:      number;
  invincible: number;
  thrustTime: number;
  velX:       number;
  shield:     number;   // seconds of active shield
  slow:       number;   // seconds of slow active
  multishot:  number;   // seconds of multishot
  freeze:     number;   // seconds of freeze active
  score2x:    number;   // seconds of 2x score
}

export interface PowerUp {
  id:    number;
  x:     number;
  y:     number;
  vy:    number;
  type:  import('./constants').PowerUpType;
  life:  number;
  spin:  number;
  pulse: number;
}

export interface ScorePopup {
  id:      number;
  x:       number;
  y:       number;
  text:    string;
  color:   string;
  life:    number;
  maxLife: number;
  vy:      number;
  scale:   number;
}

export interface ScreenShake {
  x:         number;
  y:         number;
  intensity: number;
  duration:  number;
}

export interface PulseRing {
  id:      number;
  x:       number;
  y:       number;
  radius:  number;
  maxR:    number;
  color:   string;
  life:    number;
  maxLife: number;
}

export interface AmbientParticle {
  id:   number;
  x:    number;
  y:    number;
  vx:   number;
  vy:   number;
  r:    number;
  life: number;
  maxLife: number;
  color: string;
  type: string;  // 'bubble' | 'ember' | 'snow' | 'mote' | 'rain' | 'spark'
}

export type GamePhase =
  | 'onboarding'   // step-by-step tutorial
  | 'title'
  | 'playing'
  | 'dead'
  | 'levelup'
  | 'gameover'
  | 'boss_intro'   // dramatic boss entrance
  | 'paused';

export interface OnboardingStep {
  title:    string;
  body:     string;
  icon:     string;
  action:   string;
  demo:     'move' | 'shoot' | 'split' | 'combo' | 'powerup' | 'none';
}

export interface DifficultyConfig {
  level:       number;
  ballCount:   number;
  speedMult:   number;
  gravityMult: number;
  hasMixed:    boolean;
  hasSpeedBall:boolean;
  bossWave:    boolean;
  bpm:         number;
}

export interface GameState {
  phase:            GamePhase;
  prevPhase:        GamePhase;
  score:            number;
  level:            number;
  combo:            number;
  comboTimer:       number;
  comboDisplay:     number;
  maxCombo:         number;
  player:           Player;
  balls:            Ball[];
  hooks:            Hook[];
  powerUps:         PowerUp[];
  nextId:           number;
  flashParticles:   FlashParticle[];
  ambientParticles: AmbientParticle[];
  scorePopups:      ScorePopup[];
  pulseRings:       PulseRing[];
  shake:            ScreenShake;
  levelTimer:       number;
  titleTimer:       number;
  difficulty:       DifficultyConfig;
  highScore:        number;
  bgScrollX:        number;
  bgScrollY:        number;
  levelFlash:       number;
  themeTransition:  number;   // 0→1 fade when changing theme
  onboardStep:      number;   // current onboarding step index
  onboardTimer:     number;   // time on current step
  bossIntroTimer:   number;
  totalBallsPopped: number;
  timeAlive:        number;
  glitchTimer:      number;   // for cyber theme glitch effect
}

export interface FlashParticle {
  id:      number;
  x:       number;
  y:       number;
  vx:      number;
  vy:      number;
  r:       number;
  color:   string;
  life:    number;
  maxLife: number;
  type:    'spark' | 'smoke' | 'star' | 'ring';
}

export interface InputState {
  left:  boolean;
  right: boolean;
  fire:  boolean;
  pause: boolean;
}
