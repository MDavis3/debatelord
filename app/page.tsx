'use client';

import { useState } from 'react';
import StartScreen from './components/StartScreen';
import BattleArena from './components/BattleArena';

interface GameSettings {
  topic: string;
  side: 'for' | 'against';
  heroName: string;
  demonLordType: 'proper' | 'devious' | 'aggressive';
  difficulty: number;
}

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [settings, setSettings] = useState<GameSettings | null>(null);

  const handleStart = (gameSettings: GameSettings) => {
    setSettings(gameSettings);
    setGameStarted(true);
  };

  if (!gameStarted || !settings) {
    return <StartScreen onStart={handleStart} />;
  }

  return (
    <BattleArena 
      topic={settings.topic}
      playerSide={settings.side}
      playerName={settings.heroName}
      demonLordType={settings.demonLordType}
      difficulty={settings.difficulty}
    />
  );
}
