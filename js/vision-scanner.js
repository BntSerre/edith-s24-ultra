/**
 * E.D.I.T.H. Tactical AR Vision Scanner
 * Camera stream overlay, holographic reticle, and multimodal image analysis
 */

class EdithVisionScanner {
  constructor() {
    this.videoElement = null;
    this.canvasElement = null;
    this.stream = null;
    this.facingMode = 'environment'; // Back camera by default on phones
    this.isScanning = false;
    this.hasTorch = false;
    this.torchActive = false;
  }

  init(videoEl, canvasEl) {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
  }

  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Votre appareil ou navigateur ne supporte pas l'accès direct à la caméra.");
      return false;
    }

    try {
      this.stopCamera(); // Stop existing if any

      const constraints = {
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      // Check for torch capability
      const track = this.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      this.hasTorch = !!capabilities.torch;

      if (window.edithAudio) window.edithAudio.playSuccess();
      return true;
    } catch (err) {
      console.warn('[EDITH Vision] Erreur accès caméra:', err);
      return false;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.torchActive = false;
  }

  toggleCamera() {
    this.facingMode = (this.facingMode === 'environment') ? 'user' : 'environment';
    return this.startCamera();
  }

  async toggleTorch() {
    if (!this.stream) return false;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return false;

    try {
      this.torchActive = !this.torchActive;
      await track.applyConstraints({
        advanced: [{ torch: this.torchActive }]
      });
      return this.torchActive;
    } catch (e) {
      console.warn("Torch non supportée:", e);
      return false;
    }
  }

  captureFrame() {
    if (!this.videoElement || !this.canvasElement) return null;
    const video = this.videoElement;
    const canvas = this.canvasElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async scanAndAnalyze(customPrompt = null) {
    if (this.isScanning) return;
    this.isScanning = true;

    if (window.edithAudio) {
      window.edithAudio.playScanTone();
    }

    const frameData = this.captureFrame();
    if (!frameData) {
      this.isScanning = false;
      throw new Error("Impossible de capturer le flux vidéo. Vérifiez que la caméra est active.");
    }

    const prompt = customPrompt || 
      "Analyse tactique et détaillée de cette cible ou de cette scène capturée par les lunettes E.D.I.T.H. " +
      "Identifie précisément les objets ou personnes visibles, le texte, et donne des informations tactiques, techniques ou pratiques utiles de manière synthétique et courtoise.";

    try {
      const response = await window.edithAI.ask(prompt, frameData);
      this.isScanning = false;
      return response;
    } catch (err) {
      this.isScanning = false;
      throw err;
    }
  }
}

// Global instance
window.edithVision = new EdithVisionScanner();
