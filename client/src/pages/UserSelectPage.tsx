import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import type { User } from '../types';

export default function UserSelectPage() {
  const [users, setUsers] = useState<User[]>([]);
  const setActiveUser = useAppStore(s => s.setActiveUser);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 gap-8">
      {/* Glow blob */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />

      <div className="text-center relative">
        <div className="text-5xl mb-3">🏋️</div>
        <h1 className="text-3xl font-bold tracking-tight">PK Workouts</h1>
        <p className="text-zinc-400 mt-1 text-sm">Who's training today?</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs relative">
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => setActiveUser(u)}
            className="flex items-center gap-4 rounded-2xl px-5 py-4 active:scale-95 transition-transform border border-border"
            style={{ backgroundColor: '#141C2E' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: u.avatar_color }}
            >
              {u.name[0]}
            </div>
            <span className="text-lg font-semibold">{u.name}</span>
            <span className="ml-auto text-zinc-600">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
