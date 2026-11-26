import { useRef, useState, useCallback } from 'react';
import { useGame } from './game/useGame';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './game/constants';

// ─── Directional Button ───────────────────────────────────────────────────────
function DirBtn({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <button
      aria-label={label}
      style={{
        width: 76, height: 76, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(130,170,255,0.28), rgba(30,50,160,0.16))',
        border: '2px solid rgba(100,160,255,0.38)',
        boxShadow: '0 0 20px rgba(80,120,255,0.22), inset 0 1px 0 rgba(255,255,255,0.10)',
        color: 'rgba(190,220,255,0.9)', fontSize: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none', flexShrink: 0,
      }}
      onPointerDown={e => { e.preventDefault(); onDown(); (e.currentTarget as HTMLElement).style.transform='scale(0.9)'; }}
      onPointerUp={e => { e.preventDefault(); onUp(); (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
      onPointerLeave={e => { e.preventDefault(); onUp(); (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
      onPointerCancel={e => { e.preventDefault(); onUp(); (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}
    >{label}</button>
  );
}

// ─── Fire Button ──────────────────────────────────────────────────────────────
function FireBtn({ onFire }: { onFire: () => void }) {
  return (
    <button
      aria-label="Tirer"
      style={{
        width: 88, height: 88, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(140,210,255,0.42), rgba(30,80,200,0.22))',
        border: '2.5px solid rgba(120,200,255,0.52)',
        boxShadow: '0 0 28px rgba(80,160,255,0.38), 0 0 55px rgba(40,100,255,0.14), inset 0 1px 0 rgba(255,255,255,0.18)',
        color: 'rgba(220,245,255,0.95)', fontSize: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none', flexShrink: 0,
      }}
      onPointerDown={e => {
        e.preventDefault(); onFire();
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'scale(0.88)';
        el.style.boxShadow = '0 0 50px rgba(80,200,255,0.85), 0 0 100px rgba(40,120,255,0.30)';
        setTimeout(() => {
          el.style.transform = 'scale(1)';
          el.style.boxShadow = '0 0 28px rgba(80,160,255,0.38), 0 0 55px rgba(40,100,255,0.14)';
        }, 110);
      }}
      onPointerUp={e => e.preventDefault()}
    >⚡</button>
  );
}

// ─── Pause Button ─────────────────────────────────────────────────────────────
function PauseBtn({ onPause }: { onPause: () => void }) {
  return (
    <button
      aria-label="Mettre en pause"
      style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(20,30,70,0.75)',
        border: '1.5px solid rgba(80,120,255,0.38)',
        color: 'rgba(160,200,255,0.85)', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none', flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}
      onPointerDown={e => { e.preventDefault(); onPause(); }}
    >⏸</button>
  );
}

// ─── Mute Button ──────────────────────────────────────────────────────────────
function MuteBtn({ onToggle }: { onToggle: () => boolean }) {
  const [muted, setMuted] = useState(false);
  const handle = useCallback(() => setMuted(onToggle()), [onToggle]);
  return (
    <button
      aria-label={muted ? 'Activer le son' : 'Couper le son'}
      onClick={handle}
      style={{
        position: 'absolute', top: 10, right: 10,
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(15,22,60,0.78)',
        border: '1.5px solid rgba(80,120,255,0.32)',
        color: muted ? 'rgba(100,120,180,0.45)' : 'rgba(170,210,255,0.9)',
        fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 20, boxShadow: '0 2px 14px rgba(0,0,0,0.45)',
      }}
    >{muted ? '🔇' : '🔊'}</button>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { touchLeft, touchRight, touchFire, touchPause, toggleMute } = useGame(canvasRef);

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      <MuteBtn onToggle={toggleMute} />

      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          style={{ position: 'absolute', imageRendering: 'auto' }}
        />
      </div>

      {/* Mobile controls */}
      <div className="touch-controls" style={{
        width: '100%', maxWidth: LOGICAL_WIDTH,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 22px 14px', gap: 12, flexShrink: 0,
      }}>
        <DirBtn label="◀" onDown={() => touchLeft(true)} onUp={() => touchLeft(false)} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <FireBtn onFire={touchFire} />
          <PauseBtn onPause={touchPause} />
        </div>
        <DirBtn label="▶" onDown={() => touchRight(true)} onUp={() => touchRight(false)} />
      </div>

      {/* Desktop hint */}
      <div className="keyboard-hint" style={{
        color: 'rgba(55,90,170,0.48)', fontSize: 11,
        letterSpacing: '0.14em', paddingBottom: 5, flexShrink: 0,
        textTransform: 'uppercase',
      }}>
        ← → / A D &nbsp;Déplacer &nbsp;|&nbsp; Espace / ↑ / W &nbsp;Tirer &nbsp;|&nbsp; P &nbsp;Pause &nbsp;|&nbsp; M &nbsp;Muet
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { background: #000; margin: 0; }
        @media (hover: hover) and (pointer: fine) {
          .touch-controls { display: none !important; }
          .keyboard-hint  { display: block !important; }
        }
        @media (hover: none), (pointer: coarse) {
          .touch-controls { display: flex !important; }
          .keyboard-hint  { display: none !important; }
        }
      `}</style>
    </div>
  );
}
