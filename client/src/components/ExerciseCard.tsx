import { useState } from 'react';
import { useAppStore } from '../store';
import { useFlipImage } from '../hooks/useFlipImage';
import type { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onPreference: (id: number, pref: 'liked' | 'disliked' | null) => void;
}

export default function ExerciseCard({ exercise: ex, onPreference }: Props) {
  const [expanded,     setExpanded]     = useState(false);
  const [setsLogged,   setSetsLogged]   = useState<number[]>([]);
  const flipSpeed  = useAppStore(s => s.flipSpeed);
  const currentImg = useFlipImage(ex.video_url, flipSpeed);

  const instructions: string[] = (() => {
    try { return JSON.parse(ex.instructions || '[]'); } catch { return []; }
  })();

  const allSets    = Array.from({ length: ex.sets });
  const isComplete = setsLogged.length === ex.sets;

  function logSet() {
    if (setsLogged.length < ex.sets)
      setSetsLogged(p => [...p, ex.reps_min]);
  }
  function undoSet() {
    setSetsLogged(p => p.slice(0, -1));
  }

  return (
    <div
      className="rounded-2xl overflow-hidden bg-surface"
      style={{ borderLeft: `4px solid ${ex.color_hex}` }}
    >
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-zinc-800 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Flip image thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
          {currentImg
            ? <img src={currentImg} alt={ex.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">💪</div>
          }
        </div>

        <div className="flex-1 text-left">
          <p className="font-semibold text-sm leading-tight">{ex.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {ex.sets} × {ex.reps_min}–{ex.reps_max} reps
          </p>
        </div>

        {/* Set progress dots */}
        <div className="flex gap-1 flex-shrink-0">
          {allSets.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: i < setsLogged.length ? ex.color_hex : '#3f3f46' }}
            />
          ))}
        </div>

        <span className="text-zinc-500 ml-1 text-lg">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4">

          {/* Larger flip image */}
          {currentImg && (
            <div className="rounded-xl overflow-hidden bg-zinc-800 aspect-video flex items-center justify-center">
              <img src={currentImg} alt={ex.name} className="w-full h-full object-contain" />
            </div>
          )}

          {/* Set tracker */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sets</p>
            <div className="flex gap-2">
              {allSets.map((_, i) => (
                <div
                    key={i}
                    className="flex-1 h-12 rounded-xl flex items-center justify-center text-sm font-semibold transition-all"
                    style={{
                        backgroundColor: i < setsLogged.length ? ex.color_hex : '#27272a',
                        color: i < setsLogged.length ? '#fff' : '#71717a',   // ← was '#000'
                    }}
                >
                  {i < setsLogged.length ? `${setsLogged[i]}` : `S${i + 1}`}
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
                  className="px-5 py-3 rounded-xl font-semibold text-sm bg-zinc-800 text-zinc-300 active:scale-95"
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
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Instructions</p>
              <ol className="flex flex-col gap-1.5">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-300">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-black mt-0.5"
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
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onPreference(ex.id, ex.preference === 'liked' ? null : 'liked')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                ${ex.preference === 'liked' ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
            >
              👍 Like
            </button>
            <button
              onClick={() => onPreference(ex.id, ex.preference === 'disliked' ? null : 'disliked')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                ${ex.preference === 'disliked' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            >
              👎 Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
