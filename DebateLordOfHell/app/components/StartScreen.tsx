import { useState } from 'react';
import { useAudio } from '../services/audioService';

interface StartScreenProps {
  onStart: (settings: {
    topic: string;
    side: 'for' | 'against';
    heroName: string;
    demonLordType: 'proper' | 'devious' | 'aggressive';
    difficulty: number;
  }) => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [showSetup, setShowSetup] = useState(false);
  const [topic, setTopic] = useState('');
  const [side, setSide] = useState<'for' | 'against'>('for');
  const [heroName, setHeroName] = useState('');
  const [demonLordType, setDemonLordType] = useState<'proper' | 'devious' | 'aggressive'>('proper');
  const [difficulty, setDifficulty] = useState(5);
  const audioManager = useAudio();

  const handleStartClick = () => {
    audioManager.startBetelgeuseTheme();
    setShowSetup(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic && heroName) {
      onStart({ topic, side, heroName, demonLordType, difficulty });
    }
  };

  const getDifficultyRank = (level: number) => {
    const ranks = [
      'Herald',
      'Guardian',
      'Crusader',
      'Archon',
      'Legend',
      'Ancient',
      'Divine',
      'Immortal',
      'Ascendant',
      'Demonslayer'
    ];
    return ranks[level - 1];
  };

  if (!showSetup) {
    return (
      <div className="battle-background min-h-screen flex items-center justify-center p-4">
        <div className="text-box w-full max-w-2xl text-center">
          <h1 className="text-4xl mb-8">DEBATE LORD</h1>
          <button
            onClick={handleStartClick}
            className="battle-menu-button text-2xl py-4 px-8 mx-auto block hover:scale-105 transition-transform"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="battle-background min-h-screen flex items-center justify-center p-4">
      <div className="text-box w-full max-w-2xl">
        <h1 className="text-2xl mb-8 text-center">DEBATE LORD</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">DEBATE TOPIC</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 text-black text-sm bg-white border-2 border-[#2860b8] rounded"
              placeholder="Enter the topic to debate..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm mb-2">YOUR POSITION</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`battle-menu-button ${side === 'for' ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => setSide('for')}
              >
                FOR
              </button>
              <button
                type="button"
                className={`battle-menu-button ${side === 'against' ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => setSide('against')}
              >
                AGAINST
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">CHOOSE YOUR OPPONENT</label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                className={`battle-menu-button text-sm ${demonLordType === 'proper' ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => setDemonLordType('proper')}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span>PROPER</span>
                  <span>LORD</span>
                  <span className="block text-xs mt-2 opacity-75 text-center">Formal and logical</span>
                </div>
              </button>
              <button
                type="button"
                className={`battle-menu-button text-sm ${demonLordType === 'devious' ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => setDemonLordType('devious')}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span>DEVIOUS</span>
                  <span>LORD</span>
                  <span className="block text-xs mt-2 opacity-75 text-center">Tricky and fallacious</span>
                </div>
              </button>
              <button
                type="button"
                className={`battle-menu-button text-sm ${demonLordType === 'aggressive' ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => setDemonLordType('aggressive')}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span>AGGRESSIVE</span>
                  <span>LORD</span>
                  <span className="block text-xs mt-2 opacity-75 text-center">Fierce and insulting</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">DIFFICULTY: {getDifficultyRank(difficulty)}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full h-2 bg-[#2860b8] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-1">
              <span>Herald</span>
              <span>Demonslayer</span>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">HERO NAME</label>
            <input
              type="text"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              className="w-full p-2 text-black text-sm bg-white border-2 border-[#2860b8] rounded"
              placeholder="Enter your hero name..."
              required
              maxLength={10}
            />
          </div>

          <button
            type="submit"
            className="battle-menu-button w-full py-4 text-center"
            disabled={!topic || !heroName}
          >
            START DEBATE
          </button>
        </form>
      </div>
    </div>
  );
} 