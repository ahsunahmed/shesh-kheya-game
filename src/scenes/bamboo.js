// অধ্যায় ৩খ: বাঁশঝাড়ের খাদ (bamboo2.jpg) — নিজে সাঁকো বানাইয়া পার হওয়া।
// আগের বাঁশঝাড় থেকে আনা দড়ি ও বাঁশ লাগবে। খেলোয়াড় *যেকোনো* খুঁটিতে সাঁকো বাঁধতে পারে —
// কিন্তু দুর্বল (চিকন/পচা) খুঁটির সাঁকো পার হইতে গেলে মাঝপথে **ভাইঙ্গা পড়ে, এক জীবন যায়**।
// শুধু মোটা শক্ত খুঁটির সাঁকোই মজবুত — সেইটা দিয়াই পার হওয়া যায়।
import { Platformer } from '../engine/scene.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class BambooScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=484; this.ambience='bamboo'; this.mood='mystery'; this.bgKey='bg_bamboo2';
    this.canRun=false; this.leftBound=40; this.rightBound=1240;

    this.addPlatform(-120,484,747,360);        // বাঁ পাড় (−১২০ → ৬২৭)
    this.addPlatform(860,484,540,360);          // ডান পাড় (৮৬০ → ১৪০০)
    this.water=this.addHazard(627,560,233,260); // খাদের পানি (পড়লে এক প্রাণ)

    const F=this.G.state.flags;
    this.hasRope=!!F.has_rope; this.hasBamboo=!!F.has_bamboo;
    this.ropeSolved=this.G.state.clues.has('bamboo_lesson');   // সঠিক খুঁটির মজবুত সাঁকো (স্থায়ী)
    this.wrongAnchor=false; this.collapsing=false; this.collapseT=0;
    // সাঁকোর সংঘর্ষ-পাটাতন — noSafe: এর উপর দাঁড়ালে "নিরাপদ অবস্থান" ধরা হয় না (ভাঙলে পাড়ে ফিরবে)
    this.bridge=this.addPlatform(600,484,286,16,{bridgepl:true, noSafe:true});
    this.bridge.broken=!this.ropeSolved;

    this.posts=[
      {x:452,kind:'thin',  img:'post_thin'},
      {x:510,kind:'rotten',img:'post_rotten'},
      {x:568,kind:'thick', img:'post_thick'},
    ];

    this.addHeart(1040, 430, 'heart_bamboo');  // ওপারের পাড়ে — সফলভাবে পার হওয়ার পুরস্কার (একবারই)

    this.checkpoints=[{x:150,y:398},{x:1100,y:398}];
    if (opts.enter==='right'){ this.checkpoint=1; this.player.x=1140; this.player.y=398; this.player.vx=this.player.vy=0; }
    else { this.checkpoint=opts.checkpoint||0; this.spawn(this.checkpoint); }
    this.setAudio();

    this.back=this.addInteract({ x:90, y:472, r:70, markY:380, hint:'← বাঁশঝাড়ে ফেরো (E)',
      onE:()=>this.G.changeScene('bamboogrove',{enter:'right'}) });
    for (const po of this.posts){
      po.it=this.addInteract({ x:po.x, y:472, r:24, markY:348, noMarker:this.ropeSolved,
        hint:'(E) এই খুঁটিতে সাঁকো বাঁধো', onE:()=>this._build(po) });
    }
    this.exit=this.addInteract({ x:1180, y:472, r:80, markY:380, hint:'ভাঙা পথের দিকে → (E)',
      onE:()=>this.G.changeScene('brokenpath',{enter:'left'}) });

    this._refresh();
    if (!opts.loaded && opts.enter!=='right' && !this.ropeSolved){
      if (!this.hasRope || !this.hasBamboo){
        this.G.ui.tip('সামনে চওড়া খাদ — লাফে পেরোনো যাইব না', 4.2);
        this.G.ui.tip('খালি হাতে সাঁকো হয় না — বাঁশঝাড়ে ফিরা দড়ি-বাঁশ আনো।', 5.5);
      } else {
        this.G.ui.tip('যেকোনো খুঁটিতে সাঁকো বাঁধা যায় — কিন্তু দুর্বল খুঁটির সাঁকো পার হইতে গেলে ভাইঙ্গা পড়ব!', 6);
      }
    }
  }

  _refresh(){
    if (this.ropeSolved) this.G.setObjective('মজবুত সাঁকো তৈরি — খাদ পার অইয়া ডান দিকে যাও।');
    else if (this.hasRope && this.hasBamboo) this.G.setObjective('খুঁটিতে সাঁকো বাঁধো — শক্ত খুঁটি বাইছা নিও, নইলে পার হইতে ভাঙব।');
    else this.G.setObjective('সাঁকো বানাইতে দড়ি-বাঁশ লাগব — বাঁশঝাড়ে ফিরা আনো।');
  }

  // যেকোনো খুঁটিতে সাঁকো বানানো যায় (সঠিক/ভুল আগে বলা হয় না — পার হইতে গিয়া বোঝা যায়)
  _build(po){
    if (this.ropeSolved || this.collapsing) return;
    if (!this.hasRope || !this.hasBamboo){ this.G.audio.sfx('fail');
      this.G.ui.tip('দড়ি-বাঁশ ছাড়া সাঁকো হয় না — ← বাঁশঝাড়ে ফিরা আনো।', 3.6); return; }
    this.ropeSolved=true; this.bridge.broken=false;
    this.anchorKind=po.kind; this.wrongAnchor=(po.kind!=='thick');
    for (const p2 of this.posts){ if (p2.it) p2.it.noMarker=true; }
    this.G.audio.sfx('success'); this.G.ui.toast('সাঁকো বানাইলা','success');
    if (this.wrongAnchor){
      this.G.ui.tip('সাঁকো বানানো শেষ — এবার পার হও।', 3.2);
    } else {
      this.G.state.clues.add('bamboo_lesson'); this.G.save&&this.G.save();
      this.G.ui.tip('শক্ত খুঁটির সাঁকো — মজবুত! সাবধানে পার অও।', 3.6);
    }
    this._refresh();
  }

  // দুর্বল খুঁটির সাঁকো — মাঝপথে ভাইঙ্গা পড়ে
  _collapse(){
    this.collapsing=true; this.collapseT=0.5;
    this.ropeSolved=false; this.bridge.broken=true;          // সাঁকো নাই → খেলোয়াড় পইড়া যায়
    this.anchorKind=null; this.wrongAnchor=false;
    for (const p2 of this.posts){ if (p2.it) p2.it.noMarker=false; }   // আবার খুঁটি বাছা যাবে
    this.G.audio.sfx('knock'); this.G.audio.sfx('splash');
    this.G.ui.tip('দুর্বল খুঁটির সাঁকো! মাঝপথে ভাইঙ্গা খাদে পইড়া গেলা — এক জীবন গেল।', 4.2);
    this.G.setObjective('সাঁকো ভাঙল — এইবার মোটা শক্ত খুঁটিতে বাঁধো।');
    this.player.vy=Math.max(this.player.vy,80); this.player.onGround=false;   // নিশ্চিত পতন
  }

  onUpdate(dt){
    if (this.collapseT>0){ this.collapseT-=dt; if (this.collapseT<=0) this.collapsing=false; }
    const px=this.player.x;
    // ভুল খুঁটির সাঁকোতে মাঝপথে উঠলে ভাইঙ্গা পড়ে
    if (this.ropeSolved && this.wrongAnchor && !this.collapsing && this.player.onGround && px>690 && px<860){
      this._collapse();
    }
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
  }

  _drawPosts(ctx){
    const g=this.groundY;
    for (const po of this.posts){
      const img=Assets.prop(po.img);
      if (img){ const h=150, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, po.x-w/2, g-h+6, w, h); }
      else { ctx.save(); ctx.translate(po.x,g); ctx.fillStyle='#7a5a38'; A.rr(ctx,-10,-120,20,120,4); ctx.fill(); ctx.restore(); }
    }
  }
  _drawBridge(ctx){
    const img=Assets.prop('ropebridge');
    if (img){ const w=300, h=w*(img.naturalHeight/img.naturalWidth);
      const deckFrac=0.80, top=this.groundY - h*deckFrac;
      ctx.drawImage(img, 743-w/2, top, w, h); return; }
    A.rope(ctx, 568, this.groundY-8, 866, this.groundY-8, 28);
    ctx.fillStyle='#b08a4a'; A.rr(ctx, 620, this.groundY-2, 246, 10, 3); ctx.fill();
  }
}
