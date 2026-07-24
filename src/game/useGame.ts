import { useEffect, useRef, useCallback } from 'react';
import { GameState, InputState } from './types';
import { makeInitialState } from './initialState';
import { update } from './update';
import { render } from './renderer';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './constants';
import {
  startMusic, stopMusic, setMusicLevel,
  setMuted, resumeCtx, sfxPause,
} from './audio';

export function useGame(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const stateRef     = useRef<GameState>(makeInitialState());
  const inputRef     = useRef<InputState>({ left: false, right: false, fire: false, pause: false });
  const rafRef       = useRef<number>(0);
  const lastRef      = useRef<number>(0);
  const timeRef      = useRef<number>(0);
  const audioRef     = useRef(false);
  const prevPhaseRef = useRef<string>('onboarding');
  const prevLevelRef = useRef<number>(1);
  const mutedRef     = useRef(false);

  // ── Canvas fit ────────────────────────────────────────────────────────────
  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = canvas.parentElement!;
    const scale = Math.min(p.clientWidth / LOGICAL_WIDTH, p.clientHeight / LOGICAL_HEIGHT);
    const cw = Math.round(LOGICAL_WIDTH  * scale);
    const ch = Math.round(LOGICAL_HEIGHT * scale);
    canvas.style.width  = `${cw}px`;
    canvas.style.height = `${ch}px`;
    canvas.style.left   = `${(p.clientWidth  - cw) / 2}px`;
    canvas.style.top    = `${(p.clientHeight - ch) / 2}px`;
  }, [canvasRef]);

  // ── Game loop ─────────────────────────────────────────────────────────────
  const loop = useCallback((timestamp: number) => {
    const dt = Math.min((timestamp - lastRef.current) / 1000, 0.05);
    lastRef.current = timestamp;
    timeRef.current += dt;

    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx)  { rafRef.current = requestAnimationFrame(loop); return; }

    const input = { ...inputRef.current };
    inputRef.current.fire  = false;
    inputRef.current.pause = false;

    stateRef.current = update(stateRef.current, dt, input, audioRef.current);
    const s = stateRef.current;

    // ── Audio phase transitions ──────────────────────────────────────────
    const phase = s.phase;
    const level = s.level;

    if (prevPhaseRef.current !== phase) {
      if ((phase === 'playing' || phase === 'boss_intro') &&
          (prevPhaseRef.current === 'title' || prevPhaseRef.current === 'levelup' || prevPhaseRef.current === 'onboarding')) {
        startMusic(level);
        audioRef.current = true;
      }
      if (phase === 'gameover' || phase === 'title' || phase === 'onboarding') {
        stopMusic();
      }
      if (phase === 'playing' && prevPhaseRef.current === 'dead') {
        resumeCtx();
      }
      prevPhaseRef.current = phase;
    }

    if (level !== prevLevelRef.current) {
      setMusicLevel(level);
      prevLevelRef.current = level;
    }

    render(ctx, s, timeRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [canvasRef]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') { e.preventDefault(); inputRef.current.left  = true; }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); inputRef.current.right = true; }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); inputRef.current.fire = true; }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        inputRef.current.pause = true;
        if (audioRef.current) sfxPause();
      }
      if (e.code === 'KeyM') { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); }
      if (!audioRef.current && stateRef.current.phase === 'playing') {
        resumeCtx(); audioRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') inputRef.current.left  = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputRef.current.right = false;
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fitCanvas();
    const ro = new ResizeObserver(fitCanvas);
    const parent = canvasRef.current?.parentElement;
    if (parent) ro.observe(parent);
    window.addEventListener('resize', fitCanvas);
    return () => { ro.disconnect(); window.removeEventListener('resize', fitCanvas); };
  }, [fitCanvas, canvasRef]);

  // ── Start RAF ─────────────────────────────────────────────────────────────
  useEffect(() => {
    lastRef.current = performance.now();
    rafRef.current  = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); stopMusic(); };
  }, [loop]);

  // ── Touch / mobile ────────────────────────────────────────────────────────
  const touchLeft   = useCallback((d: boolean) => { inputRef.current.left  = d; resumeCtx(); }, []);
  const touchRight  = useCallback((d: boolean) => { inputRef.current.right = d; resumeCtx(); }, []);
  const touchFire   = useCallback(() => {
    inputRef.current.fire = true; resumeCtx(); audioRef.current = true;
    if (stateRef.current.phase === 'title' || stateRef.current.phase === 'onboarding') startMusic(1);
  }, []);
  const touchPause  = useCallback(() => { inputRef.current.pause = true; if (audioRef.current) sfxPause(); }, []);
  const toggleMute  = useCallback(() => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); return mutedRef.current; }, []);

  return { touchLeft, touchRight, touchFire, touchPause, toggleMute };
}
