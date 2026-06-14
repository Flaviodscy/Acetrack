let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  
  if (!audioCtx) {
    // Standard AudioContext initialization (supporting prefix for legacy browsers)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  
  // Resume context if suspended by browser autoplay policy
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  
  return audioCtx;
}

/**
 * Procedural Tennis Racket Hit Synthesizer
 * Uses a triangle wave sweep and a filtered bandpass noise burst.
 */
export function playRacketHit(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Core pop/hit sound (Triangle wave sweep)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "triangle";
  
  // Quick frequency sweep mimicking the elastic racket string pop
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);

  // Rapid amplitude decay
  oscGain.gain.setValueAtTime(0.7, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  // 2. String friction sound (Filtered noise burst)
  try {
    const bufferSize = ctx.sampleRate * 0.05; // 50ms noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with random noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to isolate ball fuzz racket string contact tone
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1100;
    filter.Q.value = 2.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(now);
    noise.start(now);

    osc.stop(now + 0.09);
    noise.stop(now + 0.06);
  } catch (e) {
    // Fail-safe if buffer creation fails
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

/**
 * Procedural Crowd Applause/Cheer Synthesizer
 * Uses white noise with fluctuating envelope levels.
 */
export function playCrowdCheer(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 2.2;

  try {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter white noise to sound like a distant crowd (bandpass + lowpass combo)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 850;
    bandpass.Q.value = 1.0;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3500;

    const cheerGain = ctx.createGain();
    
    // Smooth fade in (applause building)
    cheerGain.gain.setValueAtTime(0, now);
    cheerGain.gain.linearRampToValueAtTime(0.18, now + 0.4);
    
    // Fluctuations inside the cheer to mimic clapping/cheering dynamics
    cheerGain.gain.setValueAtTime(0.18, now + 0.4);
    cheerGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
    cheerGain.gain.linearRampToValueAtTime(0.16, now + 1.2);
    
    // Smooth decay to zero
    cheerGain.gain.setValueAtTime(0.16, now + 1.2);
    cheerGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(cheerGain);
    cheerGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch (e) {
    // Fail-safe: play a short synth chime if Web Audio buffer creation errors out
    playAceChime();
  }
}

/**
 * Procedural Ace/Winner Chime Synthesizer
 * Plays an ascending chord using sine wave oscillators.
 */
export function playAceChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Frequencies for a bright, ascending major 7th arpeggio (C5 - E5 - G5 - B5)
  const notes = [523.25, 659.25, 783.99, 987.77];
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.value = freq;
    
    const noteTime = now + (idx * 0.09);
    
    gainNode.gain.setValueAtTime(0, noteTime);
    gainNode.gain.linearRampToValueAtTime(0.25, noteTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(noteTime);
    osc.stop(noteTime + 0.3);
  });
}

/**
 * Procedural Tennis Ball Court Bounce Synthesizer
 * Uses a lower frequency triangle sweep to simulate the dull thud of a court bounce.
 */
export function playBallBounce(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "triangle";
  
  // Lower frequency thud sweep
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

  oscGain.gain.setValueAtTime(0.65, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}
