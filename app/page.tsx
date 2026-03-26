"use client";
import { useState, useEffect, useMemo } from "react";
import { workoutPlan } from "./workoutData";

export default function WorkoutPage() {
  const [view, setView] = useState<"lift" | "history" | "weight">("lift");
  const [subView, setSubView] = useState<"workout" | "progress">("workout");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [dayIndex, setDayIndex] = useState(0); 
  const [historyDayIndex, setHistoryDayIndex] = useState(0); 
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<{id: number, date: string, value: number, rawDate: string}[]>([]);
  const [timer, setTimer] = useState(0);
  const [allWorkoutData, setAllWorkoutData] = useState<any>({});
  const [historyLog, setHistoryLog] = useState<string[]>([]); 
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [showBaselineInput, setShowBaselineInput] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentPhase = workoutPlan.phase1;
  const currentDay = currentPhase.days[dayIndex];
  const currentExercise = currentDay.exercises[exerciseIndex];
  const storageKey = `w${selectedWeek}-${currentExercise.name}`;
  const currentSets = allWorkoutData[storageKey] || [];
  const historyDay = currentPhase.days[historyDayIndex];

  useEffect(() => {
    const savedData = localStorage.getItem("gym_session_cache");
    const savedHistory = localStorage.getItem("gym_history_grid");
    const savedWeightLogs = localStorage.getItem("body_weight_logs");
    const savedBaselines = localStorage.getItem("lift_baselines");
    if (savedData) setAllWorkoutData(JSON.parse(savedData));
    if (savedHistory) setHistoryLog(JSON.parse(savedHistory));
    if (savedWeightLogs) setWeightHistory(JSON.parse(savedWeightLogs));
    if (savedBaselines) setBaselines(JSON.parse(savedBaselines));
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const globalPBs = useMemo(() => {
    const bests: Record<string, number> = { ...baselines };
    Object.keys(allWorkoutData).forEach(key => {
      const exerciseName = key.split('-').slice(1).join('-');
      const sets = allWorkoutData[key];
      if (Array.isArray(sets)) {
        sets.forEach((s: any) => {
          const w = parseFloat(s.weight);
          if (!isNaN(w) && w > (bests[exerciseName] || 0)) bests[exerciseName] = w;
        });
      }
    });
    return bests;
  }, [allWorkoutData, baselines]);

  const lastWeekData = useMemo(() => {
    if (selectedWeek === 1) return null;
    const prevKey = `w${selectedWeek - 1}-${currentExercise.name}`;
    const prevSets = allWorkoutData[prevKey] || [];
    if (prevSets.length === 0) return null;
    const maxW = Math.max(...prevSets.map((s: any) => parseFloat(s.weight) || 0));
    const maxR = Math.max(...prevSets.map((s: any) => parseFloat(s.reps) || 0));
    return { weight: maxW, reps: maxR };
  }, [selectedWeek, currentExercise.name, allWorkoutData]);

  const exerciseProgressData = useMemo(() => {
    const progress: { week: number, maxWeight: number }[] = [];
    for (let w = 1; w <= 12; w++) {
      const sets = allWorkoutData[`w${w}-${currentExercise.name}`] || [];
      if (sets.length > 0) {
        const max = Math.max(...sets.map((s: any) => parseFloat(s.weight) || 0));
        progress.push({ week: w, maxWeight: max });
      }
    }
    return progress; 
  }, [allWorkoutData, currentExercise.name]);

  const logSet = () => {
    if (!weight || !reps) return;
    const inputWeight = parseFloat(weight);
    const oldBest = globalPBs[currentExercise.name] || 0;
    if (inputWeight > oldBest && oldBest > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    const newSets = [...currentSets, { weight, reps }];
    const updatedData = { ...allWorkoutData, [storageKey]: newSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    setWeight(""); setReps("");
    setTimer(90);
  };

  const saveBaseline = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newBaselines = { ...baselines, [currentExercise.name]: num };
    setBaselines(newBaselines);
    localStorage.setItem("lift_baselines", JSON.stringify(newBaselines));
    setShowBaselineInput(false);
  };

  const logBodyWeight = () => {
    if (!bodyWeightInput) return;
    let updated;
    if (editingId) {
      updated = weightHistory.map(log => log.id === editingId ? { ...log, value: parseFloat(bodyWeightInput), rawDate: logDate, date: new Date(logDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) } : log);
      setEditingId(null);
    } else {
      const newEntry = { id: Date.now(), date: new Date(logDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }), value: parseFloat(bodyWeightInput), rawDate: logDate };
      updated = [...weightHistory, newEntry];
    }
    updated.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
    setWeightHistory(updated);
    localStorage.setItem("body_weight_logs", JSON.stringify(updated));
    setBodyWeightInput("");
  };

  const deleteWeight = (id: number) => {
    const updated = weightHistory.filter(log => log.id !== id);
    setWeightHistory(updated);
    localStorage.setItem("body_weight_logs", JSON.stringify(updated));
  };

  return (
    <div className="max-w-[100vw] overflow-hidden min-h-screen bg-[#0a0b0d] text-white font-sans selection:bg-purple-500/30 pb-40">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center bg-purple-500/10 backdrop-blur-sm">
          <div className="text-center animate-bounce">
            <p className="text-8xl mb-2">🔥</p>
            <p className="text-2xl font-black italic uppercase text-white tracking-tighter">NEW PB DETECTED</p>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5">
        <header className="pt-8 mb-4 uppercase italic font-black">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl tracking-tighter leading-none">{view === 'weight' ? 'Body Weight' : view === 'history' ? 'History' : 'Mesocycle 1'}</h1>
            {timer > 0 ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setTimer(t => t + 30)} className="bg-zinc-800 text-[9px] px-2 py-1 rounded-lg border border-zinc-700 font-black">+30s</button>
                <button onClick={() => setTimer(t => t + 60)} className="bg-zinc-800 text-[9px] px-2 py-1 rounded-lg border border-zinc-700 font-black">+1m</button>
                <div className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm tabular-nums font-black">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</div>
              </div>
            ) : (
                <button onClick={() => setTimer(90)} className="text-zinc-700"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></button>
            )}
          </div>
          {view !== 'weight' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <button key={i} onClick={() => setSelectedWeek(i + 1)} className={`flex-shrink-0 w-14 py-3 rounded-xl text-[10px] font-black transition-all border ${selectedWeek === i + 1 ? "bg-purple-600 border-purple-500 text-white" : "bg-zinc-900/40 border-zinc-800 text-zinc-600"}`}>W{i + 1}</button>
              ))}
            </div>
          )}
        </header>

        <main className="relative">
          <div className={`flex transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${view === 'history' ? '-translate-x-full' : view === 'weight' ? '-translate-x-[200%]' : 'translate-x-0'}`}>
            
            <div className="min-w-full">
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                {currentPhase.days.map((day, idx) => (
                  <button key={idx} onClick={() => { setDayIndex(idx); setExerciseIndex(0); }} className={`flex-shrink-0 px-6 py-4 rounded-xl font-black uppercase text-[9px] tracking-widest border ${dayIndex === idx ? "bg-white text-black border-white" : "bg-zinc-900/40 text-zinc-600 border-zinc-800"}`}>{day.label}</button>
                ))}
              </div>
              <div className="relative flex gap-2 mb-4 bg-zinc-900/40 p-1.5 rounded-2xl border border-zinc-800">
                  <button onClick={() => setSubView("workout")} className={`relative z-10 flex-1 py-3 text-[8px] font-black uppercase tracking-widest rounded-xl ${subView === 'workout' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Workout</button>
                  <button onClick={() => setSubView("progress")} className={`relative z-10 flex-1 py-3 text-[8px] font-black uppercase tracking-widest rounded-xl ${subView === 'progress' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Progress</button>
              </div>
              <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800 min-h-[420px]">
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tighter max-w-[200px]">{currentExercise.name}</h2>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Current PB</p>
                    <button onClick={() => setShowBaselineInput(true)} className="text-purple-400 font-black italic text-lg">{globalPBs[currentExercise.name] || 0}kg</button>
                  </div>
                </div>
                {showBaselineInput && (
                   <div className="mb-6"><input autoFocus type="number" placeholder="Enter Baseline (kg)" className="w-full bg-black border border-purple-500/50 rounded-2xl p-4 text-center text-sm font-black outline-none" onKeyDown={(e) => e.key === 'Enter' && saveBaseline(e.currentTarget.value)} /></div>
                )}
                {subView === "workout" ? (
                  <div className="space-y-6">
                    {lastWeekData && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-3 flex justify-between items-center"><span className="text-[9px] font-black uppercase text-purple-400">Last Week</span><span className="text-xs font-black italic">{lastWeekData.weight}kg x {lastWeekData.reps}</span></div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black rounded-[28px] p-5 border border-zinc-800 text-center"><p className="text-[8px] font-black uppercase text-zinc-700 mb-2">Weight</p><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none" placeholder="0" /></div>
                      <div className="bg-black rounded-[28px] p-5 border border-zinc-800 text-center"><p className="text-[8px] font-black uppercase text-zinc-700 mb-2">Reps</p><input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none" placeholder="0" /></div>
                    </div>
                    <button onClick={logSet} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em]">Log Set</button>
                    <div className="flex gap-2 justify-center">{currentSets.map((_:any, i:number) => <div key={i} className="w-2 h-2 rounded-full bg-purple-500" />)}</div>
                  </div>
                ) : (
                  <div className="space-y-3">{exerciseProgressData.map((p, i) => (<div key={i} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-zinc-800"><span className="text-[10px] font-black text-zinc-500 uppercase">Week {p.week}</span><span className="font-black italic text-purple-400">{p.maxWeight}kg</span></div>))}</div>
                )}
              </div>
              <div className="flex justify-between items-center mt-4 px-2">
                <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} disabled={exerciseIndex === 0} className="p-2 text-zinc-700 disabled:opacity-0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m15 18-6-6 6-6"/></svg></button>
                <span className="text-[10px] font-black text-zinc-700 uppercase">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
                <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} disabled={exerciseIndex === currentDay.exercises.length-1} className="p-2 text-purple-500 disabled:opacity-0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m9 18 6-6-6-6"/></svg></button>
              </div>
            </div>

            <div className="min-w-full">
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
                {currentPhase.days.map((day, idx) => (
                  <button key={idx} onClick={() => setHistoryDayIndex(idx)} className={`flex-shrink-0 px-6 py-4 rounded-xl font-black uppercase text-[9px] tracking-widest border ${historyDayIndex === idx ? "bg-purple-600 border-purple-500 text-white" : "bg-zinc-900/40 text-zinc-600 border-zinc-800"}`}>{day.label}</button>
                ))}
              </div>
              <div className="bg-zinc-900/50 border rounded-[40px] p-6 border-zinc-800 min-h-[440px] max-h-[600px] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                  {historyDay.exercises.map((ex, exIdx) => {
                    const key = `w${selectedWeek}-${ex.name}`;
                    const sets = (allWorkoutData[key] || []).slice(0, 3);
                    const isExpanded = expandedEx === exIdx.toString();
                    return (
                      <div key={exIdx} className="border-b border-zinc-800/50 pb-4">
                        <button onClick={() => setExpandedEx(isExpanded ? null : exIdx.toString())} className="w-full flex justify-between items-center py-2 text-left">
                            <span className={`text-xs font-black uppercase ${sets.length > 0 ? 'text-zinc-200' : 'text-zinc-800'}`}>{ex.name}</span>
                            <div className="flex items-center gap-2">
                              {sets.length > 0 && <span className="text-[9px] font-black text-purple-500 tracking-widest">{sets.length} Sets</span>}
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className={`text-zinc-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                        </button>
                        {isExpanded && (
                          <div className="grid grid-cols-3 gap-2 mt-4 animate-in slide-in-from-top-1">
                            {sets.length > 0 ? sets.map((s: any, i: number) => (
                                <div key={i} className="bg-black/40 p-3 rounded-xl border border-zinc-800 text-center">
                                    <p className="text-[7px] font-black text-zinc-700 uppercase mb-1">Set {i+1}</p>
                                    <p className="text-[11px] font-black italic">{s.weight}kg</p>
                                    <p className="text-[11px] font-black italic text-purple-400">{s.reps}r</p>
                                </div>
                            )) : <p className="col-span-3 text-[9px] font-black uppercase text-zinc-800 text-center py-4 italic">No workout data</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-full">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-6 mb-4">
                 <div className="flex gap-3 mb-4">
                   <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-[10px] font-black text-zinc-500 flex-1 outline-none" />
                   <input type="number" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="0.0 kg" className="bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-lg font-black italic outline-none w-32 text-center" />
                 </div>
                 <button onClick={logBodyWeight} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em]">{editingId ? 'Update Log' : 'Save Log'}</button>
              </div>
              <div className="space-y-2">
                {weightHistory.slice().reverse().map(log => (
                  <div key={log.id} className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{log.date}</span>
                        <span className="font-black italic text-xl">{log.value}kg</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingId(log.id); setBodyWeightInput(log.value.toString()); setLogDate(log.rawDate); }} className="p-2 text-zinc-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                        <button onClick={() => deleteWeight(log.id)} className="p-2 text-red-900/50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-3xl border-t border-zinc-800" />
          <div className="relative flex justify-around items-center pt-5 pb-[calc(env(safe-area-inset-bottom)+15px)] px-6">
            {[{ id: 'lift', label: 'WORKOUT' }, { id: 'history', label: 'HISTORY' }, { id: 'weight', label: 'BODY' }].map((nav) => (
              <button key={nav.id} onClick={() => setView(nav.id as any)} className="relative flex-1 flex flex-col items-center group">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${view === nav.id ? "text-purple-400" : "text-zinc-600"}`}>{nav.label}</span>
                {view === nav.id && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
}