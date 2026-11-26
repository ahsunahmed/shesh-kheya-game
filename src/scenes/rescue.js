// অধ্যায় ৭: চরে উদ্ধার — নদীর মাঝের ছোট চরে করিম চাচা (হাত নাড়ছে) ও রবিন (পা জখম) আটকা,
// পাশে ভাঙা নৌকা। চাচার কথা শোনো, রবিনকে চিকিৎসা-ব্যাগ দাও, তারপর ভারী নৌকায় ফেরার পথ।
import { Platformer } from '../engine/scene.js';
import { DIALOGUE } from '../data/dialogue.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class RescueScene extends Platformer {
  enter(opts={}){
    // চর (বালুচর)-এর বালুর উপরিতল আঁকা ছবিতে y≈৪১০; সেখানে দাঁড়াবে, পানিতে নয়।
    this.worldW=1280; this.groundY=412; this.ambience='quiet'; this.mood='rescue'; this.bgKey='bg_rescue';
    this.canRun=false; this.noVitals=true;
    this.addGround(412); this.leftBound=360; this.rightBound=880;
    this.checkpoints=[{x:450,y:326}]; this.spawn(0); this.setAudio();
    const F=this.G.state.flags;
    this.met=!!F.rs_met; this.rescued=!!F.rs_done;

    // করিম চাচা — বালুচরের উপর, হাত নাড়ছে
    this.karim=this.addNPC({ key:'karim', x:565, groundY:410, pose:'wave', facesPlayer:true });
    this.addInteract({ x:565, y:405, r:95, talk:true, markY:300, hint:'করিম চাচার কথা শোনো (E)',
      onE:()=>{ this.karim.talking=true;
        this.G.ui.startDialogue(DIALOGUE.rescue_meet, ()=>{ this.karim.talking=false; F.rs_met=1; this.met=true;
          this.G.setObjective('রবিনকে সালমা আপার চিকিৎসা-ব্যাগ দাও।'); }); } });

    // রবিন — পা জখম, বসা (ছবি-প্রপ)
    this.robinX=700;
    this.robinI=this.addInteract({ x:700, y:405, r:90, markY:306, hint:'রবিনকে সাহায্য করো (E)',
      onE:()=>this._helpRobin() });

    this.exit=this.addInteract({ x:845, y:405, r:80, hidden:!this.rescued, markY:300, hint:'নৌকায় তোলো → ফেরার পথ (E)',
      onE:()=>this.G.changeScene('river',{mode:'return'}) });

    if (!this.met) this.G.setObjective('চরে করিম চাচার কাছে যাও — কী হয়েছে শোনো।');
    else if (!this.rescued) this.G.setObjective('রবিনকে চিকিৎসা-ব্যাগ দাও।');
    else this.G.setObjective('সবাইকে নিয়ে ভারী নৌকায় সাবধানে ঘাটে ফেরো।');

    if (!opts.loaded) this.G.ui.startDialogue([{s:'player',t:'ওই তো চর! চাচা, রবিন — মুই আইসা পড়ছি!',e:'serious'}]);
  }

  _helpRobin(){
    const F=this.G.state.flags;
    if (this.rescued){ this.G.ui.toast('রবিন তৈরি — ডান দিকে নৌকায় তোলো।','info',1.6); return; }
    if (!this.met){ this.G.ui.toast('আগে করিম চাচার কথা শোনো।','info',2); return; }
    if (!F.has_medbag){ this.G.ui.startDialogue(DIALOGUE.rescue_nobag); return; }
    this.G.ui.startDialogue(DIALOGUE.rescue_heal, ()=>{ F.rs_done=1; this.rescued=true; this.exit.hidden=false;
      this.robinI.hidden=true; this.G.addClue&&this.G.addClue('robin_safe');
      this.G.setObjective('ডান দিকে নৌকায় তুলে ভারী নৌকায় ঘাটে ফেরো।'); this.G.audio.sfx('success'); });
  }

  drawBackground(ctx,cam){ const W=this.G.W,H=this.G.H,t=this.t;
    if (!Assets.has('bg_rescue')){ A.sky(ctx,W,H,A.PAL.skyDusk); A.stars(ctx,W,H,20,t);
      A.water(ctx,0,420,W,H-420,A.PAL.waterNight,t,true); } }
  drawWorld(ctx){ const t=this.t;
    if (!Assets.has('bg_rescue')){
      A.groundStrip(ctx,260,this.groundY,760,160,'#8a7a54','#5a4a30');
      A.bananaTree(ctx,980,this.groundY,0.9,t); }
    // ভাঙা নৌকা (চরের বাঁ কিনারায়, পানিতে আধ-ডোবা, একটু কাত)
    const bb=Assets.prop('brokenboat');
    if (bb){ const w=250, h=bb.naturalHeight*(w/bb.naturalWidth); ctx.save();
      ctx.translate(250, 470); ctx.rotate(-0.08); ctx.drawImage(bb, -w/2, -h*0.5, w, h); ctx.restore(); }
    // রবিন — জখম, বসা (বালুচরের উপর)
    if (!this.rescued){ const ri=Assets.prop('robin_injured');
      if (ri){ const h=116, w=ri.naturalWidth*(h/ri.naturalHeight); ctx.drawImage(ri, this.robinX-w/2, this.groundY-h+4, w, h); }
      else { A.drawActor(ctx,'robin',this.robinX,this.groundY,t,{pose:'idle',face:-1}); } }
    else { A.drawActor(ctx,'robin',this.robinX,this.groundY,t,{pose:'wave',face:1}); }
    // লণ্ঠন চরের উপর
    const ln=Assets.prop('lantern'); if (ln){ const h=60,w=ln.naturalWidth*(h/ln.naturalHeight); ctx.drawImage(ln,640-w/2,this.groundY-h,w,h); }
  }
}
