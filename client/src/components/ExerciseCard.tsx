import { useState } from 'react';
import { useAppStore } from '../store';
import { useFlipImage } from '../hooks/useFlipImage';
import type { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  readOnly?: boolean;
  onPreference?: (id: number, pref: 'liked' | 'disliked' | null) => void;
}

export default function ExerciseCard({ exercise: ex, readOnly = false, onPreference }: Props) {
  const [setsLogged, setSetsLogged] = useState<number[]>([]);
  const flipSpeed  = useAppStore(s => s.flipSpeed);
  const currentImg = useFlipImage(ex.video_url, flipSpeed);

  const allSets    = Array.from({ length: ex.sets });
  const isComplete = setsLogged.length === ex.sets;

  function logSet() {
    if (setsLogged.length < ex.sets) setSetsLogged(p => [...p, ex.reps_min]);
  }
  function undoSet() {
    setSetsLogged(p => p.slice(0, -1));
  }

  const instructions: string[] = (() => {
    try { return JSON.parse(ex.instructions || '[]'); } catch { return []; }
  })();

  if (readOnly) {
    return (
      <div
        className="rounded-2xl overflow-hidden flex items-center gap-3 px-4 py-3 border border-border"
        style={{ backgroundColor: '#141C2E', borderLeftColor: ex.color_hex, borderLeftWidth: 3 }}
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
          {currentImg
            ? <img src={currentImg} alt={ex.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl">💪</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{ex.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {ex.sets} × {ex.reps_min}–{ex.reps_max} reps
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {allSets.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1E2D45' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-border"
      style={{ backgroundColor: '#141C2E', borderLeftColor: ex.color_hex, borderLeftWidth: 3 }}
    >
      <div className="px-4 pb-4 flex flex-col gap-4 pt-4">
        {currentImg && (
          <div className="rounded-xl overflow-hidden bg-zinc-900 aspect-video">
            <img src={currentImg} alt={ex.name} className="w-full h-full object-contain" />
          </div>
        )}

        {/* Set tracker */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sets</p>
          <div className="flex gap-2">
            {allSets.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-12 rounded-xl flex items-center justify-center text-sm font-semibold transition-all"
                style={{
                  backgroundColor: i < setsLogged.length ? ex.color_hex : '#1E2D45',
                  color: i < setsLogged.length ? '#fff' : '#4B6080',
                }}
              >
                {i < setsLogged.length ? '✓' : `S${i + 1}`}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            {!isComplete && (
              <button
                onClick={logSet}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-transform active:scale-95"
                style={{ backgroundColor: ex.color_hex }}
              >
                Log Set {setsLogged.length + 1}
              </button>
            )}
            {setsLogged.length > 0 && (
              <button
                onClick={undoSet}
                className="px-5 py-3 rounded-xl font-semibold text-sm text-zinc-300 active:scale-95 border border-border"
                style={{ backgroundColor: '#1A2235' }}
              >
                Undo
              </button>
            )}
            {isComplete && (
              <div
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-center text-white"
                style={{ backgroundColor: ex.color_hex }}
              >
                ✓ Done
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {instructions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Instructions</p>
            <ol className="flex flex-col gap-1.5">
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
          </div>
        )}

        {/* Like / dislike */}
        <div className="flex gap-2">
          <button
            onClick={() => onPreference?.(ex.id, ex.preference === 'liked' ? null : 'liked')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border
              ${ex.preference === 'liked'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'border-border text-zinc-500'}`}
            style={ex.preference !== 'liked' ? { backgroundColor: '#1A2235' } : {}}
          >
            👍 Like
          </button>
          <button
            onClick={() => onPreference?.(ex.id, ex.preference === 'disliked' ? null : 'disliked')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border
              ${ex.preference === 'disliked'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'border-border text-zinc-500'}`}
            style={ex.preference !== 'disliked' ? { backgroundColor: '#1A2235' } : {}}
          >
            👎 Skip
          </button>
        </div>
      </div>
    </div>
  );
}
