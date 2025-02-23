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
  debatePhase: 'battle';
  demonLordType: 'proper' | 'devious' | 'aggressive';
}

export interface DebateResponse {
  argument: string;
  fallacies?: string[];
  damage: number;
}

const DEBATE_PROMPT = `You are the {demonLordType}, a master debater who engages in formal debates.
{personality}

Your responses MUST be:
{difficultyInstructions}
- Logically structured
- {fallacyStyle}
- Relevant to the current debate phase
- STRICTLY limited to 50 words maximum
- Plain text only, no formatting or markers
- Concise and impactful

Current debate context:
Topic: {topic}
Round: {round}/{maxRounds}
Phase: {phase}

Previous arguments:
{previousArguments}

Respond with a {qualityLevel} argument that builds on the discussion.
Remember: Keep your response under 50 words - quality over quantity!`;

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
      return 'You maintain a formal tone and focus on clear, straightforward arguments that match your difficulty level.';
    case 'devious':
      return 'You are cunning and use tricky arguments that match your difficulty level, from simple misdirection to complex fallacies.';
    case 'aggressive':
      return 'You are confrontational and use strong language that matches your difficulty level, from playground taunts to sophisticated criticism.';
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

function getDifficultyInstructions(isEvolved: boolean): string {
  if (!isEvolved) { // Archon form - easier
    return `- Use simple, clear vocabulary and straightforward sentences
- Make basic logical connections
- Show good understanding of the topic
- Focus on obvious comparisons and similarities
- Keep arguments simple and direct`;
  } else { // Immortal form - harder
    return `- Use advanced vocabulary and well-structured arguments
- Make strong logical connections
- Show expert understanding with examples
- Use sophisticated debate techniques
- Develop complex arguments with multiple supporting points`;
  }
}

function getQualityLevel(isEvolved: boolean): string {
  return isEvolved ? "masterful" : "straightforward";
}

export async function generateDebateResponse(context: DebateContext): Promise<DebateResponse> {
  const prompt = DEBATE_PROMPT
    .replace('{demonLordType}', getDemonLordName(context.demonLordType))
    .replace('{personality}', getPersonalityPrompt(context.demonLordType))
    .replace('{style}', getStylePrompt(context.demonLordType))
    .replace('{fallacyStyle}', getFallacyStyle(context.demonLordType))
    .replace('{difficultyInstructions}', getDifficultyInstructions(context.isEvolved || false))
    .replace('{qualityLevel}', getQualityLevel(context.isEvolved || false))
    .replace('{topic}', context.topic)
    .replace('{round}', context.currentRound.toString())
    .replace('{maxRounds}', context.maxRounds.toString())
    .replace('{phase}', context.debatePhase)
    .replace('{previousArguments}', formatPreviousArguments(context));

  try {
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
    
    // If we got a fallback response from the API
    if (data.result === "I apologize, but I need a moment to formulate a clearer response. Let me rephrase my argument in a more constructive way.") {
      // Generate a simple response based on evolved state
      return {
        argument: generateFallbackArgument(context.isEvolved || false),
        damage: context.isEvolved ? 250 : 150,
        fallacies: []
      };
    }

    const text = data.result;
    const damage = calculateDamage(text, context.isEvolved || false);
    const fallacies = await analyzeFallacies(text);

    return {
      argument: text,
      fallacies,
      damage
    };
  } catch (error) {
    console.error('Error generating debate response:', error);
    return {
      argument: generateFallbackArgument(context.isEvolved || false),
      damage: context.isEvolved ? 250 : 150,
      fallacies: []
    };
  }
}

function generateFallbackArgument(isEvolved: boolean): string {
  if (!isEvolved) {
    return "Let's focus on the basic facts in front of us.";
  } else {
    return "The evidence and logical principles consistently support our position through multiple angles.";
  }
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

function calculateDamage(argument: string, isEvolved: boolean): number {
  // Base damage is lower for Archon, higher for Immortal
  let damage = isEvolved ? 250 : 150;

  // Length bonus is smaller for Archon
  const words = argument.split(' ').length;
  const lengthBonus = isEvolved ? Math.min(50, words / 2) : Math.min(25, words / 3);
  damage += lengthBonus;

  // Add random variance (±10% for Archon, ±20% for Immortal)
  const variancePercent = isEvolved ? 0.2 : 0.1;
  const variance = damage * variancePercent;
  damage += Math.random() * variance * 2 - variance;

  return Math.round(damage);
}

function formatPreviousArguments(context: DebateContext): string {
  let formatted = '';
  const maxPrevious = 3; // Include last 3 arguments for better context

  const recentPlayerArgs = context.playerArguments.slice(-maxPrevious);
  const recentOpponentArgs = context.opponentArguments.slice(-maxPrevious);

  // Add a clear separator for the debate history
  formatted += '=== Previous Debate Arguments ===\n';

  recentPlayerArgs.forEach((arg, i) => {
    formatted += `Player's Argument: "${arg}"\n`;
    if (recentOpponentArgs[i]) {
      formatted += `Debate Lord's Response: "${recentOpponentArgs[i]}"\n`;
    }
    formatted += '---\n'; // Add separator between exchanges
  });

  // Add current debate phase for context
  formatted += `Current Phase: ${context.debatePhase}\n`;
  formatted += `Round: ${context.currentRound} of ${context.maxRounds}\n`;

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
    debatePhase: 'battle',
    demonLordType: 'proper',
  };

  return generateDebateResponse(context);
} 