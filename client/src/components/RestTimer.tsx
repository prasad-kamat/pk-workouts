import { useState, useEffect, useRef } from 'react';

export default function RestTimer() {
  const [seconds,  setSeconds]  = useState(0);
  const [running,  setRunning]  = useState(false);
  const [preset,   setPreset]   = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0 && running) {
      setRunning(false);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, seconds]);

  function start(s: number) { setSeconds(s); setPreset(s); setRunning(true); }
  function reset()           { setRunning(false); setSeconds(0); }

  const pct = seconds > 0 ? seconds / preset : 0;
  const r   = 26;
  const circ = 2 * Math.PI * r;

  return (
    <div className="bg-surface rounded-2xl px-4 py-3 flex items-center gap-4">
      {/* Circular countdown */}
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r={r} fill="none" stroke="#27272a" strokeWidth="4" />
          <circle
            cx="30" cy="30" r={r} fill="none" stroke="#3B82F6" strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          {seconds > 0 ? seconds : '—'}
        </span>
      </div>

      {/* Presets */}
      <div className="flex gap-2 flex-1">
        {[30, 60, 90, 120].map(s => (
          <button
            key={s}
            onClick={() => start(s)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors
              ${running && preset === s ? 'bg-blue-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
          >
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>

      {running && (
        <button onClick={reset} className="text-zinc-500 text-sm px-2">✕</button>
      )}
    </div>
  );
}
