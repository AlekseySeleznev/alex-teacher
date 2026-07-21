const { useState, useEffect, useMemo, useRef, useCallback } = React;

const WORDS = window.CATEGORIES.food.words;
const TOTAL_STEPS = window.TOTAL_STEPS;

// ---------- helpers ----------

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(pool, excludeIds, count) {
  const candidates = shuffle(pool.filter((w) => !excludeIds.includes(w.id)));
  return candidates.slice(0, count);
}

function phaseForStep(step) {
  if (step <= 5) return 1;
  if (step <= 10) return 2;
  if (step <= 20) return 3;
  return 4;
}

// Builds the randomized content for a given step.
function generateStepData(step, pool) {
  const phase = phaseForStep(step);

  if (phase === 1) {
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const distractors = pickDistractors(pool, [correct.id], 2);
    return { phase, correct, options: shuffle([correct, ...distractors]) };
  }

  if (phase === 2) {
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const distractors = pickDistractors(pool, [correct.id], 3);
    return { phase, correct, options: shuffle([correct, ...distractors]) };
  }

  if (phase === 4) {
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const distractors = pickDistractors(pool, [correct.id], 4);
    return { phase, correct, options: shuffle([correct, ...distractors]) };
  }

  // Phase 3: tap-to-place, 2 target words + 2 distractor emojis
  const targets = shuffle(pool).slice(0, 2);
  const distractors = pickDistractors(pool, targets.map((w) => w.id), 2);
  const leftWords = shuffle(targets);
  const rightEmojis = shuffle([...targets, ...distractors]);
  return { phase, targets, leftWords, rightEmojis };
}

// ---------- speech ----------

function speak(text, muted) {
  if (muted || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = window.SPEECH_LANG;
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

// Speaks without cutting off whatever is already queued - used to add a
// reinforcement pronunciation after a correct tap without killing the
// word that's still playing from the auto-play-on-entry call.
function speakQueued(text, muted) {
  if (muted || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = window.SPEECH_LANG;
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function speakSequence(texts, muted) {
  if (muted || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  texts.forEach((text) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = window.SPEECH_LANG;
    utter.rate = 0.85;
    window.speechSynthesis.speak(utter);
  });
}

function unlockSpeech() {
  if (!("speechSynthesis" in window)) return;
  // Speaking inside the click handler (the user gesture itself) unlocks
  // the TTS engine so later, non-gesture-triggered speak() calls are allowed.
  const unlock = new SpeechSynthesisUtterance(" ");
  unlock.volume = 0;
  window.speechSynthesis.speak(unlock);
}

// ---------- small UI pieces ----------

function Header({ step, muted, onToggleMute }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4">
      <div className="text-sm font-semibold text-slate-500">
        Step {step}/{TOTAL_STEPS}
      </div>
      <button
        onClick={onToggleMute}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-white shadow text-xl active:scale-95 transition"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}

function ProgressBar({ step }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="px-4 mt-3">
      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ComboBadge({ combo }) {
  if (combo < 2) return <div className="h-9" />;
  return (
    <div className="flex justify-center mt-2">
      <div className="pop px-4 py-1 rounded-full bg-amber-400 text-amber-900 font-bold text-sm shadow">
        🔥 x{combo} Combo!
      </div>
    </div>
  );
}

function OptionButton({ label, state, onClick }) {
  const base =
    "min-h-[48px] w-full rounded-2xl font-semibold text-lg shadow transition-all duration-200 active:scale-95 px-4 py-3";
  const styles = {
    idle: "bg-white text-slate-700 hover:bg-slate-50",
    correct: "bg-emerald-500 text-white",
    wrong: "bg-rose-500 text-white",
    dim: "bg-white text-slate-300",
  };
  return (
    <button
      onClick={onClick}
      disabled={state !== "idle"}
      className={`${base} ${styles[state]} ${state === "wrong" ? "shake" : ""}`}
    >
      {label}
    </button>
  );
}

// ---------- phases ----------

function WordChoicePhase({ stepData, muted, onAnswer }) {
  const [answered, setAnswered] = useState(null);
  const [wrongId, setWrongId] = useState(null);

  useEffect(() => {
    setAnswered(null);
    setWrongId(null);
    speak(stepData.correct.word, muted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepData]);

  const handlePick = (option) => {
    if (answered) return;
    const isCorrect = option.id === stepData.correct.id;
    setAnswered(option.id);
    if (isCorrect) {
      speakQueued(stepData.correct.word, muted);
    } else {
      setWrongId(option.id);
    }
    setTimeout(() => onAnswer(isCorrect), 650);
  };

  const gridCols = stepData.options.length === 5 ? "grid-cols-1" : "grid-cols-1";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-[7rem] leading-none select-none pop" key={stepData.correct.id}>
        {stepData.correct.emoji}
      </div>
      <div className={`grid ${gridCols} gap-3 w-full max-w-sm`}>
        {stepData.options.map((opt) => {
          let state = "idle";
          if (answered) {
            if (opt.id === stepData.correct.id) state = "correct";
            else if (opt.id === wrongId) state = "wrong";
            else state = "dim";
          }
          return (
            <OptionButton
              key={opt.id}
              label={opt.word}
              state={state}
              onClick={() => handlePick(opt)}
            />
          );
        })}
      </div>
    </div>
  );
}

function EmojiGridPhase({ stepData, muted, onAnswer }) {
  const [answered, setAnswered] = useState(null);
  const [wrongId, setWrongId] = useState(null);

  useEffect(() => {
    setAnswered(null);
    setWrongId(null);
    speak(stepData.correct.word, muted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepData]);

  const handlePick = (option) => {
    if (answered) return;
    const isCorrect = option.id === stepData.correct.id;
    setAnswered(option.id);
    if (isCorrect) {
      speakQueued(stepData.correct.word, muted);
    } else {
      setWrongId(option.id);
    }
    setTimeout(() => onAnswer(isCorrect), 650);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-4xl font-extrabold text-slate-700 text-center">
        {stepData.correct.word}
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        {stepData.options.map((opt) => {
          let extra = "bg-white";
          if (answered) {
            if (opt.id === stepData.correct.id) extra = "bg-emerald-500";
            else if (opt.id === wrongId) extra = "bg-rose-500 shake";
            else extra = "bg-white opacity-40";
          }
          return (
            <button
              key={opt.id}
              onClick={() => handlePick(opt)}
              disabled={!!answered}
              className={`min-h-[48px] aspect-square rounded-3xl shadow flex items-center justify-center text-6xl transition-all duration-200 active:scale-95 ${extra}`}
            >
              {opt.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TapToPlacePhase({ stepData, muted, onAnswer }) {
  const [placements, setPlacements] = useState({}); // wordId -> emojiId
  const [selectedEmojiId, setSelectedEmojiId] = useState(null);
  const [wrongFlash, setWrongFlash] = useState(null); // { emojiId, wordId } | null

  useEffect(() => {
    setPlacements({});
    setSelectedEmojiId(null);
    setWrongFlash(null);
    speakSequence(
      stepData.leftWords.map((w) => w.word),
      muted
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepData]);

  const usedEmojiIds = Object.values(placements);

  const handleTapEmoji = (emojiId) => {
    if (usedEmojiIds.includes(emojiId)) return;
    setSelectedEmojiId((cur) => (cur === emojiId ? null : emojiId));
  };

  const handleTapSlot = (wordId) => {
    if (placements[wordId] || selectedEmojiId == null) return;
    const emoji = stepData.rightEmojis.find((e) => e.id === selectedEmojiId);
    const isMatch = emoji.id === wordId;

    if (isMatch) {
      const matchedWord = stepData.leftWords.find((w) => w.id === wordId);
      speakQueued(matchedWord.word, muted);
      const next = { ...placements, [wordId]: selectedEmojiId };
      setPlacements(next);
      setSelectedEmojiId(null);
      if (Object.keys(next).length === stepData.leftWords.length) {
        setTimeout(() => onAnswer(true), 500);
      }
    } else {
      setWrongFlash({ emojiId: selectedEmojiId, wordId });
      setTimeout(() => {
        setWrongFlash(null);
        setSelectedEmojiId(null);
      }, 400);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-4 justify-center">
          {stepData.leftWords.map((w) => {
            const filledEmojiId = placements[w.id];
            const filledEmoji = filledEmojiId
              ? stepData.rightEmojis.find((e) => e.id === filledEmojiId)
              : null;
            const isWrongTarget = wrongFlash && wrongFlash.wordId === w.id;
            return (
              <div key={w.id} className="flex items-center gap-3">
                <div className="font-semibold text-slate-700 text-lg w-20 shrink-0">
                  {w.word}
                </div>
                <button
                  onClick={() => handleTapSlot(w.id)}
                  className={`min-h-[48px] flex-1 rounded-2xl border-2 border-dashed flex items-center justify-center text-3xl transition-colors duration-200
                    ${filledEmoji ? "bg-emerald-100 border-emerald-400" : "bg-white border-slate-300"}
                    ${isWrongTarget ? "shake border-rose-400 bg-rose-100" : ""}`}
                >
                  {filledEmoji ? filledEmoji.emoji : ""}
                </button>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stepData.rightEmojis.map((e) => {
            const used = usedEmojiIds.includes(e.id);
            const isSelected = selectedEmojiId === e.id;
            const isWrongSource = wrongFlash && wrongFlash.emojiId === e.id;
            let extra = "bg-white";
            if (used) extra = "bg-emerald-500 opacity-50";
            else if (isWrongSource) extra = "bg-rose-500 shake";
            else if (isSelected) extra = "bg-indigo-400 pop";
            return (
              <button
                key={e.id}
                onClick={() => handleTapEmoji(e.id)}
                disabled={used}
                className={`min-h-[48px] aspect-square rounded-3xl shadow flex items-center justify-center text-4xl transition-all duration-200 active:scale-95 ${extra}`}
              >
                {e.emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- game screen ----------

function GameScreen({ muted, onToggleMute, onFinish }) {
  const [step, setStep] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const stepData = useMemo(() => generateStepData(step, WORDS), [step]);

  const handleAnswer = useCallback(
    (isCorrect) => {
      setCombo((c) => {
        const next = isCorrect ? c + 1 : 0;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
      if (isCorrect) setCorrectCount((c) => c + 1);

      if (step === TOTAL_STEPS) {
        onFinish({ maxCombo: Math.max(maxCombo, isCorrect ? combo + 1 : 0), correctCount: correctCount + (isCorrect ? 1 : 0) });
      } else {
        setStep((s) => s + 1);
      }
    },
    [step, combo, maxCombo, correctCount, onFinish]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header step={step} muted={muted} onToggleMute={onToggleMute} />
      <ProgressBar step={step} />
      <ComboBadge combo={combo} />

      {stepData.phase === 1 && (
        <WordChoicePhase stepData={stepData} muted={muted} onAnswer={handleAnswer} />
      )}
      {stepData.phase === 2 && (
        <EmojiGridPhase stepData={stepData} muted={muted} onAnswer={handleAnswer} />
      )}
      {stepData.phase === 3 && (
        <TapToPlacePhase stepData={stepData} muted={muted} onAnswer={handleAnswer} />
      )}
      {stepData.phase === 4 && (
        <WordChoicePhase stepData={stepData} muted={muted} onAnswer={handleAnswer} />
      )}
    </div>
  );
}

// ---------- start / end screens ----------

function StartScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 text-center bg-gradient-to-b from-indigo-500 to-purple-600 text-white">
      <div className="text-7xl">🍎🍕🥕</div>
      <div>
        <h1 className="text-3xl font-extrabold">Word Quest</h1>
        <p className="mt-2 text-indigo-100">Learn 8 Thai food words in 30 quick steps!</p>
      </div>
      <button
        onClick={onStart}
        className="min-h-[48px] px-10 py-4 rounded-2xl bg-white text-indigo-600 font-bold text-xl shadow-lg active:scale-95 transition"
      >
        Start Game
      </button>
    </div>
  );
}

function EndScreen({ stats, onRestart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 text-center bg-gradient-to-b from-emerald-500 to-teal-600 text-white">
      <div className="text-7xl pop">🏆</div>
      <div>
        <h1 className="text-3xl font-extrabold">Quest Complete!</h1>
        <p className="mt-2 text-emerald-50">
          {stats.correctCount}/{TOTAL_STEPS} correct &bull; best combo x{stats.maxCombo}
        </p>
      </div>
      <button
        onClick={onRestart}
        className="min-h-[48px] px-10 py-4 rounded-2xl bg-white text-emerald-600 font-bold text-xl shadow-lg active:scale-95 transition"
      >
        Play Again
      </button>
    </div>
  );
}

// ---------- root ----------

function App() {
  const [screen, setScreen] = useState("start"); // start | playing | finished
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState({ maxCombo: 0, correctCount: 0 });
  const [gameKey, setGameKey] = useState(0);

  const handleStart = () => {
    unlockSpeech();
    setScreen("playing");
  };

  const handleFinish = (finalStats) => {
    setStats(finalStats);
    setScreen("finished");
  };

  const handleRestart = () => {
    setGameKey((k) => k + 1);
    setScreen("start");
  };

  if (screen === "start") return <StartScreen onStart={handleStart} />;
  if (screen === "finished") return <EndScreen stats={stats} onRestart={handleRestart} />;

  return (
    <GameScreen
      key={gameKey}
      muted={muted}
      onToggleMute={() => setMuted((m) => !m)}
      onFinish={handleFinish}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
