// প্রবেশবিন্দু — ক্যানভাস, গেম-লুপ, গ্লোবাল G, দৃশ্য ব্যবস্থাপনা।
import { Input } from './engine/input.js';
import { AudioEngine } from './engine/audio.js';
import { Voice } from './engine/voice.js';
import { UIManager } from './engine/ui.js';
import { Save } from './engine/save.js';
import { loadFont } from './engine/text.js';
import { Assets } from './engine/assets.js';
import { CHAPTERS, UI as S } from './data/strings.js';

import { TitleScene } from './scenes/title.js';
import { IntroScene } from './scenes/intro.js';
import { GhatScene } from './scenes/ghat.js';
import { VillageScene } from './scenes/village.js';
import { BambooGroveScene } from './scenes/bamboogrove.js';
import { BambooScene } from './scenes/bamboo.js';
import { BrokenPathScene } from './scenes/brokenpath.js';
import { BigChasmScene } from './scenes/bigchasm.js';
import { WrongPathScene } from './scenes/wrongpath.js';
import { FoxScene } from './scenes/fox.js';
import { PumpHouseScene } from './scenes/pumphouse.js';
import { MituGhatScene } from './scenes/mitughat.js';
import { RiverScene } from './scenes/river.js';
import { RescueScene } from './scenes/rescue.js';
import { TreatmentScene } from './scenes/treatment.js';
import { EndingScene } from './scenes/ending.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false });
const W=1280, H=720;
canvas.width=W; canvas.height=H;

// সংলাপ-বক্তা → চরিত্র আঁকার কী
const SPK2CHAR = { player:'player', shop:'shop', hashem:'hashem', maleka:'maleka', mitu:'mitu',
  jalil:'jalil', salma:'salma', karim:'karim', robin:'robin', narr:'narr' };

const G = {
  W,H,canvas,ctx,
  input:new Input(),
  audio:new AudioEngine(),
  voice:null,
  state:{ clues:new Set(), flags:{} },
  chapterKey:null,
  objectiveText:null,
  scene:null,
  scenes:{},
  gender:'male',
  playerKey:'player_male',
  setGender(g){ this.gender=(g==='female'?'female':'male'); this.playerKey='player_'+this.gender;
    const s=Save.readSettings()||{}; s.gender=this.gender; Save.writeSettings(s); },
  charKeyFor(s){ return s==='player' ? this.playerKey : (SPK2CHAR[s]||s); },

  addClue(id){ if(!this.state.clues.has(id)){ this.state.clues.add(id); this.ui.clueToast(id); this.save(); } },
  setObjective(txt){ this.objectiveText=txt; },
  flag(k,v){ if(v===undefined) return this.state.flags[k]; this.state.flags[k]=v; },

  changeScene(key, opts={}){
    this.chapterKey = CHAPTERS[key] ? key : (key==='title'||key==='intro'? (key==='intro'?'intro':null) : this.chapterKey);
    if (key==='title') this.chapterKey=null;
    this.objectiveText = CHAPTERS[key] ? CHAPTERS[key].obj : null;
    const Cls = this.scenes[key];
    if (!Cls){ console.error('No scene', key); return; }
    this.input.releaseAll();           // নতুন দৃশ্যে কোনো আটকে থাকা ইনপুট নয়
    this.voice && this.voice.stop();   // পুরোনো দৃশ্যের কণ্ঠ থামাও
    if (this.ui){ this.ui.dialogue=null; this.ui.choiceBox=null; this.ui.gameover=null; this.ui.notebookOpen=false; this.ui.paused=false; }  // ওভারলে পরিষ্কার
    this.scene = new Cls(this);
    this.sceneKey = key;
    this.scene.enter(opts);
    // অডিও পরিবেশ দৃশ্য ঠিক করবে
    if (key!=='title') this.save();
  },

  // চেকপয়েন্ট সংরক্ষণ
  save(){
    if (!this.sceneKey || this.sceneKey==='title') return;
    const ok=Save.write({
      chapter:this.sceneKey,
      checkpoint: this.scene && this.scene.checkpoint!=null ? this.scene.checkpoint : 0,
      clues:[...this.state.clues],
      flags:this.state.flags,
      gender:this.gender,
      hp:this.state.hp,
    });
    if (!ok && !this._warnedSave){ this._warnedSave=true; this.ui&&this.ui.toast(S.saveFail,'info',4); }
  },
  loadInto(){
    const st=Save.read(); if(!st) return false;
    this.state.clues=new Set(st.clues||[]);
    this.state.flags=st.flags||{};
    this.state.hp = st.hp!=null ? st.hp : undefined;
    if (st.gender) this.setGender(st.gender);
    this.changeScene(st.chapter||'ghat', {checkpoint: st.checkpoint||0, loaded:true});
    return true;
  },
  respawnCheckpoint(){ if (this.scene && this.scene.respawn) this.scene.respawn(); },
  // সব জীবন শেষ হলে ২ ধাপ পিছন থেকে শুরু (খেলা একটু কঠিন)
  deathRestart(){
    const order=['ghat','village','bamboogrove','bamboo','brokenpath','bigchasm','fox','pumphouse','river','rescue'];
    this.state.hp=3;
    const idx=order.indexOf(this.sceneKey);
    if (idx<0){ this.respawnCheckpoint(); return; }
    const tgt=order[Math.max(0,idx-2)];
    this.ui && this.ui.toast('২ ধাপ পিছন থেকে আবার শুরু…','info',2.6);
    this.changeScene(tgt);
  },
  goMenu(){ this.audio.setAmbience('quiet'); this.audio.setMusic_mood('calm'); this.changeScene('title'); },
  newGame(){ this.state.clues=new Set(); this.state.flags={}; this.state.hp=3; Save.clear(); this.changeScene('intro'); },
};
G.ui = new UIManager(G);
G.voice = new Voice(G);
G.scenes = { title:TitleScene, intro:IntroScene, ghat:GhatScene, village:VillageScene,
  bamboogrove:BambooGroveScene, bamboo:BambooScene, brokenpath:BrokenPathScene, bigchasm:BigChasmScene, wrongpath:WrongPathScene, fox:FoxScene,
  pumphouse:PumpHouseScene, mitughat:MituGhatScene, river:RiverScene, rescue:RescueScene,
  treatment:TreatmentScene, ending:EndingScene };

// ---- resize / letterbox (হাই-DPI: ব্যাকিং-স্টোর ডিভাইস-পিক্সেলে, তাই লেখা/ছবি ঝকঝকে) ----
G._dpr=1;
function resize(){
  const dpr=Math.min(window.devicePixelRatio||1, 2.5);
  const scale=Math.min(window.innerWidth/W, window.innerHeight/H);
  const cssW=W*scale, cssH=H*scale;
  canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px';
  canvas.width=Math.round(cssW*dpr); canvas.height=Math.round(cssH*dpr);
  G._dpr=canvas.width/W;                 // খেলার ১২৮০×৭২০ স্থানাঙ্ক → ব্যাকিং পিক্সেল
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize); resize();

// ---- loop ----
let last=performance.now();
function frame(now){
  let dt=(now-last)/1000; last=now; if (dt>1/20) dt=1/20;
  G.input.update();
  // slider drag support in overlays
  G.ui.handlePointerDrag && G.ui.handlePointerDrag();
  // scene update (gameplay blocked while overlay open, but scene may still animate)
  if (G.scene && G.scene.update) G.scene.update(dt, G.ui.blocksGameplay());
  G.ui.update(dt);
  // draw — প্রতি ফ্রেমে লজিক্যাল স্থানাঙ্ক → ব্যাকিং-স্টোরে স্কেল
  ctx.setTransform(G._dpr,0,0,G._dpr,0,0);
  ctx.fillStyle='#0c111d'; ctx.fillRect(0,0,W,H);
  if (G.scene && G.scene.draw) G.scene.draw(ctx);
  G.ui.draw(ctx);
  requestAnimationFrame(frame);
}

// ---- boot ----
(async function boot(){
  await loadFont();
  try{ await Assets.preload(); const r=Assets.report(); console.log('[assets] painted images present:', r.ok+'/'+r.total); }catch(e){}
  const se=Save.readSettings(); G.setGender(se&&se.gender?se.gender:'male');
  document.getElementById('boot').style.display='none';
  G.changeScene('title');
  requestAnimationFrame(frame);
})();

window.__G = G; // ডিবাগ/টেস্টের জন্য
