// অধ্যায় ৪: ভাঙা পথ (জঙ্গল) — এক-পর্দা: দুই পাড়ের মাঝে পানি, গুঁড়ির ওপর লাফ।
// ছোট সাপ ধাপে ধাপে আসে (প্রথমে একটি, গুঁড়ি পেরোনোর পর আরেকটি); শেষে বড় সাপ আসে —
// তখন ছোট সাপ আর থাকে না, বড় সাপ হিস্‌ দিয়ে তিনটি ধাঁধা জিজ্ঞেস করে।
import { Platformer } from '../engine/scene.js';
import { pickRiddles, askRiddles } from '../data/riddles.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class BrokenPathScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=545; this.ambience='bamboo'; this.mood='mystery'; this.bgKey='bg_broken2';
    this.canRun=true; this.doubleJump=true; this.leftBound=40; this.rightBound=1270;   // বড় খাদ পেরোতে ডাবল লাফ

    // আঁকা ছবির পানির কিনারার সঙ্গে মিলিয়ে: বড় খাদের পানি ৮৩০–১০০৫, পাথর ঠিক মাঝে।
    this.addPlatform(-120,545,465,340);        // বাঁ ডাঙা (−১২০ → ৩৪৫)
    this.addPlatform(345,600,75,150,{noSafe:true});   // ছোট খাদের তলা (নিরাপদ অবতরণ)
    this.addPlatform(420,545,410,340);         // মাঝের চওড়া ডাঙা (৪২০ → ৮৩০) — সাপ এখানে
    this.addHazard(830,604,175,220);           // বড় খাদ — পানি (৮৩০ → ১০০৫)
    this.rock=this.addPlatform(872,545,90,170,{rock:true});   // খাদের ঠিক মাঝে আলাদা পাথর (৮৭২ → ৯৬২)
    this.addPlatform(1005,545,395,340);        // ডান ডাঙা (১০০৫ → ১৪০০) — বড় সাপের এলাকা

    // একটি ছোট সাপ, চওড়া মাঝের ডাঙায় (৪২০–৮২০) — টপকে যাওয়ার মত জায়গা আছে
    this.snakeA=this.addHazard(560,this.groundY-14,66,14,{snake:true,tol:8,anim:0,min:470,max:770,dir:1,spd:44});
    this.snakes=[this.snakeA];
    this.bigActive=false; this.hissCd=3;

    // ভাসমান হৃদয়
    this.addHeart(620, 512, 'heart_bp1');        // মাঝের ডাঙায় (একবারই)
    this.addHeart(1200, 500, 'heart_bp2');        // ডান ডাঙায় (একবারই)
    // বড় সাপের sprite আগেই লোড করি — নইলে আসার মুহূর্তে ভেক্টর সাপ ঝলক দেয়
    Assets.anim('bigsnake','idle'); Assets.anim('snake','slither');

    this.checkpoints=[{x:150,y:459},{x:1130,y:459}];
    this.gatePassed=!!this.G.state.flags.bp_gate;
    if (this.gatePassed) this.bigActive=true;
    if (opts.enter==='right'){ this.checkpoint=1; this.player.x=1210; this.player.y=459; this.player.vx=this.player.vy=0; }
    else { this.checkpoint=opts.checkpoint||0; this.spawn(this.checkpoint); }
    this.setAudio();

    this.back=this.addInteract({ x:60, y:534, r:70, markY:430, hint:'← বাঁশঝাড়ে ফেরো (E)',
      onE:()=>this.G.changeScene('bamboo',{enter:'right'}) });
    this.gate=this.addInteract({ x:1185, y:534, r:115, markY:330, hidden:this.gatePassed,
      hint:'বড় সাপ পথ আটকেছে — কথা বলো (E)', onE:()=>this._riddleGate() });
    this.exit=this.addInteract({ x:1255, y:534, r:70, hidden:!this.gatePassed, hint:'বড় খাদের দিকে → (E)',
      onE:()=>this.G.changeScene('bigchasm',{enter:'left'}) });

    if (!opts.loaded && opts.enter!=='right' && this.checkpoint===0){
      this.G.setObjective('ভাঙা পথ পেরোও — সাপ টপকাইয়া বড় খাদ পার অও।');
      this.G.ui.tip('ছোট খাদে পড়লেও ভয় নাই — আবার উঠে আসা যায়', 4.2);
      this.G.ui.tip('মাঝের ডাঙার সাপ টপকাইয়া যাও', 5.2);
    }
  }

  _moveSnake(h,dt){ if(h.off) return; h.anim=(h.anim||0)+dt; h.x += h.dir*h.spd*dt;
    if(h.x>h.max){h.dir=-1;} if(h.x<h.min){h.dir=1;} }

  onUpdate(dt){
    const px=this.player.x;
    this._moveSnake(this.snakeA,dt);

    // বড় খাদের কাছে এলে নির্দেশনা (একবার)
    if (!this._djTip && px>700 && !this.gatePassed){ this._djTip=true;
      this.G.ui.tip('মাঝের পাথরে পা রাইখা দুই লাফে বড় খাদ পার হও', 4.5);
      this.G.ui.tip('চাইলে Space দুইবার চাপো — ডাবল লাফ (ফোনে লাফ-বোতাম দুইবার)', 5.5); }

    const snakesOn = !this.snakeA.off && !this.gatePassed;
    if (snakesOn){ this.hissCd-=dt; if (this.hissCd<=0){ this.hissCd=5+Math.random()*3; this.G.audio.sfx('hiss'); } }

    if (px>1010 && this.checkpoint<1){ this.checkpoint=1; this.reachCheckpoint(1);
      this.G.setObjective('ডান ডাঙায় পৌঁছেছ — সামনে বড় সাপ পথ আটকেছে।'); }

    // ডান ডাঙায় উঠলে বড় সাপ আসে — ছোট সাপ সরে যায়
    if (px>1030 && !this.bigActive){
      this.bigActive=true; this.snakeA.off=true;
      this.G.audio.sfx('hiss');
      this.G.setObjective('বিশাল এক সাপ পথ আটকেছে — ধাঁধার উত্তর দাও।');
    }
  }

  _riddleGate(){
    if (this.gatePassed) return;
    this.G.audio.sfx('hiss');
    const riddles=pickRiddles(3);
    this.G.ui.startDialogue([
      {s:'narr',t:'বিশাল এক সাপ ফণা তুইলা পথ আটকাইয়া খাড়াইল — ফোঁস ফোঁস শব্দে চাইরদিক কাঁইপা উঠল।',e:'serious'},
      {s:'narr',t:'“তিনডা ধাঁধা শুধামু। পারলে ছাইড়া দিমু, না পারলে… এই পথেই শেষ!”',e:'serious'}],
      ()=> askRiddles(this.G, riddles, 'বড় সাপের পরীক্ষা',
        ()=>{ this.G.state.flags.bp_gate=1; this.gatePassed=true; this.gate.hidden=true; this.gate.done=true;
          this.exit.hidden=false; this.G.audio.sfx('success');
          this.G.setObjective('সাপ পথ ছেড়ে দিল — ডান দিকে এগোও।');
          this.G.ui.startDialogue([{s:'narr',t:'“বুদ্ধি আছে দেহি… যা, পথ খোলা।” সাপ সইরা গেল।',e:'idle'}]); },
        (r)=>{ this.G.ui.startDialogue([{s:'narr',t:'“ভুল! উত্তর আছিল — “'+r.answer+'”।”',e:'serious'}],
            ()=>{ this.G.audio.sfx('fail'); this.damage(3,'force'); }); })
    );
  }

  drawBackground(ctx,cam){
    const W=this.G.W,H=this.G.H,t=this.t;
    A.sky(ctx,W,H,A.PAL.skyDusk);
    A.treeline(ctx,W,430,'#243a2e',3,46);
    A.water(ctx,0,560,W,H-560,A.PAL.waterNight,t,true);
  }
  drawWorld(ctx){
    const t=this.t; const painted=Assets.has('bg_broken2');
    if (!painted){
      for (const pl of this.platforms){ if (pl.visual||pl.kind) continue;
        A.groundStrip(ctx,pl.x,pl.y,pl.w,pl.h,'#5a4a30','#3a3020'); }
      A.bambooClump(ctx,120,575,180,t); A.bambooClump(ctx,1160,575,170,t);
    }
    // বড় খাদের মাঝের পাথর (পা রাখার জায়গা)
    this._drawRock(ctx);
    // ছোট সাপ (sprite থাকলে sprite, নইলে ভেক্টর)
    for (const s of this.snakes){ if (s.off) continue; this._drawSnake(ctx,s); }
    // বড় সাপ
    if (this.bigActive && !this.gatePassed) this._drawBigSnake(ctx, this.gate.x, this.groundY);
  }

  _drawRock(ctx){
    const r=this.rock; if(!r) return; const x=r.x, w=r.w, top=r.y, t=this.t;
    ctx.save();
    // গোড়ায় পানির ছায়া (পাথরের প্রস্থের মধ্যেই)
    ctx.fillStyle='rgba(18,28,32,0.5)'; ctx.beginPath(); ctx.ellipse(x+w/2, top+92, w*0.5, 10, 0,0,7); ctx.fill();
    // পাথরের দেহ — উপরে চওড়া, নিচে সরু (সংঘর্ষ-প্রস্থের বাইরে কোনো অংশ নাই, তাই ভুয়া কিনারায় পড়ার ভয় নাই)
    ctx.fillStyle='#625a50';
    ctx.beginPath();
    ctx.moveTo(x+3, top+2); ctx.lineTo(x+w-3, top+2);
    ctx.lineTo(x+w-20, top+92); ctx.lineTo(x+20, top+92); ctx.closePath(); ctx.fill();
    // আলো দিক
    ctx.fillStyle='#726a5e';
    ctx.beginPath(); ctx.moveTo(x+3,top+2); ctx.lineTo(x+w*0.5,top+2); ctx.lineTo(x+w*0.44,top+78); ctx.lineTo(x+18,top+78); ctx.closePath(); ctx.fill();
    // চ্যাপ্টা মাথা — দাঁড়ানোর ঠিক জায়গা = সংঘর্ষ প্রস্থ (x … x+w)
    ctx.fillStyle='#837a6c'; A.rr(ctx, x, top-2, w, 11, 4); ctx.fill();
    ctx.fillStyle='rgba(74,96,56,0.5)'; A.rr(ctx, x+5, top-1, w-10, 5, 3); ctx.fill();   // শ্যাওলা
    // ছোট ঢেউ গোড়ায়
    ctx.strokeStyle='rgba(150,190,200,0.3)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(x+w/2, top+90+Math.sin(t*3)*2, w*0.62, 6, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }
  _drawSnake(ctx,h){
    const cx=h.x+h.w/2, face=h.dir>0?1:-1;
    // snake_slither স্ট্রিপ — ডিফল্ট মুখ ডানে ধরা হলো
    if (A.drawSprite(ctx,'snake','slither', cx, this.groundY+2, 84, h.anim||this.t, face, {shadow:true})) return;
    const t=this.t, x=h.x, y=h.y+12;
    ctx.save(); ctx.strokeStyle='#5a6a34'; ctx.lineWidth=8; ctx.lineCap='round';
    ctx.beginPath(); for(let i=0;i<=h.w;i+=6){ const yy=y+Math.sin(i*0.25+t*8)*4; i===0?ctx.moveTo(x+i,yy):ctx.lineTo(x+i,yy); } ctx.stroke();
    const hx=h.dir>0?x+h.w:x; ctx.fillStyle='#4a5a2a'; ctx.beginPath(); ctx.arc(hx,y,6,0,7); ctx.fill();
    ctx.fillStyle='#d64a4a'; ctx.fillRect(hx+(h.dir>0?3:-6),y-1,4,1.6);
    ctx.restore();
  }
  _drawBigSnake(ctx,x,base){
    const t=this.t;
    // bigsnake_idle স্ট্রিপ — খেলোয়াড়ের দিকে (বাঁয়ে) মুখ করা
    if (A.drawSprite(ctx,'bigsnake','idle', x, base+6, 250, t, -1, {shadow:false})) return;
    // sprite এখনো লোড হইতাছে → ভেক্টর আঁকি না (ঝলক এড়াতে)
    if (Assets.status && Assets.status['anim_bigsnake_idle']!=='miss') return;
    ctx.save(); ctx.strokeStyle='#4a6a2f'; ctx.lineWidth=28; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x-44,base); ctx.quadraticCurveTo(x-10,base-50,x+6,base-130+Math.sin(t*2)*6); ctx.stroke();
    ctx.fillStyle='#4a6a2f'; ctx.beginPath(); ctx.ellipse(x+8,base-150+Math.sin(t*2)*6,28,22,0,0,7); ctx.fill();
    ctx.fillStyle='#2e3a1e'; ctx.beginPath(); ctx.ellipse(x+8,base-174+Math.sin(t*2)*6,17,17,0,0,7); ctx.fill();
    ctx.fillStyle='#e8c84a'; ctx.beginPath(); ctx.arc(x+1,base-176+Math.sin(t*2)*6,3.4,0,7); ctx.arc(x+15,base-176+Math.sin(t*2)*6,3.4,0,7); ctx.fill();
    ctx.strokeStyle='#d64a4a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+8,base-162+Math.sin(t*2)*6); ctx.lineTo(x+8,base-148); ctx.stroke();
    ctx.restore();
  }
}
