import { useEffect, useRef } from 'react';

class AudioManager {
  private static instance: AudioManager;
  private betelgeuseTheme: HTMLAudioElement | null = null;
  private sterbenshallTheme: HTMLAudioElement | null = null;
  private taktOfHeroesTheme: HTMLAudioElement | null = null;
  private isInitialized = false;
  private currentVolume = 0.5;
  private muted = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    // Create audio elements only on client side
    this.betelgeuseTheme = new Audio('/audio/Re_Zero OST - Betelgeuse Theme Compilation - Archbishop of Sloth.mp3');
    this.sterbenshallTheme = new Audio('/audio/Re_Zero Special Soundtrack CD 2 - 18. Sterbenshall.mp3');
    this.taktOfHeroesTheme = new Audio('/audio/Greatest Battle OST\'s of All Time_ Takt of Heroes.mp3');
    
    // Set up looping for Betelgeuse theme
    if (this.betelgeuseTheme) {
      this.betelgeuseTheme.loop = true;
    }
    
    // Set up event listeners for theme transitions
    if (this.sterbenshallTheme) {
      this.sterbenshallTheme.addEventListener('ended', () => {
        this.playTaktOfHeroes();
      });
    }
    
    // Set volumes
    if (this.betelgeuseTheme) this.betelgeuseTheme.volume = 0.5;
    if (this.sterbenshallTheme) this.sterbenshallTheme.volume = 0.5;
    if (this.taktOfHeroesTheme) this.taktOfHeroesTheme.volume = 0.5;

    this.isInitialized = true;
  }

  public startBetelgeuseTheme() {
    if (!this.isInitialized) this.initialize();
    this.stopAll();
    if (this.betelgeuseTheme) {
      this.betelgeuseTheme.currentTime = 0;
      const playPromise = this.betelgeuseTheme.play();
      if (playPromise) {
        playPromise.catch(e => console.error('Error playing Betelgeuse theme:', e));
      }
    }
  }

  public startEvolutionThemes() {
    if (!this.isInitialized) this.initialize();
    this.stopAll();
    if (this.sterbenshallTheme) {
      this.sterbenshallTheme.currentTime = 0;
      const playPromise = this.sterbenshallTheme.play();
      if (playPromise) {
        playPromise.catch(e => console.error('Error playing Sterbenshall theme:', e));
      }
    }
  }

  private playTaktOfHeroes() {
    if (!this.isInitialized) this.initialize();
    if (this.taktOfHeroesTheme) {
      this.taktOfHeroesTheme.currentTime = 0;
      const playPromise = this.taktOfHeroesTheme.play();
      if (playPromise) {
        playPromise.catch(e => console.error('Error playing Takt of Heroes theme:', e));
      }
    }
  }

  public stopAll() {
    if (this.betelgeuseTheme) {
      this.betelgeuseTheme.pause();
      this.betelgeuseTheme.currentTime = 0;
    }
    if (this.sterbenshallTheme) {
      this.sterbenshallTheme.pause();
      this.sterbenshallTheme.currentTime = 0;
    }
    if (this.taktOfHeroesTheme) {
      this.taktOfHeroesTheme.pause();
      this.taktOfHeroesTheme.currentTime = 0;
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (!this.muted) {
      if (this.betelgeuseTheme) this.betelgeuseTheme.volume = this.currentVolume;
      if (this.sterbenshallTheme) this.sterbenshallTheme.volume = this.currentVolume;
      if (this.taktOfHeroesTheme) this.taktOfHeroesTheme.volume = this.currentVolume;
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    const volume = muted ? 0 : this.currentVolume;
    if (this.betelgeuseTheme) this.betelgeuseTheme.volume = volume;
    if (this.sterbenshallTheme) this.sterbenshallTheme.volume = volume;
    if (this.taktOfHeroesTheme) this.taktOfHeroesTheme.volume = volume;
  }
}

export function useAudio() {
  const audioManager = useRef<AudioManager>(AudioManager.getInstance());

  useEffect(() => {
    // Initialize audio only after component mounts (client-side)
    audioManager.current.initialize();
  }, []);

  return audioManager.current;
}

export default AudioManager; 