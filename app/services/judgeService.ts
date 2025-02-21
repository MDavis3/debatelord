import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface JudgementResult {
  damage: number;
  explanation: string;
  targetPlayer: 'player' | 'opponent';
}

const JUDGE_PROMPT = `You are a panel of expert debate judges evaluating arguments in a formal debate.

Current Context:
Topic: {topic}
Phase: {phase}
Action Type: {actionType}

{actionDescription}

Your role is to:
1. Evaluate the soundness, relevance, and effectiveness of the argument/action
2. Determine if damage should be dealt, following these guidelines:

For Arguments:
- Sound arguments remove ~10% HP (with ±3% variance)
- Base HP is {baseHealth}
- During closing statements, player damage is increased by 20%

For Fallacy Calls:
- Correct fallacy identification: Remove 15% HP (with ±3% variance) from the fallacious debater
- Incorrect fallacy call: Remove 10% HP (with ±3% variance) from the caller

For Closing Statements:
- If this is the player's closing statement, evaluate if it's strong enough to defeat the DebateLord
- Consider both the argument's merit and the overall debate performance

Respond in this JSON format:
{
  "damage": number (calculated based on above rules),
  "explanation": "Brief explanation of your judgment",
  "targetPlayer": "player" or "opponent"
}`;

export async function judgeAction(
  actionType: 'argument' | 'fallacy' | 'closing',
  actionDescription: string,
  context: {
    topic: string;
    phase: string;
    baseHealth: number;
    playerArguments: string[];
    opponentArguments: string[];
  }
): Promise<JudgementResult> {
  const prompt = JUDGE_PROMPT
    .replace('{topic}', context.topic)
    .replace('{phase}', context.phase)
    .replace('{actionType}', actionType)
    .replace('{actionDescription}', actionDescription)
    .replace('{baseHealth}', context.baseHealth.toString());

  const response = await fetch('/api/debate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error('Failed to get judges\' response');
  }

  const data = await response.json();
  return JSON.parse(data.result);
} 