"use client";
import { useState, useEffect } from "react";
import { workoutPlan } from "../workoutData";
import Link from "next/link";

export default function HistoryPage() {
  const [dayIndex, setDayIndex] = useState(0);
  const [history, setHistory] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const saved = localStorage.getItem("gym_session_cache");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const currentDay = workoutPlan.phase1.days[dayIndex];

  return (
    <div className="max-w-md mx-auto min-h-screen p-6 pb-32 text-white">
      <header className="pt-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-6xl font-black italic uppercase tracking-tighter">History</h1>
          <Link href="/" className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 font-black text-[10px] uppercase tracking-widest text-lime-400">
            Back to Lift
          </Link>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {workoutPlan.phase1.days.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setDayIndex(idx)}
              className={`flex-1 min-w-[90px] py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border transition-all ${
                dayIndex === idx ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {currentDay.exercises.map((ex) => {
          const sets = history[ex.name] || [];
          return (
            <div key={ex.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-black italic uppercase leading-none w-2/3">{ex.name}</h3>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{ex.targetReps} reps</span>
              </div>

              {sets.length > 0 ? (
                <div className="space-y-2">
                  {sets.map((set: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-black/40 rounded-xl px-4 py-3 border border-zinc-800/50">
                      <span className="text-[10px] font-black text-zinc-600 uppercase">Set {sets.length - i}</span>
                      <span className="font-black italic text-lg text-white">
                        {set.weight}kg <span className="text-lime-400">× {set.reps}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-black text-zinc-700 uppercase italic">No sets logged today</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}