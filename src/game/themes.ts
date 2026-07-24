// ─── Level Themes ─────────────────────────────────────────────────────────────
// Each theme defines the visual style, colors, music key, ball palette, etc.

export interface LevelTheme {
  id:           string;
  name:         string;
  subtitle:     string;
  bgImage:      string | null;   // URL or null (use procedural)
  bgTint:       string;          // overlay color (rgba)
  floorColor:   string;
  ceilColor:    string;
  gridColor:    string;
  accentA:      string;          // primary accent
  accentB:      string;          // secondary accent
  playerColor:  string[];        // [top, mid, bottom, glow]
  ballPalette:  string[][];      // per-tier colors [tier3[], tier2[], tier1[]]
  hookColor:    string;
  hookGlow:     string;
  particleColor:string;
  musicKey:     number;          // semitone offset for music (0=C, 5=F, 7=G, etc)
  musicMode:    'minor' | 'major' | 'phrygian' | 'dorian';
  bpmBase:      number;
  ambientDesc:  string;          // description shown in onboarding
  nebulaColors: string[];        // for procedural BG overlay
  scanlineAlpha:number;
  vignetteColor:string;
  specialFX:    string;          // 'rain' | 'embers' | 'bubbles' | 'snow' | 'sparks' | 'motes' | 'glitch' | 'none'
}

export const THEMES: LevelTheme[] = [
  // ── LEVEL 1-2 : SPACE ──────────────────────────────────────────────────────
  {
    id: 'space', name: 'ESPACE PROFOND', subtitle: 'Le commencement',
    bgImage: '/bg/space.jpg',
    bgTint: 'rgba(5,8,30,0.45)',
    floorColor: '#1a2a80', ceilColor: '#2233cc',
    gridColor: 'rgba(40,80,200,0.08)',
    accentA: '#4488ff', accentB: '#8844ff',
    playerColor: ['#ddeeff','#aaccff','#4455aa','#88aaff'],
    ballPalette: [
      ['#ff3a6e','#ff7700','#ffdd00'],
      ['#00e5ff','#aa44ff','#39ff14'],
      ['#ff3a6e','#00e5ff','#ffdd00'],
    ],
    hookColor: '#e8f4ff', hookGlow: '#88ccff',
    particleColor: '#88aaff',
    musicKey: 0, musicMode: 'minor', bpmBase: 115,
    ambientDesc: 'Flottez dans le néant — maîtrisez les bases',
    nebulaColors: ['40,20,80','10,40,100','80,20,60'],
    scanlineAlpha: 0.03, vignetteColor: '3,4,20',
    specialFX: 'none',
  },

  // ── LEVEL 3-4 : OCEAN ──────────────────────────────────────────────────────
  {
    id: 'ocean', name: 'ABYSSE OCEANIQUE', subtitle: 'La pression monte',
    bgImage: '/bg/ocean.jpg',
    bgTint: 'rgba(0,15,40,0.50)',
    floorColor: '#004466', ceilColor: '#006699',
    gridColor: 'rgba(0,150,200,0.07)',
    accentA: '#00ccff', accentB: '#0066ff',
    playerColor: ['#ccffff','#66ccff','#003366','#00ccff'],
    ballPalette: [
      ['#00ccff','#0088ff','#00ffcc'],
      ['#ff6699','#66ffff','#ffcc00'],
      ['#00ffcc','#0099ff','#ff3399'],
    ],
    hookColor: '#ccffff', hookGlow: '#00aaff',
    particleColor: '#00ccff',
    musicKey: 5, musicMode: 'dorian', bpmBase: 110,
    ambientDesc: 'Les profondeurs de l\'océan cachent des créatures étranges',
    nebulaColors: ['0,30,80','0,60,100','0,20,60'],
    scanlineAlpha: 0.04, vignetteColor: '0,10,30',
    specialFX: 'bubbles',
  },

  // ── LEVEL 5-6 : NEON CITY ──────────────────────────────────────────────────
  {
    id: 'neon', name: 'VILLE NEON', subtitle: 'La jungle urbaine',
    bgImage: '/bg/neon.jpg',
    bgTint: 'rgba(10,0,20,0.40)',
    floorColor: '#550044', ceilColor: '#aa0088',
    gridColor: 'rgba(200,0,150,0.08)',
    accentA: '#ff00aa', accentB: '#00ffee',
    playerColor: ['#ffccee','#ff88cc','#660033','#ff00aa'],
    ballPalette: [
      ['#ff00aa','#ff4400','#ffee00'],
      ['#00ffee','#aa00ff','#ff0066'],
      ['#ff00aa','#00ffee','#ff8800'],
    ],
    hookColor: '#ffccee', hookGlow: '#ff00aa',
    particleColor: '#ff44cc',
    musicKey: 3, musicMode: 'phrygian', bpmBase: 130,
    ambientDesc: 'Les rues trempées pulsent de lumière néon',
    nebulaColors: ['80,0,60','40,0,80','100,0,40'],
    scanlineAlpha: 0.055, vignetteColor: '10,0,20',
    specialFX: 'rain',
  },

  // ── LEVEL 7-8 : ICE CAVE ───────────────────────────────────────────────────
  {
    id: 'ice', name: 'ABYSSE GELÉ', subtitle: 'Le froid s\'intensifie',
    bgImage: '/bg/ice.jpg',
    bgTint: 'rgba(0,10,30,0.40)',
    floorColor: '#003366', ceilColor: '#0055aa',
    gridColor: 'rgba(100,200,255,0.07)',
    accentA: '#aaddff', accentB: '#ffffff',
    playerColor: ['#eef8ff','#aaddff','#003366','#aaddff'],
    ballPalette: [
      ['#aaddff','#88ccff','#ffffff'],
      ['#ff4488','#ffcc44','#44ffcc'],
      ['#aaddff','#ffffff','#44aaff'],
    ],
    hookColor: '#ffffff', hookGlow: '#aaddff',
    particleColor: '#cceeff',
    musicKey: 9, musicMode: 'minor', bpmBase: 120,
    ambientDesc: 'Des éclats cristallins traversent l\'air gelé',
    nebulaColors: ['20,60,100','50,100,150','10,40,80'],
    scanlineAlpha: 0.025, vignetteColor: '0,10,30',
    specialFX: 'snow',
  },

  // ── LEVEL 9-10 : LAVA WORLD ────────────────────────────────────────────────
  {
    id: 'lava', name: 'NUCLEUS ENFERNAL', subtitle: 'Intensité brûlante',
    bgImage: '/bg/lava.jpg',
    bgTint: 'rgba(30,5,0,0.45)',
    floorColor: '#882200', ceilColor: '#cc4400',
    gridColor: 'rgba(255,80,0,0.07)',
    accentA: '#ff4400', accentB: '#ff8800',
    playerColor: ['#ffeecc','#ffaa44','#661100','#ff6600'],
    ballPalette: [
      ['#ff2200','#ff6600','#ffaa00'],
      ['#ffff00','#ff4400','#ff8800'],
      ['#ff2200','#ff8800','#ffcc00'],
    ],
    hookColor: '#ffeecc', hookGlow: '#ff6600',
    particleColor: '#ff4400',
    musicKey: 7, musicMode: 'phrygian', bpmBase: 140,
    ambientDesc: 'Des rivières de feu bouillonnent sous vos pieds',
    nebulaColors: ['80,20,0','100,40,0','60,10,0'],
    scanlineAlpha: 0.04, vignetteColor: '20,5,0',
    specialFX: 'embers',
  },

  // ── LEVEL 11-12 : HAUNTED ──────────────────────────────────────────────────
  {
    id: 'haunted', name: 'Royaume Hanté', subtitle: 'Les esprits se réveillent',
    bgImage: '/bg/haunted.jpg',
    bgTint: 'rgba(5,15,5,0.50)',
    floorColor: '#112211', ceilColor: '#224422',
    gridColor: 'rgba(80,200,80,0.06)',
    accentA: '#44ff88', accentB: '#00ff44',
    playerColor: ['#ccffcc','#88dd88','#113311','#44ff88'],
    ballPalette: [
      ['#44ff88','#00dd44','#88ffcc'],
      ['#ff88ff','#ffff44','#44ffff'],
      ['#44ff88','#88ffcc','#ff88ff'],
    ],
    hookColor: '#ccffcc', hookGlow: '#44ff88',
    particleColor: '#44ff88',
    musicKey: 2, musicMode: 'phrygian', bpmBase: 105,
    ambientDesc: 'Quelque chose s\'agite dans l\'obscurité entre les mondes',
    nebulaColors: ['10,40,10','20,60,20','5,30,5'],
    scanlineAlpha: 0.06, vignetteColor: '5,10,5',
    specialFX: 'motes',
  },

  // ── LEVEL 13-14 : CYBER ────────────────────────────────────────────────────
  {
    id: 'cyber', name: 'MATRICE CYBER', subtitle: 'Surcharge de données',
    bgImage: '/bg/cyber.jpg',
    bgTint: 'rgba(0,15,5,0.40)',
    floorColor: '#003300', ceilColor: '#005500',
    gridColor: 'rgba(0,255,80,0.10)',
    accentA: '#00ff44', accentB: '#44ffaa',
    playerColor: ['#ccffdd','#88ffaa','#003311','#00ff66'],
    ballPalette: [
      ['#00ff44','#00dd88','#88ff00'],
      ['#ff4400','#ffcc00','#00ccff'],
      ['#00ff44','#88ff00','#ff4400'],
    ],
    hookColor: '#ccffdd', hookGlow: '#00ff44',
    particleColor: '#00ff66',
    musicKey: 5, musicMode: 'dorian', bpmBase: 145,
    ambientDesc: 'Hacker le système — chaque boule est un noeud corrompu',
    nebulaColors: ['0,40,10','0,60,20','0,30,5'],
    scanlineAlpha: 0.08, vignetteColor: '0,10,5',
    specialFX: 'glitch',
  },

  // ── LEVEL 15+ : VOID ───────────────────────────────────────────────────────
  {
    id: 'void', name: 'LE VIDE', subtitle: 'Aucune échappatoire',
    bgImage: '/bg/void.jpg',
    bgTint: 'rgba(15,0,30,0.45)',
    floorColor: '#330044', ceilColor: '#660088',
    gridColor: 'rgba(150,0,255,0.08)',
    accentA: '#cc00ff', accentB: '#ff00aa',
    playerColor: ['#ffccff','#cc88ff','#220033','#cc00ff'],
    ballPalette: [
      ['#cc00ff','#ff00aa','#ffaa00'],
      ['#00ffee','#ff00cc','#ffff00'],
      ['#cc00ff','#ff00aa','#00ffcc'],
    ],
    hookColor: '#ffccff', hookGlow: '#cc00ff',
    particleColor: '#cc44ff',
    musicKey: 11, musicMode: 'phrygian', bpmBase: 155,
    ambientDesc: 'La réalité elle-même s\'est effondrée — survivez au chaos',
    nebulaColors: ['60,0,80','80,0,60','40,0,100'],
    scanlineAlpha: 0.05, vignetteColor: '10,0,20',
    specialFX: 'sparks',
  },
];

export function getTheme(level: number): LevelTheme {
  // Each theme covers 2 levels, cycle after all themes used
  const idx = Math.floor((level - 1) / 2) % THEMES.length;
  return THEMES[idx];
}

export function getThemeProgress(level: number): number {
  // 0..1 within current theme (for transitions)
  return ((level - 1) % 2) / 2;
}
