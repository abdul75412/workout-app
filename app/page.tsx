"use client";
import { useState, useEffect, useMemo } from "react";
import { workoutPlan } from "./workoutData";

export default function WorkoutPage() {
  const [view, setView] = useState<"lift" | "history" | "weight">("lift");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [dayIndex, setDayIndex] = useState(0); 
  const [historyDayIndex, setHistoryDayIndex] = useState(0); 
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightHistory, setWeightHistory] = useState<{id: number, date: string, value: number, rawDate: string}[]>([]);
  const [timer, setTimer] = useState(0);
  const [allWorkoutData, setAllWorkoutData] = useState<any>({});
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [showBaselineInput, setShowBaselineInput] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const currentPhase = workoutPlan.phase1;
  const currentDay = currentPhase.days[dayIndex];
  const currentExercise = currentDay.exercises[exerciseIndex];
  const storageKey = `w${selectedWeek}-${currentExercise.name}`;
  const currentSets = allWorkoutData[storageKey] || [];
  const exerciseNoteKey = `${storageKey}-note`;

  useEffect(() => {
    const savedData = localStorage.getItem("gym_session_cache");
    const savedWeightLogs = localStorage.getItem("body_weight_logs");
    const savedBaselines = localStorage.getItem("lift_baselines");
    if (savedData) setAllWorkoutData(JSON.parse(savedData));
    if (savedWeightLogs) setWeightHistory(JSON.parse(savedWeightLogs));
    if (savedBaselines) setBaselines(JSON.parse(savedBaselines));
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const logSet = () => {
    if (!weight || !reps) return;
    const inputWeight = parseFloat(weight);
    const oldBest = baselines[currentExercise.name] || 0;
    
    if (inputWeight > oldBest && oldBest > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    const newSets = [...currentSets, { weight, reps, id: Date.now() }];
    const updatedData = { ...allWorkoutData, [storageKey]: newSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    setWeight(""); setReps(""); 
    setTimer(90);
  };

  const saveNote = () => {
    const updatedData = { ...allWorkoutData, [exerciseNoteKey]: noteInput };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    setNoteInput("");
  };

  const logBodyWeight = () => {
    if (!bodyWeightInput) return;
    const dateObj = new Date(logDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    const newEntry = { id: Date.now(), date: formattedDate, value: parseFloat(bodyWeightInput), rawDate: logDate };
    const updated = [...weightHistory, newEntry].sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
    setWeightHistory(updated);
    localStorage.setItem("body_weight_logs", JSON.stringify(updated));
    setBodyWeightInput("");
  };

  const resetAll = () => {
    if (confirm("Clear all data?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Graph Logic
  const padding = { top: 20, right: 20, bottom: 20, left: 30 };
  const graphH = 150;
  const graphW = 320;
  const weights = weightHistory.map(d => d.value);
  const minW = weights.length ? Math.min(...weights) - 1 : 0;
  const maxW = weights.length ? Math.max(...weights) + 1 : 10;
  
  const getX = (i: number) => padding.left + (i * (graphW - padding.left - padding.right) / (weightHistory.length - 1 || 1));
  const getY = (v: number) => graphH - padding.bottom - ((v - minW) / (maxW - minW || 1) * (graphH - padding.top - padding.bottom));
  const linePath = weightHistory.length > 1 ? weightHistory.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(" ") : "";

  return (
    <div className="max-w-[100vw] overflow-x-hidden min-h-screen bg-[#0a0b0d] text-white font-sans pb-44 px-5">
      {showConfetti && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-purple-500/10 backdrop-blur-sm">
          <p className="text-4xl font-black italic text-amber-400 animate-bounce">NEW PB! 🚀</p>
        </div>
      )}

      {timer > 0 && (
        <div className="fixed top-0 left-0 right-0 bg-purple-600 z-[150] p-4 flex justify-between items-center border-b border-purple-400">
          <span className="font-black italic">REST: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
          <div className="flex gap-2">
            <button onClick={() => setTimer(t => t + 30)} className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black">+30s</button>
            <button onClick={() => setTimer(0)} className="bg-white text-black px-3 py-1 rounded-lg text-[10px] font-black">SKIP</button>
          </div>
        </div>
      )}

      <header className="pt-12 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">{view}</h1>
          <button onClick={() => setShowOptions(!showOptions)} className="text-zinc-600 text-xs font-black">OPTIONS</button>
        </div>

        {showOptions && (
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 mb-4 flex justify-between">
            <button onClick={resetAll} className="text-red-500 text-[10px] font-black uppercase">Reset All Data</button>
            <button onClick={() => setShowOptions(false)} className="text-zinc-500 text-[10px] font-black uppercase">Close</button>
          </div>
        )}

        <div className="flex items-center justify-between bg-zinc-900 rounded-2xl p-1 border border-zinc-800">
          <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))} className="p-2 text-zinc-500">←</button>
          <span className="text-[10px] font-black uppercase tracking-widest">Week {selectedWeek}</span>
          <button onClick={() => setSelectedWeek(w => Math.min(12, w + 1))} className="p-2 text-zinc-500">→</button>
        </div>
      </header>

      {view === 'lift' && (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {currentPhase.days.map((day, idx) => (
              <button key={idx} onClick={() => { setDayIndex(idx); setExerciseIndex(0); }} className={`min-w-[90px] py-3 rounded-xl font-black uppercase text-[9px] border ${dayIndex === idx ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{day.label}</button>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-[40px] p-8 border border-zinc-800 relative">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight max-w-[180px]">{currentExercise.name}</h2>
              <button onClick={() => setShowBaselineInput(!showBaselineInput)} className="bg-zinc-800 px-3 py-2 rounded-xl text-[9px] font-black uppercase text-zinc-500 border border-zinc-700">
                PB: {baselines[currentExercise.name] || 0}kg
              </button>
            </div>

            {showBaselineInput && (
              <div className="mb-6 flex gap-2">
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="New PB" className="flex-1 bg-black p-3 rounded-xl text-sm outline-none" />
                <button onClick={saveBaseline} className="bg-purple-500 px-4 rounded-xl font-black text-[10px]">SET</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center">
                <p className="text-[9px] font-black uppercase text-zinc-700 mb-2">Weight</p>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none" placeholder="0" />
              </div>
              <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center">
                <p className="text-[9px] font-black uppercase text-zinc-700 mb-2">Reps</p>
                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none" placeholder="0" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex gap-2">
                <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder={allWorkoutData[exerciseNoteKey] || "Add note..."} className="flex-1 bg-black/50 p-3 rounded-xl text-[10px] outline-none border border-zinc-800" />
                <button onClick={saveNote} className="bg-zinc-800 px-4 rounded-xl text-[8px] font-black uppercase">Save</button>
              </div>
            </div>

            <button onClick={logSet} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all">Log Set</button>
          </div>

          <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50">
            <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} className="p-4 font-black text-zinc-600 disabled:opacity-0" disabled={exerciseIndex === 0}>PREV</button>
            <span className="text-[10px] font-black text-zinc-800">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
            <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} className="p-4 font-black text-purple-500 disabled:opacity-0" disabled={exerciseIndex === currentDay.exercises.length-1}>NEXT</button>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {currentPhase.days.map((day, idx) => (
              <button key={idx} onClick={() => setHistoryDayIndex(idx)} className={`min-w-[90px] py-3 rounded-xl font-black uppercase text-[9px] border ${historyDayIndex === idx ? "bg-purple-600 border-purple-600" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{day.label}</button>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800 min-h-[400px]">
            {currentPhase.days[historyDayIndex].exercises.map((ex, exIdx) => {
              const sets = allWorkoutData[`w${selectedWeek}-${ex.name}`] || [];
              return (
                <div key={ex.name} onClick={() => { setDayIndex(historyDayIndex); setExerciseIndex(exIdx); setView('lift'); }} className="border-b border-zinc-800 py-4 last:border-0 active:bg-white/5 transition-colors rounded-xl px-2">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">{ex.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {sets.map((s: any, i: number) => (
                      <span key={s.id} className="bg-black px-3 py-1 rounded-lg text-[10px] font-black">{s.weight}kg × {s.reps}</span>
                    ))}
                    {sets.length === 0 && <span className="text-[10px] text-zinc-700 italic">No sets logged</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'weight' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800">
            <div className="h-[150px] w-full mb-6 relative">
              <svg width="100%" height="100%" viewBox={`0 0 ${graphW} ${graphH}`}>
                {weightHistory.length > 1 && <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="3" />}
                {weightHistory.map((d, i) => (
                  <circle key={d.id} cx={getX(i)} cy={getY(d.value)} r="4" className="fill-purple-500" />
                ))}
              </svg>
            </div>
            <div className="flex gap-2 mb-6">
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="bg-black p-4 rounded-xl text-[10px] font-black uppercase outline-none" />
              <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="kg" className="flex-1 bg-black p-4 rounded-xl outline-none font-black text-xl" />
              <button onClick={logBodyWeight} className="bg-white text-black px-6 rounded-xl font-black text-[10px] uppercase">Log</button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {weightHistory.slice().reverse().map(h => (
                <div key={h.id} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800/50 group">
                  <span className="text-[10px] font-black text-zinc-600 uppercase">{h.date}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-black italic">{h.value}kg</span>
                    <button onClick={() => {
                      const updated = weightHistory.filter(x => x.id !== h.id);
                      setWeightHistory(updated);
                      localStorage.setItem("body_weight_logs", JSON.stringify(updated));
                    }} className="text-red-900 text-[10px] font-black">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0b0d]/95 backdrop-blur-xl border-t border-zinc-800 px-6 pt-5 pb-10 flex justify-around z-50">
        {['lift', 'history', 'weight'].map((v) => (
          <button key={v} onClick={() => setView(v as any)} className="flex flex-col items-center flex-1">
            <span className={`text-[10px] font-black uppercase tracking-widest ${view === v ? "text-purple-400" : "text-zinc-600"}`}>{v === 'lift' ? 'Workout' : v === 'weight' ? 'Body' : v}</span>
            {view === v && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500" />}
          </button>
        ))}
      </nav>
    </div>
  );
}