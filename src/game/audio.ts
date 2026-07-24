// ─── Pang Genesis – Procedural Audio Engine v2 ───────────────────────────────

let _ac: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain:  GainNode | null = null;
let sfxGain:    GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let _muted = false;

// ── Context / Routing ────────────────────────────────────────────────────────
function getAC(): AudioContext {
  if (!_ac) {
    _ac = new AudioContext();
    masterGain = _ac.createGain();
    masterGain.gain.value = _muted ? 0 : 0.78;
    masterGain.connect(_ac.destination);

    // Reverb for SFX
    reverbGain = _ac.createGain();
    reverbGain.gain.value = 0.22;
    reverbGain.connect(masterGain);
    reverbNode = makeReverb(_ac, reverbGain, 1.2);

    musicGain = _ac.createGain();
    musicGain.gain.value = 0.50;
    musicGain.connect(masterGain);

    sfxGain = _ac.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(masterGain);
  }
  return _ac;
}

function makeReverb(ac: AudioContext, dest: AudioNode, duration: number): ConvolverNode {
  const len  = ac.sampleRate * duration;
  const buf  = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  const conv = ac.createConvolver();
  conv.buffer = buf;
  conv.connect(dest);
  return conv;
}

// ── Tuning ────────────────────────────────────────────────────────────────────
// Modes: offsets from root
const MODES: Record<string, number[]> = {
  minor:    [0,2,3,5,7,8,10],
  major:    [0,2,4,5,7,9,11],
  dorian:   [0,2,3,5,7,9,10],
  phrygian: [0,1,3,5,7,8,10],
};

function noteHz(root: number, degree: number, octave = 0): number {
  // root = semitones above C1 (C1 = 32.7 Hz)
  return 32.7 * Math.pow(2, (root + degree + octave * 12) / 12);
}

// ── Oscillator helpers ────────────────────────────────────────────────────────
function osc(
  dest: AudioNode, type: OscillatorType,
  freq: number, gain: number,
  t: number, dur: number,
  detune = 0, attack = 0.01, release: number | null = null,
) {
  const ac = getAC();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type; o.frequency.value = freq; o.detune.value = detune;
  const rel = release ?? dur * 0.7;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + dur - rel);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}

function noiseBuffer(ac: AudioContext, dur: number): AudioBuffer {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(
  dest: AudioNode, gain: number, t: number, dur: number,
  filtType: BiquadFilterType = 'bandpass', filtFreq = 1000, Q = 1,
) {
  const ac = getAC();
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, dur + 0.05);
  const f = ac.createBiquadFilter();
  f.type = filtType; f.frequency.value = filtFreq; f.Q.value = Q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(t); src.stop(t + dur + 0.06);
}

// ─── Music System ─────────────────────────────────────────────────────────────
let schedTimer: ReturnType<typeof setInterval> | null = null;
let nextBarTime = 0;
let _musicKey  = 0;
let _musicMode: keyof typeof MODES = 'minor';
let _bpm = 118;
let _heat = 0;   // 0..1 intensity

const LOOKAHEAD = 0.28;
const TICK_MS   = 90;

function scheduleTick() {
  const ac = getAC();
  if (!musicGain) return;
  const barDur = (60 / _bpm) * 4;
  while (nextBarTime < ac.currentTime + LOOKAHEAD) {
    scheduleBar(nextBarTime);
    nextBarTime += barDur;
  }
}

function scheduleBar(bt: number) {
  const ac = getAC();
  if (!musicGain) return;
  const beat = 60 / _bpm;
  const step = beat / 2;
  const scale = MODES[_musicMode];
  const root = _musicKey;

  // ── Bass ────────────────────────────────────────────────────────────────
  const bassNotes = [0, 0, scale[4], 0, scale[2], 0, scale[4], scale[2]];
  for (let i = 0; i < 8; i++) {
    const t = bt + i * step;
    const deg = bassNotes[i];
    const f = noteHz(root, deg, 1);
    const filt = ac.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 800 + _heat * 600;
    filt.connect(musicGain);
    osc(filt, 'sawtooth', f, 0.30 + _heat * 0.08, t, step * 0.88, 0, 0.008, step * 0.25);
  }

  // ── Chords ──────────────────────────────────────────────────────────────
  const chordDeg = [[0, scale[2], scale[4]], [scale[4], scale[6]??scale[0], scale[2]]];
  const chordBeat = [0, 4];
  for (let ci = 0; ci < 2; ci++) {
    const t = bt + chordBeat[ci] * step;
    for (const deg of chordDeg[ci % 2]) {
      const f = noteHz(root, deg, 2);
      osc(musicGain, 'sawtooth', f, 0.035, t, beat * 1.8, -8, 0.015);
      osc(musicGain, 'sawtooth', f, 0.035, t, beat * 1.8, +8, 0.015);
    }
  }

  // ── Lead ────────────────────────────────────────────────────────────────
  if (_heat > 0.3) {
    const leadPat = [0, 4, 2, 6, 4, 2, 5, 3].map(i => scale[i % scale.length]);
    for (let i = 0; i < 8; i++) {
      if (Math.random() > 0.35 + _heat * 0.3) {
        const t = bt + i * step;
        const f = noteHz(root, leadPat[i], 3);
        osc(musicGain, 'square', f, 0.045 + _heat * 0.025, t, step * 0.65, 0, 0.005, step * 0.4);
      }
    }
  }

  // ── Arp ─────────────────────────────────────────────────────────────────
  if (_heat > 0.6) {
    for (let i = 0; i < 16; i++) {
      const t = bt + i * (step / 2);
      const deg = scale[i % scale.length];
      osc(musicGain, 'triangle', noteHz(root, deg, 3 + Math.floor(i/7)), 0.022, t, step * 0.3, 0, 0.003);
    }
  }

  // ── Kick ────────────────────────────────────────────────────────────────
  for (const i of [0, 4, (Math.random() > 0.7 ? 6 : 8)]) {
    if (i >= 8) continue;
    const t = bt + i * step;
    const ko = ac.createOscillator();
    const kg = ac.createGain();
    ko.type = 'sine';
    ko.frequency.setValueAtTime(180, t);
    ko.frequency.exponentialRampToValueAtTime(38, t + 0.09);
    kg.gain.setValueAtTime(0.65, t);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    ko.connect(kg); kg.connect(musicGain);
    ko.start(t); ko.stop(t + 0.16);
  }

  // ── Snare ───────────────────────────────────────────────────────────────
  for (const i of [2, 6]) {
    const t = bt + i * step;
    noise(musicGain, 0.28, t, 0.12, 'highpass', 1800 + _heat * 1000, 2);
    // Snare body
    const so = ac.createOscillator();
    const sg = ac.createGain();
    so.type = 'triangle'; so.frequency.value = 180;
    sg.gain.setValueAtTime(0.18, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    so.connect(sg); sg.connect(musicGain);
    so.start(t); so.stop(t + 0.12);
  }

  // ── Hi-hat ──────────────────────────────────────────────────────────────
  const hhSteps = _heat > 0.5 ? 16 : 8;
  for (let i = 0; i < hhSteps; i++) {
    if (_heat < 0.2 && i % 2 !== 0) continue;
    const t = bt + i * (step / (hhSteps / 8));
    const open = (i === 2 || i === 6);
    noise(musicGain, open ? 0.055 : 0.032, t, open ? 0.09 : 0.04, 'highpass', 9000, 3);
  }

  // ── Bassline sub thump ───────────────────────────────────────────────────
  const so = ac.createOscillator();
  const sg = ac.createGain();
  so.type = 'sine'; so.frequency.value = noteHz(root, 0, 0);
  sg.gain.setValueAtTime(0.4, bt); sg.gain.exponentialRampToValueAtTime(0.0001, bt + beat * 0.6);
  so.connect(sg); sg.connect(musicGain);
  so.start(bt); so.stop(bt + beat * 0.7);
}

export function startMusic(level: number): void {
  const ac = getAC();
  if (ac.state === 'suspended') ac.resume();
  setMusicLevel(level);
  nextBarTime = ac.currentTime + 0.08;
  if (schedTimer) clearInterval(schedTimer);
  scheduleTick();
  schedTimer = setInterval(scheduleTick, TICK_MS);
}

export function stopMusic(): void {
  if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
}

export function setMusicLevel(level: number): void {
  // Map level to musical parameters
  const themes: Array<[number, keyof typeof MODES, number, number]> = [
    // [key, mode, bpm, heat]
    [0,  'minor',    116, 0.0],  // L1-2  space
    [5,  'dorian',   112, 0.2],  // L3-4  ocean
    [3,  'phrygian', 132, 0.4],  // L5-6  neon
    [9,  'minor',    122, 0.45], // L7-8  ice
    [7,  'phrygian', 142, 0.6],  // L9-10 lava
    [2,  'phrygian', 108, 0.5],  // L11-12 haunted
    [5,  'dorian',   148, 0.75], // L13-14 cyber
    [11, 'phrygian', 158, 1.0],  // L15+   void
  ];
  const idx = Math.min(Math.floor((level - 1) / 2), themes.length - 1);
  const [key, mode, bpm, heatBase] = themes[idx];
  _musicKey  = key;
  _musicMode = mode;
  _bpm       = bpm + Math.min(level * 1.5, 30);
  _heat      = Math.min(heatBase + (level - 1) * 0.02, 1);
}

export function resumeCtx(): void {
  if (_ac?.state === 'suspended') _ac.resume();
}

// ─── SFX ──────────────────────────────────────────────────────────────────────
export function sfxShoot(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  osc(sfxGain, 'sawtooth', 1400, 0.15, t, 0.05, 0, 0.002, 0.04);
  osc(sfxGain, 'square',    700, 0.10, t + 0.02, 0.04, 0, 0.002);
  noise(sfxGain, 0.06, t, 0.04, 'highpass', 5000, 2);
}

export function sfxPop(tier: number, isBoss = false): void {
  const ac = getAC(); if (!sfxGain || !reverbNode) return;
  const t = ac.currentTime;
  const baseFreqs = [1100, 750, 450];
  const f = baseFreqs[Math.min(tier - 1, 2)] * (isBoss ? 0.5 : 1);
  const g = isBoss ? 0.7 : 0.45;

  const ko = ac.createOscillator();
  const kg = ac.createGain();
  ko.type = 'sine';
  ko.frequency.setValueAtTime(f * 1.8, t);
  ko.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.14);
  kg.gain.setValueAtTime(g, t);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  ko.connect(kg);
  kg.connect(sfxGain);
  if (reverbNode) kg.connect(reverbNode);
  ko.start(t); ko.stop(t + 0.25);

  noise(sfxGain, isBoss ? 0.4 : 0.22, t, isBoss ? 0.25 : 0.15, 'bandpass', 1500, 2);
}

export function sfxCombo(combo: number): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  const scale = MODES['major'];
  const n = Math.min(combo - 2, scale.length - 1);
  const f = noteHz(0, scale[n], 3 + Math.floor(combo / 5));
  osc(sfxGain, 'sine',     f, 0.22, t, 0.18, 0, 0.004, 0.12);
  osc(sfxGain, 'triangle', f * 2, 0.08, t + 0.04, 0.12);
  if (combo >= 5) osc(sfxGain, 'sine', f * 1.5, 0.12, t + 0.02, 0.15);
}

export function sfxDeath(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  for (let i = 0; i < 6; i++) {
    osc(sfxGain, 'sawtooth', 380 - i * 52, 0.28, t + i * 0.065, 0.10);
  }
  noise(sfxGain, 0.45, t, 0.5, 'lowpass', 800, 1);
}

export function sfxLevelClear(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  const mel = [0, 4, 7, 12, 16, 19, 24];
  for (let i = 0; i < mel.length; i++) {
    const f = noteHz(0, mel[i], 3);
    osc(sfxGain, 'sine', f, 0.30, t + i * 0.075, 0.25, 0, 0.005, 0.15);
    if (i >= 4) osc(sfxGain, 'triangle', f * 2, 0.12, t + i * 0.075, 0.20);
  }
}

export function sfxBounce(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  osc(sfxGain, 'sine', 190, 0.06, t, 0.055, 0, 0.003);
}

export function sfxWallBounce(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  osc(sfxGain, 'sine', 130, 0.045, t, 0.04, 0, 0.003);
}

export function sfxPowerUp(type: string): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  const freqs: Record<string, number[]> = {
    shield:     [440, 660, 880],
    slow:       [330, 264, 220],
    multishot:  [550, 770, 990],
    freeze:     [880, 1100, 1320],
    score2x:    [660, 990, 1320],
  };
  const fs = freqs[type] ?? [440, 550, 660];
  for (let i = 0; i < fs.length; i++) {
    osc(sfxGain, 'sine', fs[i], 0.22, t + i * 0.06, 0.18, 0, 0.004, 0.12);
  }
  noise(sfxGain, 0.08, t, 0.2, 'bandpass', 3000, 2);
}

export function sfxBossRoar(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  const dist = ac.createWaveShaper();
  // Distortion curve
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (3 + 80) * x * 20 * (Math.PI / 180) / (Math.PI + 80 * Math.abs(x)); }
  dist.curve = curve;
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(80, t);
  o.frequency.linearRampToValueAtTime(35, t + 1.2);
  o.frequency.setValueAtTime(120, t + 1.2);
  o.frequency.exponentialRampToValueAtTime(50, t + 2.0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.1);
  g.gain.setValueAtTime(0.55, t + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  o.connect(dist); dist.connect(g); g.connect(sfxGain);
  o.start(t); o.stop(t + 2.3);
  noise(sfxGain, 0.35, t, 2.2, 'lowpass', 300, 0.5);
}

export function sfxPause(): void {
  const ac = getAC(); if (!sfxGain) return;
  const t = ac.currentTime;
  osc(sfxGain, 'sine', 440, 0.12, t, 0.08, 0, 0.005);
  osc(sfxGain, 'sine', 330, 0.09, t + 0.08, 0.08, 0, 0.005);
}

export function setMuted(m: boolean): void {
  _muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.78;
}
