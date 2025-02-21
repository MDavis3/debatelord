export interface Debater {
  name: string;
  sprite: string;
  health: number;
  maxHealth: number;
  level: number;
}

export interface DebateState {
  player: Debater;
  opponent: Debater;
  currentTurn: 'player' | 'opponent' | 'none';
  battleLog: BattleAction[];
  isDebateInputOpen: boolean;
  isFallacySelectOpen: boolean;
  isConcedeConfirmOpen: boolean;
  isDebateLordEvolved: boolean;
  currentPhase: 'opening_lord' | 'opening_player' | 'back_and_forth' | 'closing_lord' | 'closing_player';
  hasPlayerMadeOpeningStatement: boolean;
}

export interface BattleAction {
  type: 'debate' | 'fallacy' | 'concede' | 'system';
  content: string;
  damage?: number;
  timestamp: Date;
  sender: 'player' | 'opponent' | 'system';
  wordCount?: number;
}

export enum DebateFallacy {
  AD_HOMINEM = 'Ad Hominem',
  STRAW_MAN = 'Straw Man',
  FALSE_DICHOTOMY = 'False Dichotomy',
  SLIPPERY_SLOPE = 'Slippery Slope',
  APPEAL_TO_AUTHORITY = 'Appeal to Authority',
  RED_HERRING = 'Red Herring',
  CIRCULAR_REASONING = 'Circular Reasoning',
  HASTY_GENERALIZATION = 'Hasty Generalization'
} 