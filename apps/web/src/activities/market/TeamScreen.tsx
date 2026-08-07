import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../store/eventStore';
import { getSocket } from '../../hooks/useSocket';
import { Timer } from '../../components/Timer';
import { DecisionAction } from '@recruitquest/types';
import { audioEngine } from '../../services/AudioService';
import { generateScorecardPDF } from '../../services/pdfGenerator';
import {
  TrendingUp, TrendingDown, DollarSign, Lock, ShieldAlert,
  Flame, CheckCircle2, Trophy, ArrowUp, ArrowDown, Minus, Zap, HelpCircle, Heart, Sparkles, Award, Users, Download, Volume2, VolumeX
} from 'lucide-react';

export const MarketTeamScreen: React.FC = () => {
  const store = useEventStore();
  const socket = getSocket();

  const market = store.market;
  const quiz = store.quiz;
  const portfolio = market?.portfolio || { cash: 10000, holdings: {}, totalValue: 10000 };

  const [decisions, setDecisions] = useState<Record<string, DecisionAction>>({});
  const [isMuted, setIsMuted] = useState<boolean>(audioEngine.getMuted());

  // Background ambiance start/stop
  useEffect(() => {
    if (market) {
      if (market.isFinished) {
        audioEngine.startAmbiance('victory');
      } else {
        audioEngine.startAmbiance('market');
      }
    }
    return () => {
      audioEngine.stopAmbiance();
    };
  }, [market?.round, market?.isFinished]);

  // Trigger sound effect on market reveal
  useEffect(() => {
    if (market?.phase === 'reveal') {
      audioEngine.playEffect('reveal');
    }
  }, [market?.phase]);

  // Initialize decisions to 'hold' when round or companies change
  useEffect(() => {
    if (market?.companies) {
      const initial: Record<string, DecisionAction> = {};
      for (const c of market.companies) {
        initial[c.name] = market.submittedDecisions?.[c.name] || 'hold';
      }
      setDecisions(initial);
    }
  }, [market?.round, market?.companies, market?.submittedDecisions]);

  const toggleSound = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  if (!market || !market.scenario) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 animate-bounce border border-emerald-500/20 shadow-md">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-ink tracking-tight">MarketMayhem Exchange Starting...</h3>
        <p className="text-sm text-muted mt-2 font-medium">Preparing Virtual Stock Exchange & Initial Portfolios!</p>
      </div>
    );
  }

  // GRAND FINALE EVENT COMPLETION PAGE
  if (market.isFinished) {
    const finalVal = market.finalValue ?? portfolio.totalValue ?? 10000;
    const finalRank = store.teamRank ?? 1;
    const totalTeams = store.totalTeams ?? 1;
    const quizScore = quiz?.completion?.teamScore ?? quiz?.reveal?.totalTeamScore ?? 0;
    const quizRank = quiz?.completion?.rank ?? 1;

    const leaderName = store.leaderName || 'Leader';
    const member2Name = store.member2Name || 'Teammate';
    const teamName = store.teamName || 'Your Team';
    const teamCode = store.teamCode || '---';

    const handleDownloadPDF = () => {
      generateScorecardPDF({
        teamName,
        teamCode,
        leaderName,
        member2Name,
        quizScore,
        quizRank,
        marketNetWorth: finalVal,
        marketRank: finalRank,
        overallScore: finalVal + quizScore,
        overallRank: finalRank,
        totalTeams,
        date: new Date().toLocaleDateString()
      });
    };

    return (
      <div className="flex flex-col min-h-full max-w-md mx-auto relative p-2 space-y-4 pb-12">
        {/* GRAND FINALE CARD */}
        <div className="my-auto py-8 px-6 text-center space-y-6 bg-surface p-6 sm:p-8 rounded-3xl border-2 border-amber-400 dark:border-amber-600 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-bg border border-border text-muted hover:text-ink transition-colors shadow-2xs"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-danger" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
          </button>

          {/* Trophy Icon */}
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-white rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce border-4 border-yellow-200">
            <Trophy className="w-10 h-10" />
          </div>

          {/* Warm Energetic Message */}
          <div className="space-y-3">
            <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-full text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>GRAND FINALE</span>
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight leading-tight">
              Thank you for making this event a successful Kickstart 2.0! 🎉
            </h2>

            <p className="text-xs sm:text-sm font-semibold text-muted leading-relaxed max-w-xs mx-auto">
              Your strategy, teamwork, and quick decision making brought incredible energy to the event!
            </p>
          </div>

          {/* Team Details Badge */}
          <div className="p-4 bg-bg border border-border rounded-2xl space-y-2 text-left shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="font-extrabold text-ink text-base">{teamName}</span>
              </div>
              <span className="font-mono text-xs font-black text-accent bg-accent-soft px-2.5 py-1 rounded-md">
                Code: {teamCode}
              </span>
            </div>

            <div className="text-xs text-muted font-medium border-t border-border pt-2 flex items-center space-x-2">
              <span className="font-semibold text-ink">Members:</span>
              <span>{leaderName} & {member2Name}</span>
            </div>
          </div>

          {/* DETAILED SCORE BREAKDOWN FOR BOTH ACTIVITIES */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-black text-muted uppercase tracking-widest text-center">
              Detailed Event Scorecard
            </h4>

            {/* Activity 1: Quiz Challenge */}
            <div className="p-3.5 bg-bg border border-border rounded-2xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent font-black flex items-center justify-center text-sm">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-ink text-sm">Activity 1: Quiz Challenge</h5>
                  <span className="text-[11px] text-muted font-medium">Rank #{quizRank} of {totalTeams}</span>
                </div>
              </div>
              <strong className="font-mono text-accent font-black text-base">{quizScore} pts</strong>
            </div>

            {/* Activity 2: Market Simulation */}
            <div className="p-3.5 bg-bg border border-border rounded-2xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 font-black flex items-center justify-center text-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-ink text-sm">Activity 2: MarketMayhem</h5>
                  <span className="text-[11px] text-muted font-medium">Rank #{finalRank} of {totalTeams}</span>
                </div>
              </div>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-base">
                ₹{finalVal.toLocaleString()}
              </strong>
            </div>

            {/* Overall Combined Grand Standings */}
            <div className="p-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-2 border-amber-400 dark:border-amber-600 rounded-2xl flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-ink font-black flex items-center justify-center text-base shadow-xs">
                  🥇
                </div>
                <div>
                  <h5 className="font-black text-ink text-sm">Overall Grand Standings</h5>
                  <span className="text-xs text-amber-700 dark:text-amber-300 font-extrabold">Final Position #{finalRank}</span>
                </div>
              </div>
              <div className="text-right">
                <strong className="font-mono text-accent font-black text-lg block">
                  ₹{(finalVal + quizScore).toLocaleString()}
                </strong>
                <span className="text-[10px] text-muted uppercase font-bold">Total Net Score</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC DOWNLOAD PDF SCORECARD BUTTON */}
          <button
            onClick={handleDownloadPDF}
            className="w-full py-4 bg-accent hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg transition-transform active:scale-95 text-sm flex items-center justify-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download PDF Scorecard</span>
          </button>

          {/* Warm Closing Note */}
          <div className="text-xs text-muted font-medium pt-1">
            Keep this screen or save your PDF as your official event completion token! 🌟
          </div>
        </div>

        {/* FOOTER SIGNATURE AT THE BOTTOM */}
        <div className="text-center pt-2 text-xs font-bold text-muted flex items-center justify-center space-x-1 font-sans">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          <span>by <strong className="text-ink font-extrabold">GFG Tech Lead</strong></span>
        </div>
      </div>
    );
  }

  const isPaused = store.currentActivity?.status === 'paused';
  const phase = market.phase || 'trading';
  const isTrading = phase === 'trading' && !isPaused;
  const isReveal = phase === 'reveal';
  const currentRank = store.teamRank ?? market.reveal?.rank;
  const rankDelta = store.rankDelta ?? market.reveal?.rankDelta ?? 0;

  // Calculate live projected available cash based on selected decisions
  let projectedCash = portfolio.cash;
  if (market.companies && isTrading) {
    for (const c of market.companies) {
      const act = decisions[c.name] || 'hold';
      if (act === 'buy') projectedCash -= c.price;
      if (act === 'sell') projectedCash += c.price;
    }
  }

  const handleAction = (companyName: string, action: DecisionAction, price: number, currentHoldings: number) => {
    if (!isTrading) return;

    // Constraints validation
    if (action === 'buy') {
      const neededCash = price;
      if (projectedCash < neededCash && decisions[companyName] !== 'buy') {
        alert(`Insufficient cash! Required: ₹${neededCash}, Available: ₹${projectedCash}`);
        return;
      }
    }

    if (action === 'sell') {
      if (currentHoldings <= 0 && decisions[companyName] !== 'sell') {
        alert(`Cannot sell! You hold 0 shares of ${companyName}.`);
        return;
      }
    }

    const updated = { ...decisions, [companyName]: action };
    setDecisions(updated);

    // Auto submit to socket
    if (store.currentActivity) {
      socket.emit('team:submit', {
        activityId: store.currentActivity.id,
        payload: {
          roundIndex: market.round - 1,
          decisions: updated
        }
      });
    }
  };

  return (
    <div className="flex flex-col min-h-full max-w-md mx-auto space-y-3 pb-8">
      {/* Header Bar: Round, Phase, Net Worth & Dynamic Rank + Sound Toggle */}
      <div className="flex items-center justify-between py-2 border-b border-border text-xs font-bold uppercase tracking-wider">
        <span className="flex items-center space-x-1.5 text-emerald-600 font-black">
          <TrendingUp className="w-4 h-4" />
          <span>ROUND {market.round} / {market.total}</span>
        </span>

        <div className="flex items-center space-x-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-full bg-surface border border-border text-muted hover:text-ink transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-danger" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
          </button>

          {/* DYNAMIC RANK BADGE */}
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

          {/* NET WORTH BADGE */}
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-black font-mono text-xs shadow-xs">
            Net Worth: ₹{portfolio.totalValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* PHASE BANNER & TIMER */}
      <div className={`p-3.5 rounded-2xl border text-center font-bold text-xs flex items-center justify-between shadow-xs ${
        isTrading
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
      }`}>
        <div className="flex items-center space-x-2">
          {isTrading ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <Lock className="w-4 h-4 text-amber-500" />
          )}
          <span className="font-extrabold uppercase tracking-wide">
            {isTrading ? 'PHASE 1: TRADING WINDOW (0:00–0:30)' : 'PHASE 2: MARKET REVEAL GAP (0:30–1:00)'}
          </span>
        </div>

        <Timer deadline={market.deadline || market.reveal?.deadline} isPaused={isPaused} size="normal" />
      </div>

      {/* RANDOM INITIAL ASSET ASSIGNMENT BANNER */}
      {market.assignedCompany && (
        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] font-extrabold text-indigo-600 dark:text-indigo-300 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Assigned Entry Asset: <strong>1 Share of {market.assignedCompany}</strong></span>
          </span>
          <span className="font-mono text-muted">Cash: ₹{portfolio.cash.toLocaleString()}</span>
        </div>
      )}

      {/* ROUND NEWS FLASH CARD */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-2 relative overflow-hidden">
        <div className="flex items-center space-x-2 text-xs font-black text-amber-500 uppercase tracking-widest">
          <Flame className="w-4 h-4" />
          <span>ROUND {market.round} NEWS FLASH</span>
        </div>

        <h3 className="text-base font-extrabold text-ink leading-snug">
          {market.scenario.title}
        </h3>

        <p className="text-xs text-muted font-medium leading-relaxed">
          {market.scenario.description}
        </p>
      </div>

      {/* PHASE 2: MARKET REVEAL IMPACT CARD */}
      {isReveal && market.reveal && (
        <div className="p-5 bg-surface border-2 border-indigo-500/40 rounded-3xl space-y-4 shadow-xl text-center">
          <div className="text-xs font-black text-accent uppercase tracking-widest flex items-center justify-center space-x-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>MARKET IMPACT REVEALED!</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            {market.reveal.impacts.map((imp) => (
              <div key={imp.company} className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                imp.isBankrupt
                  ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
                  : imp.pctChange > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : imp.pctChange < 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                  : 'bg-bg border-border text-muted'
              }`}>
                <div className="font-extrabold flex justify-between items-center">
                  <span>{imp.company}</span>
                  {imp.isBankrupt ? (
                    <span className="bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-black">BANKRUPT</span>
                  ) : (
                    <span className="font-mono">{imp.pctChange > 0 ? `+${imp.pctChange}%` : `${imp.pctChange}%`}</span>
                  )}
                </div>

                <div className="font-mono text-[11px] flex justify-between text-muted">
                  <span>₹{imp.oldPrice} ➔ <strong className="text-ink">₹{imp.newPrice}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-bg border border-border rounded-2xl flex items-center justify-around text-xs font-extrabold">
            <div>
              <span className="text-muted block text-[10px] uppercase">Updated Net Worth</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                ₹{portfolio.totalValue.toLocaleString()}
              </strong>
            </div>

            {currentRank !== undefined && (
              <div className="border-l border-border pl-4">
                <span className="text-muted block text-[10px] uppercase">Updated Rank</span>
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

      {/* PORTFOLIO SNAPSHOT SUMMARY */}
      <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs font-bold font-mono">
        <div>
          <span className="text-muted block text-[10px] uppercase">Available Cash</span>
          <span className={`text-sm font-black ${projectedCash < 0 ? 'text-danger' : 'text-ink'}`}>
            ₹{projectedCash.toLocaleString()}
          </span>
        </div>

        <div className="text-right">
          <span className="text-muted block text-[10px] uppercase">Single-Share Limit</span>
          <span className="text-accent font-semibold text-xs">Max ±1 Share / Stock / Round</span>
        </div>
      </div>

      {/* TRADING PORTAL COMPANY LIST (10 COMPANIES) */}
      <div className="space-y-2.5">
        {market.companies?.map((c) => {
          const currentHoldings = portfolio.holdings[c.name] || 0;
          const currentAction = decisions[c.name] || 'hold';
          const isBankrupt = c.isBankrupt || c.price === 0;

          return (
            <div
              key={c.name}
              className={`p-3.5 rounded-2xl border transition-all ${
                isBankrupt
                  ? 'bg-red-500/5 border-red-500/30 opacity-75'
                  : currentAction !== 'hold'
                  ? 'bg-surface border-accent shadow-xs'
                  : 'bg-surface border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-extrabold text-sm text-ink flex items-center space-x-2">
                    <span>{c.name}</span>
                    {isBankrupt && (
                      <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                        BANKRUPT (₹0)
                      </span>
                    )}
                  </h4>
                  <span className="text-xs text-muted font-medium">
                    Shares Held: <strong className="text-ink font-mono">{currentHoldings}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <div className="font-mono text-base font-black text-ink">
                    ₹{c.price.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-muted block uppercase">Current Price</span>
                </div>
              </div>

              {/* SINGLE-SHARE ACTION SELECTOR (BUY +1 / HOLD 0 / SELL -1) */}
              {!isBankrupt ? (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={!isTrading || (projectedCash < c.price && currentAction !== 'buy')}
                    onClick={() => handleAction(c.name, 'buy', c.price, currentHoldings)}
                    className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-1 transition-all ${
                      currentAction === 'buy'
                        ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-bg hover:bg-emerald-500/10 text-emerald-600 border border-border disabled:opacity-40'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Buy (+1)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isTrading}
                    onClick={() => handleAction(c.name, 'hold', c.price, currentHoldings)}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1 transition-all ${
                      currentAction === 'hold'
                        ? 'bg-gray-800 text-white shadow-xs'
                        : 'bg-bg hover:bg-surface text-muted border border-border'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Hold (0)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isTrading || (currentHoldings <= 0 && currentAction !== 'sell')}
                    onClick={() => handleAction(c.name, 'sell', c.price, currentHoldings)}
                    className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-1 transition-all ${
                      currentAction === 'sell'
                        ? 'bg-red-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-bg hover:bg-red-500/10 text-red-600 border border-border disabled:opacity-40'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Sell (-1)</span>
                  </button>
                </div>
              ) : (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-xs font-bold text-red-600 flex items-center justify-center space-x-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Trading Halted • Shares Completely Worthless</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
