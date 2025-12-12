
import { BGM_LIBRARY, BGMTrack } from '../data/bgm_tracks';

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private currentBgm: HTMLAudioElement | null = null;
  private currentBgmKey: string | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.3; // Default slightly lower for comfort
  private masterGain: GainNode | null = null;

  constructor() {
    // We init AudioContext lazily on first user interaction
  }

  public initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.updateVolume();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    this.updateVolume();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateVolume();
  }

  private updateVolume() {
    const effectiveVol = this.isMuted ? 0 : this.volume;
    
    // SFX Volume
    if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(effectiveVol, this.audioCtx?.currentTime || 0, 0.1);
    }
    
    // BGM Volume
    if (this.currentBgm) {
        this.currentBgm.volume = effectiveVol;
    }
  }

  // --- TTS ---
  public speakWord(word: string) {
    if (this.isMuted || this.volume === 0 || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.volume = this.volume;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google US English') || 
      voice.name.includes('Samantha') || 
      (voice.lang === 'en-US' && !voice.name.includes('Microsoft'))
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // --- BGM ---
  
  public getCurrentTrackName(): string {
      const track = BGM_LIBRARY.find(t => t.id === this.currentBgmKey);
      return track ? track.name : 'Unknown Track';
  }

  public playNextBGM() {
      const currentIndex = BGM_LIBRARY.findIndex(t => t.id === this.currentBgmKey);
      let nextIndex = currentIndex + 1;
      if (nextIndex >= BGM_LIBRARY.length) nextIndex = 0;
      this.playBGM(BGM_LIBRARY[nextIndex].id);
  }

  public playPrevBGM() {
      const currentIndex = BGM_LIBRARY.findIndex(t => t.id === this.currentBgmKey);
      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = BGM_LIBRARY.length - 1;
      this.playBGM(BGM_LIBRARY[prevIndex].id);
  }

  public playBGM(trackKey: string) {
    if (this.currentBgmKey === trackKey && !this.currentBgm?.paused) return; // Already playing
    
    const track = BGM_LIBRARY.find(t => t.id === trackKey);
    const url = track ? track.url : BGM_LIBRARY[0].url;

    // Stop previous
    if (this.currentBgm) {
      const oldBgm = this.currentBgm;
      // Simple fade out
      let vol = oldBgm.volume;
      const fade = setInterval(() => {
        if (vol > 0.05) {
          vol -= 0.05;
          oldBgm.volume = vol;
        } else {
          oldBgm.pause();
          clearInterval(fade);
        }
      }, 50);
    }

    this.currentBgmKey = trackKey;
    this.currentBgm = new Audio(url);
    this.currentBgm.loop = (trackKey !== 'VICTORY');
    this.currentBgm.volume = this.isMuted ? 0 : this.volume;
    
    const playPromise = this.currentBgm.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.log("Auto-play prevented. waiting for interaction.", e);
            // We can try again after interaction
        });
    }
  }

  public stopBGM() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm = null;
      this.currentBgmKey = null;
    }
  }

  // --- Synthesized SFX (No External Files Needed) ---
  
  public playAttackSFX() {
    this.playTone(100, 'sawtooth', 0.1, 0);
    this.playNoise(0.15);
  }

  public playBlockSFX() {
    this.playTone(400, 'sine', 0.1, 0.5); // Ping
    this.playTone(300, 'triangle', 0.3, 0); // Gong body
  }

  public playBuffSFX() {
    this.initAudioContext();
    if (!this.audioCtx || this.isMuted) return;
    
    const now = this.audioCtx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
       const osc = this.audioCtx!.createOscillator();
       const gain = this.audioCtx!.createGain();
       osc.type = 'sine';
       osc.frequency.value = freq;
       
       gain.gain.setValueAtTime(0.1 * this.volume, now + i*0.1);
       gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.3);
       
       osc.connect(gain);
       gain.connect(this.masterGain!);
       osc.start(now + i*0.1);
       osc.stop(now + i*0.1 + 0.3);
    });
  }

  public playClickSFX() {
    this.playTone(800, 'sine', 0.05, 0.01);
  }

  public playHoverSFX() {
     this.playTone(200, 'sine', 0.02, 0.05);
  }

  public playErrorSFX() {
    this.playTone(150, 'sawtooth', 0.3, 0.1);
    this.playTone(140, 'sawtooth', 0.3, 0.1);
  }
  
  public playSuccessSFX() {
      this.playTone(880, 'sine', 0.1, 0.5);
      setTimeout(() => this.playTone(1760, 'sine', 0.2, 1.0), 100);
  }

  public playPurchaseSFX() {
    this.playTone(1200, 'square', 0.1, 0);
    setTimeout(() => this.playTone(1600, 'square', 0.2, 0.1), 100);
  }

  public playDrawSFX() {
    // Crisp paper slide sound
    this.playNoise(0.05); 
    this.playTone(600, 'triangle', 0.05, 0);
  }

  public playGoldSFX() {
    // High pitched jingling
    this.playTone(1500, 'sine', 0.1, 0);
    setTimeout(() => this.playTone(1800, 'sine', 0.1, 0), 50);
    setTimeout(() => this.playTone(2000, 'sine', 0.2, 0), 100);
  }

  public playVictorySFX() {
     this.initAudioContext();
     if (!this.audioCtx || this.isMuted) return;
     const now = this.audioCtx.currentTime;
     
     // Simple fanfare triad
     [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const startTime = now + i * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2 * this.volume, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
     });
  }

  private playTone(freq: number, type: OscillatorType, duration: number, delay: number = 0) {
    this.initAudioContext();
    if (!this.audioCtx || this.isMuted) return;
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + delay);
    
    // Scale gain by master volume
    const vol = 0.1 * (this.isMuted ? 0 : this.volume);
    
    gain.gain.setValueAtTime(vol, this.audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(this.audioCtx.currentTime + delay);
    osc.stop(this.audioCtx.currentTime + delay + duration);
  }

  private playNoise(duration: number) {
    this.initAudioContext();
    if (!this.audioCtx || this.isMuted) return;

    const bufferSize = this.audioCtx.sampleRate * duration;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.audioCtx.createGain();
    const vol = 0.2 * (this.isMuted ? 0 : this.volume);

    gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.masterGain!);
    noise.start();
  }
}

export const audioService = new SoundManager();
