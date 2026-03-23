import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import ExerciseCard from '../components/ExerciseCard';
import RestTimer   from '../components/RestTimer';
import type { TodayWorkout, Exercise } from '../types';

const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function TodayPage() {
  const activeUser = useAppStore(s => s.activeUser)!;
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [activeUser.id]);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/exercises/today?user_id=${activeUser.id}&weekday=1`);
    setWorkout(await r.json());
    setLoading(false);
  }

  async function handlePreference(exerciseId: number, pref: 'liked' | 'disliked' | null) {
    await fetch('/api/preferences', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: activeUser.id, exercise_id: exerciseId, preference: pref }),
    });
    // Update local state
    setWorkout(w => {
      if (!w) return w;
      return {
        ...w,
        muscle_groups: w.muscle_groups.map(mg => ({
          ...mg,
          exercises: mg.exercises.map((ex: Exercise) =>
            ex.id === exerciseId ? { ...ex, preference: pref } : ex
          ),
        })),
      };
    });
  }

  const today = new Date();
  const weekday = today.getDay();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-zinc-500">Loading...</div>
    </div>
  );

  if ((workout as any)?.rest_day) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <span className="text-6xl">🛋️</span>
      <h2 className="text-2xl font-bold">Rest Day</h2>
      <p className="text-zinc-400">Recovery is part of training. See you Monday.</p>
    </div>
  );

  const totalExercises = workout?.muscle_groups.reduce((a, mg) => a + mg.exercises.length, 0) ?? 0;

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm">{today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
          <h1 className="text-2xl font-bold mt-0.5">
            {DAY[weekday]}'s Workout
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {workout?.muscle_groups.map(mg => mg.muscle_group.display_name).join(' · ')}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: activeUser.avatar_color }}
        >
          {activeUser.name[0]}
        </div>
      </div>

      {/* Week strip */}
      <div className="flex gap-1.5">
        {['M','T','W','T','F','S','S'].map((d, i) => {
          const dow = [1,2,3,4,5,6,0][i];
          const isToday = dow === weekday;
          return (
            <div
              key={i}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-colors
                ${isToday ? 'bg-white text-black' : dow === 0 || dow === 6 ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* Rest timer */}
      <RestTimer />

      {/* Muscle groups + exercises */}
      {workout?.muscle_groups.map(({ muscle_group: mg, exercises }) => (
        <div key={mg.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mg.color_hex }} />
            <h2 className="font-semibold text-sm text-zinc-300 uppercase tracking-wider">
              {mg.display_name}
            </h2>
            <span className="text-zinc-600 text-xs">{exercises.length} exercises</span>
          </div>
          {exercises.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} onPreference={handlePreference} />
          ))}
        </div>
      ))}
    </div>
  );
}
