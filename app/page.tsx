"use client";
import { useState, useEffect, useMemo } from "react";
import { workoutPlan } from "./workoutData";

export default function WorkoutPage() {
  const [view, setView] = useState<"lift" | "history" | "weight">("lift");
  const [dayIndex, setDayIndex] = useState(0); 
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [weightHistory, setWeightHistory] = useState<{id: number, date: string, value: number}[]>([]);
  const [timer, setTimer] = useState(0);
  const [allWorkoutData, setAllWorkoutData] = useState<any>({});
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [showBaselineInput, setShowBaselineInput] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentPhase = workoutPlan.phase1;
  const currentDay = currentPhase.days[dayIndex];
  const currentExercise = currentDay.exercises[exerciseIndex];
  const storageKey = `w1-${currentExercise.name}`;
  const currentSets = allWorkoutData[storageKey] || [];

  useEffect(() => {
    const savedData = localStorage.getItem("gym_cache");
    const savedWeight = localStorage.getItem("weight_logs");
    const savedPBs = localStorage.getItem("lift_baselines");
    if (savedData) setAllWorkoutData(JSON.parse(savedData));
    if (savedWeight) setWeightHistory(JSON.parse(savedWeight));
    if (savedPBs) setBaselines(JSON.parse(savedPBs));
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const saveBaseline = () => {
    const val = parseFloat(weight);
    if (!val) return;
    const newPBs = { ...baselines, [currentExercise.name]: val };
    setBaselines(newPBs);
    localStorage.setItem("lift_baselines", JSON.stringify(newPBs));
    setShowBaselineInput(false);
    setWeight("");
  };

  const logSet = () => {
    if (!weight || !reps) return;
    const val = parseFloat(weight);
    const oldPB = baselines[currentExercise.name] || 0;
    
    if (val > oldPB && oldPB > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    const newSets = [...currentSets, { id: Date.now(), weight, reps }];
    const updated = { ...allWorkoutData, [storageKey]: newSets };
    setAllWorkoutData(updated);
    localStorage.setItem("gym_cache", JSON.stringify(updated));
    
    setWeight(""); setReps(""); 
    setTimer(90); 
  };

  const deleteSet = (exName: string, id: number) => {
    const key = `w1-${exName}`;
    const updatedSets = (allWorkoutData[key] || []).filter((s: any) => s.id !== id);
    const updated = { ...allWorkoutData, [key]: updatedSets };
    setAllWorkoutData(updated);
    localStorage.setItem("gym_cache", JSON.stringify(updated));
  };

  const logBodyWeight = () => {
    if (!bodyWeightInput) return;
    const newLog = { id: Date.now(), date: new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit'}), value: parseFloat(bodyWeightInput) };
    const updated = [newLog, ...weightHistory];
    setWeightHistory(updated);
    localStorage.setItem("weight_logs", JSON.stringify(updated));
    setBodyWeightInput("");
  };

  const deleteWeight = (id: number) => {
    const updated = weightHistory.filter(w => w.id !== id);
    setWeightHistory(updated);
    localStorage.setItem("weight_logs", JSON.stringify(updated));
  };

  return (
    <div className="max-w-[100vw] min-h-screen bg-[#0a0b0d] text-white font-sans pb-40 px-5">
      {showConfetti && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-purple-500/20 backdrop-blur-sm pointer-events-none">
          <p className="text-4xl font-black italic text-amber-400 animate-bounce">NEW PB! 🚀</p>
        </div>
      )}

      <header className="pt-10 mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">{view}</h1>
        {timer > 0 && <div className="bg-purple-600 px-4 py-2 rounded-full font-black tabular-nums shadow-[0_0_15px_rgba(147,51,234,0.5)]">REST {timer}s</div>}
      </header>

      {view === 'lift' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight max-w-[180px]">{currentExercise.name}</h2>
              <button onClick={() => setShowBaselineInput(!showBaselineInput)} className="text-[9px] font-black uppercase text-zinc-500 bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700">
                PB: {baselines[currentExercise.name] || 0}kg
              </button>
            </div>

            {showBaselineInput && (
              <div className="flex gap-2 mb-4 bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 animate-in slide-in-from-top-2">
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Baseline weight" className="flex-1 bg-black p-3 rounded-lg text-sm outline-none font-bold" />
                <button onClick={saveBaseline} className="bg-purple-500 px-4 rounded-lg font-black text-[10px]">SET</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black p-5 rounded-2xl border border-zinc-800">
                <p className="text-[9px] font-black text-zinc-700 uppercase mb-1">Weight</p>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none" placeholder="0" />
              </div>
              <div className="bg-black p-5 rounded-2xl border border-zinc-800">
                <p className="text-[9px] font-black text-zinc-700 uppercase mb-1">Reps</p>
                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none" placeholder="0" />
              </div>
            </div>
            <button onClick={logSet} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-transform">Log Set</button>
          </div>

          <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50">
            <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} className="p-4 font-black text-zinc-600 active:text-white" disabled={exerciseIndex === 0}>PREV</button>
            <span className="text-[10px] font-black text-zinc-800">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
            <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} className="p-4 font-black text-purple-500 active:text-white" disabled={exerciseIndex === currentDay.exercises.length-1}>NEXT</button>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 space-y-6 max-h-[60vh] overflow-y-auto">
          {currentDay.exercises.map((ex) => {
            const sets = allWorkoutData[`w1-${ex.name}`] || [];
            if (sets.length === 0) return null;
            return (
              <div key={ex.name}>
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-3 tracking-widest">{ex.name}</p>
                <div className="space-y-2">
                  {sets.map((s: any, i: number) => (
                    <div key={s.id} className="bg-black/40 p-4 rounded-xl flex justify-between items-center border border-zinc-800/50">
                      <span className="text-[10px] font-black text-zinc-700">SET {i+1}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black tabular-nums">{s.weight}kg × {s.reps}</span>
                        <button onClick={() => deleteSet(ex.name, s.id)} className="bg-red-500/10 text-red-500 w-8 h-8 rounded-lg font-black flex items-center justify-center">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'weight' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800">
            <div className="flex gap-2 mb-6">
              <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="Current Weight" className="flex-1 bg-black p-4 rounded-xl outline-none font-black text-lg" />
              <button onClick={logBodyWeight} className="bg-white text-black px-6 rounded-xl font-black text-xs uppercase">Save</button>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {weightHistory.map(w => (
                <div key={w.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                  <span className="text-[10px] font-black text-zinc-600">{w.date}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-black italic tabular-nums">{w.value}kg</span>
                    <button onClick={() => deleteWeight(w.id)} className="bg-red-500/10 text-red-500 w-8 h-8 rounded-lg font-black flex items-center justify-center">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-2xl border-t border-zinc-800 px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] flex justify-around z-50">
        {['lift', 'history', 'weight'].map((v) => (
          <button key={v} onClick={() => setView(v as any)} className="flex flex-col items-center">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${view === v ? "text-purple-400" : "text-zinc-600"}`}>{v}</span>
            {view === v && <div className="mt-2 w-1 h-1 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />}
          </button>
        ))}
      </nav>
    </div>
  );
}