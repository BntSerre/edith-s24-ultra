/**
 * E.D.I.T.H. Tactical AI - S24 Ultra Edition Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------------------------------------
  // DOM Elements
  // ----------------------------------------------------
  const tabButtons = document.querySelectorAll('.nav-tab-item');
  const tabPanes = document.querySelectorAll('.hud-tab-pane');
  const reactorWrapper = document.getElementById('reactorWrapper');
  const edithStatusText = document.getElementById('edithStatusText');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const dialogueStream = document.getElementById('dialogueStream');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const voiceMainBtn = document.getElementById('voiceMainBtn');
  const quickChips = document.querySelectorAll('.quick-chip');
  const headerTime = document.getElementById('headerTime');
  const headerBattery = document.getElementById('headerBattery');

  // Vision Elements
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const arScanBtn = document.getElementById('arScanBtn');
  const switchCamBtn = document.getElementById('switchCamBtn');
  const torchBtn = document.getElementById('torchBtn');
  const arResultsModal = document.getElementById('arResultsModal');
  const arResultsText = document.getElementById('arResultsText');
  const closeArResults = document.getElementById('closeArResults');

  // Tools Elements (Redesigned S24 Ultra Edition)
  const telemBattery = document.getElementById('telemBattery');
  const telemScreen = document.getElementById('telemScreen');
  const telemCoords = document.getElementById('telemCoords');
  const spenStatusText = document.getElementById('spenStatusText');
  const spenCanvas = document.getElementById('spenCanvas');
  const clearCanvasBtn = document.getElementById('clearCanvasBtn');
  const saveCanvasBtn = document.getElementById('saveCanvasBtn');
  const colorBtns = document.querySelectorAll('.color-dot-btn');
  const notesContainer = document.getElementById('notesContainer');
  const notesCountBadge = document.getElementById('notesCountBadge');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const noteCategorySelect = document.getElementById('noteCategorySelect');
  const noteInput = document.getElementById('noteInput');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerPresetBtns = document.querySelectorAll('.timer-preset-btn');
  const stopTimerBtn = document.getElementById('stopTimerBtn');
  const sosBtn = document.getElementById('sosBtn');
  const copyCoordsBtn = document.getElementById('copyCoordsBtn');

  // Settings Elements
  const providerSelect = document.getElementById('providerSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  const userCallsignInput = document.getElementById('userCallsignInput');
  const voiceSelect = document.getElementById('voiceSelect');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const installAppBtn = document.getElementById('installAppBtn');

  // ----------------------------------------------------
  // Haptic Vibrations (Android Vibration API)
  // ----------------------------------------------------
  function triggerHaptic(type = 'light') {
    if (navigator.vibrate) {
      try {
        if (type === 'light') navigator.vibrate(12);
        else if (type === 'medium') navigator.vibrate(25);
        else if (type === 'heavy') navigator.vibrate([30, 40, 30]);
      } catch (e) {}
    }
  }

  // ----------------------------------------------------
  // Android PWA 1-Click Installation
  // ----------------------------------------------------
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installAppBtn) installAppBtn.style.display = 'block';
  });

  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      triggerHaptic('medium');
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[EDITH S24 PWA] Installé avec succès !');
        }
        deferredInstallPrompt = null;
      } else {
        alert("Pour installer sur votre Galaxy S24 Ultra :\nAppuyez sur le menu (les 3 points en haut à droite) puis sur « Installer l'application ».");
      }
    });
  }

  // ----------------------------------------------------
  // Audio Visualizer Waveform Canvas (QHD+ Sharp Scaling)
  // ----------------------------------------------------
  const waveCtx = waveformCanvas ? waveformCanvas.getContext('2d') : null;
  let wavePhase = 0;

  function renderWaveform() {
    if (!waveCtx || !waveformCanvas) return;
    const dpr = window.devicePixelRatio || 2;
    const width = waveformCanvas.width = waveformCanvas.offsetWidth * dpr;
    const height = waveformCanvas.height = waveformCanvas.offsetHeight * dpr;
    waveCtx.clearRect(0, 0, width, height);

    const isSpeaking = window.edithAudio && window.edithAudio.isSpeaking;
    const isListening = window.edithSpeech && window.edithSpeech.isListening;

    const numPoints = 30;
    const step = width / (numPoints - 1);
    const centerY = height / 2;

    waveCtx.beginPath();
    waveCtx.lineWidth = 2 * dpr;

    if (isListening) {
      waveCtx.strokeStyle = '#ff7700';
      waveCtx.shadowColor = 'rgba(255, 119, 0, 0.8)';
      waveCtx.shadowBlur = 8;
    } else if (isSpeaking) {
      waveCtx.strokeStyle = '#00f0ff';
      waveCtx.shadowColor = 'rgba(0, 240, 255, 0.8)';
      waveCtx.shadowBlur = 8;
    } else {
      waveCtx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      waveCtx.shadowBlur = 0;
    }

    for (let i = 0; i < numPoints; i++) {
      const x = i * step;
      let amplitude = 2;

      if (isListening) {
        amplitude = Math.sin(i * 0.4 + wavePhase) * (height * 0.35);
      } else if (isSpeaking) {
        amplitude = Math.sin(i * 0.5 + wavePhase * 1.5) * (height * 0.4) * Math.sin(i / numPoints * Math.PI);
      } else {
        amplitude = Math.sin(i * 0.2 + wavePhase * 0.5) * 3;
      }

      const y = centerY + amplitude;
      if (i === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
    }
    waveCtx.stroke();

    wavePhase += 0.08;
    requestAnimationFrame(renderWaveform);
  }
  renderWaveform();

  // ----------------------------------------------------
  // Tactical Header Clock & Battery
  // ----------------------------------------------------
  function updateHeaderTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour12: false });
    if (headerTime) headerTime.textContent = `T+${timeStr}`;
  }
  setInterval(updateHeaderTime, 1000);
  updateHeaderTime();

  async function updateHeaderBattery() {
    if (navigator.getBattery) {
      try {
        const b = await navigator.getBattery();
        const pct = Math.round(b.level * 100);
        if (headerBattery) headerBattery.textContent = `${pct}% ${b.charging ? '⚡' : ''}`;
        if (telemBattery) telemBattery.textContent = `${pct}% ${b.charging ? '(Charge 45W)' : ''}`;
      } catch (e) {}
    }
  }
  updateHeaderBattery();

  // ----------------------------------------------------
  // Navigation Tabs Switching
  // ----------------------------------------------------
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      const targetTab = btn.dataset.tab;
      window.edithAudio.playBeep(1000, 0.04);

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');

      if (targetTab === 'tabVision') {
        window.edithVision.startCamera();
      } else {
        window.edithVision.stopCamera();
      }

      if (targetTab === 'tabTools') {
        refreshToolsView();
        initSpenCanvas();
      }
    });
  });

  // ----------------------------------------------------
  // Reactor States
  // ----------------------------------------------------
  function setReactorState(state, statusText = '') {
    if (!reactorWrapper) return;
    reactorWrapper.classList.remove('listening', 'speaking', 'processing');

    if (state === 'listening') {
      reactorWrapper.classList.add('listening');
      if (voiceMainBtn) voiceMainBtn.classList.add('listening');
      if (edithStatusText) edithStatusText.textContent = statusText || 'ÉCOUTE VOCALE EN COURS...';
    } else if (state === 'speaking') {
      reactorWrapper.classList.add('speaking');
      if (voiceMainBtn) voiceMainBtn.classList.remove('listening');
      if (edithStatusText) edithStatusText.textContent = statusText || 'E.D.I.T.H. RÉPOND...';
    } else if (state === 'processing') {
      reactorWrapper.classList.add('processing');
      if (voiceMainBtn) voiceMainBtn.classList.remove('listening');
      if (edithStatusText) edithStatusText.textContent = statusText || 'ANALYSE EN COURS...';
    } else {
      if (voiceMainBtn) voiceMainBtn.classList.remove('listening');
      if (edithStatusText) edithStatusText.textContent = statusText || 'SYSTÈME NOMINAL // S24 ULTRA PRÊT';
    }
  }

  // ----------------------------------------------------
  // Dialogue & Chat System
  // ----------------------------------------------------
  function appendMessage(sender, text) {
    if (!dialogueStream) return;

    const msg = document.createElement('div');
    msg.className = `message-bubble ${sender}`;

    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const isEdith = sender === 'edith';

    msg.innerHTML = `
      <div class="msg-header">
        <span class="${isEdith ? 'msg-author-edith' : 'msg-author-user'}">
          ${isEdith ? '⚡ E.D.I.T.H. // S24U TACTICAL' : '👤 ' + (window.edithAI.userName || 'COMMANDANT')}
        </span>
        <span class="msg-timestamp">${now}</span>
      </div>
      <div class="msg-body">${formatMessageText(text)}</div>
      ${isEdith ? `
        <div class="msg-actions">
          <button class="msg-act-btn replay-speech-btn">🔊 Réécouter</button>
          <button class="msg-act-btn copy-msg-btn">📋 Copier</button>
        </div>
      ` : ''}
    `;

    if (isEdith) {
      msg.querySelector('.replay-speech-btn').addEventListener('click', () => {
        triggerHaptic('light');
        setReactorState('speaking');
        window.edithAudio.speak(text, null, () => setReactorState('idle'));
      });

      const copyBtn = msg.querySelector('.copy-msg-btn');
      copyBtn.addEventListener('click', () => {
        triggerHaptic('light');
        navigator.clipboard.writeText(text);
        copyBtn.textContent = '✓ Copié !';
        setTimeout(() => copyBtn.textContent = '📋 Copier', 2000);
      });
    }

    dialogueStream.appendChild(msg);
    dialogueStream.scrollTop = dialogueStream.scrollHeight;
  }

  function formatMessageText(text) {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,240,255,0.1);padding:2px 4px;border-radius:3px;">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  async function handleUserSubmit(userInputText) {
    const text = (userInputText || messageInput.value || '').trim();
    if (!text) return;

    if (messageInput) messageInput.value = '';
    appendMessage('user', text);
    setReactorState('processing', 'ANALYSE DU PROTOCOLE...');

    try {
      const reply = await window.edithAI.ask(text);
      appendMessage('edith', reply);
      if (window.edithAudio.autoSpeak) {
        setReactorState('speaking', 'SYNTHÈSE VOCALE...');
        window.edithAudio.speak(reply, 
          () => setReactorState('speaking'),
          () => setReactorState('idle')
        );
      } else {
        setReactorState('idle');
      }
    } catch (err) {
      appendMessage('edith', `Erreur système : ${err.message}`);
      setReactorState('idle');
      window.edithAudio.playWarning();
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      triggerHaptic('light');
      handleUserSubmit();
    });
  }

  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        triggerHaptic('light');
        handleUserSubmit();
      }
    });
  }

  // ----------------------------------------------------
  // Voice Input (Speech Recognition)
  // ----------------------------------------------------
  if (voiceMainBtn) {
    voiceMainBtn.addEventListener('click', () => {
      triggerHaptic('medium');
      window.edithAudio.ensureAudioResumed();
      window.edithSpeech.toggle();
    });
  }

  if (reactorWrapper) {
    reactorWrapper.addEventListener('click', () => {
      triggerHaptic('medium');
      window.edithAudio.ensureAudioResumed();
      if (window.edithAudio.isSpeaking) {
        window.edithAudio.stopSpeaking();
        setReactorState('idle');
        return;
      }
      window.edithSpeech.toggle();
    });
  }

  window.edithSpeech.onStartCallback = () => {
    setReactorState('listening', 'ÉCOUTE ACTIVE...');
  };

  window.edithSpeech.onResultCallback = (finalText, interimText) => {
    if (messageInput) messageInput.value = finalText || interimText;
    if (finalText) handleUserSubmit(finalText);
  };

  window.edithSpeech.onEndCallback = () => {
    if (!window.edithAudio.isSpeaking && reactorWrapper.classList.contains('listening')) {
      setReactorState('idle');
    }
  };

  // Quick Chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      triggerHaptic('light');
      const prompt = chip.dataset.prompt;
      if (prompt) {
        window.edithAudio.playBeep(700, 0.05);
        handleUserSubmit(prompt);
      }
    });
  });

  // ----------------------------------------------------
  // AR Vision Scanner Controls
  // ----------------------------------------------------
  window.edithVision.init(cameraVideo, cameraCanvas);

  if (arScanBtn) {
    arScanBtn.addEventListener('click', async () => {
      triggerHaptic('heavy');
      try {
        arScanBtn.disabled = true;
        arScanBtn.innerHTML = '⚡ ANALYSE S24U EN COURS...';
        
        const result = await window.edithVision.scanAndAnalyze();
        
        if (arResultsText) arResultsText.innerHTML = formatMessageText(result);
        if (arResultsModal) arResultsModal.classList.add('show');

        window.edithAudio.speak(result);
      } catch (err) {
        alert("Erreur de scan : " + err.message);
      } finally {
        arScanBtn.disabled = false;
        arScanBtn.innerHTML = '⚡ SCANNER LA CIBLE';
      }
    });
  }

  if (closeArResults) {
    closeArResults.addEventListener('click', () => {
      triggerHaptic('light');
      arResultsModal.classList.remove('show');
      window.edithAudio.stopSpeaking();
    });
  }

  if (switchCamBtn) {
    switchCamBtn.addEventListener('click', () => {
      triggerHaptic('light');
      window.edithVision.toggleCamera();
    });
  }

  if (torchBtn) {
    torchBtn.addEventListener('click', async () => {
      triggerHaptic('light');
      const state = await window.edithVision.toggleTorch();
      torchBtn.style.color = state ? 'var(--vision-orange-bright)' : 'var(--jarvis-blue)';
    });
  }

  // ----------------------------------------------------
  // S Pen Tactical Pad (Drawing Canvas)
  // ----------------------------------------------------
  let isDrawing = false;
  let currentColor = '#00f0ff';
  let spenCtx = null;

  function initSpenCanvas() {
    if (!spenCanvas) return;
    spenCtx = spenCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 2;
    spenCanvas.width = spenCanvas.offsetWidth * dpr;
    spenCanvas.height = spenCanvas.offsetHeight * dpr;
    spenCtx.scale(dpr, dpr);
    spenCtx.lineCap = 'round';
    spenCtx.lineJoin = 'round';
  }

  if (spenCanvas) {
    const startDraw = (e) => {
      isDrawing = true;
      const rect = spenCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Detect S Pen stylus vs finger
      if (e.pointerType === 'pen') {
        if (spenStatusText) spenStatusText.textContent = 'S PEN // DESSIN EN COURS (PRESSION ACTIVE)';
      }

      spenCtx.beginPath();
      spenCtx.moveTo(x, y);
      const pressure = e.pressure || 0.5;
      spenCtx.lineWidth = Math.max(1.5, pressure * 6);
      spenCtx.strokeStyle = currentColor;
    };

    const drawMove = (e) => {
      if (!isDrawing) return;
      const rect = spenCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pressure = e.pressure || 0.5;
      spenCtx.lineWidth = Math.max(1.5, pressure * 6);
      spenCtx.lineTo(x, y);
      spenCtx.stroke();
    };

    const stopDraw = () => {
      isDrawing = false;
    };

    spenCanvas.addEventListener('pointerdown', startDraw);
    spenCanvas.addEventListener('pointermove', drawMove);
    spenCanvas.addEventListener('pointerup', stopDraw);
    spenCanvas.addEventListener('pointercancel', stopDraw);
  }

  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });

  if (clearCanvasBtn && spenCanvas) {
    clearCanvasBtn.addEventListener('click', () => {
      triggerHaptic('light');
      if (spenCtx) {
        spenCtx.clearRect(0, 0, spenCanvas.width, spenCanvas.height);
      }
    });
  }

  if (saveCanvasBtn && spenCanvas) {
    saveCanvasBtn.addEventListener('click', async () => {
      triggerHaptic('medium');
      const dataUrl = spenCanvas.toDataURL('image/jpeg', 0.85);
      
      // Switch to main chat tab and analyze sketch
      tabButtons[0].click();
      appendMessage('user', '[Schéma S Pen transmis pour analyse tactique]');
      setReactorState('processing', 'ANALYSE DU SCHÉMA S PEN...');

      try {
        const reply = await window.edithAI.ask(
          "Analyse ce schéma ou croquis manuscrit dessiné au stylet S Pen sur le terminal S24 Ultra. Identifie ce qu'il représente et donne ton avis tactique ou tes recommandations.",
          dataUrl
        );
        appendMessage('edith', reply);
        setReactorState('speaking', 'SYNTHÈSE VOCALE...');
        window.edithAudio.speak(reply);
      } catch (err) {
        appendMessage('edith', `Erreur d'analyse du schéma : ${err.message}`);
        setReactorState('idle');
      }
    });
  }

  // ----------------------------------------------------
  // Redesigned Mission Notes & Filters
  // ----------------------------------------------------
  let activeFilter = 'all';

  function renderNotes() {
    if (!notesContainer) return;
    const notes = window.edithS24Tools.getNotes(activeFilter);
    const totalCount = window.edithS24Tools.getNotes('all').length;
    
    if (notesCountBadge) notesCountBadge.textContent = `${totalCount} NOTE${totalCount > 1 ? 'S' : ''}`;
    notesContainer.innerHTML = '';

    if (notes.length === 0) {
      notesContainer.innerHTML = `<div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);padding:10px 0;text-align:center;">Aucune consigne dans cette catégorie.</div>`;
      return;
    }

    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = `clean-note-card ${note.category}`;
      card.innerHTML = `
        <div class="note-card-top">
          <span class="note-tag">${note.category.toUpperCase()}</span>
          <span style="color:var(--text-muted);">${note.date}</span>
        </div>
        <div class="note-card-text">${note.text}</div>
        <div class="note-card-actions">
          <button class="note-action-btn read-btn">🔊 Écouter</button>
          <button class="note-action-btn del-btn" style="color:var(--danger-red);">✕ Supprimer</button>
        </div>
      `;

      card.querySelector('.read-btn').addEventListener('click', () => {
        triggerHaptic('light');
        window.edithAudio.speak(note.text);
      });

      card.querySelector('.del-btn').addEventListener('click', () => {
        triggerHaptic('light');
        window.edithS24Tools.deleteNote(note.id);
        renderNotes();
      });

      notesContainer.appendChild(card);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderNotes();
    });
  });

  if (addNoteBtn && noteInput) {
    addNoteBtn.addEventListener('click', () => {
      triggerHaptic('light');
      const text = noteInput.value.trim();
      const cat = noteCategorySelect ? noteCategorySelect.value : 'mission';
      if (text) {
        window.edithS24Tools.addNote(text, cat);
        noteInput.value = '';
        renderNotes();
      }
    });

    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addNoteBtn.click();
    });
  }

  // ----------------------------------------------------
  // Timer & Telemetry Controls
  // ----------------------------------------------------
  timerPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      const secs = parseInt(btn.dataset.seconds, 10);
      window.edithS24Tools.startTimer(
        secs,
        (formatted) => { if (timerDisplay) timerDisplay.textContent = formatted; },
        () => { if (timerDisplay) timerDisplay.textContent = '00:00'; }
      );
    });
  });

  if (stopTimerBtn) {
    stopTimerBtn.addEventListener('click', () => {
      triggerHaptic('light');
      window.edithS24Tools.stopTimer();
      if (timerDisplay) timerDisplay.textContent = '00:00';
    });
  }

  if (sosBtn) {
    sosBtn.addEventListener('click', () => {
      triggerHaptic('heavy');
      const active = window.edithS24Tools.toggleSOS((state) => {
        document.body.style.backgroundColor = state ? '#ef4444' : 'var(--bg-dark)';
      });
      sosBtn.textContent = active ? 'ARRÊTER BALISE SOS' : 'DÉCLENCHER BALISE SOS';
      sosBtn.classList.toggle('orange', active);
      if (!active) document.body.style.backgroundColor = 'var(--bg-dark)';
    });
  }

  if (copyCoordsBtn) {
    copyCoordsBtn.addEventListener('click', async () => {
      triggerHaptic('light');
      const coords = await window.edithS24Tools.getTacticalCoordinates();
      const text = `[COORDONNÉES TACTIQUES E.D.I.T.H. S24U]\nLatitude: ${coords.lat}\nLongitude: ${coords.lon}\nAltitude: ${coords.alt}`;
      navigator.clipboard.writeText(text);
      copyCoordsBtn.textContent = '✓ Coordonnées Copiées !';
      setTimeout(() => copyCoordsBtn.textContent = '📋 Copier GPS', 2000);
    });
  }

  async function refreshToolsView() {
    renderNotes();
    const telem = await window.edithS24Tools.getDeviceTelemetry();
    if (telemCoords) {
      telemCoords.textContent = 'Acquisition GPS...';
      const coords = await window.edithS24Tools.getTacticalCoordinates();
      telemCoords.textContent = `${coords.lat}, ${coords.lon}`;
    }
  }

  // ----------------------------------------------------
  // Settings Logic
  // ----------------------------------------------------
  function updateSettingsStatus() {
    const statusText = document.getElementById('settingsStatusText');
    const apiKeyHint = document.getElementById('apiKeyHint');
    const aiBadge = document.getElementById('aiLinkBadge');
    const keyVal = (apiKeyInput ? apiKeyInput.value : '').trim();
    const providerVal = providerSelect ? providerSelect.value : 'gemini';

    if (keyVal.length > 5) {
      if (statusText) statusText.textContent = `LIAISON ${providerVal.toUpperCase()} ACTIVE`;
      if (apiKeyHint) {
        apiKeyHint.textContent = '✓ Clé enregistrée';
        apiKeyHint.style.color = 'var(--jarvis-blue)';
      }
      if (aiBadge) {
        aiBadge.textContent = 'SATELLITE ACTIF';
        aiBadge.style.color = 'var(--jarvis-blue)';
      }
    } else if (providerVal === 'offline') {
      if (statusText) statusText.textContent = 'MODE AUTONOME S24U';
      if (apiKeyHint) {
        apiKeyHint.textContent = 'Sans clé nécessaire';
        apiKeyHint.style.color = 'var(--text-muted)';
      }
      if (aiBadge) {
        aiBadge.textContent = 'LOCAL';
        aiBadge.style.color = 'var(--vision-orange-bright)';
      }
    } else {
      if (statusText) statusText.textContent = 'MODE LOCAL (HORS LIAISON)';
      if (apiKeyHint) {
        apiKeyHint.textContent = 'Clé requise pour satellite';
        apiKeyHint.style.color = 'var(--vision-orange)';
      }
      if (aiBadge) {
        aiBadge.textContent = 'ATTENTE CLÉ';
        aiBadge.style.color = 'var(--vision-orange-bright)';
      }
    }
  }

  function syncModelSelectOptions(provider, selectedModel) {
    if (!modelSelect) return;
    modelSelect.innerHTML = '';

    const modelsByProvider = {
      gemini: [
        { value: 'auto', label: '⚡ Auto-Détection Intelligente (Recommandé)' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Rapide & Multimodal)' },
        { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Dernière version)' },
        { value: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash 002' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Raisonnement Complexe)' }
      ],
      groq: [
        { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Recommandé Groq)' },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Ultra Rapide)' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Fenêtre 32k)' }
      ],
      openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommandé OpenAI)' },
        { value: 'gpt-4o', label: 'GPT-4o (Complet)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ],
      offline: [
        { value: 'offline-edith', label: 'Moteur E.D.I.T.H. Local (Sans Clé / Hors-Ligne)' }
      ]
    };

    const list = modelsByProvider[provider] || modelsByProvider.gemini;
    list.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      if (m.value === selectedModel) opt.selected = true;
      modelSelect.appendChild(opt);
    });

    if (modelSelect.selectedIndex === -1 && modelSelect.options.length > 0) {
      modelSelect.selectedIndex = 0;
    }
  }

  function initSettingsUI() {
    if (providerSelect) {
      providerSelect.value = window.edithAI.provider;
      syncModelSelectOptions(providerSelect.value, window.edithAI.customModel);
      providerSelect.addEventListener('change', () => {
        syncModelSelectOptions(providerSelect.value);
        updateSettingsStatus();
      });
    }

    if (apiKeyInput) {
      apiKeyInput.value = window.edithAI.apiKey;
      apiKeyInput.addEventListener('input', updateSettingsStatus);
    }

    if (userCallsignInput) {
      userCallsignInput.value = window.edithAI.userName;
    }

    // Interactive Functions Toggles
    const featureAutoSpeak = document.getElementById('featureAutoSpeak');
    const featureSoundFx = document.getElementById('featureSoundFx');
    const featureTacticalPacing = document.getElementById('featureTacticalPacing');

    if (featureAutoSpeak) {
      featureAutoSpeak.checked = window.edithAudio.autoSpeak;
      featureAutoSpeak.addEventListener('change', () => {
        triggerHaptic('light');
        window.edithAudio.autoSpeak = featureAutoSpeak.checked;
      });
    }

    if (featureSoundFx) {
      featureSoundFx.checked = window.edithAudio.soundEnabled;
      featureSoundFx.addEventListener('change', () => {
        triggerHaptic('light');
        window.edithAudio.soundEnabled = featureSoundFx.checked;
      });
    }

    if (featureTacticalPacing) {
      featureTacticalPacing.checked = window.edithAI.tacticalPacing;
      featureTacticalPacing.addEventListener('change', () => {
        triggerHaptic('light');
        window.edithAI.tacticalPacing = featureTacticalPacing.checked;
      });
    }

    // Sliders
    const voiceRateSlider = document.getElementById('voiceRateSlider');
    const voiceRateVal = document.getElementById('voiceRateVal');
    const voicePitchSlider = document.getElementById('voicePitchSlider');
    const voicePitchVal = document.getElementById('voicePitchVal');

    if (voiceRateSlider && voiceRateVal) {
      voiceRateSlider.value = window.edithAudio.voiceRate;
      voiceRateVal.textContent = Number(window.edithAudio.voiceRate).toFixed(2) + 'x';
      voiceRateSlider.addEventListener('input', () => {
        voiceRateVal.textContent = Number(voiceRateSlider.value).toFixed(2) + 'x';
        window.edithAudio.voiceRate = parseFloat(voiceRateSlider.value);
      });
    }

    if (voicePitchSlider && voicePitchVal) {
      voicePitchSlider.value = window.edithAudio.voicePitch;
      voicePitchVal.textContent = Number(window.edithAudio.voicePitch).toFixed(2);
      voicePitchSlider.addEventListener('input', () => {
        voicePitchVal.textContent = Number(voicePitchSlider.value).toFixed(2);
        window.edithAudio.voicePitch = parseFloat(voicePitchSlider.value);
      });
    }

    // Custom Directives Prompt
    const customPromptInput = document.getElementById('customPromptInput');
    const resetPromptBtn = document.getElementById('resetPromptBtn');
    if (customPromptInput) {
      customPromptInput.value = window.edithAI.customPrompt;
    }
    if (resetPromptBtn && customPromptInput) {
      resetPromptBtn.addEventListener('click', () => {
        triggerHaptic('medium');
        customPromptInput.value = '';
        window.edithAudio.playBeep(440, 0.05);
      });
    }

    updateSettingsStatus();

    // Visibility toggle for API Key
    const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
    if (toggleApiKeyVisibility && apiKeyInput) {
      toggleApiKeyVisibility.addEventListener('click', () => {
        triggerHaptic('light');
        if (apiKeyInput.type === 'password') {
          apiKeyInput.type = 'text';
          toggleApiKeyVisibility.textContent = '🔒';
        } else {
          apiKeyInput.type = 'password';
          toggleApiKeyVisibility.textContent = '👁️';
        }
      });
    }

    // Callsign quick chips
    document.querySelectorAll('.callsign-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic('light');
        const sign = chip.getAttribute('data-callsign');
        if (userCallsignInput && sign) {
          userCallsignInput.value = sign;
          window.edithAudio.playBeep(880, 0.05);
        }
      });
    });

    const populateVoices = () => {
      if (!voiceSelect) return;
      voiceSelect.innerHTML = '';
      const availableVoices = window.edithAudio.getAvailableVoices();
      availableVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        if (window.edithAudio.preferredVoice && window.edithAudio.preferredVoice.voiceURI === v.voiceURI) {
          opt.selected = true;
        }
        voiceSelect.appendChild(opt);
      });
    };

    populateVoices();
    setTimeout(populateVoices, 1000);
    window.onEdithVoicesLoaded = populateVoices;
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      triggerHaptic('medium');
      window.edithAI.setCredentials(
        providerSelect.value,
        apiKeyInput.value,
        modelSelect.value,
        userCallsignInput.value
      );

      const customPromptInput = document.getElementById('customPromptInput');
      const featureTacticalPacing = document.getElementById('featureTacticalPacing');
      if (customPromptInput) {
        window.edithAI.setCustomDirectives(
          customPromptInput.value,
          featureTacticalPacing ? featureTacticalPacing.checked : false
        );
      }

      const voiceRateSlider = document.getElementById('voiceRateSlider');
      const voicePitchSlider = document.getElementById('voicePitchSlider');
      const featureSoundFx = document.getElementById('featureSoundFx');
      const featureAutoSpeak = document.getElementById('featureAutoSpeak');

      window.edithAudio.setAudioParams(
        voiceRateSlider ? voiceRateSlider.value : 1.05,
        voicePitchSlider ? voicePitchSlider.value : 1.0,
        featureSoundFx ? featureSoundFx.checked : true,
        featureAutoSpeak ? featureAutoSpeak.checked : true
      );

      if (voiceSelect) {
        window.edithAudio.setVoice(voiceSelect.value);
      }

      updateSettingsStatus();
      window.edithAudio.playSuccess();
      alert("✓ TOUS LES PROTOCOLES & FONCTIONS E.D.I.T.H. ONT ÉTÉ ENREGISTRÉS AVEC SUCCÈS SUR S24 ULTRA !");
    });
  }

  const testApiBtn = document.getElementById('testApiBtn');
  if (testApiBtn) {
    testApiBtn.addEventListener('click', async () => {
      triggerHaptic('medium');
      window.edithAI.setCredentials(
        providerSelect.value,
        apiKeyInput.value,
        modelSelect.value,
        userCallsignInput.value
      );

      testApiBtn.disabled = true;
      testApiBtn.textContent = '⚡ TEST EN COURS...';
      try {
        const testRes = await window.edithAI.testConnection();
        if (testRes.success) {
          window.edithAudio.playSuccess();
          alert(`✓ SUCCÈS LIAISON SATELLITE !\n\nModèle actif : ${testRes.model}\nRéponse EDITH : "${testRes.text}"`);
        } else {
          window.edithAudio.playWarning();
          alert(`✕ ERREUR DE LIAISON :\n${testRes.message}`);
        }
      } catch (err) {
        window.edithAudio.playWarning();
        alert(`✕ ERREUR :\n${err.message}`);
      } finally {
        testApiBtn.disabled = false;
        testApiBtn.textContent = '⚡ TESTER LIAISON IA';
      }
    });
  }

  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      triggerHaptic('light');
      if (voiceSelect) window.edithAudio.setVoice(voiceSelect.value);
      window.edithAudio.speak(`Système tactique opérationnel sur Samsung Galaxy S24 Ultra. Bonjour, ${window.edithAI.userName}.`);
    });
  }

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      if (confirm("Réinitialiser le journal de conversation ?")) {
        triggerHaptic('medium');
        window.edithAI.clearHistory();
        if (dialogueStream) dialogueStream.innerHTML = '';
        appendMessage('edith', `Journal réinitialisé. Systèmes S24 Ultra nominaux, ${window.edithAI.userName}.`);
      }
    });
  }

  // ----------------------------------------------------
  // Boot Sequence
  // ----------------------------------------------------
  initSettingsUI();
  renderNotes();

  setTimeout(() => {
    window.edithAudio.playBootSound();
    appendMessage(
      'edith',
      `Bonjour, ${window.edithAI.userName}. Je suis **E.D.I.T.H.** (Édition Galaxy S24 Ultra).\n\n` +
      `Tous vos systèmes sont calibrés pour votre terminal :\n` +
      `• **Châssis Titane & Écran Dynamic AMOLED 2X** (QHD+ 120Hz).\n` +
      `• **Prise en charge du stylet S Pen** avec bloc-notes tactique intégré.\n` +
      `• **Onglet Protocoles enrichi et épuré** (télémétrie, mémos catégorisés, boussole azimutale).\n\n` +
      `Appuyez sur le **Réacteur ARC central** ou sur le micro pour me parler !`
    );
  }, 400);

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[EDITH S24 SW] Enregistré :', reg.scope))
        .catch(err => console.warn('[EDITH S24 SW] Erreur :', err));
    });
  }
});
