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
  const [archivedData, setArchivedData] = useState<any>({});
  const [historyLog, setHistoryLog] = useState<string[]>([]); 
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [showBaselineInput, setShowBaselineInput] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [settingsMode, setSettingsMode] = useState<"main" | "archives">("main");

  const currentPhase = workoutPlan.phase1;
  const currentDay = currentPhase.days[dayIndex];
  const currentExercise = currentDay.exercises[exerciseIndex];
  const storageKey = `w${selectedWeek}-${currentExercise.name}`;
  const currentSets = allWorkoutData[storageKey] || [];
  const exerciseNotes = allWorkoutData[`${storageKey}-note`] || "";
  const historyDay = currentPhase.days[historyDayIndex];

  useEffect(() => {
    const savedData = localStorage.getItem("gym_session_cache");
    const savedArchive = localStorage.getItem("gym_archive");
    const savedHistory = localStorage.getItem("gym_history_grid");
    const savedWeightLogs = localStorage.getItem("body_weight_logs");
    const savedBaselines = localStorage.getItem("lift_baselines");
    if (savedData) setAllWorkoutData(JSON.parse(savedData));
    if (savedArchive) setArchivedData(JSON.parse(savedArchive));
    if (savedHistory) setHistoryLog(JSON.parse(savedHistory));
    if (savedWeightLogs) setWeightHistory(JSON.parse(savedWeightLogs));
    if (savedBaselines) setBaselines(JSON.parse(savedBaselines));
  }, []);

  const globalPBs = useMemo(() => {
    const bests: Record<string, number> = { ...baselines };
    Object.keys(allWorkoutData).forEach(key => {
      if (key.endsWith("-note")) return;
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

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const logSet = () => {
    if (!weight || !reps) return;
    const inputWeight = parseFloat(weight);
    const oldBest = globalPBs[currentExercise.name] || 0;
    
    if (inputWeight > oldBest && oldBest > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    const newSets = [...currentSets, { weight, reps, id: Date.now() }];
    const updatedData = { ...allWorkoutData, [storageKey]: newSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    
    setWeight(""); setReps(""); 
    const isCompound = currentExercise.name.toLowerCase().includes("press") || currentExercise.name.toLowerCase().includes("squat");
    setTimer(isCompound ? 120 : 60);
  };

  const deleteSet = (exName: string, setId: number) => {
    const key = `w${selectedWeek}-${exName}`;
    const updatedSets = (allWorkoutData[key] || []).filter((s: any) => s.id !== setId);
    const updatedData = { ...allWorkoutData, [key]: updatedSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
  };

  const deleteWeightLog = (id: number) => {
    const updated = weightHistory.filter(h => h.id !== id);
    setWeightHistory(updated);
    localStorage.setItem("body_weight_logs", JSON.stringify(updated));
  };

  const saveBaseline = () => {
    const num = parseFloat(weight);
    if (isNaN(num)) return;
    const newBaselines = { ...baselines, [currentExercise.name]: num };
    setBaselines(newBaselines);
    localStorage.setItem("lift_baselines", JSON.stringify(newBaselines));
    setShowBaselineInput(false);
    setWeight("");
  };

  const logBodyWeight = () => {
    if (!bodyWeightInput) return;
    const dateObj = new Date(logDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    let updatedHistory;
    if (editingId) {
      updatedHistory = weightHistory.map(h => h.id === editingId ? { ...h, value: parseFloat(bodyWeightInput), date: formattedDate, rawDate: logDate } : h);
      setEditingId(null);
    } else {
      updatedHistory = [...weightHistory, { id: Date.now(), date: formattedDate, value: parseFloat(bodyWeightInput), rawDate: logDate }];
    }
    const sorted = updatedHistory.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
    setWeightHistory(sorted);
    localStorage.setItem("body_weight_logs", JSON.stringify(sorted));
    setBodyWeightInput("");
  };

  const padding = { top: 20, right: 30, bottom: 20, left: 40 };
  const width = 340;
  const height = 200;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const weights = weightHistory.map(d => d.value);
  let minW = weightHistory.length > 0 ? Math.min(...weights) - 2 : 70;
  let maxW = weightHistory.length > 0 ? Math.max(...weights) + 2 : 100;
  const getY = (val: number) => padding.top + chartH - ((val - minW) / ((maxW - minW) || 1)) * chartH;
  const getX = (i: number) => weightHistory.length <= 1 ? padding.left + chartW / 2 : padding.left + (i / (weightHistory.length - 1)) * chartW;
  const linePath = weightHistory.length > 1 ? weightHistory.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(" ") : "";
  const actualWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].value : 0;
  const totalChange = (actualWeight - (weightHistory[0]?.value || 0)).toFixed(1);

  return (
    <div className="max-w-[100vw] overflow-x-hidden min-h-screen bg-[#0a0b0d] text-white font-sans pb-40">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center bg-purple-500/10 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center animate-bounce">
            <p className="text-8xl mb-2">🚀</p>
            <p className="text-3xl font-black italic uppercase text-amber-400 tracking-tighter">NEW PERSONAL BEST</p>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5">
        <header className="pt-8 mb-4 uppercase italic font-black">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl tracking-tighter">{view === 'weight' ? 'Weight' : view === 'history' ? 'History' : 'Workout'}</h1>
            {timer > 0 && <div className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black tabular-nums">REST {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</div>}
          </div>
        </header>

        <main className="relative">
          <div className={`flex transition-transform duration-500 ease-out ${view === 'history' ? '-translate-x-full' : view === 'weight' ? '-translate-x-[200%]' : 'translate-x-0'}`}>
            
            {/* WORKOUT VIEW */}
            <div className="min-w-full">
              <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800 min-h-[400px]">
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">{currentExercise.name}</h2>
                  <button onClick={() => setShowBaselineInput(!showBaselineInput)} className="px-3 py-2 rounded-xl text-[8px] font-black uppercase bg-zinc-800 text-zinc-400">
                    {baselines[currentExercise.name] ? `${baselines[currentExercise.name]}kg pb` : 'set pb'}
                  </button>
                </div>

                {showBaselineInput && (
                  <div className="mb-4 bg-purple-500/10 p-4 rounded-2xl flex gap-2">
                    <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="PB Weight" className="flex-1 bg-black rounded-xl p-3 outline-none" />
                    <button onClick={saveBaseline} className="bg-purple-500 px-4 rounded-xl font-black text-[9px]">Save</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-black rounded-[28px] p-5 border border-zinc-800 text-center">
                    <p className="text-[8px] font-black uppercase text-zinc-700 mb-2">Weight</p>
                    <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none" placeholder="0" />
                  </div>
                  <div className="bg-black rounded-[28px] p-5 border border-zinc-800 text-center">
                    <p className="text-[8px] font-black uppercase text-zinc-700 mb-2">Reps</p>
                    <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none" placeholder="0" />
                  </div>
                </div>
                <button onClick={logSet} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest">Log Set</button>
              </div>
              <div className="flex justify-between items-center mt-4 px-2">
                  <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} className="p-4 text-zinc-600 disabled:opacity-0" disabled={exerciseIndex === 0}>BACK</button>
                  <span className="text-[10px] font-black text-zinc-700">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
                  <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} className="p-4 text-purple-500 disabled:opacity-0" disabled={exerciseIndex === currentDay.exercises.length-1}>NEXT</button>
              </div>
            </div>

            {/* HISTORY VIEW */}
            <div className="min-w-full">
              <div className="bg-zinc-900 border rounded-[40px] p-6 border-zinc-800 min-h-[440px]">
                <div className="space-y-4">
                  {historyDay.exercises.map((ex, exIdx) => {
                    const sets = allWorkoutData[`w${selectedWeek}-${ex.name}`] || [];
                    return (
                      <div key={exIdx} className="border-b border-zinc-800 pb-4">
                        <p className="text-[10px] font-black uppercase text-zinc-500 mb-3">{ex.name}</p>
                        <div className="grid grid-cols-1 gap-2">
                          {sets.map((s: any, i: number) => (
                            <div key={s.id} onContextMenu={(e) => { e.preventDefault(); deleteSet(ex.name, s.id); }} className="bg-black/40 p-3 rounded-xl flex justify-between items-center active:bg-red-500/20 transition-colors">
                              <span className="text-[10px] font-black text-zinc-700">SET {i+1}</span>
                              <div className="flex gap-4">
                                <span className="text-xs font-black">{s.weight}kg</span>
                                <span className="text-xs font-black text-purple-400">{s.reps} reps</span>
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

            {/* WEIGHT VIEW */}
            <div className="min-w-full">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-6">
                <div className="relative w-full h-[150px] mb-8">
                  <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                    {weightHistory.length >= 2 && <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="4" />}
                    {weightHistory.map((d, i) => (
                      <circle key={d.id} cx={getX(i)} cy={getY(d.value)} r="5" className="fill-purple-500" onContextMenu={(e) => { e.preventDefault(); deleteWeightLog(d.id); }} />
                    ))}
                  </svg>
                </div>
                <div className="flex gap-2">
                    <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="Weight" className="flex-1 bg-black rounded-2xl p-4 outline-none font-black" />
                    <button onClick={logBodyWeight} className="bg-white text-black px-8 rounded-2xl font-black text-[11px]">Save</button>
                </div>
              </div>
            </div>

          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0b0d]/95 backdrop-blur-xl border-t border-zinc-800 px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] flex justify-around z-50">
          {[{ id: 'lift', label: 'WORKOUT' }, { id: 'history', label: 'HISTORY' }, { id: 'weight', label: 'BODY' }].map((nav) => (
            <button key={nav.id} onClick={() => setView(nav.id as any)} className="relative flex-1 flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${view === nav.id ? "text-purple-400" : "text-zinc-600"}`}>{nav.label}</span>
              {view === nav.id && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}