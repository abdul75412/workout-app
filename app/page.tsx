"use client";
import { useState, useEffect, useMemo } from "react";
import { workoutPlan } from "./workoutData";

export default function WorkoutPage() {
  const [view, setView] = useState<"lift" | "history" | "weight">("lift");
  const [activeSubView, setActiveSubView] = useState<"workout" | "progress">("workout");
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

  const currentPhase = workoutPlan.phase1;
  const currentDay = currentPhase.days[dayIndex];
  const currentExercise = currentDay.exercises[exerciseIndex];
  const storageKey = `w${selectedWeek}-${currentExercise.name}`;
  const currentSets = allWorkoutData[storageKey] || [];

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

  const saveBaseline = () => {
    const val = parseFloat(weight);
    if (isNaN(val)) return;
    const newBaselines = { ...baselines, [currentExercise.name]: val };
    setBaselines(newBaselines);
    localStorage.setItem("lift_baselines", JSON.stringify(newBaselines));
    setShowBaselineInput(false);
    setWeight("");
  };

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
    setWeight(""); setReps(""); setTimer(90);
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

  const editPoint = (id: number) => {
    const newVal = prompt("Enter new weight:");
    if (!newVal || isNaN(parseFloat(newVal))) return;
    const updated = weightHistory.map(h => h.id === id ? { ...h, value: parseFloat(newVal) } : h);
    setWeightHistory(updated);
    localStorage.setItem("body_weight_logs", JSON.stringify(updated));
  };

  const weightStats = useMemo(() => {
    if (weightHistory.length === 0) return { current: 0, change: "0" };
    const current = weightHistory[weightHistory.length - 1].value;
    const start = weightHistory[0].value;
    const diff = (current - start).toFixed(1);
    return { current, change: parseFloat(diff) > 0 ? `+${diff}` : diff };
  }, [weightHistory]);

  const padding = { top: 20, right: 20, bottom: 20, left: 35 };
  const graphH = 180;
  const graphW = 350;
  const weightsArr = weightHistory.map(d => d.value);
  const minW = weightsArr.length ? Math.min(...weightsArr) - 2 : 0;
  const maxW = weightsArr.length ? Math.max(...weightsArr) + 2 : 10;
  const getX = (i: number) => padding.left + (i * (graphW - padding.left - padding.right) / (weightHistory.length - 1 || 1));
  const getY = (v: number) => graphH - padding.bottom - ((v - minW) / (maxW - minW || 1) * (graphH - padding.top - padding.bottom));
  const linePath = weightHistory.length > 1 ? weightHistory.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(" ") : "";

  return (
    <div className="max-w-[100vw] overflow-x-hidden min-h-screen bg-[#0a0b0d] text-white font-sans pb-44 px-5">
      {showConfetti && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-purple-600/20 backdrop-blur-md pointer-events-none">
          <p className="text-5xl font-black italic text-amber-400 animate-bounce tracking-tighter uppercase">New PB! 🚀</p>
        </div>
      )}

      {timer > 0 && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] text-center w-full max-w-[300px] shadow-2xl">
            <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-[0.2em]">Rest Timer</p>
            <p className="text-6xl font-black italic tabular-nums mb-8">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setTimer(t => t + 30)} className="bg-zinc-800 py-3 rounded-2xl font-black text-[10px] uppercase">+30s</button>
              <button onClick={() => setTimer(t => t + 60)} className="bg-zinc-800 py-3 rounded-2xl font-black text-[10px] uppercase">+1m</button>
            </div>
            <button onClick={() => setTimer(0)} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Skip Rest</button>
          </div>
        </div>
      )}

      <header className="pt-12 mb-6 uppercase italic font-black tracking-tighter">
        <h1 className="text-3xl mb-4">{view === 'weight' ? 'Weight' : view}</h1>
        {view === 'lift' && (
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 mb-4 not-italic">
            <button onClick={() => setActiveSubView("workout")} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubView === 'workout' ? 'bg-white text-black' : 'text-zinc-500'}`}>Workout</button>
            <button onClick={() => setActiveSubView("progress")} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubView === 'progress' ? 'bg-white text-black' : 'text-zinc-500'}`}>Progress</button>
          </div>
        )}
        <div className="flex items-center justify-between bg-zinc-900 rounded-2xl p-1 border border-zinc-800 not-italic">
          <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))} className="p-2 text-zinc-500">←</button>
          <span className="text-[10px] font-black uppercase tracking-widest">Week {selectedWeek}</span>
          <button onClick={() => setSelectedWeek(w => Math.min(12, w + 1))} className="p-2 text-zinc-500">→</button>
        </div>
      </header>

      {view === 'lift' && activeSubView === 'workout' && (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {currentPhase.days.map((day, idx) => (
              <button key={idx} onClick={() => { setDayIndex(idx); setExerciseIndex(0); }} className={`min-w-[90px] py-3 rounded-xl font-black uppercase text-[9px] border transition-all ${dayIndex === idx ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{day.label}</button>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-[40px] p-8 border border-zinc-800 relative">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-tight max-w-[180px]">{currentExercise.name}</h2>
              <button onClick={() => setShowBaselineInput(!showBaselineInput)} className="bg-zinc-800 px-3 py-2 rounded-xl text-[8px] font-black uppercase text-zinc-400 border border-zinc-700">PB: {baselines[currentExercise.name] || 0}kg</button>
            </div>
            {showBaselineInput && (
              <div className="mb-6 flex gap-2"><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" className="flex-1 bg-black p-3 rounded-xl outline-none border border-zinc-800 font-black" /><button onClick={saveBaseline} className="bg-purple-500 px-4 rounded-xl font-black text-[10px] uppercase">Set</button></div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center"><p className="text-[9px] font-black uppercase text-zinc-700 mb-2">Weight</p><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none tabular-nums" placeholder="0" /></div>
              <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center"><p className="text-[9px] font-black uppercase text-zinc-700 mb-2">Reps</p><input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none tabular-nums" placeholder="0" /></div>
            </div>
            <button onClick={logSet} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] active:scale-95 shadow-lg">Log Set</button>
          </div>
          <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50 font-black uppercase text-[10px]">
            <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} className="p-4 text-zinc-600 disabled:opacity-0" disabled={exerciseIndex === 0}>Prev</button>
            <span className="text-zinc-800 tracking-widest">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
            <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} className="p-4 text-purple-500 disabled:opacity-0" disabled={exerciseIndex === currentDay.exercises.length-1}>Next</button>
          </div>
        </div>
      )}

      {view === 'lift' && activeSubView === 'progress' && (
        <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic mb-6">Weight Progress Graph</p>
          <div className="h-[200px] w-full">
            <svg width="100%" height="100%" viewBox={`0 0 ${graphW} ${graphH}`} preserveAspectRatio="none">
              {weightHistory.length > 1 && <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />}
              {weightHistory.map((d, i) => (<circle key={d.id} cx={getX(i)} cy={getY(d.value)} r="8" onClick={() => editPoint(d.id)} className="fill-purple-500 stroke-[4px] stroke-black cursor-pointer active:scale-150 transition-transform" />))}
            </svg>
          </div>
          <div className="mt-8 px-2 flex justify-between items-end">
            <div>
              <p className="text-[9px] font-black text-zinc-600 uppercase italic">Starting Weight</p>
              <p className="text-xl font-black italic">{weightHistory[0]?.value || 0}kg</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-zinc-600 uppercase italic">Total Change</p>
              <p className={`text-3xl font-black italic ${parseFloat(weightStats.change) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{weightStats.change}kg</p>
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {currentPhase.days.map((day, idx) => (
              <button key={idx} onClick={() => setHistoryDayIndex(idx)} className={`min-w-[90px] py-3 rounded-xl font-black uppercase text-[9px] border transition-all ${historyDayIndex === idx ? "bg-purple-600 border-purple-600" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{day.label}</button>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800 min-h-[400px]">
            {currentPhase.days[historyDayIndex].exercises.map((ex, exIdx) => {
              const sets = allWorkoutData[`w${selectedWeek}-${ex.name}`] || [];
              return (
                <div key={ex.name} onClick={() => { setDayIndex(historyDayIndex); setExerciseIndex(exIdx); setView('lift'); setActiveSubView('workout'); }} className="border-b border-zinc-800 py-5 last:border-0 px-2">
                  <p className="text-[10px] font-black uppercase text-zinc-600 mb-3 tracking-widest italic">{ex.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {sets.map((s: any) => (<span key={s.id} className="bg-black/60 px-3 py-2 rounded-lg text-[10px] font-black italic border border-zinc-800">{s.weight}kg × {s.reps}</span>))}
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
            <div className="grid grid-cols-2 gap-2 mb-4">
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="bg-black p-4 rounded-2xl text-[10px] font-black uppercase border border-zinc-800 outline-none" />
              <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="0.0kg" className="bg-black p-4 rounded-2xl font-black text-xl border border-zinc-800 outline-none" />
            </div>
            <button onClick={logBodyWeight} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg">Log Weight</button>
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar mt-6">
              {weightHistory.slice().reverse().map(h => (
                <div key={h.id} className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-zinc-800/50 font-black"><span className="text-[10px] text-zinc-600 uppercase italic">{h.date}</span><div className="flex items-center gap-6"><span className="italic text-xl">{h.value}kg</span><button onClick={() => { const updated = weightHistory.filter(x => x.id !== h.id); setWeightHistory(updated); localStorage.setItem("body_weight_logs", JSON.stringify(updated)); }} className="text-red-500 bg-red-500/10 w-8 h-8 rounded-lg flex items-center justify-center">×</button></div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0b0d]/95 backdrop-blur-xl border-t border-zinc-800 px-6 pt-5 pb-10 flex justify-around z-[100]">
        {[{id: 'lift', label: 'Workout'}, {id: 'history', label: 'History'}, {id: 'weight', label: 'Weight'}].map((v) => (
          <button key={v.id} onClick={() => setView(v.id as any)} className="flex flex-col items-center flex-1 transition-all active:scale-90"><span className={`text-[10px] font-black uppercase tracking-[0.2em] ${view === v.id ? "text-purple-400" : "text-zinc-600"}`}>{v.label}</span>{view === v.id && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500" />}</button>
        ))}
      </nav>
    </div>
  );
}