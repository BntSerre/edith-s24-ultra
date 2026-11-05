/**
 * E.D.I.T.H. Tactical Protocols & S24 Ultra Tools Engine
 * Telemetry, Categorized Notes, S Pen Canvas, Compass, Timer, SOS Beacon
 */

class EdithS24Tools {
  constructor() {
    this.notes = JSON.parse(localStorage.getItem('edith_s24_notes') || '[]');
    this.timerInterval = null;
    this.timerSeconds = 0;
    this.timerInitial = 0;
    this.isTimerRunning = false;
    this.sosInterval = null;
    this.isSosActive = false;
    this.sPenActive = false;
    this.currentFilter = 'all';

    // Compass / Azimuth
    this.compassHeading = 0;
    this.initOrientationListener();
  }

  /* ----------------------------------------------------
     Device Orientation & Compass
     ---------------------------------------------------- */
  initOrientationListener() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', (e) => this.handleOrientation(e), true);
      window.addEventListener('deviceorientation', (e) => this.handleOrientation(e), true);
    }
  }

  handleOrientation(e) {
    let heading = null;
    if (e.webkitCompassHeading) {
      heading = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      heading = (360 - e.alpha) % 360;
    }

    if (heading !== null) {
      this.compassHeading = Math.round(heading);
      const compassEl = document.getElementById('compassHeadingVal');
      const arrowEl = document.getElementById('compassArrow');
      if (compassEl) compassEl.textContent = `${this.compassHeading}°`;
      if (arrowEl) arrowEl.style.transform = `rotate(${this.compassHeading}deg)`;
    }
  }

  /* ----------------------------------------------------
     Categorized Mission Notes
     ---------------------------------------------------- */
  getNotes(filter = 'all') {
    if (filter === 'all') return this.notes;
    return this.notes.filter(n => n.category === filter);
  }

  addNote(text, category = 'mission') {
    if (!text || !text.trim()) return null;
    const note = {
      id: Date.now().toString(),
      text: text.trim(),
      category: category,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    this.notes.unshift(note);
    localStorage.setItem('edith_s24_notes', JSON.stringify(this.notes));
    if (window.edithAudio) window.edithAudio.playSuccess();
    return note;
  }

  deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    localStorage.setItem('edith_s24_notes', JSON.stringify(this.notes));
    if (window.edithAudio) window.edithAudio.playBeep(450, 0.05);
  }

  /* ----------------------------------------------------
     Tactical Countdown Timer
     ---------------------------------------------------- */
  startTimer(seconds, onTick, onComplete) {
    this.stopTimer();
    this.timerSeconds = seconds;
    this.timerInitial = seconds;
    this.isTimerRunning = true;

    if (window.edithAudio) window.edithAudio.playActivation();

    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      const progress = (this.timerSeconds / this.timerInitial);
      if (onTick) onTick(this.formatTime(this.timerSeconds), progress);

      if (this.timerSeconds <= 0) {
        this.stopTimer();
        if (window.edithAudio) {
          window.edithAudio.playWarning();
          window.edithAudio.speak("Protocole de compte à rebours achevé, monsieur.");
        }
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /* ----------------------------------------------------
     S24 Ultra Telemetry & Hardware Diagnostics
     ---------------------------------------------------- */
  async getDeviceTelemetry() {
    const telemetry = {
      batteryLevel: 'N/A',
      isCharging: false,
      chargingTime: null,
      online: navigator.onLine,
      processor: 'Snapdragon 8 Gen 3 (Octa-Core)',
      ram: navigator.deviceMemory ? `${navigator.deviceMemory} Go LPDDR5X` : '12 Go LPDDR5X',
      display: '6.8" Dynamic AMOLED 2X (QHD+ 120Hz)',
      screenRes: `${window.screen.width * (window.devicePixelRatio || 1)}x${window.screen.height * (window.devicePixelRatio || 1)}`,
      coords: null
    };

    if (navigator.getBattery) {
      try {
        const b = await navigator.getBattery();
        telemetry.batteryLevel = `${Math.round(b.level * 100)}%`;
        telemetry.isCharging = b.charging;
      } catch (e) {}
    }

    return telemetry;
  }

  async getTacticalCoordinates() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: '48.8584° N', lon: '2.2945° E', alt: '35m', acc: '±5m' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: `${pos.coords.latitude.toFixed(5)}° N`,
            lon: `${pos.coords.longitude.toFixed(5)}° E`,
            alt: pos.coords.altitude ? `${Math.round(pos.coords.altitude)}m` : 'Sol',
            acc: `±${Math.round(pos.coords.accuracy)}m`
          });
        },
        () => resolve({ lat: 'COORD_VERROUILLÉE', lon: 'REF_ORBITALE', alt: 'N/A', acc: 'GPS Masqué' }),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  }

  /* ----------------------------------------------------
     SOS Emergency Beacon
     ---------------------------------------------------- */
  toggleSOS(onFlashCallback) {
    if (this.isSosActive) {
      this.isSosActive = false;
      if (this.sosInterval) clearInterval(this.sosInterval);
      return false;
    }

    this.isSosActive = true;
    let state = false;
    this.sosInterval = setInterval(() => {
      state = !state;
      if (onFlashCallback) onFlashCallback(state);
      if (state && window.edithAudio) window.edithAudio.playBeep(920, 0.05);
    }, 220);

    return true;
  }
}

// Global instance
window.edithS24Tools = new EdithS24Tools();
