import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../store/eventStore';
import { getSocket } from '../../hooks/useSocket';
import { Timer } from '../../components/Timer';
import { OptionRow } from '../../components/OptionRow';
import { audioEngine } from '../../services/AudioService';
import { CheckCircle2, Lock, Send, Trophy, Sparkles, Flame, Zap, Award, ArrowUp, ArrowDown, Minus, Volume2, VolumeX } from 'lucide-react';

export const QuizTeamScreen: React.FC = () => {
  const store = useEventStore();
  const socket = getSocket();

  const quiz = store.quiz;

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedDisplay, setLockedDisplay] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(audioEngine.getMuted());

  // Ambient sound start/stop
  useEffect(() => {
    if (quiz && !quiz.isComplete) {
      audioEngine.startAmbiance('quiz');
    }
    return () => {
      audioEngine.stopAmbiance();
    };
  }, [quiz?.index, quiz?.isComplete]);

  // Trigger sound effects on question reveal
  useEffect(() => {
    if (quiz?.reveal) {
      if (quiz.reveal.isCorrect) {
        audioEngine.playEffect('correct');
      } else {
        audioEngine.playEffect('reveal');
      }
    }
  }, [quiz?.reveal?.index]);

  const toggleSound = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  // Clean state reset whenever question index changes
  useEffect(() => {
    if (quiz) {
      if (typeof quiz.lockedAnswer === 'number') {
        setSelectedOption(quiz.lockedAnswer);
        setIsLocked(true);
        setLockedDisplay(`Option ${quiz.lockedAnswer + 1}`);
      } else if (typeof quiz.lockedAnswer === 'string' && quiz.lockedAnswer.trim()) {
        setTextInput(quiz.lockedAnswer);
        setIsLocked(true);
        setLockedDisplay(quiz.lockedAnswer);
      } else {
        // ALWAYS RESET FOR A NEW QUESTION IF NO ANSWER IS LOCKED FOR THIS QUESTION
        setSelectedOption(null);
        setTextInput('');
        setIsLocked(false);
        setLockedDisplay('');
      }
      setStartTime(Date.now());
    }
  }, [quiz?.index, quiz?.lockedAnswer]);

  if (!quiz || !quiz.question) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-accent flex items-center justify-center mb-4 animate-bounce border border-indigo-500/20 shadow-md">
          <Flame className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-2xl font-black text-ink tracking-tight">Quiz Challenge Starting...</h3>
        <p className="text-sm text-muted mt-2 font-medium">Get ready with your teammate!</p>
      </div>
    );
  }

  const handleSelectOption = (index: number) => {
    if (isLocked || !store.currentActivity) return;

    setSelectedOption(index);
    setIsLocked(true);
    setLockedDisplay(`Option ${index + 1}`);
    audioEngine.playEffect('tick');

    const responseTimeMs = Math.max(100, Date.now() - startTime);

    socket.emit('team:submit', {
      activityId: store.currentActivity.id,
      payload: {
        questionIndex: quiz.index,
        selectedOption: index,
        responseTimeMs
      }
    });
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !textInput.trim() || !store.currentActivity) return;

    const trimmed = textInput.trim();
    setIsLocked(true);
    setLockedDisplay(trimmed);
    audioEngine.playEffect('tick');

    const responseTimeMs = Math.max(100, Date.now() - startTime);

    socket.emit('team:submit', {
      activityId: store.currentActivity.id,
      payload: {
        questionIndex: quiz.index,
        textAnswer: trimmed,
        responseTimeMs
      }
    });
  };

  // QUIZ COMPLETE VIEW & POPUP MODAL
  if (quiz.isComplete) {
    const comp = quiz.completion;
    const finalScore = comp?.teamScore ?? store.teamTotalScore ?? 0;

    return (
      <div className="flex flex-col min-h-full max-w-md mx-auto relative">
        {/* CELEBRATORY ENERGETIC ESPORTS VICTORY MODAL */}
        {showCompletionModal && (
          <div className="fixed inset-0 bg-ink/80 backdrop-blur-md z-50 p-6 flex items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="bg-surface border-2 border-indigo-500/30 p-8 rounded-3xl max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

              <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce border-4 border-yellow-200">
                <Trophy className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-ink tracking-tight uppercase">
                  🔥 PHENOMENAL WORK!
                </h2>
                <p className="text-sm font-semibold text-accent">
                  {comp?.message || 'Quiz Challenge Completed!'}
                </p>
              </div>

              <div className="p-5 bg-bg border border-border rounded-2xl space-y-3 shadow-inner">
                <div className="text-xs font-extrabold text-muted uppercase tracking-widest">Quiz Points Earned</div>
                <div className="text-5xl font-black text-accent font-mono tracking-tight">
                  {finalScore} <span className="text-lg font-normal text-muted">pts</span>
                </div>

                {comp?.rank && (
                  <div className="inline-flex items-center space-x-1.5 text-xs font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 py-1.5 px-4 rounded-full border border-emerald-300">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>RANK #{comp.rank} OF {comp.totalTeams || 1} TEAMS</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCompletionModal(false)}
                className="w-full py-4 bg-accent hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 text-base flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Enter Event Lobby</span>
              </button>
            </div>
          </div>
        )}

        {/* RESTING LOBBY SCREEN */}
        <div className="my-auto py-10 text-center space-y-6 bg-surface p-8 rounded-3xl border border-border shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-ink tracking-tight">
              Waiting for organizer...
            </h3>
            <p className="text-muted text-sm font-medium leading-relaxed max-w-xs mx-auto">
              The competition will begin shortly. Keep this screen open.
            </p>
          </div>

          {store.teamCode && (
            <div className="p-4 bg-bg border border-border rounded-2xl max-w-xs mx-auto space-y-1">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                Your Team Code
              </span>
              <span className="font-mono text-3xl font-black text-accent tracking-widest block">
                {store.teamCode}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isPaused = store.currentActivity?.status === 'paused';
  const hasOptions = quiz.question.options && quiz.question.options.length > 0;
  const isRevealing = !!quiz.reveal;
  const displayQNum = quiz.questionNumber || quiz.index + 1;
  const currentTotalScore = store.teamTotalScore ?? 0;
  const currentRank = store.teamRank ?? quiz.reveal?.rank;
  const rankDelta = store.rankDelta ?? quiz.reveal?.rankDelta ?? 0;

  return (
    <div className="flex flex-col min-h-full max-w-md mx-auto space-y-3">
      {/* Top Bar Progress, Live Points, Sound Toggle & Dynamic Rank Badge */}
      <div className="flex items-center justify-between py-2 border-b border-border text-xs font-bold uppercase tracking-wider">
        <span className="flex items-center space-x-1.5 text-accent font-black">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Q {displayQNum} / {quiz.total}</span>
        </span>

        <div className="flex items-center space-x-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-full bg-surface border border-border text-muted hover:text-ink transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-danger" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>

          {/* DYNAMIC RANK & TREND ARROW BADGE */}
          {currentRank !== undefined && (
            <span className={`px-2.5 py-1 rounded-full font-extrabold text-xs flex items-center space-x-1 border ${
              rankDelta > 0
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : rankDelta < 0
                ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
                : 'bg-surface border-border text-muted'
            }`}>
              {rankDelta > 0 && <ArrowUp className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
              {rankDelta < 0 && <ArrowDown className="w-3.5 h-3.5 text-red-600 stroke-[3]" />}
              {rankDelta === 0 && <Minus className="w-3 h-3 text-muted" />}
              <span>Rank #{currentRank}</span>
              {rankDelta !== 0 && (
                <span className="text-[10px] font-black font-mono">({rankDelta > 0 ? `+${rankDelta}` : rankDelta})</span>
              )}
            </span>
          )}

          {/* LIVE POINTS BADGE */}
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-black font-mono text-xs shadow-xs flex items-center space-x-1">
            <span>Points:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{currentTotalScore} pts</strong>
          </span>
        </div>
      </div>

      {/* Hero Timer */}
      <Timer deadline={quiz.deadline} isPaused={isPaused || isRevealing} size="hero" />

      {/* SPEED BONUS TIER BANNER */}
      {!isRevealing && (
        <div className="flex items-center justify-center space-x-2 py-1.5 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-300">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Speed Scale: <strong>100 pts</strong> (&lt;15s) • <strong>75 pts</strong> (&lt;30s) • <strong>50 pts</strong> (&lt;45s)</span>
        </div>
      )}

      {/* CLEAN STATIC 5-SECOND ANSWER & RESULT DISPLAY CARD */}
      {isRevealing && (
        <div className="p-5 bg-surface border-2 border-indigo-500/40 rounded-3xl text-center space-y-3 shadow-xl">
          <div className="p-3 bg-bg rounded-2xl border border-border text-sm font-extrabold text-ink space-y-1">
            <div className="text-xs text-muted font-bold uppercase">Correct Answer:</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-black font-mono text-lg">{quiz.reveal?.correctAnswer}</div>
          </div>

          {/* ANSWER REVEAL IMAGE */}
          {quiz.reveal?.revealImageUrl && (
            <div className="p-2 bg-bg border border-border rounded-2xl overflow-hidden shadow-inner">
              <span className="text-[11px] font-extrabold text-muted uppercase tracking-wider block mb-2">Answer Key Grid</span>
              <img
                src={quiz.reveal.revealImageUrl}
                alt="Answer Reveal Key"
                className="w-full h-auto max-h-56 object-contain rounded-xl mx-auto border border-border"
              />
            </div>
          )}

          {quiz.reveal?.submittedAnswer && (
            <div className="text-xs font-bold text-muted">
              Your Submission: <span className="text-ink font-mono font-extrabold">{quiz.reveal.submittedAnswer}</span>
            </div>
          )}

          {quiz.reveal?.pointsEarned !== undefined && (
            <div className={`text-xs font-black py-2 px-4 rounded-xl w-full shadow-xs tracking-wider uppercase flex items-center justify-between ${
              quiz.reveal.isCorrect
                ? 'bg-emerald-600 text-white'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span>{quiz.reveal.isCorrect ? '✅ CORRECT ANSWER!' : '❌ INCORRECT ANSWER'}</span>
              <span className="font-mono text-sm">{quiz.reveal.isCorrect ? `+${quiz.reveal.pointsEarned} PTS` : '0 PTS'}</span>
            </div>
          )}

          {/* REVEAL SCORE & RANK TREND BANNER */}
          <div className="p-3 bg-bg border border-border rounded-2xl flex items-center justify-around text-xs font-extrabold">
            <div>
              <span className="text-muted block text-[10px] uppercase">Updated Score</span>
              <strong className="text-accent font-mono text-base">{currentTotalScore} pts</strong>
            </div>

            {currentRank !== undefined && (
              <div className="border-l border-border pl-4">
                <span className="text-muted block text-[10px] uppercase">Event Rank</span>
                <div className="flex items-center space-x-1 font-mono text-base font-black text-ink">
                  {rankDelta > 0 && <ArrowUp className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                  {rankDelta < 0 && <ArrowDown className="w-4 h-4 text-red-600 stroke-[3]" />}
                  <span>#{currentRank}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
        <h2 className="text-lg sm:text-xl font-extrabold text-ink leading-relaxed tracking-tight whitespace-pre-line">
          {quiz.question.text}
        </h2>

        {/* QUESTION IMAGE */}
        {quiz.question.imageUrl && (
          <div className="p-2 bg-bg border border-border rounded-2xl overflow-hidden shadow-inner">
            <img
              src={quiz.question.imageUrl}
              alt="Question Visual Clue"
              className="w-full h-auto max-h-64 object-contain rounded-xl mx-auto border border-border"
            />
          </div>
        )}
      </div>

      {/* Answer Area */}
      {hasOptions ? (
        <div className="space-y-3">
          {quiz.question.options!.map((optText, idx) => (
            <OptionRow
              key={idx}
              index={idx}
              label={optText}
              isSelected={selectedOption === idx}
              isLocked={isLocked || isPaused || isRevealing}
              onSelect={handleSelectOption}
            />
          ))}
        </div>
      ) : (
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your answer here..."
            disabled={isLocked || isPaused || isRevealing}
            className="w-full px-4 py-3.5 bg-surface border-2 border-border rounded-xl text-ink font-semibold text-lg focus:outline-none focus:border-accent transition-colors shadow-xs"
          />
          {!isLocked && !isRevealing && (
            <button
              type="submit"
              disabled={isPaused || !textInput.trim()}
              className="w-full py-4 px-6 bg-accent hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center space-x-2 text-base"
            >
              <Send className="w-4 h-4" />
              <span>Submit Answer</span>
            </button>
          )}
        </form>
      )}

      {/* Lock Feedback Banner */}
      {isLocked && !isRevealing && (
        <div className="p-3.5 bg-accent-soft border border-accent/30 rounded-xl text-center flex items-center justify-center space-x-2 text-accent font-bold text-sm shadow-xs">
          <Lock className="w-4 h-4" />
          <span>Answer Locked In: <strong className="font-mono underline">{lockedDisplay}</strong></span>
        </div>
      )}
    </div>
  );
};
