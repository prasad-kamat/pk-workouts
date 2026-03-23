import { useAppStore } from '../store';

export default function SettingsPage() {
  const { activeUser, flipSpeed, setFlipSpeed, setActiveUser } = useAppStore();

  return (
    <div className="px-4 pt-6 flex flex-col gap-5 bg-bg min-h-screen">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* User */}
      <div className="rounded-2xl p-4 flex items-center gap-3 border border-border"
           style={{ backgroundColor: '#141C2E' }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
          style={{ backgroundColor: activeUser?.avatar_color }}
        >
          {activeUser?.name[0]}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{activeUser?.name}</p>
          <p className="text-xs text-zinc-500">Active user</p>
        </div>
        <button
          onClick={() => setActiveUser(null as any)}
          className="text-sm text-zinc-400 px-3 py-1.5 rounded-lg border border-border active:scale-95 transition-transform"
          style={{ backgroundColor: '#1A2235' }}
        >
          Switch
        </button>
      </div>

      {/* Flip speed */}
      <div className="rounded-2xl p-4 flex flex-col gap-3 border border-border"
           style={{ backgroundColor: '#141C2E' }}>
        <div className="flex justify-between items-center">
          <p className="font-semibold text-sm">Image flip speed</p>
          <span className="text-sm text-accent font-mono">{flipSpeed}ms</span>
        </div>
        <input
          type="range" min={200} max={2000} step={100}
          value={flipSpeed}
          onChange={e => setFlipSpeed(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>Fast (200ms)</span>
          <span>Slow (2s)</span>
        </div>
      </div>
    </div>
  );
}
