// অধ্যায় ১: খালি ঘাট — painted ব্যাকগ্রাউন্ডে এক-পর্দার walkway; চিহ্ন পরীক্ষা + দড়ির পাজল।
import { Platformer } from '../engine/scene.js';
import { DIALOGUE } from '../data/dialogue.js';
import { ROPE_OPTIONS, evalRope } from '../data/puzzles.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class GhatScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=612; this.ambience='river'; this.mood='mystery'; this.bgKey='bg_ghat';
    this.canRun=false; this.noVitals=true;              // শান্ত অনুসন্ধান-পর্দা, হৃদয়/দম লাগবে না
    this.addGround(612); this.leftBound=70; this.rightBound=1210;
    this.checkpoints=[{x:180,y:520}];
    if (opts.enter==='right'){ this.player.x=1150; this.player.y=520; this.player.vx=this.player.vy=0; }
    else this.spawn(0);
    this.setAudio();

    // চিহ্ন (painted রশি, কাদা, নৌকার দাগের কাছাকাছি)
    this.addInteract({ x:540, y:600, r:95, markY:470, once:true, onE:()=>this._rope() });            // মোরিং রশি
    this.addInteract({ x:300, y:600, r:85, markY:560, once:true,
      onE:()=>{ this.G.addClue('ghat_mud'); this.G.ui.startDialogue(DIALOGUE.ghat_mud); } });            // কাদায় ছাপ
    this.addInteract({ x:960, y:600, r:95, markY:470, once:true,
      onE:()=>{ this.G.addClue('ghat_boat'); this.G.ui.startDialogue(DIALOGUE.ghat_boat); } });           // জেটির কাছে নৌকার দাগ

    this.exit=this.addInteract({ x:1200, y:600, r:80, hidden:true, hint:'গ্রামের পথ → (E)',
      onE:()=>this.G.changeScene('village',{enter:'left'}) });

    if (!opts.loaded) this.G.ui.startDialogue(DIALOGUE.ghat_intro,
      ()=>this.G.ui.tip('উজ্জ্বল চিহ্নের কাছে গিয়া E / ট্যাপ দিয়া পরখ করো', 4.5));
    if (this.G.state.clues.has('ghat_mud')) this.interactables[1].done=true;
    if (this.G.state.clues.has('ghat_boat')) this.interactables[2].done=true;
    if (this.G.state.clues.has('ghat_rope')) this.interactables[0].done=true;
  }

  _rope(){
    this.G.ui.choice('ঘাটের খুঁটিতে ছেঁড়া দড়িটা ভালো করে দেখো — কী মনে হয়?',
      ROPE_OPTIONS.map(o=>({id:o.id,label:o.label})),
      (choice)=>{
        const r=evalRope(choice);
        if (r.ok){ this.interactables[0].done=true; this.G.addClue(r.clue);
          this.G.ui.toast(S.correct,'success'); setTimeout(()=>this.G.ui.startDialogue([{s:'player',t:r.msg,e:'think'}]),300); }
        else { this.G.ui.toast(S.wrong,'fail'); setTimeout(()=>this.G.ui.startDialogue([
          {s:'player',t:r.msg,e:'worried'},{s:'player',t:'আবার দেহি।',e:'think'}], ()=>this._rope()),300); }
      });
  }

  onUpdate(dt){
    const done = this.G.state.clues.has('ghat_rope')&&this.G.state.clues.has('ghat_mud')&&this.G.state.clues.has('ghat_boat');
    this.exit.hidden=!done;
    if (done && !this._cp1){ this._cp1=true;
      this.G.setObjective('ঘাটের তিনটি চিহ্নই দেখা শেষ। ডান দিকের গ্রামের পথে যাও।');
      this.G.ui.toast('সব চিহ্ন দেখা শেষ — ডান দিকে এগোও','info',2.2); }
  }

  // painted ব্যাকগ্রাউন্ড থাকলে কেবল সূক্ষ্ম জীবন্ত উপাদান; নইলে vector দৃশ্য
  drawWorld(ctx){
    const t=this.t;
    if (!Assets.has('bg_ghat')){
      A.groundStrip(ctx,-200,this.groundY,this.worldW+400,200,'#9a7a4e','#6f5a3c');
      A.hut(ctx,120,this.groundY-170,150,110,{}); A.jetty(ctx,980,this.groundY-110,300,t);
      A.post(ctx,540,this.groundY-10,56,'thick'); A.boat(ctx,1060,this.groundY-78,1.2,t,{bob:true});
      return;
    }
    A.liveWater(ctx, 0, 300, this.worldW, 170, t);        // নদীতে ঝিকিমিকি
    A.liveGrass(ctx, 120, this.groundY-6, 10, t);          // পায়ের কাছে ঘাস
    A.liveGrass(ctx, 1040, this.groundY-6, 8, t);
    A.reeds(ctx, 470, 500, 7, t, 0.9);                     // রশির পাশে নলখাগড়া

    // ---- দৃশ্যমান সূত্র (prop PNG থাকলে তা, নইলে ভেক্টর; দেখা হলে মিইয়ে যায়) ----
    const seen=(id)=>this.G.state.clues.has(id);
    if (!Assets.prop('footprints')){                                     // দুই জনের দুই সারি পায়ের ছাপ
      A.footprints(ctx, 236, this.groundY+14, seen('ghat_mud'));
      A.footprints(ctx, 296, this.groundY-2, seen('ghat_mud'));
    } else A.drawProp(ctx,'footprints',270,this.groundY+6,120);
    if (!Assets.prop('tornrope')) A.tornRope(ctx, 540, 548, seen('ghat_rope'));                 // খুঁটিতে ছেঁড়া দড়ি
    else A.drawProp(ctx,'tornrope',540,548,80);
    if (!Assets.prop('boatmarks')) A.boatMarks(ctx, 940, this.groundY+4, seen('ghat_boat'));    // নৌকা টেনে নামানোর দাগ
    else A.drawProp(ctx,'boatmarks',940,this.groundY+4,160);
  }
}
