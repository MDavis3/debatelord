import { useState, useEffect } from 'react';
import { useAudio } from '../services/audioService';

export default function VolumeControl() {
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const audioManager = useAudio();

  useEffect(() => {
    // Set initial volume from audio manager
    setVolume(audioManager.getVolume() * 100);
    setIsMuted(audioManager.isMuted());
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    audioManager.setVolume(newVolume / 100);
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioManager.setMuted(newMutedState);
  };

  // Choose the appropriate icon based on volume level and mute state
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 33) return '🔈';
    if (volume < 67) return '🔉';
    return '🔊';
  };

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-black/50 p-2 rounded-lg z-50">
      <button
        onClick={toggleMute}
        className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded"
      >
        {getVolumeIcon()}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={handleVolumeChange}
        className="w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
        style={{
          backgroundImage: `linear-gradient(to right, white ${volume}%, transparent ${volume}%)`,
        }}
      />
    </div>
  );
} 