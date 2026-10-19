// Campanita suave generada con Web Audio (sin archivos): dos notas en seno, con desvanecido.
let ctx;

export function playChime() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [
      { freq: 659.25, at: 0 }, // Mi
      { freq: 987.77, at: 0.18 }, // Si
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(0.12, now + at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 1.5);
    });
  } catch {
    /* audio no disponible */
  }
  try {
    navigator.vibrate?.([120, 80, 120]);
  } catch {
    /* sin vibración */
  }
}

// Los navegadores solo permiten sonido tras una interacción: se "despierta" al iniciar el bloque.
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* audio no disponible */
  }
}
