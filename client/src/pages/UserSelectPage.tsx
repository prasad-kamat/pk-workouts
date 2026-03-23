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
      <div className="text-center">
        <div className="text-5xl mb-3">🏋️</div>
        <h1 className="text-3xl font-bold">PK Workouts</h1>
        <p className="text-zinc-400 mt-1">Who's training today?</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => setActiveUser(u)}
            className="flex items-center gap-4 bg-surface rounded-2xl px-5 py-4 active:scale-95 transition-transform"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: u.avatar_color }}
            >
              {u.name[0]}
            </div>
            <span className="text-lg font-semibold">{u.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
