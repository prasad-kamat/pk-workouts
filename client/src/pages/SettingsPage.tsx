import { useAppStore } from '../store';

export default function SettingsPage() {
  const { activeUser, flipSpeed, setFlipSpeed, setActiveUser } = useAppStore();

  return (
    <div className="px-4 pt-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* User */}
      <div className="bg-surface rounded-2xl p-4 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ backgroundColor: activeUser?.avatar_color }}
        >
          {activeUser?.name[0]}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{activeUser?.name}</p>
          <p className="text-xs text-zinc-400">Active user</p>
        </div>
        <button
          onClick={() => setActiveUser(null as any)}
          className="text-sm text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg"
        >
          Switch
        </button>
      </div>

      {/* Image flip speed */}
      <div className="bg-surface rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="font-semibold">Image flip speed</p>
          <span className="text-sm text-zinc-400 font-mono">{flipSpeed}ms</span>
        </div>
        <input
          type="range" min={200} max={2000} step={100}
          value={flipSpeed}
          onChange={e => setFlipSpeed(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Fast (200ms)</span>
          <span>Slow (2s)</span>
        </div>
      </div>
    </div>
  );
}
