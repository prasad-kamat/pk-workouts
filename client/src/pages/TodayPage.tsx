import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import ExerciseCard   from '../components/ExerciseCard';
import WorkoutSession from '../components/WorkoutSession';
import type { TodayWorkout, Exercise } from '../types';

export default function TodayPage() {
  const activeUser = useAppStore(s => s.activeUser)!;
  const [workout,   setWorkout]   = useState<TodayWorkout | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [inSession, setInSession] = useState(false);

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

  const today        = new Date();
  const allExercises = workout?.muscle_groups.flatMap(mg => mg.exercises) ?? [];
  const totalCount   = allExercises.length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );

  if ((workout as any)?.rest_day) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center bg-bg">
      <span className="text-6xl">🛋️</span>
      <h2 className="text-2xl font-bold">Rest Day</h2>
      <p className="text-zinc-400">Recovery is part of training. See you tomorrow.</p>
    </div>
  );

  if (inSession) return (
    <WorkoutSession
      exercises={allExercises}
      onExit={() => setInSession(false)}
      onPreference={handlePreference}
    />
  );

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-5 bg-bg min-h-screen">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-sm">
            {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Today's Workout</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {workout?.muscle_groups.map(mg => mg.muscle_group.display_name).join(' · ')}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-lg"
          style={{ backgroundColor: activeUser.avatar_color }}
        >
          {activeUser.name[0]}
        </div>
      </div>

      {/* Stats pill */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl px-4 py-3 border border-border flex flex-col gap-0.5"
             style={{ backgroundColor: '#111827' }}>
          <span className="text-2xl font-bold text-accent">{totalCount}</span>
          <span className="text-xs text-zinc-500">Exercises</span>
        </div>
        <div className="flex-1 rounded-xl px-4 py-3 border border-border flex flex-col gap-0.5"
             style={{ backgroundColor: '#111827' }}>
          <span className="text-2xl font-bold text-accent">
            {workout?.muscle_groups.length ?? 0}
          </span>
          <span className="text-xs text-zinc-500">Muscle Groups</span>
        </div>
        <div className="flex-1 rounded-xl px-4 py-3 border border-border flex flex-col gap-0.5"
             style={{ backgroundColor: '#111827' }}>
          <span className="text-2xl font-bold text-accent">
            {allExercises.reduce((a, ex) => a + ex.sets, 0)}
          </span>
          <span className="text-xs text-zinc-500">Total Sets</span>
        </div>
      </div>

      {/* Exercise list — read only */}
      {workout?.muscle_groups.map(({ muscle_group: mg, exercises }) => (
        <div key={mg.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mg.color_hex }} />
            <h2 className="font-semibold text-xs text-zinc-400 uppercase tracking-widest">
              {mg.display_name}
            </h2>
            <span className="text-zinc-700 text-xs">{exercises.length} exercises</span>
          </div>
          {exercises.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} readOnly />
          ))}
        </div>
      ))}

      {/* Start button */}
      <button
        onClick={() => setInSession(true)}
        className="w-full py-5 rounded-2xl font-bold text-lg text-white active:scale-95 transition-transform mt-2 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
      >
        Start Workout 💪
      </button>
    </div>
  );
}
