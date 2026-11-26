// অধ্যায় ৩খ: বাঁশঝাড়ের খাদ (bamboo2.jpg) — নিজে সাঁকো বানাইয়া পার হওয়া।
// আগের বাঁশঝাড় থেকে আনা দড়ি ও বাঁশ লাগবে। ধাপ:
//   (১) মোটা শক্ত খুঁটিতে দড়ি বাঁধো (ভুল খুঁটি নড়ে, সয় না)
//   (২) বাঁশ বিছাইয়া পাটাতন বানাও → সাঁকো তৈরি → হেঁটে পার হও।
// জিনিস না আনলে এই ধাপ করা যাবে না — বাঁশঝাড়ে ফিরা আনতে অইব।
import { Platformer } from '../engine/scene.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class BambooScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=484; this.ambience='bamboo'; this.mood='mystery'; this.bgKey='bg_bamboo2';
    this.canRun=false; this.leftBound=40; this.rightBound=1240;   // দৌড় নাই → চওড়া খাদ লাফে পেরোনো যায় না

    this.addPlatform(-120,484,747,360);     // বাঁ পাড় (−১২০ → ৬২৭)
    this.addPlatform(860,484,540,360);      // ডান পাড় (৮৬০ → ১৪০০)
    this.water=this.addHazard(627,560,233,260);   // খাদের পানি (পড়লে এক প্রাণ)

    const F=this.G.state.flags;
    this.hasRope=!!F.has_rope; this.hasBamboo=!!F.has_bamboo;
    this.tied=!!F.sako_tied;                                  // দড়ি বাঁধা হয়েছে?
    this.ropeSolved=this.G.state.clues.has('bamboo_lesson');  // সাঁকো সম্পূর্ণ?
    this.bridge=this.addPlatform(600,484,286,16,{bridgepl:true});
    this.bridge.broken=!this.ropeSolved;

    // খুঁটি তিনটা একটু পিছনে (শক্ত খুঁটিও যেন খাদে না ভাসে)
    this.posts=[
      {x:452,kind:'thin',  img:'post_thin',   shake:0, broken:false, breakT:0},
      {x:510,kind:'rotten',img:'post_rotten', shake:0, broken:false, breakT:0},
      {x:568,kind:'thick', img:'post_thick',  shake:0, broken:false, breakT:0},
    ];

    this.addHeart(743, 438, 'heart_bamboo');   // একবারই নেওয়া যায় (লেভেল ফিরলেও আর আসে না)

    this.checkpoints=[{x:150,y:398},{x:1100,y:398}];
    if (opts.enter==='right'){ this.checkpoint=1; this.player.x=1140; this.player.y=398; this.player.vx=this.player.vy=0; }
    else { this.checkpoint=opts.checkpoint||0; this.spawn(this.checkpoint); }
    this.setAudio();

    this.back=this.addInteract({ x:90, y:472, r:70, markY:380, hint:'← বাঁশঝাড়ে ফেরো (E)',
      onE:()=>this.G.changeScene('bamboogrove',{enter:'right'}) });
    for (const po of this.posts){
      po.it=this.addInteract({ x:po.x, y:472, r:24, markY:348, noMarker:this.ropeSolved,
        hint:'(E) সাঁকো বানাও', onE:()=>this._build(po) });
    }
    this.exit=this.addInteract({ x:1180, y:472, r:80, markY:380, hint:'ভাঙা পথের দিকে → (E)',
      onE:()=>this.G.changeScene('brokenpath',{enter:'left'}) });

    this._refresh();
    if (!opts.loaded && opts.enter!=='right' && !this.ropeSolved){
      if (!this.hasRope && !this.hasBamboo){
        this.G.ui.tip('সামনে চওড়া খাদ — লাফে পেরোনো যাইব না', 4.2);
        this.G.ui.tip('খালি হাতে সাঁকো বানানো যায় না — বাঁশঝাড়ে ফিরা দড়ি-বাঁশ আনো।', 5.5);
      } else {
        this.G.ui.tip('মোটা শক্ত খুঁটিতে দড়ি বাঁধো, তারপর বাঁশ বিছাইয়া পাটাতন বানাও', 5.2);
      }
    }
  }

  _refresh(){
    if (this.ropeSolved) this.G.setObjective('সাঁকো তৈরি — খাদ পার অইয়া ডান দিকে যাও।');
    else if (this.tied) this.G.setObjective('দড়ি বাঁধা — এবার বাঁশ বিছাইয়া পাটাতন বানাও (খুঁটিতে E)।');
    else if (this.hasRope) this.G.setObjective('মোটা শক্ত খুঁটিতে দড়ি বাঁধো।');
    else this.G.setObjective('সাঁকো বানাইতে দড়ি-বাঁশ লাগব — বাঁশঝাড়ে ফিরা আনো।');
  }

  _build(po){
    if (this.ropeSolved) return;
    const F=this.G.state.flags;
    // ধাপ ১: দড়ি বাঁধা
    if (!this.tied){
      if (!this.hasRope){ this.G.audio.sfx('fail'); this.G.ui.tip('বাঁধনের দড়িই তো নাই! ← বাঁশঝাড়ে ফিরা দড়ি আনো।', 3.6); return; }
      // দুর্বল খুঁটিতে বাঁধলে খুঁটি ভাইঙ্গা পড়ে — খেলোয়াড় খাদে পইড়া এক জীবন হারায়
      if (po.kind!=='thick'){
        if (!po.broken){ po.broken=true; po.breakT=0.9; this.G.audio.sfx('knock'); this.G.audio.sfx('splash');
          this.damage(1,'force');
          this.G.ui.tip('দুর্বল খুঁটি ভাইঙ্গা পড়ল — টাল সামলাইতে না পাইরা খাদে পইড়া এক জীবন গেল!', 3.8);
        } else this.G.ui.tip('এই খুঁটি তো আগেই ভাঙা — মোটা শক্ত খুঁটিতে বাঁধো।', 2.6);
        return;
      }
      this.tied=true; F.sako_tied=1; this.G.audio.sfx('success');
      this.G.ui.tip('দড়ি টান-টান বাঁধা অইল! এবার বাঁশ বিছাইয়া পাটাতন বানাও — আবার E চাপো।', 4.5);
      this._refresh(); this.G.save&&this.G.save(); return;
    }
    // ধাপ ২: বাঁশ বিছাইয়া পাটাতন
    if (po.kind!=='thick'){ this.G.ui.tip('দড়ি তো মোটা খুঁটিতে বাঁধা — ওইখানেই বাঁশ বিছাও।', 2.8); return; }
    if (!this.hasBamboo){ this.G.audio.sfx('fail'); this.G.ui.tip('পাটাতনের বাঁশ নাই! ← বাঁশঝাড়ে ফিরা বাঁশ আনো।', 3.6); return; }
    this.ropeSolved=true; this.bridge.broken=false;
    for (const p2 of this.posts){ if (p2.it) p2.it.noMarker=true; }
    this.G.addClue('bamboo_lesson'); this.G.audio.sfx('success'); this.G.ui.toast('সাঁকো তৈরি!','success');
    this.G.ui.tip('নিজের বানানো সাঁকো! সাবধানে খাদ পার অও।', 4.2);
    this._refresh();
  }

  onUpdate(dt){
    for (const po of this.posts){ if (po.shake>0) po.shake-=dt; if (po.breakT>0) po.breakT-=dt; }
    const px=this.player.x;
    if (px>900 && this.checkpoint<1){ this.checkpoint=1; this.reachCheckpoint(1);
      this.G.setObjective('খাদ পার অইছ — ডান দিকে ভাঙা পথের দিকে যাও।'); }
  }

  drawWorld(ctx){
    const t=this.t, g=this.groundY;
    if (!Assets.has('bg_bamboo2')){
      A.groundStrip(ctx,-200,g,760,260,'#7a6a44','#5a4a30');
      A.groundStrip(ctx,860,g,620,260,'#7a6a44','#5a4a30');
      A.liveWater(ctx,627,g+20,233,120,t);
    }
    this._drawPosts(ctx);
    if (this.ropeSolved) this._drawBridge(ctx);
    else if (this.tied) this._drawRopeOnly(ctx);   // দড়ি বাঁধা, পাটাতন বাকি
  }

  _drawPosts(ctx){
    const g=this.groundY, t=this.t;
    for (const po of this.posts){
      const img=Assets.prop(po.img);
      ctx.save();
      if (po.broken){
        // ভাঙা খুঁটি — কাত হইয়া পড়া
        const fall=Math.min(1.15, (0.9-(po.breakT>0?po.breakT:0))*1.4);
        ctx.translate(po.x, g); ctx.rotate(0.5+fall);
        if (img){ const h=140, w=img.naturalWidth*(h/img.naturalHeight); ctx.globalAlpha=0.9; ctx.drawImage(img, -w/2, -h+6, w, h); }
        else { ctx.fillStyle='#6a4a2c'; A.rr(ctx,-10,-110,20,110,4); ctx.fill(); }
      } else {
        const sh = po.shake>0 ? Math.sin(t*46)*4*(po.shake/0.6) : 0;
        ctx.translate(po.x+sh, g);
        if (img){ const h=150, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, -w/2, -h+6, w, h); }
        else { ctx.fillStyle='#7a5a38'; A.rr(ctx,-10,-120,20,120,4); ctx.fill(); }
      }
      ctx.restore();
    }
  }
  // দড়ি বাঁধা কিন্তু পাটাতন হয়নি — শুধু টান-টান দড়ি দেখা যায়
  _drawRopeOnly(ctx){
    const g=this.groundY;
    A.rope(ctx, 568, g-118, 900, g-96, 44);
    A.rope(ctx, 568, g-96, 900, g-74, 46);
  }
  _drawBridge(ctx){
    const img=Assets.prop('ropebridge');
    if (img){ const w=300, h=w*(img.naturalHeight/img.naturalWidth);
      const deckFrac=0.80, top=this.groundY - h*deckFrac;
      ctx.drawImage(img, 743-w/2, top, w, h); return; }
    A.rope(ctx, 616, this.groundY-8, 866, this.groundY-8, 28);
    ctx.fillStyle='#b08a4a'; A.rr(ctx, 620, this.groundY-2, 246, 10, 3); ctx.fill();
  }
}
