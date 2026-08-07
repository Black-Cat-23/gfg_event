// High-Quality Audio Engine with MP3 Track Support & Smooth Mute Controls

class AudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentMode: 'quiz' | 'market' | 'victory' | 'none' = 'none';
  private isMuted: boolean = false;
  private volume: number = 0.25; // 25% comfortable background volume

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      this.currentAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startAmbiance(mode: 'quiz' | 'market' | 'victory') {
    if (this.currentMode === mode && this.currentAudio) return;
    this.stopAmbiance();

    this.currentMode = mode;

    let src = '';
    if (mode === 'quiz') src = '/audio/quiz_theme.mp3';
    if (mode === 'market') src = '/audio/market_theme.mp3';
    if (mode === 'victory') src = '/audio/victory_theme.mp3';

    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.volume;
      audio.muted = this.isMuted;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.currentAudio = audio;
          })
          .catch((err) => {
            console.warn(`[AudioService] Autoplay paused until user interaction or MP3 missing at ${src}:`, err.message);
          });
      }
    } catch (e) {
      console.warn('[AudioService] Audio play error:', e);
    }
  }

  public stopAmbiance() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.currentMode = 'none';
  }

  public playEffect(type: 'correct' | 'reveal' | 'tick' | 'victory') {
    if (this.isMuted) return;

    try {
      let src = '/audio/chime.mp3';
      if (type === 'tick') src = '/audio/tick.mp3';
      if (type === 'victory') src = '/audio/victory_chime.mp3';

      const sfx = new Audio(src);
      sfx.volume = 0.4;
      sfx.play().catch(() => {});
    } catch (e) {}
  }
}

export const audioEngine = new AudioService();
