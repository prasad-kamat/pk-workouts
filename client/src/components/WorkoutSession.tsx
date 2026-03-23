import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useFlipImage } from '../hooks/useFlipImage';
import type { Exercise } from '../types';

interface Props {
  exercises: Exercise[];
  onExit: () => void;
  onPreference: (id: number, pref: 'liked' | 'disliked' | null) => void;
}

export default function WorkoutSession({ exercises, onExit, onPreference }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setsLogged,   setSetsLogged]   = useState<number[]>([]);
  const [countdown,    setCountdown]    = useState<number | null>(null);
  const [done,         setDone]         = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const flipSpeed  = useAppStore(s => s.flipSpeed);
  const ex         = exercises[currentIndex];
  const currentImg = useFlipImage(ex?.video_url ?? null, flipSpeed);

  const allSets    = ex ? Array.from({ length: ex.sets }) : [];
  const isComplete = setsLogged.length === ex?.sets;
  const isLast     = currentIndex === exercises.length - 1;

  const instructions: string[] = (() => {
    try { return JSON.parse(ex?.instructions || '[]'); } catch { return []; }
  })();

  useEffect(() => {
    if (isComplete && countdown === null) setCountdown(5);
  }, [isComplete]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { clearInterval(countdownRef.current); advance(); return; }
    countdownRef.current = setInterval(() => setCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearInterval(countdownRef.current);
  }, [countdown]);

  function advance() {
    clearInterval(countdownRef.current);
    setCountdown(null);
    if (isLast) { setDone(true); }
    else { setCurrentIndex(i => i + 1); setSetsLogged([]); }
  }

  function logSet() {
    if (setsLogged.length < ex.sets) setSetsLogged(p => [...p, ex.reps_min]);
  }
  function undoSet() {
    if (countdown !== null) { clearInterval(countdownRef.current); setCountdown(null); }
    setSetsLogged(p => p.slice(0, -1));
  }

  if (done) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-6 px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle at 50% 40%, #3B82F6, transparent 70%)' }} />
      <div className="text-7xl relative">🎉</div>
      <h1 className="text-3xl font-bold relative">Workout Done!</h1>
      <p className="text-zinc-400 relative">You crushed {exercises.length} exercises today.</p>
      <button
        onClick={onExit}
        className="mt-4 px-8 py-4 rounded-2xl font-bold text-lg text-white active:scale-95 transition-transform relative shadow-lg"
        style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
      >
        Back to Overview
      </button>
    </div>
  );

  const progressPct = ((currentIndex + (isComplete ? 1 : 0)) / exercises.length) * 100;

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-24">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={onExit}
          className="text-zinc-500 text-sm flex items-center gap-1 active:text-white transition-colors"
        >
          ✕ Exit
        </button>
        <span className="text-sm font-semibold text-zinc-400">
          {currentIndex + 1} <span className="text-zinc-600">/</span> {exercises.length}
        </span>
        <div className="w-12" />
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1E2D45' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #2563EB, #3B82F6)',
            }}
          />
        </div>
      </div>

      {/* Muscle group + name */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ex.color_hex }} />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {ex.muscle_group_display}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ex.name}</h2>
        <p className="text-zinc-500 text-sm mt-0.5">
          {ex.sets} sets · {ex.reps_min}–{ex.reps_max} reps
        </p>
      </div>

      {/* Flip image */}
      <div className="px-4 mt-2">
        <div className="rounded-2xl overflow-hidden aspect-video w-full border border-border"
             style={{ backgroundColor: '#0D1525' }}>
          {currentImg
            ? <img src={currentImg} alt={ex.name} className="w-full h-full object-contain" />
            : <div className="w-full h-full flex items-center justify-center text-5xl">💪</div>
          }
        </div>
      </div>

      {/* Set tracker */}
      <div className="px-4 mt-5">
        <div className="flex gap-2 mb-3">
          {allSets.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all border"
              style={{
                backgroundColor: i < setsLogged.length ? ex.color_hex : '#141C2E',
                borderColor:     i < setsLogged.length ? ex.color_hex : '#1E2D45',
                color:           i < setsLogged.length ? '#fff' : '#4B6080',
              }}
            >
              {i < setsLogged.length ? '✓' : `S${i + 1}`}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {!isComplete ? (
            <button
              onClick={logSet}
              className="flex-1 py-4 rounded-2xl font-bold text-base text-white active:scale-95 transition-transform shadow-lg"
              style={{ background: `linear-gradient(135deg, ${ex.color_hex}CC, ${ex.color_hex})` }}
            >
              Log Set {setsLogged.length + 1}
            </button>
          ) : (
            <button
              onClick={advance}
              className="flex-1 py-4 rounded-2xl font-bold text-base text-white active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
            >
              {isLast ? '🎉 Finish Workout' : 'Next Exercise'}
              {countdown !== null && !isLast && (
                <span className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-sm font-bold">
                  {countdown}
                </span>
              )}
            </button>
          )}
          {setsLogged.length > 0 && (
            <button
              onClick={undoSet}
              className="px-5 py-4 rounded-2xl font-semibold text-sm text-zinc-300 active:scale-95 border border-border"
              style={{ backgroundColor: '#141C2E' }}
            >
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      {instructions.length > 0 && (
        <details className="px-4 mt-5 rounded-2xl border border-border mx-4 overflow-hidden"
                 style={{ backgroundColor: '#141C2E' }}>
          <summary className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer select-none flex items-center justify-between">
            Instructions
            <span className="text-zinc-600">▾</span>
          </summary>
          <ol className="flex flex-col gap-2 px-4 pb-4">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: ex.color_hex }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* Like / dislike */}
      <div className="flex gap-2 px-4 mt-4">
        <button
          onClick={() => onPreference(ex.id, ex.preference === 'liked' ? null : 'liked')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border
            ${ex.preference === 'liked'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'text-zinc-500 border-border'}`}
          style={ex.preference !== 'liked' ? { backgroundColor: '#141C2E' } : {}}
        >
          👍 Like
        </button>
        <button
          onClick={() => onPreference(ex.id, ex.preference === 'disliked' ? null : 'disliked')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border
            ${ex.preference === 'disliked'
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'text-zinc-500 border-border'}`}
          style={ex.preference !== 'disliked' ? { backgroundColor: '#141C2E' } : {}}
        >
          👎 Skip
        </button>
      </div>
    </div>
  );
}
