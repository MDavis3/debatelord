'use client';

import { useState, useEffect, useCallback } from 'react';
import { Debater, DebateState, BattleAction, DebateFallacy } from '../types/debate';
import { generateDebateResponse, startDebate, DebateContext, analyzeFallacies } from '../services/debateService';
import { judgeAction } from '../services/judgeService';
import DebateInput from './DebateInput';
import ConcedeDialog from './ConcedeDialog';
import { useAudio } from '../services/audioService';
import '../styles/animations.css';

interface BattleArenaProps {
  topic: string;
  playerSide: 'for' | 'against';
  playerName: string;
  demonLordType: 'proper' | 'devious' | 'aggressive';
}

interface JudgementResult {
  score: number;
  damage: number;
  explanation: string;
  targetPlayer: 'player' | 'opponent';
  isCriticalHit: boolean;
  effectiveness: 'critical' | 'effective' | 'weak' | 'ineffective';
  shouldLoseTurn: boolean;
}

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function BattleArena({ topic, playerSide, playerName, demonLordType }: BattleArenaProps) {
  const audioManager = useAudio();
  
  const getInitialHealth = (): number => {
    return 1000;
  };

  const [state, setState] = useState<DebateState>(() => ({
    player: {
      name: playerName,
      sprite: '/sprites/Debater.png',
      health: getInitialHealth(),
      maxHealth: getInitialHealth(),
      level: 1
    },
    opponent: {
      name: 'Debate Lord',
      sprite: '/sprites/DebateLord.png',
      health: getInitialHealth(),
      maxHealth: getInitialHealth(),
      level: 50 // Start at Archon level
    },
    currentTurn: 'opponent',
    battleLog: [],
    isDebateInputOpen: false,
    isFallacySelectOpen: false,
    isConcedeConfirmOpen: false,
    isDebateLordEvolved: false,
    currentPhase: 'battle',
    hasPlayerMadeOpeningStatement: true
  }));

  const [debateContext, setDebateContext] = useState<DebateContext>({
    topic: topic,
    currentRound: 0,
    maxRounds: Number(process.env.NEXT_PUBLIC_DEBATE_ROUNDS) || 3,
    playerArguments: [],
    opponentArguments: [],
    debatePhase: 'battle',
    demonLordType,
    isEvolved: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('What will DEBATER do?');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isPlayerDamaged, setIsPlayerDamaged] = useState(false);
  const [isOpponentDamaged, setIsOpponentDamaged] = useState(false);
  const [isEvolutionAnimating, setIsEvolutionAnimating] = useState(false);
  const [screenBrightness, setScreenBrightness] = useState(100);
  const [isLightningVisible, setIsLightningVisible] = useState(false);

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
        debatePhase: 'battle',
        demonLordType,
        isEvolved: false
      });

      setDebateContext(prev => ({
        ...prev,
        opponentArguments: [response.argument]
      }));

      setState(prev => ({
        ...prev,
        currentTurn: 'player',
        currentPhase: 'battle',
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
    if (isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0) return;
    setState(prev => ({ ...prev, isDebateInputOpen: true }));
  };

  const handleDebateSubmit = (argument: string) => {
    if (isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0) return;
    debouncedDebateSubmit(argument);
  };

  const handleFallacyClick = () => {
    if (isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0) return;
    setState(prev => ({ ...prev, isFallacySelectOpen: true }));
  };

  const handleFallacySelect = (fallacy: string) => {
    if (isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0) return;
    debouncedFallacySelect(fallacy);
  };

  const handleConcedeClick = () => {
    if (isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0) return;
    setState(prev => ({ ...prev, isConcedeConfirmOpen: true }));
  };

  const handleConcede = () => {
    const message = `The ${getDemonLordName(demonLordType)} has prevailed. Better luck next time!`;
    setMessage(message);
    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        health: 0
      },
      isConcedeConfirmOpen: false,
      currentTurn: 'none',
      battleLog: [...prev.battleLog, {
        type: 'system',
        content: message,
        timestamp: new Date(),
        sender: 'system'
      }]
    }));
    
    // Return to start screen after 5 seconds
    setTimeout(() => {
      window.location.href = '/';
    }, 5000);
  };

  const checkGameEnd = useCallback(() => {
    console.log('=== checkGameEnd Start ===', {
      playerHealth: state.player.health,
      opponentHealth: state.opponent.health,
      currentMessage: message
    });

    if (state.player.health <= 0) {
      // Player defeat - use same message as concede
      const message = `The ${getDemonLordName(demonLordType)} has prevailed. Better luck next time!`;
      console.log('Setting defeat message:', message);
      setMessage(message);
      setIsProcessing(false);
      setIsLoading(false);
      setState(prev => ({
        ...prev,
        currentTurn: 'none',
        battleLog: [...prev.battleLog, {
          type: 'system',
          content: message,
          timestamp: new Date(),
          sender: 'system'
        }]
      }));

      console.log('State updated for defeat');

      // Return to start screen after 5 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 5000);
      return true;
    }
    
    if (state.opponent.health <= 0) {
      // Player victory
      const message = 'VICTORY! You have defeated the Debate Lord!';
      setMessage(message);
      setIsProcessing(false); // Clear processing state
      setIsLoading(false); // Clear loading state
      setState(prev => ({
        ...prev,
        currentTurn: 'none',
        battleLog: [...prev.battleLog, {
          type: 'system',
          content: message,
          timestamp: new Date(),
          sender: 'system'
        }]
      }));

      // Fade out battle theme and play victory fanfare
      audioManager.fadeOutBattleTheme();
      audioManager.playVictoryFanfare();
      
      // Return to start screen after 10 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 10000);
      return true;
    }

    return false;
  }, [state.player.health, state.opponent.health, demonLordType, audioManager]);

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
    
    // Start thunderstorm sound
    audioManager.startThunderstorm();
    
    // Fade to black (faster fade out)
    for (let brightness = 100; brightness >= 0; brightness -= 10) {
      setScreenBrightness(brightness);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    
    // Hold black screen and play lightning effects
    const lightningFlashes = 3;
    for (let i = 0; i < lightningFlashes; i++) {
      // Show lightning
      setIsLightningVisible(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Hide lightning
      setIsLightningVisible(false);
      
      // Wait before next flash
      if (i < lightningFlashes - 1) {
        await new Promise(resolve => setTimeout(resolve, 900));
      }
    }
    
    // Hold black screen for remaining time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Precise timing for the sprite swap and fade in
    const fadeInStart = Date.now();
    const fadeInDuration = 750; // 0.75 seconds
    
    // Fade back in with precise timing
    while (Date.now() - fadeInStart < fadeInDuration) {
      const elapsed = Date.now() - fadeInStart;
      const brightness = Math.min(100, (elapsed / fadeInDuration) * 100);
      setScreenBrightness(brightness);
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
    }
    
    // Ensure we end at exactly 100% brightness
    setScreenBrightness(100);
    setIsEvolutionAnimating(false);
    
    // Fade out thunderstorm sound
    audioManager.stopThunderstorm();
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

  // Update damage application to include critical hits
  const applyDamage = async (target: 'player' | 'opponent', amount: number, isCriticalHit: boolean = false) => {
    // Only animate and apply damage if amount is greater than 0
    if (amount > 0) {
      console.log('=== Damage Application Start ===', {
        target,
        amount,
        isCriticalHit,
        currentMessage: message
      });
      
      if (isCriticalHit) {
        audioManager.playDamageSound();
        setTimeout(() => audioManager.playDamageSound(), 250);
      } else {
        audioManager.playDamageSound();
      }
      
      await playDamageAnimation(target);
      
      // Apply damage and get new health
      const newHealth = Math.max(0, target === 'player' ? 
        state.player.health - Math.abs(amount) :
        state.opponent.health - Math.abs(amount)
      );

      console.log('Health updated:', {
        target,
        oldHealth: target === 'player' ? state.player.health : state.opponent.health,
        newHealth,
        willDie: newHealth <= 0
      });
      
      setState(prev => ({
        ...prev,
        [target]: {
          ...prev[target],
          health: newHealth
        }
      }));

      // Check for game end immediately after damage
      if (newHealth <= 0) {
        console.log('=== Game End Sequence Start ===', {
          target,
          currentMessage: message,
          processingState: isProcessing,
          loadingState: isLoading
        });
        
        // Clear any pending messages or states before checking game end
        setMessage('');
        setIsProcessing(false);
        setIsLoading(false);
        
        // Small delay to ensure damage animation completes
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('Calling checkGameEnd after delay');
        const gameEnded = checkGameEnd();
        console.log('checkGameEnd result:', {
          gameEnded,
          currentMessage: message
        });
        return true; // Return true if game ended
      }

      // Check for evolution if opponent's health dropped below threshold
      if (target === 'opponent' && newHealth > 0) {
        const healthPercentage = (newHealth / state.opponent.maxHealth) * 100;
        if (healthPercentage <= 40 && !state.isDebateLordEvolved) {
          await handleEvolution();
        }
      }
    }
    return false; // Return false if game continues
  };

  const getEffectivenessMessage = (effectiveness: string, isCriticalHit: boolean): string => {
    switch(effectiveness) {
      case 'critical':
        return "CRITICAL HIT! Your argument was devastating!";
      case 'effective':
        return "Your argument was effective!";
      case 'weak':
        return "Your argument was weak...";
      case 'ineffective':
        return "Your argument was ineffective.";
      default:
        return "The judges are evaluating your argument...";
    }
  };

  // Update evolution transition
  const handleEvolution = async () => {
    // Start fading out the battle theme as the screen dims
    audioManager.fadeOutBattleTheme();
    
    await playEvolutionAnimation();
    
    // Start playing Sterbenshall after the screen fades back in
    audioManager.startEvolutionTheme();
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
        console.log('Analyzing fallacies for:', { argument: lastOpponentArg.substring(0, 100) + '...' });
        const fallacies = await analyzeFallacies(lastOpponentArg);
        console.log('Detected fallacies:', fallacies);
        
        setMessage("The Judges are deliberating on your fallacy call...");
        
        let judgement: JudgementResult;
        try {
          console.log('Requesting judge evaluation for fallacy:', { 
            calledFallacy: fallacy,
            actualFallacies: fallacies,
            argumentPreview: lastOpponentArg.substring(0, 100) + '...'
          });
          
          judgement = await judgeAction('fallacy', 
            JSON.stringify({
              calledFallacy: fallacy,
              actualFallacies: fallacies,
              argument: lastOpponentArg
            }), 
            {
              topic,
              phase: 'battle',
              baseHealth: state.player.maxHealth,
              playerArguments: debateContext.playerArguments,
              opponentArguments: debateContext.opponentArguments,
              isEvolved: state.isDebateLordEvolved
            }
          );
          console.log('Received judge response:', judgement);
        } catch (judgeError: any) {
          console.error('Judge evaluation error:', { 
            error: judgeError?.toString(),
            type: judgeError?.constructor?.name || 'Unknown',
            message: judgeError?.message || 'Unknown error'
          });
          judgement = {
            score: 0,
            damage: 200,
            explanation: "The judges rule that your fallacy call was incorrect. The argument appears logically sound.",
            targetPlayer: 'player' as const,
            isCriticalHit: false,
            effectiveness: 'ineffective',
            shouldLoseTurn: true
          };
        }

        const fallacyAction: BattleAction = {
          type: 'fallacy',
          content: `${fallacy} fallacy ${judgement.targetPlayer === 'opponent' ? 'detected' : 'call failed'}!`,
          damage: judgement.damage,
          timestamp: new Date(),
          sender: 'system'
        };

        setState(prev => ({
          ...prev,
          battleLog: [...prev.battleLog, fallacyAction],
          isFallacySelectOpen: false,
          // Only end turn if fallacy call was incorrect
          currentTurn: judgement.targetPlayer === 'player' ? 'opponent' : 'player'
        }));

        setMessage(judgement.explanation);

        const gameEnded = await applyDamage(judgement.targetPlayer, judgement.damage, judgement.isCriticalHit);
        
        if (gameEnded) {
          console.log('Game ended after fallacy damage');
          return;
        }

        // Only get Lord's response if the fallacy call was incorrect
        if (judgement.targetPlayer === 'player') {
          setMessage("The Debate Lord is formulating a response...");
          await new Promise(resolve => setTimeout(resolve, 1000));

          const response = await generateDebateResponse({
            ...debateContext,
            playerArguments: [...debateContext.playerArguments, `[Failed ${fallacy} fallacy call]`],
            isEvolved: state.isDebateLordEvolved
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

          setDebateContext(prev => ({
            ...prev,
            opponentArguments: [...prev.opponentArguments, response.argument]
          }));

          setMessage("The Judges are deliberating on the Debate Lord's argument...");
          let lordJudgement: JudgementResult;
          try {
            lordJudgement = await judgeAction(
              'argument',
              response.argument,
              {
                topic,
                phase: 'battle',
                baseHealth: state.player.maxHealth,
                playerArguments: [...debateContext.playerArguments, `[Failed ${fallacy} fallacy call]`],
                opponentArguments: [...debateContext.opponentArguments, response.argument],
                isEvolved: state.isDebateLordEvolved
              }
            );
          } catch (judgeError) {
            console.error('Error in judge action:', judgeError);
            lordJudgement = {
              score: 50,
              damage: 200,
              explanation: "The judges are carefully considering the nuances of this complex argument.",
              targetPlayer: 'player' as const,
              isCriticalHit: false,
              effectiveness: 'weak',
              shouldLoseTurn: false
            };
          }

          setMessage(getEffectivenessMessage(lordJudgement.effectiveness, lordJudgement.isCriticalHit));
          await new Promise(resolve => setTimeout(resolve, 2000));

          const gameEndedAfterLordDamage = await applyDamage('player', lordJudgement.damage, lordJudgement.isCriticalHit);
          
          if (gameEndedAfterLordDamage) {
            console.log('Game ended after Lord damage');
            return;
          }

          const nextPhase = handlePhaseTransition();
          setState(prev => ({ 
            ...prev, 
            currentTurn: 'player',
            currentPhase: nextPhase
          }));

          setMessage(lordJudgement.explanation);
        }

      } catch (error: any) {
        console.error('Fallacy check error:', {
          error: error?.toString(),
          type: error?.constructor?.name || 'Unknown',
          message: error?.message || 'Unknown error'
        });
        setMessage('Error checking fallacy. Your turn continues.');
        setState(prev => ({ 
          ...prev, 
          isFallacySelectOpen: false,
          currentTurn: 'player'
        }));
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
      }
    }, 300),
    [debateContext, isProcessing, state.currentPhase, state.player.maxHealth, topic, state.player.health, state.isDebateLordEvolved]
  );

  const debouncedDebateSubmit = useCallback(
    debounce(async (argument: string) => {
      console.log('=== Starting Debate Submit ===', {
        currentTurn: state.currentTurn,
        phase: state.currentPhase,
        isProcessing,
        isLoading
      });

      if (isProcessing) return;
      setIsProcessing(true);
      setIsLoading(true);
      setState(prev => ({ ...prev, isDebateInputOpen: false }));

      try {
        // Add player's argument to battle log
        console.log('Adding player argument to battle log');
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

        console.log('Updated debate context with player argument');
        setDebateContext(prev => ({
          ...prev,
          playerArguments: [...prev.playerArguments, argument]
        }));

        // Let the Judges evaluate the player's argument
        console.log('Starting judge evaluation of player argument');
        setMessage("The Judges are deliberating on your argument...");
        let playerJudgement: JudgementResult;
        try {
          playerJudgement = await judgeAction(
            'argument',
            argument,
            {
              topic,
              phase: 'battle',
              baseHealth: state.opponent.maxHealth,
              playerArguments: [...debateContext.playerArguments, argument],
              opponentArguments: debateContext.opponentArguments,
              isEvolved: state.isDebateLordEvolved
            }
          );
          console.log('Received player judgment:', playerJudgement);
        } catch (judgeError) {
          console.error('Error in player judge action:', judgeError);
          playerJudgement = {
            score: 50,
            damage: 100,
            explanation: "The judges acknowledge your argument but need more time to fully evaluate its merits.",
            targetPlayer: 'opponent' as const,
            isCriticalHit: false,
            effectiveness: 'weak',
            shouldLoseTurn: false
          };
        }

        // Show effectiveness message
        setMessage(getEffectivenessMessage(playerJudgement.effectiveness, playerJudgement.isCriticalHit));
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Apply damage based on Judges' decision
        console.log('Applying damage to opponent:', {
          damage: playerJudgement.damage,
          isCriticalHit: playerJudgement.isCriticalHit
        });
        const gameEnded = await applyDamage('opponent', playerJudgement.damage, playerJudgement.isCriticalHit);
        
        if (gameEnded) {
          console.log('Game ended after player damage');
          return;
        }

        // If the argument was ineffective, opponent gets an immediate counter
        if (playerJudgement.shouldLoseTurn) {
          console.log('Player lost turn due to ineffective argument');
          setMessage("Your argument was so weak, the Debate Lord sees an opening!");
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Check for evolution threshold
        const healthPercentage = (state.opponent.health / state.opponent.maxHealth) * 100;
        if (healthPercentage <= 20 && !state.isDebateLordEvolved) {
          console.log('Triggering evolution sequence');
          await handleEvolution();
        }

        // Get DebateLord's response
        console.log('Requesting Debate Lord response');
        setMessage("The Debate Lord is formulating a response...");
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await generateDebateResponse({
          ...debateContext,
          playerArguments: [...debateContext.playerArguments, argument],
          isEvolved: state.isDebateLordEvolved
        });
        console.log('Received Debate Lord response:', {
          responseLength: response.argument.length,
          damage: response.damage
        });

        const opponentBattleAction: BattleAction = {
          type: 'debate',
          content: response.argument,
          timestamp: new Date(),
          sender: 'opponent'
        };

        // Update battle log with opponent's response
        console.log('Updating battle log with Lord response');
        setState(prev => ({
          ...prev,
          battleLog: [...prev.battleLog, opponentBattleAction]
        }));

        // Update debate context with opponent's response
        console.log('Updating debate context with Lord response');
        setDebateContext(prev => ({
          ...prev,
          opponentArguments: [...prev.opponentArguments, response.argument]
        }));

        // Let the Judges evaluate the DebateLord's response
        console.log('Starting judge evaluation of Lord response');
        setMessage("The Judges are deliberating on the Debate Lord's argument...");
        let lordJudgement: JudgementResult;
        try {
          lordJudgement = await judgeAction(
            'argument',
            response.argument,
            {
              topic,
              phase: 'battle',
              baseHealth: state.player.maxHealth,
              playerArguments: [...debateContext.playerArguments, argument],
              opponentArguments: [...debateContext.opponentArguments, response.argument],
              isEvolved: state.isDebateLordEvolved
            }
          );
          console.log('Received Lord judgment:', lordJudgement);
        } catch (judgeError) {
          console.error('Error in Lord judge action:', judgeError);
          lordJudgement = {
            score: 50,
            damage: 100,
            explanation: "The judges are carefully considering the nuances of this complex argument.",
            targetPlayer: 'player' as const,
            isCriticalHit: false,
            effectiveness: 'weak',
            shouldLoseTurn: false
          };
        }

        // Show effectiveness message for Lord's argument
        setMessage(getEffectivenessMessage(lordJudgement.effectiveness, lordJudgement.isCriticalHit));
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Apply damage based on Judges' decision
        console.log('Applying damage to player:', {
          damage: lordJudgement.damage,
          isCriticalHit: lordJudgement.isCriticalHit
        });
        const gameEndedAfterLordDamage = await applyDamage('player', lordJudgement.damage, lordJudgement.isCriticalHit);

        if (gameEndedAfterLordDamage) {
          console.log('Game ended after Lord damage');
          return;
        }

        // Update final state after Lord's turn
        const nextPhase = handlePhaseTransition();
        console.log('Transitioning to next phase:', {
          currentPhase: state.currentPhase,
          nextPhase,
          shouldLoseTurn: lordJudgement.shouldLoseTurn
        });
        
        setState(prev => ({ 
          ...prev, 
          currentTurn: lordJudgement.shouldLoseTurn ? 'opponent' : 'player',
          currentPhase: nextPhase
        }));

        setMessage(lordJudgement.explanation);

        console.log('=== Final State ===', {
          currentTurn: state.currentTurn,
          phase: state.currentPhase,
          playerHealth: state.player.health,
          opponentHealth: state.opponent.health
        });

      } catch (error) {
        console.error('Error in debate flow:', error);
        setMessage('Error processing debate. Your turn continues.');
        setState(prev => ({ 
          ...prev, 
          currentTurn: 'player',
          isDebateInputOpen: false
        }));
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
        console.log('=== Debate Submit Complete ===', {
          currentTurn: state.currentTurn,
          phase: state.currentPhase,
          isProcessing: false,
          isLoading: false
        });
      }
    }, 300),
    [debateContext, state.currentPhase, state.player.maxHealth, state.opponent.maxHealth, topic, isProcessing, state.isDebateLordEvolved]
  );

  const handlePhaseTransition = useCallback(() => {
    const healthPercentage = (state.opponent.health / state.opponent.maxHealth) * 100;
    
    if (healthPercentage <= 40 && !state.isDebateLordEvolved) {
      setState(prev => ({ 
        ...prev, 
        isDebateLordEvolved: true,
        opponent: {
          ...prev.opponent,
          level: 90 // Evolve to Immortal level
        }
      }));
    }
    
    return 'battle'; // Always return battle phase
  }, [state.opponent.health, state.opponent.maxHealth, state.isDebateLordEvolved]);

  const getPhaseDisplay = () => {
    return 'DEBATE!';
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
      className="battle-background min-h-screen relative"
      style={{
        filter: `brightness(${screenBrightness}%)`,
        transition: 'filter 50ms linear'
      }}
    >
      {/* Background Elements */}
      <div className="stone-wall" />
      <div className="battle-ground" />
      <div className="battle-bg-pattern" />

      {/* Lightning Overlay */}
      {isLightningVisible && (
        <div 
          className="absolute inset-0 z-50 pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        >
          <video
            key={`lightning-video-${Date.now()}`}
            preload="auto"
            playsInline
            muted
            autoPlay
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onLoadStart={() => console.log('Video load started')}
            onLoadedData={() => console.log('Video data loaded')}
            onCanPlay={() => console.log('Video can play')}
            onError={(e) => {
              const video = e.currentTarget;
              console.error('Video loading error:', {
                error: e,
                networkState: video.networkState,
                readyState: video.readyState,
                src: video.currentSrc || video.src,
                errorCode: video.error?.code,
                errorMessage: video.error?.message
              });
              // Don't hide the overlay immediately, let the animation continue
              setTimeout(() => setIsLightningVisible(false), 1000);
            }}
          >
            <source 
              src="/video/lightning-overlay.mp4" 
              type="video/mp4"
              onError={(e) => {
                console.error('Source error:', e);
                // Try loading an alternative format if MP4 fails
                const video = e.currentTarget.parentElement as HTMLVideoElement;
                if (video) {
                  video.src = '/video/lightning-overlay.webm';
                }
              }}
            />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Game Content */}
      <div className="relative z-10">
        {/* Topic Display */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-20">
          <div className="topic-box">
            <div className="topic-title">Topic: {topic}</div>
            <div className="phase-title">{getPhaseDisplay()}</div>
          </div>
        </div>

        {/* Status Boxes Container */}
        <div className="status-boxes-container">
          {/* Player Status Box */}
          <div style={{ width: '280px' }}> {/* Fixed width container */}
            <div className="status-box">
              <div className="flex justify-between items-center mb-2">
                <span className="mr-2 text-base truncate max-w-[120px]">{state.player.name}</span>
                <span className="flex-shrink-0 text-base whitespace-nowrap">Lv.{state.player.level}</span>
              </div>
              <div className="w-full"> {/* Ensure full width */}
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

          {/* Opponent Status Box */}
          <div style={{ width: '280px' }}> {/* Fixed width container */}
            <div className="status-box">
              <div className="flex justify-between items-center mb-2">
                <span className="mr-2 text-base truncate max-w-[120px]">{state.opponent.name}</span>
                <span className="flex-shrink-0 text-base whitespace-nowrap">Lv.{state.opponent.level}</span>
              </div>
              <div className="w-full"> {/* Ensure full width */}
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

        {/* Position Indicators */}
        <div className="position-indicator position-left">
          {playerSide === 'for' ? 'FOR' : 'AGAINST'}
        </div>
        <div className="position-indicator position-right">
          {playerSide === 'for' ? 'AGAINST' : 'FOR'}
        </div>

        {/* Characters Container */}
        <div className="absolute inset-x-0 top-[250px] flex justify-between px-0">
          {/* Player Character */}
          <div className="character-container" style={{ width: '290px', height: '290px', marginLeft: '32px' }}>
            <div className="character-wrapper">
              <div className="platform-container" style={{ width: '160px', height: '30px', bottom: '-20px', position: 'absolute', left: 'calc(50% - 5px)', transform: 'translateX(-50%)' }}>
                <div className="platform back" style={{ filter: 'blur(6px)' }} />
                <div className="platform" style={{ filter: 'blur(6px)' }} />
              </div>
              <img
                src={getSprites().playerSprite}
                alt="Player"
                className={`${isPlayerDamaged ? 'animate-damage' : ''}`}
                style={{
                  width: '217.5px',
                  height: '217.5px',
                  objectFit: 'contain',
                  imageRendering: 'pixelated',
                  margin: 'auto',
                  display: 'block',
                  transform: 'translateY(10px)'
                }}
              />
            </div>
          </div>

          {/* Opponent Character */}
          <div className="character-container" style={{ width: '290px', height: '290px', marginRight: '32px' }}>
            <div className="character-wrapper">
              <div className="platform-container" style={{ width: '300px', height: '30px', bottom: '-21px', position: 'absolute', left: 'calc(50% + 7px)', transform: 'translateX(-50%)' }}>
                <div className="platform back" style={{ filter: 'blur(6px)' }} />
                <div className="platform" style={{ filter: 'blur(6px)' }} />
              </div>
              <img
                src={getSprites().opponentSprite}
                alt="Opponent"
                className={`${isOpponentDamaged ? 'animate-damage' : ''} ${state.isDebateLordEvolved ? 'evolved-lord' : ''}`}
                style={{
                  width: '290px',
                  height: '290px',
                  transform: state.isDebateLordEvolved ? 'scale(1.25)' : 'scale(1)',
                  transformOrigin: 'center bottom',
                  imageRendering: 'pixelated',
                  objectFit: 'contain',
                  transition: isEvolutionAnimating ? 'none' : 'transform 0.3s ease-out'
                }}
              />
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="chat-container">
          <div className="chat-history">
            {state.battleLog.map((log, index) => (
              <div key={index} className={`message-bubble ${log.sender}-message`}>
                {log.content}
              </div>
            ))}
          </div>
        </div>

        {/* Battle Menu */}
        <div className="fixed bottom-4 left-0 right-0 px-4 z-10">
          <div className={`battle-menu max-w-2xl mx-auto ${state.currentTurn === 'none' || isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0 ? 'message-only' : ''}`}>
            {state.player.health <= 0 || state.opponent.health <= 0 ? (
              <div className="text-center col-span-3">{message}</div>
            ) : state.currentTurn === 'none' ? (
              <div className="text-center col-span-3">{message}</div>
            ) : isLoading ? (
              <div className="text-center col-span-3">Loading...</div>
            ) : isProcessing ? (
              <div className="text-center col-span-3">{message}</div>
            ) : state.currentTurn === 'opponent' ? (
              <div className="text-center col-span-3">Waiting for Debate Lord's response...</div>
            ) : (
              <>
                <button
                  onClick={handleDebateClick}
                  disabled={state.currentTurn !== 'player' || isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0}
                  className="battle-menu-button"
                >
                  <span className="arrow">▶</span> DEBATE
                </button>
                <button
                  onClick={handleFallacyClick}
                  disabled={state.currentTurn !== 'player' || isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0}
                  className="battle-menu-button"
                >
                  <span className="arrow">▶</span> FALLACY
                </button>
                <button
                  onClick={handleConcedeClick}
                  disabled={state.currentTurn !== 'player' || isLoading || isProcessing || state.player.health <= 0 || state.opponent.health <= 0}
                  className="battle-menu-button"
                >
                  <span className="arrow">▶</span> CONCEDE
                </button>
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
    </div>
  );
} 