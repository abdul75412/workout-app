"use client";
import { useState, useEffect, useMemo } from "react";
import { workoutPlan } from "./workoutData";

export default function WorkoutPage() {
  const [view, setView] = useState<"lift" | "history" | "weight">("lift");
  const [selectedWeek, setSelectedWeek] = useState(1);
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
  const storageKey = `w${selectedWeek}-${currentExercise.name}`;
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
      interval = setInterval(() => setTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
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
    const key = `w${selectedWeek}-${exName}`;
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
    <div className="max-w-[100vw] min-h-screen bg-[#0a0b0d] text-white font-sans pb-44 px-5 overflow-x-hidden">
      {showConfetti && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-purple-500/20 backdrop-blur-sm pointer-events-none">
          <p className="text-5xl font-black italic text-amber-400 animate-bounce tracking-tighter">NEW PB! 🚀</p>
        </div>
      )}

      {timer > 0 && (
        <div className="fixed top-0 left-0 right-0 bg-purple-600/95 backdrop-blur-md z-[150] p-4 border-b border-purple-400/30">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">REST TIMER</p>
            <p className="text-4xl font-black tabular-nums leading-none mb-4">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
            <div className="flex gap-2">
              <button onClick={() => setTimer(t => t + 30)} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black">+30S</button>
              <button onClick={() => setTimer(t => t + 60)} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black">+1M</button>
              <button onClick={() => setTimer(0)} className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase">SKIP</button>
            </div>
          </div>
        </div>
      )}

      <header className="pt-12 mb-4 uppercase italic font-black">
        <h1 className="text-4xl tracking-tighter leading-none mb-4">{view === 'weight' ? 'Weight' : view === 'history' ? 'History' : 'Meso 1'}</h1>
        
        {view !== 'weight' && (
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-2xl p-1 border border-zinc-800/50">
            <button onClick={() => setSelectedWeek(prev => Math.max(1, prev - 1))} className="p-2 text-zinc-600 active:text-white">←</button>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">Week {selectedWeek}</span>
            <button onClick={() => setSelectedWeek(prev => Math.min(12, prev + 1))} className="p-2 text-zinc-600 active:text-white">→</button>
          </div>
        )}
      </header>

      <main>
        {view === 'lift' && (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {currentPhase.days.map((day, idx) => (
                <button key={idx} onClick={() => { setDayIndex(idx); setExerciseIndex(0); }} className={`min-w-[100px] py-4 rounded-xl font-black uppercase text-[9px] tracking-widest border transition-all ${dayIndex === idx ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-600 border-zinc-800"}`}>{day.label}</button>
              ))}
            </div>

            <div className="bg-zinc-900 rounded-[40px] p-8 border border-zinc-800 shadow-2xl relative">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight max-w-[200px]">{currentExercise.name}</h2>
                <button onClick={() => setShowBaselineInput(!showBaselineInput)} className="bg-zinc-800 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-zinc-700/50">
                  PB: {baselines[currentExercise.name] || 0}kg
                </button>
              </div>

              {showBaselineInput && (
                <div className="mb-6 bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20">
                  <div className="flex gap-2">
                    <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="PB" className="flex-1 bg-black rounded-xl p-3 outline-none font-bold" />
                    <button onClick={saveBaseline} className="bg-purple-500 px-6 rounded-xl font-black text-[10px]">SET</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center">
                  <p className="text-[9px] font-black uppercase text-zinc-700 mb-2">Weight</p>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none tabular-nums" placeholder="0" />
                </div>
                <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center">
                  <p className="text-[9px] font-black uppercase text-zinc-700 mb-2">Reps</p>
                  <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none tabular-nums" placeholder="0" />
                </div>
              </div>
              <button onClick={logSet} className="w-full bg-white text-black py-6 rounded-[24px] font-black uppercase text-[12px] tracking-[0.3em] active:scale-95 transition-all">Log Set</button>
            </div>

            <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-[24px] border border-zinc-800/50">
              <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} className="p-4 font-black text-zinc-600 disabled:opacity-0" disabled={exerciseIndex === 0}>PREV</button>
              <span className="text-[10px] font-black text-zinc-800 tracking-widest">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
              <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} className="p-4 font-black text-purple-500 disabled:opacity-0" disabled={exerciseIndex === currentDay.exercises.length-1}>NEXT</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-4">
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {currentPhase.days.map((day, idx) => (
                <button key={idx} onClick={() => setDayIndex(idx)} className={`min-w-[100px] py-4 rounded-xl font-black uppercase text-[9px] tracking-widest border transition-all ${dayIndex === idx ? "bg-purple-600 text-white border-purple-600" : "bg-zinc-900 text-zinc-600 border-zinc-800"}`}>{day.label}</button>
              ))}
            </div>
            <div className="bg-zinc-900/50 rounded-[40px] border border-zinc-800 p-6 min-h-[400px]">
              <div className="space-y-6">
                {currentDay.exercises.map((ex) => {
                  const sets = allWorkoutData[`w${selectedWeek}-${ex.name}`] || [];
                  if (sets.length === 0) return null;
                  return (
                    <div key={ex.name} className="border-b border-zinc-800/50 pb-6 last:border-0">
                      <p className="text-[10px] font-black uppercase text-zinc-600 mb-4">{ex.name}</p>
                      <div className="space-y-2">
                        {sets.map((s: any, i: number) => (
                          <div key={s.id} className="bg-black/40 p-4 rounded-2xl flex justify-between items-center">
                            <span className="text-[9px] font-black text-zinc-800">SET {i+1}</span>
                            <div className="flex items-center gap-6">
                              <span className="font-black italic text-sm">{s.weight}kg × {s.reps}</span>
                              <button onClick={() => deleteSet(ex.name, s.id)} className="bg-red-500/10 text-red-500 w-8 h-8 rounded-xl font-black">×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'weight' && (
          <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800">
            <div className="flex gap-3 mb-8">
              <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="00.0" className="flex-1 bg-black p-5 rounded-2xl outline-none font-black text-2xl italic" />
              <button onClick={logBodyWeight} className="bg-white text-black px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest">Log</button>
            </div>
            <div className="space-y-2">
              {weightHistory.map(w => (
                <div key={w.id} className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-zinc-800/50">
                  <span className="text-[10px] font-black text-zinc-600">{w.date}</span>
                  <div className="flex items-center gap-6">
                    <span className="font-black italic text-xl">{w.value}kg</span>
                    <button onClick={() => deleteWeight(w.id)} className="bg-red-500/10 text-red-500 w-10 h-10 rounded-xl font-black">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0b0d]/95 backdrop-blur-2xl border-t border-zinc-800 px-8 pt-6 pb-12 flex justify-around z-[100]">
        {['lift', 'history', 'weight'].map((v) => (
          <button key={v} onClick={() => setView(v as any)} className="flex flex-col items-center">
            <span className={`text-[11px] font-black uppercase tracking-[0.4em] transition-colors ${view === v ? "text-purple-400" : "text-zinc-700"}`}>{v === 'lift' ? 'Workout' : v}</span>
            {view === v && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_15px_#a855f7]" />}
          </button>
        ))}
      </nav>
    </div>
  );
}