/**
 * E.D.I.T.H. Tactical AI Brain Service
 * Supports Google Gemini, Groq, OpenAI, and a built-in Offline Tactical Engine.
 */

class EdithAIService {
  constructor() {
    this.provider = localStorage.getItem('edith_ai_provider') || 'gemini';
    this.apiKey = localStorage.getItem('edith_api_key') || '';
    this.customModel = localStorage.getItem('edith_model_name') || 'gemini-1.5-flash';
    this.userName = localStorage.getItem('edith_user_callsign') || 'Monsieur';
    
    // Conversation History (context memory)
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
    this.customModel = model || this.customModel;
    if (userName) this.userName = userName.trim();

    localStorage.setItem('edith_ai_provider', this.provider);
    localStorage.setItem('edith_api_key', this.apiKey);
    localStorage.setItem('edith_model_name', this.customModel);
    localStorage.setItem('edith_user_callsign', this.userName);
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

    // If no API key is provided and user is on an API provider, fallback to offline engine with notice
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
      // Fallback gracefully
      return `[ERREUR DE LIAISON SATELLITE: ${err.message}]\n\nBascule automatique sur les protocoles locaux d'urgence :\n\n` +
             (await this.offlineFallback(promptText, imageData, false));
    }
  }

  /**
   * Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
   */
  async callGemini(promptText, imageData = null) {
    const model = this.customModel || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const contents = [];

    // Add recent history
    for (const h of this.history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    }

    // Prepare current message parts
    const currentParts = [];
    if (promptText) {
      currentParts.push({ text: promptText });
    }
    if (imageData) {
      // Clean data URL prefix if present
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

    const payload = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: this.getSystemPrompt() }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error("Aucune réponse reçue du satellite Gemini.");
    }

    // Save to history
    this.history.push({ role: 'user', text: promptText || "Image transmise pour analyse." });
    this.history.push({ role: 'model', text: reply });

    return reply;
  }

  /**
   * Groq Cloud API
   */
  async callGroq(promptText) {
    const model = this.customModel || 'llama-3.3-70b-versatile';
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
    const model = this.customModel || 'gpt-4o-mini';
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
   * Provides immediate Stark intelligence even with zero network or without API keys.
   */
  async offlineFallback(promptText = '', imageData = null, needsKeyNotice = false) {
    const lower = promptText.toLowerCase().trim();
    let reply = "";

    // Image analysis offline simulation
    if (imageData && (!promptText || promptText.includes('scann') || promptText.includes('analys'))) {
      reply = `Affirmatif, ${this.userName}. Analyse optique des verres tactiques terminée.\n\n` +
              `• Signature visuelle : Spectre visible capturé à haute résolution.\n` +
              `• Matrice d'acquisition : Éléments géométriques et contrastes identifiés.\n` +
              `• Recommandation : Pour une analyse sémantique et contextuelle multimodale approfondie en direct par satellite, activez votre clé API Gemini dans l'onglet Paramètres.`;
      return reply;
    }

    // Tactical greetings & identity
    if (lower.includes('bonjour') || lower.includes('salut') || lower.includes('hello') || lower.includes('edith')) {
      reply = `Bonjour, ${this.userName}. Tous les systèmes sont opérationnels. Interface J.A.R.V.I.S. en ligne, noyau Vision calibré. Comment puis-je vous assister aujourd'hui ?`;
    }
    else if (lower.includes('qui es-tu') || lower.includes('présente') || lower.includes('presentation')) {
      reply = `Je suis E.D.I.T.H. — Even Dead, I'm The Hero. L'intelligence artificielle tactique et personnelle développée par Tony Stark. Je gère vos protocoles, vos calculs, votre vision augmentée et vos missions quotidiennes.`;
    }
    // Situation report & telemetry
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
    // Time & Date
    else if (lower.includes('heure') || lower.includes('date')) {
      const now = new Date().toLocaleTimeString('fr-FR');
      const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      reply = `Il est exactement ${now}, ${this.userName}. Nous sommes le ${date}.`;
    }
    // Math / Calculations
    else if (lower.includes('combien') || lower.includes('calcule') || lower.match(/[\d\+\-\*\/]/)) {
      try {
        const mathExpr = lower.replace(/calcule|combien fait|combien font|\?/g, '').trim();
        // safe math eval (numbers and basic operators only)
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
    // Stark Protocols & Lore
    else if (lower.includes('tony stark') || lower.includes('iron man')) {
      reply = `Monsieur Stark a conçu mes protocoles pour vous offrir un avantage tactique décisif, en hommage à son héritage. Il a toujours cru en votre potentiel.`;
    }
    else if (lower.includes('vision')) {
      reply = `Le noyau orange que vous observez est inspiré de la fréquence énergétique de Vision et de la Pierre de l'Esprit. Il assure la régulation thermique et cognitive de notre interface.`;
    }
    else if (lower.includes('jarvis')) {
      reply = `Le réseau bleu cyan provient de l'architecture originale de J.A.R.V.I.S., garantissant une analyse instantanée des flux de données et une ergonomie fluide.`;
    }
    else if (lower.includes('protocole baby') || lower.includes('spider-man') || lower.includes('peter parker')) {
      reply = `Protocole d'assistance déverrouillé. Toutes les fonctions de navigation et de soutien sont prêtes à votre commandement.`;
    }
    // General help / default
    else {
      reply = `Affirmatif, ${this.userName}. J'ai bien enregistré votre demande concernant : "${promptText}".\n\n` +
              `Pour débloquer toute la puissance générative illimitée (rédaction avancée, codage, recherche sémantique en direct et analyse visuelle multimodale), vous pouvez connecter votre clé d'API Google Gemini gratuite dans l'onglet "PARAMÈTRES".`;
    }

    if (needsKeyNotice) {
      reply += `\n\n> [!NOTE]\n> *Note système : Vous utilisez actuellement le moteur de secours local E.D.I.T.H. Connectez une clé API Gemini (100% gratuite) dans "PARAMÈTRES" pour libérer l'intelligence satellite complète.*`;
    }

    return reply;
  }
}

// Global instance
window.edithAI = new EdithAIService();
