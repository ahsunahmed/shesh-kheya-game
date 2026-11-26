// মানব-কণ্ঠ সংলাপ।
// অগ্রাধিকার: (১) আগে-থেকে-তৈরি কণ্ঠ-ক্লিপ (assets/voice/<id>.mp3 — ElevenLabs/বরিশালি উচ্চারণ)।
//            (২) না থাকলে ডিভাইসের বাংলা TTS। (৩) তাও না থাকলে নীরব (শুধু লেখা)।
import { Save } from './save.js';

const PROFILE = {
  karim: { pitch:0.65, rate:0.92 }, jalil: { pitch:0.72, rate:0.9 }, hashem:{ pitch:0.74, rate:0.88 },
  shop:  { pitch:1.18, rate:1.0 },  maleka:{ pitch:1.22, rate:0.98 }, salma: { pitch:1.2, rate:1.0 },
  mitu:  { pitch:1.3,  rate:1.04 }, robin: { pitch:1.25, rate:1.08 }, narr:  { pitch:0.9, rate:0.95 },
};

// FNV-1a 32-bit → স্থিতিশীল আইডি (tools/extract_voice_lines.py-এর সঙ্গে হুবহু মেলে)
export function voiceId(text){
  const b=new TextEncoder().encode(text);
  let h=0x811c9dc5;
  for (let i=0;i<b.length;i++){ h^=b[i]; h=Math.imul(h,0x01000193); }
  return 'v'+(h>>>0).toString(16).padStart(8,'0');
}

export class Voice {
  constructor(G){
    this.G=G;
    this.supported = typeof window!=='undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const s=Save.readSettings()||{};
    this.enabled = s.voice!==false;
    this.voices=[]; this.bn=null; this.cur=null;
    this.clipMap={}; this.curAudio=null;
    if (this.supported){
      const load=()=>{ try{ this.voices=window.speechSynthesis.getVoices()||[]; this.bn=this._pickBn(); }catch(e){} };
      load(); try{ window.speechSynthesis.onvoiceschanged=load; }catch(e){}
      setTimeout(load,350); setTimeout(load,1200);
    }
    this._loadClipIndex();
  }
  // আইডি → ফাইলনাম মানচিত্র (থাকলে)। পুরোনো তালিকা-রূপও সামলায়।
  async _loadClipIndex(){
    try{ const r=await fetch('./assets/voice/index.json',{cache:'no-store'});
      if (r.ok){ const j=await r.json();
        if (Array.isArray(j)){ for(const id of j) this.clipMap[id]=id+'.mp3'; }
        else if (j && typeof j==='object'){ this.clipMap=j; } } }catch(e){}
  }
  _pickBn(){ const v=this.voices;
    return v.find(x=>/^bn([-_]|$)/i.test(x.lang)) || v.find(x=>/bengali|bangla|বাংলা/i.test(x.name)) || null; }
  // ডিভাইসে বাংলা কণ্ঠ বা তৈরি ক্লিপ — কিছু একটা শোনানো যাবে কি না
  available(){ return Object.keys(this.clipMap).length>0 || (this.supported && !!this.bn); }

  _profile(speaker){
    if (speaker==='player') return this.G && this.G.gender==='female' ? {pitch:1.28,rate:1.02} : {pitch:0.95,rate:1.0};
    return PROFILE[speaker] || {pitch:1.0, rate:1.0};
  }

  speak(text, speaker){
    if (!this.enabled || !text) return;
    this.stop();
    const id=voiceId(text);
    // (১) তৈরি ক্লিপ (আইডি → ফাইলনাম)
    const file=this.clipMap[id];
    if (file){
      try{
        const a=new Audio('./assets/voice/'+encodeURIComponent(file));
        a.volume = (this.G.audio && this.G.audio.settings && !this.G.audio.settings.muteAll) ? 1 : 0;
        this.curAudio=a; a.play().catch(()=>{});
        return;
      }catch(e){}
    }
    // (২) বাংলা TTS
    if (this.supported){
      if (!this.bn) this.bn=this._pickBn();
      if (this.bn){ try{
        const u=new SpeechSynthesisUtterance(text);
        u.voice=this.bn; u.lang=this.bn.lang||'bn-IN';
        const p=this._profile(speaker); u.pitch=p.pitch; u.rate=p.rate; u.volume=1;
        this.cur=u; window.speechSynthesis.speak(u);
      }catch(e){} }
    }
    // (৩) নীরব — লেখা দেখা যাবে
  }
  stop(){
    if (this.supported){ try{ window.speechSynthesis.cancel(); }catch(e){} }
    this.cur=null;
    if (this.curAudio){ try{ this.curAudio.pause(); }catch(e){} this.curAudio=null; }
  }
  setEnabled(v){ this.enabled=!!v; if(!this.enabled) this.stop();
    const s=Save.readSettings()||{}; s.voice=this.enabled; Save.writeSettings(s); }
  toggle(){ this.setEnabled(!this.enabled); return this.enabled; }
}
