'use client';

import { useState, useEffect, useCallback } from 'react';
import { Debater, DebateState, BattleAction, DebateFallacy } from '../types/debate';
import { generateDebateResponse, startDebate, DebateContext, analyzeFallacies } from '../services/debateService';
import { judgeAction } from '../services/judgeService';
import DebateInput from './DebateInput';
import ConcedeDialog from './ConcedeDialog';
import { useAudio } from '../services/audioService';

interface BattleArenaProps {
  topic: string;
  playerSide: 'for' | 'against';
  playerName: string;
  demonLordType: 'proper' | 'devious' | 'aggressive';
  difficulty: number;
}

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function BattleArena({ topic, playerSide, playerName, demonLordType, difficulty }: BattleArenaProps) {
  const getInitialHealth = (difficulty: number): number => {
    if (difficulty === 10) return 2000; // Demonslayer
    const baseHealth = 1000;
    const difficultyBonus = (difficulty - 1) * (baseHealth * 0.1); // 10% more HP per level after Herald
    return Math.round(baseHealth + difficultyBonus);
  };

  const [state, setState] = useState<DebateState>({
    player: {
      name: playerName,
      sprite: '/sprites/Debater.png',
      health: getInitialHealth(1), // Player always starts at Herald level
      maxHealth: getInitialHealth(1),
      level: 1
    },
    opponent: {
      name: 'Debate Lord',
      sprite: '/sprites/DebateLord.png',
      health: getInitialHealth(difficulty),
      maxHealth: getInitialHealth(difficulty),
      level: 90 + difficulty
    },
    currentTurn: 'opponent',
    battleLog: [],
    isDebateInputOpen: false,
    isFallacySelectOpen: false,
    isConcedeConfirmOpen: false,
    isDebateLordEvolved: false,
    currentPhase: 'opening_lord',
    hasPlayerMadeOpeningStatement: false
  });

  const [debateContext, setDebateContext] = useState<DebateContext>({
    topic: topic,
    currentRound: 0,
    maxRounds: Number(process.env.NEXT_PUBLIC_DEBATE_ROUNDS) || 3,
    playerArguments: [],
    opponentArguments: [],
    debatePhase: 'opening',
    demonLordType,
    difficulty
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('What will DEBATER do?');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isPlayerDamaged, setIsPlayerDamaged] = useState(false);
  const [isOpponentDamaged, setIsOpponentDamaged] = useState(false);
  const [isEvolutionAnimating, setIsEvolutionAnimating] = useState(false);
  const [screenBrightness, setScreenBrightness] = useState(100);

  useEffect(() => {
    // Start with DebateLord's opening statement
    startDebateSession();
  }, []);

  const startDebateSession = async () => {
    setIsLoading(true);
    try {
      const response = await generateDebateResponse({
        topic,
        currentRound: 0,
        maxRounds: Number(process.env.NEXT_PUBLIC_DEBATE_ROUNDS) || 3,
        playerArguments: [],
        opponentArguments: [],
        debatePhase: 'opening',
        demonLordType,
        difficulty,
        isOpeningStatement: true,
        isClosingStatement: false,
        isEvolved: false
      });

      setDebateContext(prev => ({
        ...prev,
        opponentArguments: [response.argument]
      }));

      setState(prev => ({
        ...prev,
        currentTurn: 'player',
        currentPhase: 'opening_player',
        battleLog: [{
          type: 'debate',
          content: response.argument,
          timestamp: new Date(),
          sender: 'opponent',
          wordCount: response.argument.split(/\s+/).length
        }]
      }));

      setMessage("What will you do?");
    } catch (error) {
      console.error('Error starting debate:', error);
      setMessage('Error starting debate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebateClick = () => {
    if (isLoading || isProcessing) return;
    setState(prev => ({ ...prev, isDebateInputOpen: true }));
  };

  const handleDebateSubmit = (argument: string) => {
    if (isLoading || isProcessing) return;
    debouncedDebateSubmit(argument);
  };

  const handleFallacyClick = () => {
    if (isLoading || isProcessing) return;
    setState(prev => ({ ...prev, isFallacySelectOpen: true }));
  };

  const handleFallacySelect = (fallacy: string) => {
    if (isLoading || isProcessing) return;
    debouncedFallacySelect(fallacy);
  };

  const handleConcedeClick = () => {
    if (isLoading || isProcessing) return;
    setState(prev => ({ ...prev, isConcedeConfirmOpen: true }));
  };

  const handleConcede = () => {
    const concedeMessage = 'The Debate Lord has prevailed. Better luck next time!';
    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        health: 0
      },
      isConcedeConfirmOpen: false,
      currentTurn: 'none',
      battleLog: [...prev.battleLog, {
        type: 'concede',
        content: 'Player conceded the debate',
        timestamp: new Date(),
        sender: 'system'
      }]
    }));
    setMessage(concedeMessage);
    // Return to start screen after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  const handleDebateEnd = () => {
    const playerWon = state.opponent.health <= 0;
    setMessage(playerWon 
      ? 'Congratulations! You have won the debate!' 
      : 'The Debate Lord has prevailed. Better luck next time!');
    setState(prev => ({ ...prev, currentTurn: 'none' }));
  };

  function calculateDamage(argument: string): number {
    // Base damage calculation
    let damage = 50;

    // Adjust based on length (longer arguments deal more damage)
    const words = argument.split(' ').length;
    damage += Math.min(50, words / 2);

    // Add random variance (±20%)
    const variance = damage * 0.2;
    damage += Math.random() * variance * 2 - variance;

    return Math.round(damage);
  }

  // Function to handle damage animation
  const playDamageAnimation = async (target: 'player' | 'opponent') => {
    const setDamaged = target === 'player' ? setIsPlayerDamaged : setIsOpponentDamaged;
    
    // Flash 3 times
    for (let i = 0; i < 3; i++) {
      setDamaged(true);
      await new Promise(resolve => setTimeout(resolve, 150));
      setDamaged(false);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  };

  // Function to handle evolution animation
  const playEvolutionAnimation = async () => {
    setIsEvolutionAnimating(true);
    
    // Fade to black
    for (let brightness = 100; brightness >= 0; brightness -= 5) {
      setScreenBrightness(brightness);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Hold black screen for dramatic effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fade back in
    for (let brightness = 0; brightness <= 100; brightness += 5) {
      setScreenBrightness(brightness);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setIsEvolutionAnimating(false);
  };

  // Update the sprite selection logic
  const getSprites = () => {
    const playerBase = isPlayerDamaged ? '/sprites/DamageDebater.png' : '/sprites/Debater.png';
    
    let opponentBase = '/sprites/DebateLord.png';
    if (isEvolutionAnimating) {
      opponentBase = '/sprites/EvolutionLord.png';
    } else if (state.isDebateLordEvolved) {
      opponentBase = '/sprites/EvolvedLord.png';
    } else if (isOpponentDamaged) {
      opponentBase = '/sprites/DamageLord.png';
    }
    
    return { playerSprite: playerBase, opponentSprite: opponentBase };
  };

  // Update damage application to include animation
  const applyDamage = async (target: 'player' | 'opponent', amount: number) => {
    await playDamageAnimation(target);
    setState(prev => ({
      ...prev,
      [target]: {
        ...prev[target],
        health: Math.max(0, prev[target].health - amount)
      }
    }));
  };

  // Update evolution transition
  const handleEvolution = async () => {
    const audioManager = useAudio();
    await playEvolutionAnimation();
    // Start playing Sterbenshall after the screen fades back in
    audioManager.startEvolutionThemes();
    setState(prev => ({ ...prev, isDebateLordEvolved: true }));
  };

  // Debounced handlers
  const debouncedFallacySelect = useCallback(
    debounce(async (fallacy: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setIsLoading(true);
      
      try {
        const lastOpponentArg = debateContext.opponentArguments[debateContext.opponentArguments.length - 1];
        const fallacies = await analyzeFallacies(lastOpponentArg);
        
        setMessage("The Judges are deliberating...");
        
        const judgement = await judgeAction('fallacy', 
          JSON.stringify({
            calledFallacy: fallacy,
            actualFallacies: fallacies,
            argument: lastOpponentArg
          }), 
          {
            topic,
            phase: state.currentPhase,
            baseHealth: state.player.maxHealth,
            playerArguments: debateContext.playerArguments,
            opponentArguments: debateContext.opponentArguments
          }
        );

        const fallacyAction: BattleAction = {
          type: 'fallacy',
          content: `${fallacy} fallacy ${judgement.targetPlayer === 'opponent' ? 'detected' : 'call failed'}!`,
          damage: judgement.damage,
          timestamp: new Date(),
          sender: 'system'
        };

        setState(prev => ({
          ...prev,
          [judgement.targetPlayer]: {
            ...prev[judgement.targetPlayer],
            health: Math.max(0, prev[judgement.targetPlayer].health - judgement.damage)
          },
          battleLog: [...prev.battleLog, fallacyAction],
          isFallacySelectOpen: false
        }));

        setMessage(judgement.explanation);

        await applyDamage(judgement.targetPlayer, judgement.damage);
      } catch (error) {
        console.error('Error checking fallacy:', error);
        setMessage('Error checking fallacy. Please try again.');
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
      }
    }, 300),
    [debateContext, isProcessing, state.currentPhase, state.player.maxHealth, topic]
  );

  const debouncedDebateSubmit = useCallback(
    debounce(async (argument: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setIsLoading(true);
      setState(prev => ({ ...prev, isDebateInputOpen: false }));

      try {
        // Add player's argument to battle log
        const newBattleAction: BattleAction = {
          type: 'debate',
          content: argument,
          timestamp: new Date(),
          sender: 'player'
        };

        setState(prev => ({
          ...prev,
          currentTurn: 'opponent',
          battleLog: [...prev.battleLog, newBattleAction]
        }));

        setDebateContext(prev => ({
          ...prev,
          playerArguments: [...prev.playerArguments, argument]
        }));

        // Let the Judges evaluate the player's argument
        setMessage("The Judges are deliberating...");
        const playerJudgement = await judgeAction(
          state.currentPhase === 'closing_player' ? 'closing' : 'argument',
          argument,
          {
            topic,
            phase: state.currentPhase,
            baseHealth: state.opponent.maxHealth,
            playerArguments: [...debateContext.playerArguments, argument],
            opponentArguments: debateContext.opponentArguments
          }
        );

        // Apply damage based on Judges' decision
        await applyDamage('opponent', playerJudgement.damage);

        // Check for evolution threshold
        const healthPercentage = (state.opponent.health / state.opponent.maxHealth) * 100;
        if (healthPercentage <= 20 && !state.isDebateLordEvolved) {
          await handleEvolution();
        }

        // Get DebateLord's response
        setMessage("The Debate Lord is thinking...");
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await generateDebateResponse({
          ...debateContext,
          playerArguments: [...debateContext.playerArguments, argument]
        });

        const opponentBattleAction: BattleAction = {
          type: 'debate',
          content: response.argument,
          timestamp: new Date(),
          sender: 'opponent'
        };

        setState(prev => ({
          ...prev,
          battleLog: [...prev.battleLog, opponentBattleAction]
        }));

        // Let the Judges evaluate the DebateLord's response
        setMessage("The Judges are deliberating...");
        const lordJudgement = await judgeAction(
          state.currentPhase === 'closing_lord' ? 'closing' : 'argument',
          response.argument,
          {
            topic,
            phase: state.currentPhase,
            baseHealth: state.player.maxHealth,
            playerArguments: [...debateContext.playerArguments, argument],
            opponentArguments: [...debateContext.opponentArguments, response.argument]
          }
        );

        // Apply damage based on Judges' decision
        await applyDamage('player', lordJudgement.damage);

        setDebateContext(prev => ({
          ...prev,
          opponentArguments: [...prev.opponentArguments, response.argument],
          currentRound: prev.currentRound + 1,
          debatePhase: prev.currentRound >= prev.maxRounds ? 'closing' : 'middle'
        }));

        setMessage(lordJudgement.explanation);

        if (state.player.health <= 0 || state.opponent.health <= 0) {
          handleDebateEnd();
        }
      } catch (error) {
        console.error('Error in debate:', error);
        setMessage('Error processing debate. Please try again.');
        setState(prev => ({ ...prev, currentTurn: 'player' }));
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
      }
    }, 300),
    [debateContext, state.currentPhase, state.player.maxHealth, state.opponent.maxHealth, topic, isProcessing]
  );

  const handlePhaseTransition = useCallback(() => {
    const healthPercentage = (state.opponent.health / state.opponent.maxHealth) * 100;
    
    if (!state.hasPlayerMadeOpeningStatement) {
      return 'back_and_forth';
    }
    
    if (healthPercentage <= 20 && state.currentTurn === 'opponent' && !state.isDebateLordEvolved) {
      setState(prev => ({ ...prev, isDebateLordEvolved: true }));
      return 'back_and_forth';
    }
    
    if (healthPercentage <= 20 && state.currentTurn === 'player') {
      return 'closing_lord';
    }
    
    if (state.currentPhase === 'closing_lord') {
      return 'closing_player';
    }
    
    return 'back_and_forth';
  }, [state.opponent.health, state.opponent.maxHealth, state.currentTurn, state.hasPlayerMadeOpeningStatement, state.isDebateLordEvolved]);

  const getPhaseDisplay = () => {
    switch(state.currentPhase) {
      case 'opening_lord':
      case 'opening_player':
        return 'OPENING STATEMENT';
      case 'back_and_forth':
        return 'BACK AND FORTH';
      case 'closing_lord':
      case 'closing_player':
        return 'CLOSING STATEMENT';
      default:
        return '';
    }
  };

  function getDemonLordName(type: 'proper' | 'devious' | 'aggressive'): string {
    switch(type) {
      case 'proper':
        return 'Proper Lord';
      case 'devious':
        return 'Devious Lord';
      case 'aggressive':
        return 'Aggressive Lord';
      default:
        return 'Debate Lord';
    }
  }

  return (
    <div 
      className="battle-background min-h-screen relative debug-layout"
      style={{
        filter: `brightness(${screenBrightness}%)`,
        transition: 'filter 50ms linear'
      }}
    >
      {/* Topic Display */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-20">
        <div className="topic-box">
          <div className="topic-title">Topic: {topic}</div>
          <div className="phase-title">{getPhaseDisplay()}</div>
        </div>
      </div>

      {/* Status Boxes Container */}
      <div className="status-boxes-container">
        <div className="w-[220px]">
          <div className="status-box p-2">
            <div className="flex justify-between items-center mb-2">
              <span className="mr-2 text-base truncate max-w-[100px]">{state.player.name}</span>
              <span className="flex-shrink-0 text-base whitespace-nowrap">Lv.{state.player.level}</span>
            </div>
            <div>
              <div className="hp-bar">
                <div 
                  className={`hp-bar-fill ${
                    state.player.health > 50 ? '' :
                    state.player.health > 25 ? 'yellow' : 'red'
                  }`}
                  style={{ width: `${(state.player.health / state.player.maxHealth) * 100}%` }}
                />
              </div>
              <div className="text-right text-sm mt-1">
                {state.player.health}/{state.player.maxHealth}
              </div>
            </div>
          </div>
        </div>

        <div className="w-[220px]">
          <div className="status-box p-2">
            <div className="flex justify-between items-center mb-2">
              <span className="mr-2 text-base">{state.opponent.name}</span>
              <span className="flex-shrink-0 text-base whitespace-nowrap">Lv.{state.opponent.level}</span>
            </div>
            <div>
              <div className="hp-bar">
                <div 
                  className={`hp-bar-fill ${
                    state.opponent.health > 500 ? '' :
                    state.opponent.health > 250 ? 'yellow' : 'red'
                  }`}
                  style={{ width: `${(state.opponent.health / state.opponent.maxHealth) * 100}%` }}
                />
              </div>
              <div className="text-right text-sm mt-1">
                {state.opponent.health}/{state.opponent.maxHealth}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Characters Container */}
      <div className="absolute inset-x-0 top-[250px] flex justify-between px-32">
        {/* Player Character */}
        <div className="character-container" style={{ width: '220px', height: '220px' }}>
          <div className="character-wrapper">
            <div className="platform-container" style={{ width: '120px', height: '20px', bottom: '-10px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              <div className="platform back" style={{ filter: 'blur(3px)' }} />
              <div className="platform" style={{ filter: 'blur(3px)' }} />
            </div>
            <img
              src={getSprites().playerSprite}
              alt="Player"
              className={`${isPlayerDamaged ? 'animate-damage' : ''}`}
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                imageRendering: 'pixelated'
              }}
            />
          </div>
        </div>

        {/* Opponent Character */}
        <div className="character-container" style={{ width: '290px', height: '290px' }}>
          <div className="character-wrapper">
            <div className="platform-container" style={{ width: '200px', height: '30px', bottom: '-15px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              <div className="platform back" style={{ filter: 'blur(6px)' }} />
              <div className="platform" style={{ filter: 'blur(6px)' }} />
            </div>
            <img
              src={getSprites().opponentSprite}
              alt="Opponent"
              className={`${isOpponentDamaged ? 'animate-damage' : ''}`}
              style={{
                width: '290px',
                height: '290px',
                transform: `scale(${state.isDebateLordEvolved ? 1.2 : 1})`,
                imageRendering: 'pixelated',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      </div>

      {/* Battle Menu */}
      <div className="absolute bottom-4 left-0 right-0 px-4 z-10">
        <div className={`battle-menu max-w-2xl mx-auto ${state.currentTurn === 'none' ? 'message-only' : ''}`}>
          {state.currentTurn === 'none' ? (
            <div>{message}</div>
          ) : (
            <>
              <button
                onClick={handleDebateClick}
                disabled={state.currentTurn !== 'player' || isLoading || isProcessing}
                className="battle-menu-button"
              >
                DEBATE
              </button>
              <button
                onClick={handleFallacyClick}
                disabled={state.currentTurn !== 'player' || isLoading || isProcessing}
                className="battle-menu-button"
              >
                FALLACY
              </button>
              <button
                onClick={handleConcedeClick}
                disabled={state.currentTurn !== 'player' || isLoading || isProcessing}
                className="battle-menu-button"
              >
                CONCEDE
              </button>
              <div /> {/* Empty div for grid alignment */}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {state.isDebateInputOpen && (
        <DebateInput
          onClose={() => setState(prev => ({ ...prev, isDebateInputOpen: false }))}
          onSubmit={handleDebateSubmit}
          phase={state.currentPhase}
        />
      )}

      {state.isFallacySelectOpen && (
        <div className="fixed inset-0 bg-black/50 modal-overlay flex items-center justify-center">
          <div className="text-box w-full max-w-2xl mx-4">
            <div className="mb-4">Which fallacy do you want to call out?</div>
            <div className="grid grid-cols-2 gap-4">
              {Object.values(DebateFallacy).map(fallacy => (
                <button
                  key={fallacy}
                  className="battle-menu-button text-sm"
                  onClick={() => handleFallacySelect(fallacy)}
                >
                  {fallacy}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button className="battle-menu-button" onClick={() => setState(prev => ({ ...prev, isFallacySelectOpen: false }))}>
                BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {state.isConcedeConfirmOpen && (
        <ConcedeDialog
          onClose={() => setState(prev => ({ ...prev, isConcedeConfirmOpen: false }))}
          onConfirm={handleConcede}
        />
      )}
    </div>
  );
} 