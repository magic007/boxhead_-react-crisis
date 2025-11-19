
import { WeaponType } from '../../types';

export class SoundSystem {
  ctx: AudioContext;
  masterGain: GainNode;

  constructor() {
    // @ts-ignore
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Master Volume
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
  }

  playShoot(weapon: WeaponType) {
    if (this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;

    if (weapon === WeaponType.PISTOL || weapon === WeaponType.UZI) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      const freq = weapon === WeaponType.PISTOL ? 300 : 400;
      const dur = weapon === WeaponType.PISTOL ? 0.1 : 0.05;

      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(t + dur);
    } else if (weapon === WeaponType.SHOTGUN) {
      this.playNoise(0.2, 0.4);
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.2);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(t + 0.2);
    }
  }

  playExplosion() {
    if (this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;
    
    // Rumble Noise
    this.playNoise(0.5, 0.8);
    
    // Sub-bass Thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
    gain.gain.setValueAtTime(1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 0.5);
  }

  playBuild() {
    if (this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1200, t + 0.05);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 0.1);
  }

  playHit() {
    if (this.ctx.state === 'suspended') return;
    this.playNoise(0.05, 0.2);
  }

  playPickup() {
    if (this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // High pitched double beep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1600, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(t + 0.2);
  }

  playVirusShoot() {
     if (this.ctx.state === 'suspended') return;
     const t = this.ctx.currentTime;
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     osc.type = 'sine';
     osc.frequency.setValueAtTime(600, t);
     osc.frequency.linearRampToValueAtTime(200, t + 0.4);
     gain.gain.setValueAtTime(0.2, t);
     gain.gain.linearRampToValueAtTime(0, t + 0.4);
     osc.connect(gain);
     gain.connect(this.masterGain);
     osc.start();
     osc.stop(t + 0.4);
  }
  
  playDeath() {
     if (this.ctx.state === 'suspended') return;
     this.playNoise(0.15, 0.3);
  }

  playGameOver() {
      if (this.ctx.state === 'suspended') return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(50, t + 1.5);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(t + 1.5);
  }

  private playNoise(dur: number, vol: number) {
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}
