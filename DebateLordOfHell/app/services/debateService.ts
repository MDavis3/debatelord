import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export interface DebateContext {
  topic: string;
  isOpeningStatement?: boolean;
  isClosingStatement?: boolean;
  isEvolved?: boolean;
  currentRound: number;
  maxRounds: number;
  playerArguments: string[];
  opponentArguments: string[];
  debatePhase: 'opening' | 'middle' | 'closing';
  demonLordType: 'proper' | 'devious' | 'aggressive';
  difficulty: number;
}

export interface DebateResponse {
  argument: string;
  fallacies?: string[];
  damage: number;
}

const DEBATE_PROMPT = `You are the {demonLordType}, a master debater who engages in formal debates.
{personality}

Your responses should be:
- {style}
- Logically structured
- {fallacyStyle}
- Relevant to the current debate phase
- Difficulty level: {difficulty}/10
- For opening statements: 300-500 words
- For regular responses: 50-100 words
- Plain text only, no formatting or markers

Current debate context:
Topic: {topic}
Round: {round}/{maxRounds}
Phase: {phase}

Previous arguments:
{previousArguments}

Respond with a compelling argument that builds on the discussion.`;

async function callGeminiAPI(prompt: string): Promise<string> {
  const response = await fetch('/api/debate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate response');
  }

  const data = await response.json();
  return data.result;
}

function getPersonalityPrompt(type: 'proper' | 'devious' | 'aggressive'): string {
  switch(type) {
    case 'proper':
      return 'You maintain a formal, professional tone and focus on logical arguments.';
    case 'devious':
      return 'You are cunning and deceptive, frequently employing logical fallacies to trick your opponent.';
    case 'aggressive':
      return 'You are fierce and confrontational, occasionally using creative insults while maintaining debate relevance.';
  }
}

function getStylePrompt(type: 'proper' | 'devious' | 'aggressive'): string {
  switch(type) {
    case 'proper':
      return 'Formal and professional';
    case 'devious':
      return 'Subtle and misleading';
    case 'aggressive':
      return 'Bold and confrontational';
  }
}

function getFallacyStyle(type: 'proper' | 'devious' | 'aggressive'): string {
  switch(type) {
    case 'proper':
      return 'Avoiding logical fallacies';
    case 'devious':
      return 'Incorporating subtle logical fallacies';
    case 'aggressive':
      return 'Using emotional appeals and ad hominem attacks';
  }
}

export async function generateDebateResponse(context: DebateContext): Promise<DebateResponse> {
  const prompt = DEBATE_PROMPT
    .replace('{demonLordType}', getDemonLordName(context.demonLordType))
    .replace('{personality}', getPersonalityPrompt(context.demonLordType))
    .replace('{style}', getStylePrompt(context.demonLordType))
    .replace('{fallacyStyle}', getFallacyStyle(context.demonLordType))
    .replace('{difficulty}', context.difficulty.toString())
    .replace('{topic}', context.topic)
    .replace('{round}', context.currentRound.toString())
    .replace('{maxRounds}', context.maxRounds.toString())
    .replace('{phase}', context.debatePhase)
    .replace('{previousArguments}', formatPreviousArguments(context));

  const text = await callGeminiAPI(prompt);

  // Calculate damage based on response length, complexity, and difficulty
  const damage = calculateDamage(text, context.difficulty);

  // Analyze for potential fallacies (more likely with devious type)
  const fallacies = await analyzeFallacies(text);

  return {
    argument: text,
    fallacies,
    damage
  };
}

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

// Update damage calculation to consider difficulty
function calculateDamage(argument: string, difficulty: number): number {
  // Base damage calculation
  let damage = 40 + (difficulty * 2); // Base damage scales with difficulty

  // Adjust based on length (longer arguments deal more damage)
  const words = argument.split(' ').length;
  damage += Math.min(40, words / 2);

  // Add random variance (±20%)
  const variance = damage * 0.2;
  damage += Math.random() * variance * 2 - variance;

  return Math.round(damage);
}

function formatPreviousArguments(context: DebateContext): string {
  let formatted = '';
  const maxPrevious = 2; // Only include last 2 arguments for context

  const recentPlayerArgs = context.playerArguments.slice(-maxPrevious);
  const recentOpponentArgs = context.opponentArguments.slice(-maxPrevious);

  recentPlayerArgs.forEach((arg, i) => {
    formatted += `Player: ${arg}\n`;
    if (recentOpponentArgs[i]) {
      formatted += `Debate Lord: ${recentOpponentArgs[i]}\n`;
    }
  });

  return formatted;
}

export async function analyzeFallacies(argument: string): Promise<string[]> {
  const fallacyPrompt = `Analyze this argument for logical fallacies from the following list:
  - Ad Hominem
  - Straw Man
  - False Dichotomy
  - Slippery Slope
  - Appeal to Authority
  - Red Herring
  - Circular Reasoning
  - Hasty Generalization

  Argument: "${argument}"

  Return only the names of fallacies found, separated by commas. If none are found, return "none".`;

  const fallaciesText = await callGeminiAPI(fallacyPrompt);
  
  return fallaciesText === 'none' 
    ? [] 
    : fallaciesText.split(',').map(f => f.trim());
}

export async function startDebate(topic: string): Promise<DebateResponse> {
  const context: DebateContext = {
    topic,
    currentRound: 0,
    maxRounds: Number(process.env.NEXT_PUBLIC_DEBATE_ROUNDS) || 3,
    playerArguments: [],
    opponentArguments: [],
    debatePhase: 'opening',
    demonLordType: 'proper',
    difficulty: 5
  };

  return generateDebateResponse(context);
} 