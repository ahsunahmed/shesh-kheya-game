// অধ্যায় ৪ক: বড় খাদ (জঙ্গল) — এক চলমান গুঁড়ি বাঁয়ে-ডানে দোলে; তার উপর লাফিয়ে উঠে ওপারে যেতে হয়।
// না পারলে পানিতে পড়ে এক প্রাণ যায়। গুঁড়ির উপরে একটি ভাসমান হৃদয় (জীবন)।
import { Platformer } from '../engine/scene.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class BigChasmScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=524; this.ambience='bamboo'; this.mood='mystery'; this.bgKey='bg_bigchasm';
    this.canRun=true; this.leftBound=40; this.rightBound=1240;

    this.addPlatform(-120,524,540,340);       // বাঁ পাড় (−১২০ → ৪২০) — আঁকা ঘাসের সঙ্গে মিলিয়ে উপরে
    this.addPlatform(860,524,540,340);         // ডান পাড় (৮৬০ → ১৪০০)
    this.addHazard(420,608,440,220);           // মাঝের বড় খাদ — পানি (পড়লে এক প্রাণ)

    // একটিমাত্র চলমান গুঁড়ি — খাদের ভিতরেই বাঁয়ে-ডানে দোলে, পানির ঠিক উপরে
    // বাঁ প্রান্ত ৪২৪↔৭২৪ → গুঁড়ি সবসময় ৪২০…৮৬০ খাদের মধ্যে থাকে
    this.log=this.addPlatform(574,548,132,16,{kind:'osc',amp:150,speed:0.8,axis:'x',visual:'log'});

    // গুঁড়ির উপরে ভাসমান হৃদয় (গুঁড়ির সাথে সরে)
    this.logHeart=this.addHeart(this.log.x+this.log.w/2, this.log.y-24, 'heart_bigchasm');

    this.checkpoints=[{x:150,y:438},{x:1080,y:438}];
    this.crossed=!!this.G.state.flags.chasm_done;
    if (opts.enter==='right'){ this.checkpoint=1; this.player.x=1100; this.player.y=438; this.player.vx=this.player.vy=0; }
    else { this.checkpoint=opts.checkpoint||0; this.spawn(this.checkpoint); }
    this.setAudio();

    this.back=this.addInteract({ x:60, y:540, r:70, markY:440, hint:'← ভাঙা পথে ফেরো (E)',
      onE:()=>this.G.changeScene('brokenpath',{enter:'right'}) });
    this.exit=this.addInteract({ x:1180, y:540, r:80, markY:440, hint:'শেয়ালের মাঠের দিকে → (E)',
      onE:()=>this.G.changeScene('fox',{enter:'left'}) });

    if (!opts.loaded && opts.enter!=='right' && this.checkpoint===0){
      this.G.setObjective('দোলন্ত গুঁড়িতে লাফ দিয়া বড় খাদ পার অও।');
      this.G.ui.tip('মাঝের গুঁড়ি বাঁয়ে-ডানে দোলে — ঠিক সময়ে উপরে লাফ দাও', 4.5);
      this.G.ui.tip('পানিতে পড়লে এক প্রাণ যাবে · গুঁড়ির উপরে একটা জীবন আছে', 5.5);
    }
  }

  onUpdate(dt){
    // হৃদয় গুঁড়ির সাথে সরে
    if (this.logHeart && !this.logHeart.taken){ this.logHeart.x=this.log.x+this.log.w/2; this.logHeart.y=this.log.y-24; }
    const px=this.player.x;
    if (px>900 && this.checkpoint<1){ this.checkpoint=1; this.reachCheckpoint(1);
      this.crossed=true; this.G.state.flags.chasm_done=1; this.G.save&&this.G.save();
      this.G.setObjective('খাদ পার হয়েছ — ডান দিকে শেয়ালের মাঠে যাও।'); }
  }

  drawBackground(ctx,cam){
    const W=this.G.W,H=this.G.H,t=this.t;
    if (!Assets.has('bg_bigchasm')){ A.sky(ctx,W,H,A.PAL.skyDusk); A.treeline(ctx,W,430,'#243a2e',3,46);
      A.water(ctx,0,560,W,H-560,A.PAL.waterNight,t,true); }
  }
  drawWorld(ctx){
    const t=this.t;
    if (!Assets.has('bg_bigchasm')){
      for (const pl of this.platforms){ if (pl.visual||pl.kind) continue;
        A.groundStrip(ctx,pl.x,pl.y,pl.w,pl.h,'#5a4a30','#3a3020'); }
    }
  }
}
