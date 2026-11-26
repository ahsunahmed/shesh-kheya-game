// অধ্যায় ৩ক: বাঁশঝাড় (bamboo.jpg) — অনুসন্ধান-পর্দা।
// সামনের চওড়া খাদ পার হইতে নিজেই সাঁকো বানাইতে অইব। তার জন্য দরকারি দুইটা জিনিস এইহানে
// ছড়াইয়া আছে — দড়ি ও বাঁশ। সাথে একটা অকেজো জিনিসও আছে (বুদ্ধি কইরা বাছতে অইব)।
// সরাসরি ইঙ্গিত নাই; শুধু রহস্যময় উক্তি। জিনিস না নিয়াও সামনে যাওয়া যায়, কিন্তু খাদে গিয়া
// সাঁকো বানানো যাবে না — তখন ফিরা আইসা নিতে অইব।
import { Platformer } from '../engine/scene.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class BambooGroveScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=612; this.ambience='bamboo'; this.mood='mystery'; this.bgKey='bg_bamboo';
    this.canRun=false; this.noVitals=true;
    this.addGround(612); this.leftBound=70; this.rightBound=1210;
    this.checkpoints=[{x:150,y:520}];
    if (opts.enter==='right'){ this.player.x=1150; this.player.y=520; this.player.vx=this.player.vy=0; }
    else this.spawn(0);
    this.setAudio();
    const F=this.G.state.flags;

    this.back=this.addInteract({ x:100, y:600, r:70, markY:500, hint:'← গ্রামে ফেরো (E)',
      onE:()=>this.G.changeScene('village',{enter:'right'}) });

    // সাঁকোর জন্য দরকারি জিনিস (কোনো মার্কার নাই — খুঁজে পেতে হবে)
    this.items=[
      {x:470, kind:'bamboo', flag:'has_bamboo', got:'has_bamboo',
        msg:'কয়েকটা শক্ত বাঁশ! পাটাতন বানাইতে লাগব — তুইলা নিলা।'},
      {x:780, kind:'rope', flag:'has_rope', got:'has_rope',
        msg:'একটা শক্ত পাকানো দড়ি! বাঁধনের কামে লাগব — কাঁধে নিলা।'},
    ];
    for (const it of this.items){ it.it=this.addInteract({ x:it.x, y:600, r:56, markY:556, hidden:!!F[it.flag], noMarker:true,
      hint:'(E) পরখ করো', onE:()=>this._take(it) }); }

    // অকেজো জিনিস (red herring) — তোলা যায়, কাজে লাগে না
    this.decoy={x:980, kind:'bucket', msg:'পুরান ফুটা বালতি — কোনো কামে লাগব না।'};
    this.decoy.it=this.addInteract({ x:980, y:600, r:52, markY:556, once:true, noMarker:true,
      hint:'(E) পরখ করো', onE:()=>{ this.G.audio.sfx('ui'); this.G.ui.tip(this.decoy.msg, 2.8); } });

    this.exit=this.addInteract({ x:1200, y:600, r:80, markY:500, hint:'ভাঙা খাদের দিকে → (E)',
      onE:()=>this.G.changeScene('bamboo',{enter:'left'}) });

    this._refreshObj();
    if (!opts.loaded && opts.enter!=='right' && !(F.has_rope&&F.has_bamboo)){
      this.G.ui.tip('বাঁশঝাড়ের ফিসফিস — “খালি হাতে ভাঙা খাদ কেউ পার অয় না।”', 5.5);
      this.G.ui.tip('এদিক-ওদিক খুঁইজা দেখো — পার অওনের জিনিস ছড়াইয়া আছে।', 5);
    }
  }

  _refreshObj(){
    const F=this.G.state.flags;
    if (F.has_rope && F.has_bamboo) this.G.setObjective('দড়ি আর বাঁশ — দুইটাই নেওয়া অইছে। ভাঙা খাদের দিকে আগাও।');
    else this.G.setObjective('বাঁশঝাড় ঘুইরা দেখো — খাদ পার অইতে কী কী লাগব, কুড়াইয়া নাও।');
  }
  _take(it){
    const F=this.G.state.flags; if (F[it.flag]) return;
    F[it.flag]=1; it.it.hidden=true; this.G.audio.sfx('success');
    this.G.ui.tip(it.msg, 3.8); this._refreshObj(); this.G.save&&this.G.save();
    if (F.has_rope && F.has_bamboo) this.G.ui.tip('যা যা লাগত, পাইছ মনে অয়। এবার খাদের দিকে যাও।', 4);
  }

  drawWorld(ctx){
    const t=this.t, g=this.groundY;
    if (!Assets.has('bg_bamboo')){
      A.groundStrip(ctx,-200,g,this.worldW+400,200,'#7a6a44','#5a4a30');
      A.bambooClump(ctx,300,g,170,t); A.bambooClump(ctx,980,g,160,t);
      A.liveWater(ctx,360,320,900,120,t);
    }
    const F=this.G.state.flags;
    // দড়ি
    if (!F.has_rope){ const img=Assets.prop('ropecoil');
      if (img){ const h=42, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, 780-w/2, g-h+6, w, h); }
      else { ctx.save(); ctx.strokeStyle='#caa15a'; ctx.lineWidth=4; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.ellipse(780,g-6-i*4,22-i*3,7-i,0,0,7); ctx.stroke(); } ctx.restore(); } }
    // বাঁশ (কয়েকটা মাটিতে পড়া)
    if (!F.has_bamboo) this._drawBamboo(ctx,470,g);
    // অকেজো বালতি
    if (!this.decoy.it.done){ const img=Assets.prop('bucket');
      if (img){ const h=54, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, 980-w/2, g-h+6, w, h); }
      else { ctx.save(); ctx.fillStyle='#8a7a5a'; A.rr(ctx,964,g-30,32,28,4); ctx.fill(); ctx.restore(); } }
  }
  _drawBamboo(ctx,x,g){
    ctx.save();
    for (let i=0;i<3;i++){ const yy=g-8-i*7;
      ctx.strokeStyle= i%2? '#8fae4a':'#7a9a3e'; ctx.lineWidth=9; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x-46, yy+i*2); ctx.lineTo(x+46, yy-i*2); ctx.stroke();
      ctx.strokeStyle='#5a7a2a'; ctx.lineWidth=2;
      for (let k=-1;k<2;k++){ const nx=x+k*26; ctx.beginPath(); ctx.moveTo(nx,yy-4+i*2); ctx.lineTo(nx,yy+4+i*2); ctx.stroke(); } }
    ctx.restore();
  }
}
