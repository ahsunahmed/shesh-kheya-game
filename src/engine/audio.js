// Web Audio দিয়ে তৈরি শব্দ — আলাদা কোনো অডিও ফাইল লাগে না (সব নিজের তৈরি)।
// ব্রাউজারের নিয়ম মেনে প্রথম ক্লিক/ট্যাপে resume করা হয়।
import { Save } from './save.js';

export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.ready = false;
    this.master = null; this.musicG = null; this.sfxG = null;
    const s = Save.readSettings() || {};
    const num=(v,d)=> (typeof v==='number' && isFinite(v)) ? Math.max(0,Math.min(1,v)) : d;
    this.settings = {
      muteAll: s.muteAll ?? false,
      music: num(s.music, 0.6),
      sfx: num(s.sfx, 0.8),
    };
    this.files = {};          // নাম → AudioBuffer (আসল শব্দ ফাইল)
    this.ambNodes = [];
    this.ambName = null;
    this.musicName = null;
    this._musicTimer = null;
    this._musicStep = 0;
  }

  // ইউজার জেসচারে ডাকতে হবে
  async unlock(){
    if (this.ctx) { if (this.ctx.state==='suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.musicG = this.ctx.createGain();
    this.sfxG = this.ctx.createGain();
    this.musicG.connect(this.master); this.sfxG.connect(this.master);
    this.master.connect(this.ctx.destination);
    this._applyVolumes();
    if (this.ctx.state==='suspended') await this.ctx.resume();
    this.ready = true;
    this._loadFiles();
  }

  // আসল শব্দ ফাইল (mp3) লোড — ব্যর্থ হলে procedural ফলব্যাক চলবে
  _loadFiles(){
    const list = { hiss:'snake_hiss', howl:'fox_howl', hit:'stick_hit' };
    for (const k in list){
      fetch('./assets/audio/'+list[k]+'.mp3').then(r=>r.arrayBuffer()).then(ab=>{
        this.ctx.decodeAudioData(ab, buf=>{ this.files[k]=buf; }, ()=>{});
      }).catch(()=>{});
    }
  }
  // বাফার বাজাও — থাকলে true
  playFile(name, vol=1){
    const buf=this.files[name]; if(!buf||!this.ready) return false;
    try{ const src=this.ctx.createBufferSource(); src.buffer=buf;
      const g=this.ctx.createGain(); g.gain.value=vol;
      src.connect(g); g.connect(this.sfxG); src.start(); return true;
    }catch(e){ return false; }
  }

  _applyVolumes(){
    if (!this.ctx) return;
    const cl=(v,d)=> (typeof v==='number'&&isFinite(v))?Math.max(0,Math.min(1,v)):d;
    this.settings.music=cl(this.settings.music,0.6); this.settings.sfx=cl(this.settings.sfx,0.8);
    const m = this.settings.muteAll ? 0 : 1;
    this.master.gain.value = 0.9*m;
    this.musicG.gain.value = this.settings.music;
    this.sfxG.gain.value = this.settings.sfx;
  }
  _save(){ Save.writeSettings(this.settings); }

  setMute(v){ this.settings.muteAll=!!v; this._applyVolumes(); this._save(); }
  toggleMute(){ this.setMute(!this.settings.muteAll); return this.settings.muteAll; }
  setMusic(v){ if(!isFinite(v))return; this.settings.music=Math.max(0,Math.min(1,v)); this._applyVolumes(); this._save(); }
  setSfx(v){ if(!isFinite(v))return; this.settings.sfx=Math.max(0,Math.min(1,v)); this._applyVolumes(); this._save(); }

  _noiseBuffer(dur=2){
    const n = this.ctx.sampleRate*dur;
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let last=0;
    for (let i=0;i<n;i++){ const w=Math.random()*2-1; d[i]=(last+0.02*w)/1.02; last=d[i]; d[i]*=3.0; }
    return b;
  }

  // ---------- পরিবেশ ধ্বনি (ambience bed) ----------
  setAmbience(name){
    if (!this.ready || this.ambName===name) return;
    this._stopAmbience();
    this.ambName = name;
    const now = this.ctx.currentTime;
    const add = (node, g=0.3)=>{ const gg=this.ctx.createGain(); gg.gain.value=0; gg.gain.linearRampToValueAtTime(g, now+1.2);
      node.connect(gg); gg.connect(this.musicG); this.ambNodes.push({node,gg}); };

    const river = ()=>{
      const src=this.ctx.createBufferSource(); src.buffer=this._noiseBuffer(3); src.loop=true;
      const lp=this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=480; lp.Q.value=0.6;
      src.connect(lp); src.start(); add(lp,0.22);
    };
    const wind = (g=0.14)=>{
      const src=this.ctx.createBufferSource(); src.buffer=this._noiseBuffer(3); src.loop=true;
      const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=600; bp.Q.value=0.8;
      const lfo=this.ctx.createOscillator(); lfo.frequency.value=0.12; const lg=this.ctx.createGain(); lg.gain.value=320;
      lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
      src.connect(bp); src.start(); add(bp,g);
    };
    const rain = ()=>{
      const src=this.ctx.createBufferSource(); src.buffer=this._noiseBuffer(3); src.loop=true;
      const hp=this.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1800;
      src.connect(hp); src.start(); add(hp,0.18);
    };
    switch(name){
      case 'river': river(); wind(0.1); this._birds(0.02); break;
      case 'village': wind(0.09); this._birds(0.05); this._market(); break;
      case 'bamboo': wind(0.16); this._birds(0.03); break;
      case 'storm': rain(); wind(0.22); break;
      case 'night_river': river(); wind(0.12); break;
      case 'rain': rain(); river(); wind(0.08); break;
      case 'quiet': wind(0.06); break;
      default: wind(0.08);
    }
  }
  _stopAmbience(){
    const now = this.ctx? this.ctx.currentTime:0;
    for (const a of this.ambNodes){ try{ a.gg.gain.cancelScheduledValues(now); a.gg.gain.linearRampToValueAtTime(0, now+0.4);
      setTimeout(()=>{ try{a.node.disconnect&&a.node.disconnect();}catch(e){} }, 600);}catch(e){} }
    this.ambNodes=[]; if (this._birdTimer){ clearInterval(this._birdTimer); this._birdTimer=null; }
    if (this._marketTimer){ clearInterval(this._marketTimer); this._marketTimer=null; }
    this.ambName=null;
  }
  _birds(rate=0.04){
    this._birdTimer = setInterval(()=>{
      if (Math.random()>rate*6) return;
      const t=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain();
      o.type='sine'; const f=1400+Math.random()*900; o.frequency.setValueAtTime(f,t);
      o.frequency.linearRampToValueAtTime(f*1.25, t+0.08);
      o.frequency.linearRampToValueAtTime(f*0.9, t+0.16);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.05,t+0.02); g.gain.linearRampToValueAtTime(0,t+0.2);
      o.connect(g); g.connect(this.musicG); o.start(t); o.stop(t+0.25);
    }, 500);
  }
  _market(){
    this._marketTimer = setInterval(()=>{
      if (Math.random()>0.25) return;
      const t=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain();
      o.type='triangle'; o.frequency.setValueAtTime(160+Math.random()*120,t);
      o.frequency.linearRampToValueAtTime(120+Math.random()*80,t+0.3);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.03,t+0.05); g.gain.linearRampToValueAtTime(0,t+0.4);
      o.connect(g); g.connect(this.musicG); o.start(t); o.stop(t+0.45);
    }, 700);
  }

  // ---------- হালকা সংগীত (mood) ----------
  setMusic_mood(name){
    if (!this.ready || this.musicName===name) return;
    this.musicName = name;
    if (this._musicTimer){ clearInterval(this._musicTimer); this._musicTimer=null; }
    if (name==='none') return;
    const scales = {
      mystery:[0,2,3,5,7,8,10],   // মাইনর-ঘেঁষা
      danger: [0,1,3,5,6,8,10],
      rescue: [0,2,4,5,7,9,11],   // মেজর, আশাবাদী
      calm:   [0,2,4,7,9],
    };
    const base = {mystery:196, danger:174, rescue:220, calm:246}[name] || 196;
    const sc = scales[name] || scales.mystery;
    this._musicStep=0;
    const stepMs = name==='danger'?360: name==='rescue'?460: 620;
    this._musicTimer = setInterval(()=>{
      if (!this.ready) return;
      const t=this.ctx.currentTime;
      // pad প্রতি ৪ ধাপে
      if (this._musicStep%4===0) this._pad(base/2 * Math.pow(2, sc[(this._musicStep/4|0)%sc.length]/12), 2.2, name);
      // arpeggio নোট
      const deg = sc[(this._musicStep*3)%sc.length];
      const freq = base * Math.pow(2, deg/12);
      this._pluck(freq, name);
      this._musicStep++;
    }, stepMs);
  }
  _pad(freq, dur, mood){
    const t=this.ctx.currentTime; const o=this.ctx.createOscillator(); const o2=this.ctx.createOscillator();
    const g=this.ctx.createGain(); const lp=this.ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
    o.type='sawtooth'; o2.type='sine'; o.frequency.value=freq; o2.frequency.value=freq*1.004;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.06,t+0.6); g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.musicG);
    o.start(t); o2.start(t); o.stop(t+dur+0.1); o2.stop(t+dur+0.1);
  }
  _pluck(freq, mood){
    const t=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain();
    o.type = mood==='danger'?'triangle':'sine'; o.frequency.value=freq;
    const peak = mood==='danger'?0.07:0.05;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+0.02); g.gain.exponentialRampToValueAtTime(0.0005,t+0.5);
    o.connect(g); g.connect(this.musicG); o.start(t); o.stop(t+0.55);
  }
  // সংলাপের সময় সংগীত নরম করা
  duck(on){ if(!this.ready) return; const t=this.ctx.currentTime;
    this.musicG.gain.cancelScheduledValues(t);
    this.musicG.gain.linearRampToValueAtTime(this.settings.music*(on?0.35:1), t+0.3); }

  // ---------- SFX ----------
  _env(type, f0, f1, dur, vol, slideT){
    if (!this.ready) return;
    const t=this.ctx.currentTime; const o=this.ctx.createOscillator(); const g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f0,t);
    if (f1!=null) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1), t+(slideT||dur));
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0005,t+dur);
    o.connect(g); g.connect(this.sfxG); o.start(t); o.stop(t+dur+0.02);
  }
  _noiseBurst(dur, vol, type='highpass', freq=1200){
    if(!this.ready) return;
    const t=this.ctx.currentTime; const src=this.ctx.createBufferSource(); src.buffer=this._noiseBuffer(dur+0.1);
    const f=this.ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0005,t+dur);
    src.connect(f); f.connect(g); g.connect(this.sfxG); src.start(t); src.stop(t+dur+0.05);
  }
  sfx(name){
    if (!this.ready) return;
    switch(name){
      case 'step':    this._noiseBurst(0.08, 0.12, 'lowpass', 500); break;
      case 'jump':    this._env('square', 320, 620, 0.16, 0.12, 0.12); break;
      case 'land':    this._noiseBurst(0.12, 0.18, 'lowpass', 300); break;
      case 'rope':    this._noiseBurst(0.22, 0.12, 'bandpass', 900); break;
      case 'oar':     this._noiseBurst(0.3, 0.14, 'lowpass', 400); break;
      case 'splash':  this._noiseBurst(0.4, 0.22, 'highpass', 800); break;
      case 'switch':  this._env('square', 180, 90, 0.08, 0.14, 0.05); break;
      case 'clue':    this._env('sine', 880, 1320, 0.18, 0.12); setTimeout(()=>this._env('sine',1320,1760,0.2,0.1),90); break;
      case 'success': [523,659,784,1046].forEach((f,i)=> setTimeout(()=>this._env('sine',f,f,0.22,0.12),i*110)); break;
      case 'fail':    this._env('sawtooth', 200, 110, 0.3, 0.14, 0.25); break;
      case 'ui':      this._env('sine', 660, 660, 0.06, 0.08); break;
      case 'thunder': this._noiseBurst(1.4, 0.3, 'lowpass', 160); break;
      case 'light_on':[440,660,880].forEach((f,i)=>setTimeout(()=>this._env('triangle',f,f,0.3,0.1),i*120)); break;
      case 'knock':   this._noiseBurst(0.1,0.2,'lowpass',220); break;
      case 'hiss':    if(!this.playFile('hiss')) this._hiss(); break;
      case 'howl':    if(!this.playFile('howl')) this._howl(); break;
      case 'hit':     if(!this.playFile('hit',0.9)) this._noiseBurst(0.1,0.22,'lowpass',260); break;
    }
  }

  // বড় সাপের হিস্‌ — দোলায়িত ব্যান্ডপাস নয়েজ
  _hiss(){
    if(!this.ready) return;
    const t=this.ctx.currentTime;
    const src=this.ctx.createBufferSource(); src.buffer=this._noiseBuffer(1.5); src.loop=false;
    const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=3200; bp.Q.value=2.2;
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.2,t+0.12);
    g.gain.linearRampToValueAtTime(0.13,t+1.0); g.gain.exponentialRampToValueAtTime(0.0005,t+1.4);
    const lfo=this.ctx.createOscillator(); lfo.frequency.value=8.5; const lg=this.ctx.createGain(); lg.gain.value=1100;
    lfo.connect(lg); lg.connect(bp.frequency); lfo.start(t); lfo.stop(t+1.42);
    src.connect(bp); bp.connect(g); g.connect(this.sfxG); src.start(t); src.stop(t+1.45);
  }
  // শেয়ালের ডাক — কর্কশ চিৎকার/ঘেউ (দুটি ছোট yip + একটি লম্বা screech)
  _howl(){
    if(!this.ready) return;
    // একটি কর্কশ স্বর: দুই ডিট্যুনড স্ম (rasp), দ্রুত ভিব্রাটো, ফর্ম্যান্ট ব্যান্ডপাস, সঙ্গে নয়েজ-নিঃশ্বাস
    const yip=(t0, f0, f1, dur, vol)=>{
      const o1=this.ctx.createOscillator(), o2=this.ctx.createOscillator(), g=this.ctx.createGain();
      o1.type='sawtooth'; o2.type='sawtooth'; o2.detune.value=25;
      o1.frequency.setValueAtTime(f0,t0); o1.frequency.exponentialRampToValueAtTime(Math.max(60,f1),t0+dur);
      o2.frequency.setValueAtTime(f0*1.01,t0); o2.frequency.exponentialRampToValueAtTime(Math.max(60,f1*1.01),t0+dur);
      // rasp — দ্রুত ভিব্রাটো
      const vib=this.ctx.createOscillator(); vib.type='square'; vib.frequency.value=34;
      const vg=this.ctx.createGain(); vg.gain.value=55; vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
      const bp=this.ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500; bp.Q.value=1.1;
      g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol,t0+0.03);
      g.gain.exponentialRampToValueAtTime(0.0005,t0+dur);
      o1.connect(bp); o2.connect(bp); bp.connect(g); g.connect(this.sfxG);
      o1.start(t0); o2.start(t0); vib.start(t0); o1.stop(t0+dur+0.02); o2.stop(t0+dur+0.02); vib.stop(t0+dur+0.02);
      // নিঃশ্বাস/rasp নয়েজ
      const src=this.ctx.createBufferSource(); src.buffer=this._noiseBuffer(dur+0.05);
      const hp=this.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2200; const ng=this.ctx.createGain();
      ng.gain.setValueAtTime(vol*0.4,t0); ng.gain.exponentialRampToValueAtTime(0.0005,t0+dur);
      src.connect(hp); hp.connect(ng); ng.connect(this.sfxG); src.start(t0); src.stop(t0+dur+0.05);
    };
    const t=this.ctx.currentTime;
    yip(t,       520, 300, 0.14, 0.16);   // ঘেউ ১
    yip(t+0.20,  560, 320, 0.14, 0.16);   // ঘেউ ২
    yip(t+0.44,  480, 760, 0.5,  0.17);   // লম্বা কর্কশ চিৎকার (উপরে ওঠা)
  }
}
