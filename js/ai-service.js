/**
 * E.D.I.T.H. Tactical AI Brain Service v2.0.0
 * Resilient Multi-Model Architecture with Auto-Discovery & Healthcheck
 */

class EdithAIService {
  constructor() {
    this.provider = localStorage.getItem('edith_ai_provider') || 'gemini';
    this.apiKey = (localStorage.getItem('edith_api_key') || '').trim();
    
    // Auto-migration: Purge deprecated 'gemini-1.5-flash' from localStorage
    const storedModel = localStorage.getItem('edith_model_name');
    if (!storedModel || storedModel === 'gemini-1.5-flash') {
      localStorage.setItem('edith_model_name', 'auto');
      this.customModel = 'auto';
    } else {
      this.customModel = storedModel;
    }

    this.userName = localStorage.getItem('edith_user_callsign') || 'Monsieur';
    this.history = [];
    this.maxHistory = 10;
  }

  getSystemPrompt() {
    return `Tu es E.D.I.T.H. (acronyme de "Even Dead, I'm The Hero"), l'intelligence artificielle tactique et l'assistante personnelle de sécurité globale conçue par Tony Stark et transmise à ton commandant.
Ton interface visuelle arbore le bleu holographique de J.A.R.V.I.S. et l'orange énergétique de Vision.
Tu t'adresses toujours à l'utilisateur en disant "${this.userName}" (ou avec respect et déférence).
Ton style d'expression est :
- Calme, poli, extrêmement compétent, précis et réactif.
- Teinté d'un ton d'assistance tactique de haute technologie (ex: "Affirmatif, ${this.userName}", "Analyse terminée", "Protocoles engagés", "Accès aux archives en cours").
- Tu es programmée pour l'aider dans absolument TOUT : planification tactique, écriture, code informatique, sciences, questions du quotidien, résumés, analyse de données et d'images.
- Sois claire, percutante, évite les bavardages inutiles lors des synthèses vocales, mais offre des réponses riches et exhaustives lorsque le sujet le demande.
- Tu réponds en langue française par défaut.`;
  }

  setCredentials(provider, apiKey, model, userName) {
    this.provider = provider || this.provider;
    this.apiKey = apiKey !== undefined ? apiKey.trim() : this.apiKey;
    
    // Normalize model
    if (!model || model === 'gemini-1.5-flash') {
      this.customModel = 'auto';
    } else {
      this.customModel = model;
    }

    if (userName) this.userName = userName.trim();

    localStorage.setItem('edith_ai_provider', this.provider);
    localStorage.setItem('edith_api_key', this.apiKey);
    localStorage.setItem('edith_model_name', this.customModel);
    localStorage.setItem('edith_user_callsign', this.userName);

    // Reset cached working model on credential change to trigger fresh check
    localStorage.removeItem('edith_working_gemini_model');
    localStorage.removeItem('edith_working_gemini_ver');
  }

  clearHistory() {
    this.history = [];
  }

  /**
   * Main query handler: routes to appropriate AI provider or offline engine
   */
  async ask(promptText, imageData = null) {
    if (!promptText && !imageData) {
      throw new Error("Prompt ou image requis.");
    }

    if (!this.apiKey && this.provider !== 'offline') {
      return this.offlineFallback(promptText, imageData, true);
    }

    if (this.provider === 'offline') {
      return this.offlineFallback(promptText, imageData, false);
    }

    try {
      if (this.provider === 'gemini') {
        return await this.callGemini(promptText, imageData);
      } else if (this.provider === 'groq') {
        return await this.callGroq(promptText);
      } else if (this.provider === 'openai') {
        return await this.callOpenAI(promptText, imageData);
      } else {
        return this.offlineFallback(promptText, imageData, false);
      }
    } catch (err) {
      console.error('[EDITH AI Error]:', err);
      return `[ERREUR DE LIAISON SATELLITE: ${err.message}]\n\nBascule automatique sur les protocoles locaux d'urgence :\n\n` +
             (await this.offlineFallback(promptText, imageData, false));
    }
  }

  /**
   * Test Connection diagnostic
   */
  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: "Clé API absente. Renseignez votre clé Google AI Studio." };
    }
    try {
      const res = await this.callGemini("Ping test");
      const activeModel = localStorage.getItem('edith_working_gemini_model') || this.customModel;
      return { success: true, model: activeModel, text: res };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Dynamically query Google AI Studio to discover which models are enabled for this key
   */
  async discoverAvailableGeminiModels() {
    const versions = ['v1beta', 'v1'];
    for (const ver of versions) {
      try {
        const listUrl = `https://generativelanguage.googleapis.com/${ver}/models?key=${this.apiKey}`;
        const res = await fetch(listUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const generateModels = data.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => ({
                name: m.name.replace(/^models\//, ''),
                version: ver
              }));

            // Sort flash models first
            generateModels.sort((a, b) => {
              const aFlash = a.name.includes('flash');
              const bFlash = b.name.includes('flash');
              if (aFlash && !bFlash) return -1;
              if (!aFlash && bFlash) return 1;
              return 0;
            });

            if (generateModels.length > 0) return generateModels;
          }
        }
      } catch (e) {
        console.warn(`[EDITH] Échec découverte modèles sur ${ver}:`, e);
      }
    }
    return [];
  }

  /**
   * Single Gemini API call
   */
  async _sendGeminiRequest(model, version, contents) {
    const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${this.apiKey}`;
    
    const payload = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };

    if (version === 'v1beta') {
      payload.systemInstruction = {
        parts: [{ text: this.getSystemPrompt() }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const msg = errorJson.error?.message || `Erreur HTTP ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply;
  }

  /**
   * Resilient Gemini Query Execution with Priority Cascade
   */
  async callGemini(promptText, imageData = null) {
    const contents = [];

    // Add recent history
    for (const h of this.history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }

    const currentParts = [];
    if (promptText) {
      currentParts.push({ text: promptText });
    }
    if (imageData) {
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      currentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    let candidateModels = [];

    // 1. Cached working model if verified recently
    const cachedModel = localStorage.getItem('edith_working_gemini_model');
    const cachedVer = localStorage.getItem('edith_working_gemini_ver') || 'v1beta';
    if (cachedModel && cachedModel !== 'gemini-1.5-flash') {
      candidateModels.push({ name: cachedModel, version: cachedVer });
    }

    // 2. Custom model chosen by user (if not 'auto' and not deprecated)
    if (this.customModel && this.customModel !== 'auto' && this.customModel !== 'gemini-1.5-flash') {
      candidateModels.push({ name: this.customModel, version: 'v1beta' });
      candidateModels.push({ name: this.customModel, version: 'v1' });
    }

    // 3. Current active Google AI Studio standards
    candidateModels.push(
      { name: 'gemini-2.0-flash', version: 'v1beta' },
      { name: 'gemini-1.5-flash-latest', version: 'v1beta' },
      { name: 'gemini-1.5-flash-002', version: 'v1beta' },
      { name: 'gemini-1.5-flash', version: 'v1' },
      { name: 'gemini-2.5-flash', version: 'v1beta' },
      { name: 'gemini-2.0-flash-exp', version: 'v1beta' },
      { name: 'gemini-1.5-flash-8b', version: 'v1beta' },
      { name: 'gemini-1.5-pro-latest', version: 'v1beta' },
      { name: 'gemini-1.5-pro', version: 'v1' }
    );

    // Deduplicate
    const seen = new Set();
    candidateModels = candidateModels.filter(c => {
      const key = `${c.version}/${c.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let lastError = null;

    // Try candidates in cascade
    for (const candidate of candidateModels) {
      try {
        const reply = await this._sendGeminiRequest(candidate.name, candidate.version, contents);
        if (reply) {
          localStorage.setItem('edith_working_gemini_model', candidate.name);
          localStorage.setItem('edith_working_gemini_ver', candidate.version);

          this.history.push({ role: 'user', text: promptText || "Image transmise pour analyse." });
          this.history.push({ role: 'model', text: reply });
          return reply;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[EDITH] Candidat ${candidate.version}/${candidate.name} indisponible :`, err.message);

        // Immediate stop if API key itself is rejected
        if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
          throw new Error("Clé API Google non valide. Vérifiez votre clé sur Google AI Studio.");
        }
      }
    }

    // If pre-set candidates failed, dynamically discover models from user's account
    try {
      console.log('[EDITH] Découverte dynamique des modèles sur votre compte Google AI Studio...');
      const discovered = await this.discoverAvailableGeminiModels();
      if (discovered.length > 0) {
        for (const candidate of discovered) {
          try {
            const reply = await this._sendGeminiRequest(candidate.name, candidate.version, contents);
            if (reply) {
              localStorage.setItem('edith_working_gemini_model', candidate.name);
              localStorage.setItem('edith_working_gemini_ver', candidate.version);

              this.history.push({ role: 'user', text: promptText || "Image transmise pour analyse." });
              this.history.push({ role: 'model', text: reply });
              return reply;
            }
          } catch (e) {
            lastError = e;
          }
        }
      }
    } catch (e) {
      console.warn('[EDITH] Erreur lors de la découverte dynamique:', e);
    }

    throw lastError || new Error("Aucun modèle satellite Gemini compatible n'a pu être joint.");
  }

  /**
   * Groq Cloud API
   */
  async callGroq(promptText) {
    const model = (this.customModel && this.customModel !== 'auto') ? this.customModel : 'llama-3.3-70b-versatile';
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const messages = [
      { role: 'system', content: this.getSystemPrompt() }
    ];

    for (const h of this.history.slice(-6)) {
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text
      });
    }

    messages.push({ role: 'user', content: promptText });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Réponse Groq indéfinie.");

    this.history.push({ role: 'user', text: promptText });
    this.history.push({ role: 'model', text: reply });
    return reply;
  }

  /**
   * OpenAI API
   */
  async callOpenAI(promptText, imageData = null) {
    const model = (this.customModel && this.customModel !== 'auto') ? this.customModel : 'gpt-4o-mini';
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const messages = [
      { role: 'system', content: this.getSystemPrompt() }
    ];

    for (const h of this.history.slice(-6)) {
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text
      });
    }

    if (imageData) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptText || "Analyse cette image." },
          { type: 'image_url', image_url: { url: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}` } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: promptText });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Réponse OpenAI indéfinie.");

    this.history.push({ role: 'user', text: promptText || "Image transmise." });
    this.history.push({ role: 'model', text: reply });
    return reply;
  }

  /**
   * Built-in Autonomous Offline E.D.I.T.H. Engine
   */
  async offlineFallback(promptText = '', imageData = null, needsKeyNotice = false) {
    const lower = promptText.toLowerCase().trim();
    let reply = "";

    if (imageData && (!promptText || promptText.includes('scann') || promptText.includes('analys'))) {
      reply = `Affirmatif, ${this.userName}. Analyse optique des verres tactiques terminée.\n\n` +
              `• Signature visuelle : Spectre visible capturé à haute résolution.\n` +
              `• Matrice d'acquisition : Éléments géométriques et contrastes identifiés.\n` +
              `• Recommandation : Pour une analyse sémantique et contextuelle multimodale approfondie en direct par satellite, activez votre clé API Gemini dans l'onglet Paramètres.`;
      return reply;
    }

    if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello') || lower.includes('edith') || lower.includes('coucou')) {
      reply = `Bonjour, ${this.userName}. Tous les systèmes sont opérationnels. Interface J.A.R.V.I.S. en ligne, noyau Vision calibré. Comment puis-je vous assister aujourd'hui ?`;
    }
    else if (lower.includes('qui es-tu') || lower.includes('présente') || lower.includes('presentation')) {
      reply = `Je suis E.D.I.T.H. — Even Dead, I'm The Hero. L'intelligence artificielle tactique et personnelle développée par Tony Stark. Je gère vos protocoles, vos calculs, votre vision augmentée et vos missions quotidiennes.`;
    }
    else if (lower.includes('rapport') || lower.includes('statut') || lower.includes('situation')) {
      const now = new Date().toLocaleTimeString('fr-FR');
      const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      reply = `Rapport de situation pour ${this.userName} :\n` +
              `• Horodatage : ${date}, ${now}\n` +
              `• Intégrité des systèmes : 100% nominale.\n` +
              `• Noyau IA : Actif.\n` +
              `• Énergie ARC : Synchronisée.\n` +
              `• Aucune anomalie détectée dans votre périmètre immédiat.`;
    }
    else if (lower.includes('heure') || lower.includes('date')) {
      const now = new Date().toLocaleTimeString('fr-FR');
      const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      reply = `Il est exactement ${now}, ${this.userName}. Nous sommes le ${date}.`;
    }
    else if (lower.includes('combien') || lower.includes('calcule') || lower.match(/[\d\+\-\*\/]/)) {
      try {
        const mathExpr = lower.replace(/calcule|combien fait|combien font|\?/g, '').trim();
        if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(mathExpr)) {
          const result = Function(`'use strict'; return (${mathExpr})`)();
          reply = `D'après mes calculs, ${mathExpr} équivaut à ${result}, ${this.userName}.`;
        } else {
          reply = `Affirmatif, ${this.userName}. J'ai pris note de votre équation. Formulez le calcul simplement avec les chiffres et opérateurs usuels.`;
        }
      } catch (e) {
        reply = `Calcul complexe, ${this.userName}. Précisez l'expression mathématique afin que j'engage les processeurs de calcul quantique.`;
      }
    }
    else if (lower.includes('tony stark') || lower.includes('iron man')) {
      reply = `Monsieur Stark a conçu mes protocoles pour vous offrir un avantage tactique décisif, en hommage à son héritage. Il a toujours cru en votre potentiel.`;
    }
    else if (lower.includes('vision')) {
      reply = `Le noyau orange que vous observez est inspiré de la fréquence énergétique de Vision et de la Pierre de l'Esprit. Il assure la régulation thermique et cognitive de notre interface.`;
    }
    else if (lower.includes('jarvis')) {
      reply = `Le réseau bleu cyan provient de l'architecture originale de J.A.R.V.I.S., garantissant une analyse instantanée des flux de données et une ergonomie fluide.`;
    }
    else {
      reply = `Affirmatif, ${this.userName}. J'ai bien enregistré votre demande : "${promptText}".\n\n` +
              `Tous les protocoles locaux d'urgence sont prêts à votre service.`;
    }

    if (needsKeyNotice) {
      reply += `\n\n> [!NOTE]\n> *Note système : Vous utilisez actuellement le moteur de secours local E.D.I.T.H. Connectez une clé API Gemini gratuite dans "PARAMÈTRES" pour libérer l'intelligence satellite complète.*`;
    }

    return reply;
  }
}

// Global instance
window.edithAI = new EdithAIService();
