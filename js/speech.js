/**
 * E.D.I.T.H. Speech Recognition Engine
 * Handles voice commands and microphone stream
 */

class EdithSpeechRecognition {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.continuous = false;
    this.lang = 'fr-FR';

    this.onStartCallback = null;
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;

    this.initRecognition();
  }

  isSupported() {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }

  initRecognition() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('[EDITH] SpeechRecognition non supporté nativement.');
      return;
    }

    this.recognition = new SpeechRecognitionClass();
    this.recognition.lang = this.lang;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (window.edithAudio) window.edithAudio.playActivation();
      if (this.onStartCallback) this.onStartCallback();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback(finalTranscript, interimTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[EDITH] Speech recognition error:', event.error);
      this.isListening = false;
      if (window.edithAudio) window.edithAudio.playWarning();
      if (this.onErrorCallback) this.onErrorCallback(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.continuous && this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {}
      } else {
        if (this.onEndCallback) this.onEndCallback();
      }
    };
  }

  start() {
    if (!this.recognition) {
      this.initRecognition();
      if (!this.recognition) return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('[EDITH] Déjà en écoute ou erreur de démarrage:', e);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  toggle() {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }
}

// Global instance
window.edithSpeech = new EdithSpeechRecognition();
