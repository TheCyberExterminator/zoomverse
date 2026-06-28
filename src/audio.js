// Tiny WebAudio sound engine — all sound synthesized (no audio files needed).
import { Save } from "./save.js";

let ctx = null, musicGain = null, sfxGain = null, musicOn = false, musicNodes = [];
let userMusic = 0.6, userSfx = 0.8;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = userSfx; sfxGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function blip(freq, dur = 0.12, type = "sine", vol = 0.25, slideTo = null) {
  const c = ac();
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(); o.stop(c.currentTime + dur + 0.02);
}

export const Audio = {
  unlock() {
    ac();
    const s = Save.getSettings();
    userMusic = s.music;
    this.setSfxVolume(s.sfx);
  },
  click() { blip(520, 0.08, "square", 0.18); },
  star() { blip(880, 0.1, "triangle", 0.25); setTimeout(() => blip(1320, 0.12, "triangle", 0.22), 70); },
  boost() { blip(220, 0.25, "sawtooth", 0.22, 660); },
  repair() { blip(330, 0.06, "square", 0.15); },
  jump() { blip(440, 0.18, "sine", 0.2, 880); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, "triangle", 0.28), i * 130)); },

  setSfxVolume(v) { userSfx = v; if (sfxGain) sfxGain.gain.value = v; },
  setMusicVolume(v) {
    userMusic = v;
    if (ctx && musicOn) musicGain.gain.linearRampToValueAtTime(v * 0.15, ctx.currentTime + 0.2);
  },

  toggleMusic() { return this.setMusic(!musicOn); },
  setMusic(on) {
    const c = ac();
    musicOn = on;
    if (on && musicNodes.length === 0) {
      [110, 164.81].forEach((f) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.value = f;
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 0.15; lg.gain.value = 3;
        lfo.connect(lg); lg.connect(o.frequency);
        g.gain.value = 0.5;
        o.connect(g); g.connect(musicGain);
        o.start(); lfo.start();
        musicNodes.push(o, lfo);
      });
    }
    musicGain.gain.linearRampToValueAtTime(on ? userMusic * 0.15 : 0.0, c.currentTime + 0.6);
    return musicOn;
  },
};
