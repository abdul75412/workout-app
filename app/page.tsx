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
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const resetMesocycle = () => {
    const newArchive = { ...archivedData, [Date.now()]: { data: allWorkoutData, history: historyLog } };
    setArchivedData(newArchive);
    setAllWorkoutData({});
    setHistoryLog([]);
    localStorage.setItem("gym_archive", JSON.stringify(newArchive));
    localStorage.setItem("gym_session_cache", JSON.stringify({}));
    localStorage.setItem("gym_history_grid", JSON.stringify([]));
    setConfirmReset(false);
    setShowOptions(false);
  };

  const restoreArchive = (timestamp: string) => {
    const archivedEntry = archivedData[timestamp];
    setAllWorkoutData(archivedEntry.data);
    setHistoryLog(archivedEntry.history || []);
    const newArchive = { ...archivedData };
    delete newArchive[timestamp];
    setArchivedData(newArchive);
    localStorage.setItem("gym_archive", JSON.stringify(newArchive));
    localStorage.setItem("gym_session_cache", JSON.stringify(archivedEntry.data));
    localStorage.setItem("gym_history_grid", JSON.stringify(archivedEntry.history || []));
    setShowOptions(false);
  };

  const saveBaseline = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const newBaselines = { ...baselines, [currentExercise.name]: num };
    setBaselines(newBaselines);
    localStorage.setItem("lift_baselines", JSON.stringify(newBaselines));
    setShowBaselineInput(false);
  };

  const saveNote = () => {
    const updatedData = { ...allWorkoutData, [`${storageKey}-note`]: noteInput };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    setShowNoteField(false);
  };

  const logSet = () => {
    if (!weight || !reps) return;
    const inputWeight = parseFloat(weight);
    const oldBest = globalPBs[currentExercise.name] || 0;
    if (inputWeight >= oldBest + 10 && oldBest > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    const newSets = [...currentSets, { weight, reps }];
    const updatedData = { ...allWorkoutData, [storageKey]: newSets };
    setAllWorkoutData(updatedData);
    localStorage.setItem("gym_session_cache", JSON.stringify(updatedData));
    const logKey = `w${selectedWeek}-d${dayIndex + 1}`;
    if (!historyLog.includes(logKey)) {
        const newHistory = [...historyLog, logKey];
        setHistoryLog(newHistory);
        localStorage.setItem("gym_history_grid", JSON.stringify(newHistory));
    }
    setWeight(""); setReps(""); 
    const isCompound = currentExercise.name.toLowerCase().includes("press") || currentExercise.name.toLowerCase().includes("squat");
    setTimer(isCompound ? 120 : 60);
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
  const firstWeight = weightHistory.length > 0 ? weightHistory[0].value : 0;
  const totalChange = (actualWeight - firstWeight).toFixed(1);

  return (
    <div className="max-w-[100vw] overflow-hidden min-h-screen bg-[#0a0b0d] text-white font-sans selection:bg-purple-500/30">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[200] flex items-center justify-center bg-purple-500/10 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center animate-bounce">
            <p className="text-8xl mb-2">🚀</p>
            <p className="text-3xl font-black italic uppercase text-amber-400 tracking-tighter">HUGE +10KG PR</p>
          </div>
        </div>
      )}

      {showOptions && (
        <div className="fixed inset-0 bg-[#0a0b0d]/95 backdrop-blur-md z-[200] p-6 flex items-center justify-center">
            <div className="bg-zinc-900 w-full max-w-xs p-6 rounded-[40px] border border-zinc-800 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">{settingsMode === "main" ? "Settings" : "Archives"}</h2>
                    {settingsMode === "archives" && (
                        <button onClick={() => setSettingsMode("main")} className="text-[10px] font-black text-zinc-500 uppercase">Back</button>
                    )}
                </div>
                
                {settingsMode === "main" ? (
                    <div className="space-y-3">
                        <button onClick={() => setSettingsMode("archives")} className="w-full bg-zinc-800 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">View Archives</button>
                        {!confirmReset ? (
                            <button onClick={() => setConfirmReset(true)} className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-500/20">Reset Meso</button>
                        ) : (
                            <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/20">
                                <p className="text-[9px] font-black text-red-500 uppercase text-center mb-4 tracking-wider leading-tight">Archive current data and start fresh?</p>
                                <button onClick={resetMesocycle} className="w-full bg-red-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest mb-2">Yes, Reset</button>
                                <button onClick={() => setConfirmReset(false)} className="w-full py-2 text-[9px] font-black uppercase text-zinc-600">Cancel</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {Object.keys(archivedData).length > 0 ? Object.keys(archivedData).sort().reverse().map(ts => (
                            <div key={ts} className="bg-black/40 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{new Date(parseInt(ts)).toLocaleDateString('en-GB')}</p>
                                </div>
                                <button onClick={() => restoreArchive(ts)} className="text-purple-500 text-[9px] font-black uppercase tracking-widest">Restore</button>
                            </div>
                        )) : <p className="text-center py-10 text-[9px] font-black uppercase text-zinc-700 tracking-widest">No archives</p>}
                    </div>
                )}
                <button onClick={() => {setShowOptions(false); setConfirmReset(false); setSettingsMode("main");}} className="w-full mt-6 py-4 bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400">Close</button>
            </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5">
        <header className="pt-8 mb-4 uppercase italic font-black">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl tracking-tighter leading-none">{view === 'weight' ? 'Weight' : view === 'history' ? 'History' : 'Mesocycle 1'}</h1>
            <button onClick={() => setShowOptions(true)} className="p-2 text-zinc-700 active:text-white transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
          {view !== 'weight' && (
            <div className="relative flex items-center justify-between bg-zinc-900/40 rounded-2xl p-1 border border-zinc-800/50">
              <button onClick={() => setSelectedWeek(prev => Math.max(1, prev - 1))} className="p-2 text-zinc-600 active:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m15 18-6-6 6-6"/></svg></button>
              <div className="flex-1 text-center"><span className="text-[10px] font-black tracking-widest uppercase">Week {selectedWeek}</span></div>
              <button onClick={() => setSelectedWeek(prev => Math.min(12, prev + 1))} className="p-2 text-zinc-600 active:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
          )}
        </header>

        <main className="relative">
          <div className={`flex transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${view === 'history' ? '-translate-x-full' : view === 'weight' ? '-translate-x-[200%]' : 'translate-x-0'}`}>
            
            {/* LIFT VIEW */}
            <div className="min-w-full">
              <div className="mb-2">
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                    {currentPhase.days.map((day, idx) => (
                        <button key={idx} onClick={() => { setDayIndex(idx); setExerciseIndex(0); }} className={`min-w-[100px] py-4 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all border ${dayIndex === idx ? "bg-white text-black border-white" : "bg-zinc-900/40 text-zinc-600 border-zinc-800/50"}`}>{day.label}</button>
                    ))}
                 </div>
                 <div className="h-1.5 w-full bg-zinc-900/40 rounded-full overflow-hidden mt-1 px-1">
                    <div className="h-full bg-zinc-700 rounded-full transition-all duration-300" style={{ width: `${100 / currentPhase.days.length}%`, transform: `translateX(${dayIndex * 100}%)` }} />
                 </div>
              </div>

              <div className="relative flex gap-2 mb-4 bg-zinc-900/40 p-1.5 rounded-2xl border border-zinc-800/50 mt-4">
                  <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-8px)] bg-zinc-800 rounded-xl transition-transform duration-300 ease-out ${subView === 'progress' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} />
                  <button onClick={() => setSubView("workout")} className={`relative z-10 flex-1 py-3 text-[8px] font-black uppercase tracking-[0.25em] transition-colors ${subView === 'workout' ? 'text-white' : 'text-zinc-600'}`}>Workout</button>
                  <button onClick={() => setSubView("progress")} className={`relative z-10 flex-1 py-3 text-[8px] font-black uppercase tracking-[0.25em] transition-colors ${subView === 'progress' ? 'text-white' : 'text-zinc-600'}`}>Progress</button>
              </div>

              <div className="bg-zinc-900 rounded-[40px] p-6 border border-zinc-800 min-h-[400px] flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex-1">
                      <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tighter max-w-[180px]">{currentExercise.name}</h2>
                          <button onClick={() => { setNoteInput(exerciseNotes); setShowNoteField(!showNoteField); }} className={`transition-colors ${exerciseNotes ? 'text-purple-400' : 'text-zinc-700'}`}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                      </div>
                  </div>
                  <button onClick={() => setShowBaselineInput(!showBaselineInput)} className="bg-zinc-800 px-3 py-2 rounded-xl text-[8px] font-black uppercase text-zinc-500 tracking-widest border border-zinc-700/50">{baselines[currentExercise.name] ? `${baselines[currentExercise.name]}kg pb` : 'set pb'}</button>
                </div>

                <div className="flex-1 relative overflow-hidden">
                  <div className={`flex transition-transform duration-500 ease-in-out h-full ${subView === "progress" ? "-translate-x-full" : "translate-x-0"}`}>
                      <div className="min-w-full">
                          {showNoteField && (
                              <div className="mb-4 animate-in slide-in-from-top-2 duration-300">
                                  <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="note..." className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-[11px] font-bold italic outline-none min-h-[80px]" />
                                  <button onClick={saveNote} className="w-full bg-zinc-800 py-3 rounded-xl text-[9px] font-black uppercase mt-2 tracking-widest">Save Note</button>
                              </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 mb-8">
                              <div className="bg-black rounded-[28px] p-5 border border-zinc-800 text-center">
                                <p className="text-[8px] font-black uppercase text-zinc-700 mb-2 tracking-widest">Weight</p>
                                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center outline-none tabular-nums" placeholder="0" />
                              </div>
                              <div className="bg-black rounded-[28px] p-5 border border-zinc-800 text-center">
                                <p className="text-[8px] font-black uppercase text-zinc-700 mb-2 tracking-widest">Reps</p>
                                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="bg-transparent text-5xl font-black w-full text-center text-purple-400 outline-none tabular-nums" placeholder="0" />
                              </div>
                          </div>
                          <button onClick={logSet} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] active:scale-95 transition-all">Log Set</button>
                      </div>

                      <div className="min-w-full flex items-end justify-around gap-2 px-2 pt-10">
                          {exerciseProgressData.length > 0 ? exerciseProgressData.map((d, i) => {
                              const max = Math.max(...exerciseProgressData.map(p => p.maxWeight));
                              const min = Math.min(...exerciseProgressData.map(p => p.maxWeight));
                              const h = max === min ? 60 : 30 + ((d.maxWeight - min) / (max - min)) * 70;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                                    <span className="text-[10px] font-black italic text-zinc-400">{d.maxWeight}</span>
                                    <div style={{ height: `${h}%` }} className="w-full bg-gradient-to-t from-purple-900 to-purple-400 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.15)]" />
                                    <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter">W{d.week}</span>
                                </div>
                              )
                          }) : <div className="w-full h-full flex items-center justify-center opacity-10"><p className="text-[10px] font-black uppercase tracking-[0.5em]">No History</p></div>}
                      </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50">
                  <button onClick={() => setExerciseIndex(i => Math.max(0, i-1))} disabled={exerciseIndex === 0} className="p-3 text-zinc-600 active:text-white disabled:opacity-0 transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m15 18-6-6 6-6"/></svg></button>
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">{exerciseIndex + 1} / {currentDay.exercises.length}</span>
                  <button onClick={() => setExerciseIndex(i => Math.min(currentDay.exercises.length-1, i+1))} disabled={exerciseIndex === currentDay.exercises.length-1} className="p-3 text-purple-500 active:text-white disabled:opacity-0 transition-all"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m9 18 6-6-6-6"/></svg></button>
              </div>
            </div>

            {/* HISTORY VIEW */}
            <div className="min-w-full">
              <div className="mb-6">
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                    {currentPhase.days.map((day, idx) => (
                        <button key={idx} onClick={() => setHistoryDayIndex(idx)} className={`min-w-[100px] py-4 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all border ${historyDayIndex === idx ? "bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20" : "bg-zinc-900/40 text-zinc-600 border-zinc-800/50"}`}>{day.label}</button>
                    ))}
                 </div>
                 <div className="h-1.5 w-full bg-zinc-900/40 rounded-full overflow-hidden mt-1 px-1">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${100 / currentPhase.days.length}%`, transform: `translateX(${historyDayIndex * 100}%)` }} />
                 </div>
              </div>

              <div className="bg-zinc-900/50 border rounded-[40px] p-6 border-zinc-800/50 min-h-[440px] max-h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
                <h3 className="text-xl font-black italic uppercase mb-8 tracking-tighter text-zinc-400">{historyDay.label}</h3>
                <div className="space-y-2">
                  {historyDay.exercises.map((ex, exIdx) => {
                    const key = `w${selectedWeek}-${ex.name}`;
                    const sets = allWorkoutData[key] || [];
                    const isExpanded = expandedEx === exIdx.toString();
                    return (
                      <div key={exIdx} className="mb-2">
                        <button onClick={() => setExpandedEx(isExpanded ? null : exIdx.toString())} className={`w-full flex justify-between items-center p-4 rounded-2xl transition-all ${isExpanded ? 'bg-zinc-800/40' : 'bg-transparent border-b border-zinc-800/50 active:bg-zinc-800/20'}`}>
                            <span className={`text-xs font-black uppercase tracking-tight text-left ${sets.length > 0 ? 'text-zinc-200' : 'text-zinc-700'}`}>{ex.name}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className={`text-zinc-800 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        {isExpanded && sets.length > 0 && (
                          <div className="px-4 py-4 space-y-2 animate-in slide-in-from-top-1 duration-300">
                            {sets.map((s: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                                    <span className="text-[9px] font-black text-zinc-700 italic w-6">#{i+1}</span>
                                    <div className="flex-1 flex justify-around">
                                        <div className="flex items-baseline gap-1"><span className="text-[12px] font-black tabular-nums">{s.weight}</span><span className="text-[7px] font-black text-zinc-600 uppercase">kg</span></div>
                                        <div className="flex items-baseline gap-1"><span className="text-[12px] font-black text-purple-400 tabular-nums">{s.reps}</span><span className="text-[7px] font-black text-zinc-600 uppercase">reps</span></div>
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
            </div>

            {/* WEIGHT VIEW */}
            <div className="min-w-full">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-5 mb-4 grid grid-cols-2 gap-px bg-zinc-800/20">
                  <div className="bg-zinc-900 text-center py-4"><p className="text-[8px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Current</p><p className="text-3xl font-black italic tabular-nums">{actualWeight}<span className="text-[11px] not-italic ml-1 text-zinc-500">kg</span></p></div>
                  <div className="bg-zinc-900 text-center py-4"><p className="text-[8px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Trend</p><p className={`text-3xl font-black italic tabular-nums ${Number(totalChange) <= 0 ? 'text-purple-400' : 'text-red-400'}`}>{totalChange}<span className="text-[11px] not-italic ml-1 text-zinc-500">kg</span></p></div>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-4 mb-4">
                <div className="relative w-full h-[200px] rounded-2xl bg-black/20">
                  <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    {[0, 1, 2, 3, 4].map((i) => {
                      const y = padding.top + (chartH / 4) * i;
                      const val = maxW - ((maxW - minW) / 4) * i;
                      return (<g key={i}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#18181b" strokeWidth="1" strokeDasharray="4 4" /><text x={padding.left - 10} y={y + 3} textAnchor="end" className="fill-zinc-700 text-[9px] font-black italic">{val.toFixed(0)}</text></g>);
                    })}
                    {weightHistory.length >= 2 && <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" strokeJoin="round" className="drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />}
                    {weightHistory.map((d, i) => (<g key={d.id} onClick={() => { setEditingId(d.id); setBodyWeightInput(d.value.toString()); setLogDate(d.rawDate); }}>
                      <circle cx={getX(i)} cy={getY(d.value)} r={editingId === d.id ? "6" : "5"} className={`fill-purple-500 transition-all ${editingId === d.id ? 'stroke-white stroke-2' : 'stroke-[#0a0b0d] stroke-2'}`} />
                    </g>))}
                  </svg>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-[40px] p-5 border border-zinc-800">
                 <div className="flex gap-3 mb-4">
                   <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-[10px] font-black text-zinc-500 flex-1 outline-none uppercase" />
                   <div className="relative w-32">
                    <input type="number" step="0.1" value={bodyWeightInput} onChange={(e) => setBodyWeightInput(e.target.value)} placeholder="00.0" className="bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-lg font-black italic outline-none w-full text-center tabular-nums" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-700">KG</span>
                   </div>
                 </div>
                 <button onClick={logBodyWeight} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] active:scale-95 transition-all">Save Log</button>
              </div>
            </div>

          </div>
        </main>

        <nav className="fixed bottom-8 left-8 right-8 bg-zinc-900/80 backdrop-blur-3xl rounded-[40px] py-5 px-2 flex justify-around border border-zinc-800 shadow-2xl z-50">
          {[{ id: 'lift', label: 'WORKOUT' }, { id: 'history', label: 'HISTORY' }, { id: 'weight', label: 'BODY' }].map((nav) => (
            <button key={nav.id} onClick={() => setView(nav.id as any)} className="relative flex-1 flex flex-col items-center group">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${view === nav.id ? "text-purple-400" : "text-zinc-600 group-active:text-zinc-400"}`}>{nav.label}</span>
              {view === nav.id && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-in zoom-in duration-300" />}
            </button>
          ))}
        </nav>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
}