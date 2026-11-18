// Sound effects from Web Audio oscillators: no sound files, so nothing is fetched.
// The audio context is created on the first key press or click, as browsers require.
let audio = null;

export function unlockAudio() {
  if (audio === null) {
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    audio = Ctor ? new Ctor() : false;
  }
  if (audio && audio.state === 'suspended') audio.resume();
}

function tone(freq, duration, { type = 'sine', volume = 0.12, slideTo = null, delay = 0 } = {}) {
  if (!audio) return;
  const t0 = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  collect() {
    tone(880, 0.08, { type: 'triangle', volume: 0.1, slideTo: 1320 });
  },
  dash() {
    tone(420, 0.14, { type: 'sine', volume: 0.1, slideTo: 1100 });
  },
  hit() {
    tone(180, 0.3, { type: 'sawtooth', volume: 0.1, slideTo: 60 });
  },
  wave() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'triangle', volume: 0.1, delay: i * 0.09 }));
  },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, { type: 'triangle', volume: 0.11, delay: i * 0.12 }));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, { type: 'sawtooth', volume: 0.08, delay: i * 0.18 }));
  },
};
