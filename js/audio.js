/**
 * E.D.I.T.H. Audio & Speech Synthesis Engine
 * Synthesizes Stark HUD sound effects with Web Audio API
 * and speaks responses with Web Speech API
 */

class EdithAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.preferredVoice = null;
    this.isSpeaking = false;
    this.voiceRate = parseFloat(localStorage.getItem('edith_voice_rate')) || 1.05;
    this.voicePitch = parseFloat(localStorage.getItem('edith_voice_pitch')) || 1.0;
    this.soundEnabled = localStorage.getItem('edith_sound_enabled') !== 'false';
    this.autoSpeak = localStorage.getItem('edith_auto_speak') !== 'false';

    this.initAudioContext();
    this.initVoices();
  }

  setAudioParams(rate, pitch, soundEnabled, autoSpeak) {
    if (rate !== undefined && !isNaN(rate)) {
      this.voiceRate = parseFloat(rate);
      localStorage.setItem('edith_voice_rate', this.voiceRate);
    }
    if (pitch !== undefined && !isNaN(pitch)) {
      this.voicePitch = parseFloat(pitch);
      localStorage.setItem('edith_voice_pitch', this.voicePitch);
    }
    if (soundEnabled !== undefined) {
      this.soundEnabled = Boolean(soundEnabled);
      localStorage.setItem('edith_sound_enabled', this.soundEnabled);
    }
    if (autoSpeak !== undefined) {
      this.autoSpeak = Boolean(autoSpeak);
      localStorage.setItem('edith_auto_speak', this.autoSpeak);
    }
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  ensureAudioResumed() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      // Look for French female / high quality voices
      const savedVoiceURI = localStorage.getItem('edith_voice_uri');
      if (savedVoiceURI) {
        this.preferredVoice = this.voices.find(v => v.voiceURI === savedVoiceURI);
      }
      
      if (!this.preferredVoice) {
        // Prioritize French voices
        this.preferredVoice = this.voices.find(v => v.lang.startsWith('fr') && (v.name.includes('Female') || v.name.includes('Hortense') || v.name.includes('Google') || v.name.includes('Julie') || v.name.includes('Céline'))) ||
                              this.voices.find(v => v.lang.startsWith('fr')) ||
                              this.voices[0];
      }

      if (typeof window.onEdithVoicesLoaded === 'function') {
        window.onEdithVoicesLoaded();
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getAvailableVoices() {
    return this.voices.filter(v => v.lang.startsWith('fr') || v.lang.startsWith('en'));
  }

  setVoice(voiceURI) {
    const v = this.voices.find(voice => voice.voiceURI === voiceURI);
    if (v) {
      this.preferredVoice = v;
      localStorage.setItem('edith_voice_uri', voiceURI);
    }
  }

  /* ----------------------------------------------------
     Synthesized Stark HUD Sound FX (Web Audio API)
     ---------------------------------------------------- */
  playBeep(freq = 800, duration = 0.05, type = 'sine') {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudioResumed();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio effect error:', e);
    }
  }

  playBootSound() {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudioResumed();
      if (!this.audioCtx) return;

      const notes = [220, 440, 659.25, 880, 1174.66]; // Stark chord
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playBeep(freq, 0.18, 'sine');
        }, idx * 60);
      });
    } catch (e) {}
  }

  playActivation() {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudioResumed();
      if (!this.audioCtx) return;
      this.playBeep(520, 0.06, 'triangle');
      setTimeout(() => this.playBeep(780, 0.08, 'sine'), 60);
      setTimeout(() => this.playBeep(1046, 0.1, 'sine'), 120);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudioResumed();
      if (!this.audioCtx) return;
      this.playBeep(659.25, 0.08, 'sine');
      setTimeout(() => this.playBeep(880, 0.12, 'sine'), 80);
    } catch (e) {}
  }

  playScanTone() {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudioResumed();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(1400, this.audioCtx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  playWarning() {
    if (!this.soundEnabled) return;
    try {
      this.ensureAudioResumed();
      if (!this.audioCtx) return;
      this.playBeep(440, 0.12, 'sawtooth');
      setTimeout(() => this.playBeep(330, 0.18, 'sawtooth'), 140);
    } catch (e) {}
  }

  /* ----------------------------------------------------
     Speech Synthesis (E.D.I.T.H. Speaks)
     ---------------------------------------------------- */
  speak(text, onStartCallback, onEndCallback) {
    if (!this.synth) {
      if (onEndCallback) onEndCallback();
      return;
    }

    // Cancel current speech if any
    this.stopSpeaking();

    // Clean markdown symbols from spoken text
    const cleanText = text
      .replace(/[#*`_~\[\]()><]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'lien web')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.preferredVoice ? this.preferredVoice.lang : 'fr-FR';
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.rate = this.voiceRate;
    utterance.pitch = this.voicePitch;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStartCallback) onStartCallback();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (err) => {
      console.warn('SpeechSynthesis error:', err);
      this.isSpeaking = false;
      if (onEndCallback) onEndCallback();
    };

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

// Global instance
window.edithAudio = new EdithAudioEngine();
