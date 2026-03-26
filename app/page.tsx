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
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

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

  const currentPhase = workoutPlan.phase1;
  const currentDay = currentPhase.days[dayIndex];
  const currentExercise = currentDay.exercises[exerciseIndex];
  const storageKey = `w${selectedWeek}-${currentExercise.name}`;
  const currentSets = allWorkoutData[storageKey] || [];

  const logSet = () => {
    if (!weight || !reps) return;
    const newSets = [...currentSets, { weight, reps, id: Date.now() }];
    const updatedData = { ...allWorkoutData, [storageKey]: newSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    setWeight(""); setReps(""); setTimer(90);
  };

  const deleteSet = (exKey: string, setId: number) => {
    const updatedSets = allWorkoutData[exKey].filter((s: any) => s.id !== setId);
    const updatedData = { ...allWorkoutData, [exKey]: updatedSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
  };

  const editSet = (exKey: string, setId: number) => {
    const set = allWorkoutData[exKey].find((s: any) => s.id === setId);
    const newW = prompt("new weight", set.weight);
    const newR = prompt("new reps", set.reps);
    if (!newW || !newR) return;
    const updatedSets = allWorkoutData[exKey].map((s: any) => s.id === setId ? { ...s, weight: newW, reps: newR } : s);
    const updatedData = { ...allWorkoutData, [exKey]: updatedSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
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

  const editWeightPoint = (id: number) => {
    const entry = weightHistory.find(h => h.id === id);
    const action = confirm(`edit ${entry?.value}kg ok to edit cancel to delete`);
    if (action) {
      const newVal = prompt("new weight", entry?.value.toString());
      if (!newVal || isNaN(parseFloat(newVal))) return;
      const updated = weightHistory.map(h => h.id === id ? { ...h, value: parseFloat(newVal) } : h);
      setWeightHistory(updated);
      localStorage.setItem("body_weight_logs", JSON.stringify(updated));
    } else {
      const updated = weightHistory.filter(h => h.id !== id);
      setWeightHistory(updated);
      localStorage.setItem("body_weight_logs", JSON.stringify(updated));
    }
  };

  const liftProgressData = useMemo(() => {
    const sets = allWorkoutData[storageKey] || [];
    return sets.map((s: any) => ({ id: s.id, val: parseFloat(s.weight) * parseInt(s.reps) }));
  }, [allWorkoutData, storageKey]);

  const padding = { top: 20, right: 20, bottom: 20, left: 35 };
  const graphH = 180;
  const graphW = 350;
  const getX = (i: number, len: number) => padding.left + (i * (graphW - padding.left - padding.right) / (len - 1 || 1));
  const getY = (v: number, min: number, max: number) => graphH - padding.bottom - ((v - min) / (max - min || 1) * (graphH - padding.top - padding.bottom));

  const weightsArr = weightHistory.map(d => d.value);
  const minW = weightsArr.length ? Math.min(...weightsArr) - 1 : 0;
  const maxW = weightsArr.length ? Math.max(...weightsArr) + 1 : 10;
  const bwLinePath = weightHistory.length > 1 ? weightHistory.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, weightHistory.length)} ${getY(d.value, minW, maxW)}`).join(" ") : "";

  return (
    <div className="max-w-[100vw] overflow-x-hidden min-h-screen bg-[#0a0b0d] text-white font-sans pb-44 px-5">
      {timer > 0 && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] text-center w-full max-w-[300px]">
            <p className="text-6xl font-black italic tabular-nums mb-8">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setTimer(t => t + 30)} className="bg-zinc-800 py-3 rounded-2xl font-black text-[10px] uppercase">+30s</button>
              <button onClick={() => setTimer(t => t + 60)} className="bg-zinc-800 py-3 rounded-2xl font-black text-[10px] uppercase">+1m</button>
            </div>
            <button onClick={() => setTimer(0)} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px]">skip rest</button>
          </div>
        </div>
      )}

      <header className="pt-12 mb-6 uppercase italic font-black tracking-tighter">
        <h1 className="text-3xl mb-4">{view === 'lift' ? 'Mesocycle 1' : view === 'weight' ? 'Weight' : 'History'}</h1>
        {view === 'lift' && (
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 mb-4 not-italic">
            <button onClick={() => setActiveSubView("workout")} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeSubView === 'workout' ? 'bg-white text-black' : 'text-zinc-500'}`}>Workout</button>
            <button onClick={() => setActiveSubView("progress")} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeSubView === 'progress' ? 'bg-white text-black' : 'text-zinc-500'}`}>Progress</button>
          </div>
        )}
      </header>

      {view === 'lift' && activeSubView === 'workout' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-[40px] p-8 border border-zinc-800 relative">
            <h2 className="text-2xl font-black italic uppercase mb-8">{currentExercise.name}</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center"><p className="text-[9px] font-black uppercase text-zinc-700 mb-2">weight</p><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none" placeholder="0" /></div>
              <div className="bg-black rounded-[28px] p-6 border border-zinc-800 text-center"><p className="text-[9px] font-black uppercase text-zinc-700 mb-2">reps</p><input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none" placeholder="0" /></div>
            </div>
            <button onClick={logSet} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em]">log set</button>
          </div>
          <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50 font-black uppercase text-[10px]">
            <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} className="p-4 text-zinc-600">prev</button>
            <span className="text-zinc-800">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
            <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} className="p-4 text-purple-500">next</button>
          </div>
        </div>
      )}

      {view === 'lift' && activeSubView === 'progress' && (
        <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic mb-6 text-center">lift volume (kg x reps)</p>
          <div className="h-[200px] w-full flex items-end justify-around gap-1 px-4">
            {liftProgressData.map((d: any, i: number) => {
              const max = Math.max(...liftProgressData.map((x: any) => x.val));
              const height = (d.val / (max || 1)) * 100;
              return <div key={d.id} className="bg-purple-600 w-full rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(height, 5)}%` }} />;
            })}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {currentPhase.days.map((day, idx) => (
              <button key={idx} onClick={() => setHistoryDayIndex(idx)} className={`min-w-[90px] py-3 rounded-xl font-black uppercase text-[9px] border ${historyDayIndex === idx ? "bg-purple-600 border-purple-600" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{day.label}</button>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800">
            {currentPhase.days[historyDayIndex].exercises.map((ex, exIdx) => {
              const exKey = `w${selectedWeek}-${ex.name}`;
              const sets = allWorkoutData[exKey] || [];
              const isExpanded = expandedHistory === exKey;
              return (
                <div key={ex.name} className="border-b border-zinc-800 py-5 last:border-0 px-2">
                  <div className="flex justify-between items-center">
                    <p onClick={() => { setDayIndex(historyDayIndex); setExerciseIndex(exIdx); setView('lift'); setActiveSubView('workout'); }} className="text-[10px] font-black uppercase text-purple-400 italic cursor-pointer border-b border-purple-900">{ex.name}</p>
                    <button onClick={() => setExpandedHistory(isExpanded ? null : exKey)} className="bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center text-xs">{isExpanded ? '▲' : '▼'}</button>
                  </div>
                  {isExpanded && (
                    <div className="space-y-2 mt-4 transition-all">
                      {sets.length === 0 ? <p className="text-[8px] uppercase text-zinc-600 font-black italic">no sets logged</p> : sets.map((s: any) => (
                        <div key={s.id} className="flex justify-between bg-black/40 p-3 rounded-xl items-center border border-zinc-800/50">
                          <span className="text-[10px] font-black italic">{s.weight}kg x {s.reps}</span>
                          <div className="flex gap-2">
                            <button onClick={() => editSet(exKey, s.id)} className="text-zinc-500 text-[8px] font-black uppercase bg-zinc-800 px-2 py-1 rounded">Edit</button>
                            <button onClick={() => deleteSet(exKey, s.id)} className="text-red-500 text-[8px] font-black uppercase bg-red-500/10 px-2 py-1 rounded">Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'weight' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic mb-6 text-center">Body Weight Graph</p>
            <div className="h-[220px] w-full mb-8">
              <svg width="100%" height="100%" viewBox={`0 0 ${graphW} ${graphH}`} preserveAspectRatio="none" shapeRendering="geometricPrecision" style={{ overflow: 'visible' }}>
                {weightHistory.length > 1 && <path d={bwLinePath} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                {weightHistory.map((d, i) => (<circle key={d.id} cx={getX(i, weightHistory.length)} cy={getY(d.value, minW, maxW)} r="6" onClick={() => editWeightPoint(d.id)} className="fill-purple-500 stroke-[3px] stroke-black cursor-pointer active:scale-125 transition-transform" />))}
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="bg-black p-4 rounded-2xl text-[10px] font-black border border-zinc-800 outline-none" />
              <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="0.0kg" className="bg-black p-4 rounded-2xl font-black text-xl border border-zinc-800 outline-none" />
            </div>
            <button onClick={logBodyWeight} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg">log weight</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0b0d]/95 backdrop-blur-xl border-t border-zinc-800 px-6 pt-5 pb-10 flex justify-around z-[100]">
        {[{id: 'lift', label: 'Workout'}, {id: 'history', label: 'History'}, {id: 'weight', label: 'Weight'}].map((v) => (
          <button key={v.id} onClick={() => setView(v.id as any)} className="flex flex-col items-center flex-1">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${view === v.id ? "text-purple-400" : "text-zinc-600"}`}>{v.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}