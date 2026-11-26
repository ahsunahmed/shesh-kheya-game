// ভুল পথ — মালেকা আপার মানচিত্রে ভুল নদীপথ বাছলে এখানে আসে।
// ভাসা গুঁড়ির উপর দিয়া লাফাইয়া আগাইতে হয় (পানির উপর হাঁটা যায় না — পড়লে এক প্রাণ)।
// শেষ প্রান্তে বিপদ — উত্তরের জন্য ভিডিও ক্লিপ, দক্ষিণের জন্য ছবি। যেকোনো সময় বাঁয়ে ফিরা গ্রামে যাওয়া যায়।
import { Platformer } from '../engine/scene.js';
import { evalDeduction } from '../data/puzzles.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

const CFG = {
  north_char: {
    name:'উত্তরের চর', bg:'bg_river2', clip:'./assets/img/bg/north_deadend.mp4', endBg:'bg_wrong_north_end',
    obj:'উত্তরের চরের দিকে আগাইতাছ — গুঁড়ি লাফাইয়া সামনে দেহো কী আছে।',
    enter:'বালুর চর ধইরা আগাই… ভাসা গুঁড়ির উপর দিয়া সাবধানে।',
    danger:['জোয়ার আইসা চরটা ডুবাইয়া দিতাছে — সামনে খালি পানি, আর পথ নাই!',
            'অগভীর চর রাইতের জোয়ারে ডুইবা যায়। করিম চাচা এইদিকে আহে নাই।'],
  },
  south_baor: {
    name:'দক্ষিণের বাঁওড়', bg:'bg_river3', clip:null, endBg:'bg_wrong_south_end',
    obj:'দক্ষিণের বাঁওড়ের দিকে আগাইতাছ — গুঁড়ি লাফাইয়া সামনে দেহো কী আছে।',
    enter:'বাঁওড়ের আন্ধার পথ… ভাসা গুঁড়ির উপর দিয়া আগাই।',
    danger:['সর্বনাশ! সামনে বিশাল ঘূর্ণি — স্রোত উল্টা দিকে টানতাছে!',
            'বাঁওড়ে জোয়ারের সময় স্রোত উল্টা। আহত মানুষ লইয়া এইদিকে যাওন যায় না।'],
  },
};

export class WrongPathScene extends Platformer {
  enter(opts={}){
    this.choice=this.G.state.flags.v_choice || 'north_char';
    this.cfg = CFG[this.choice] || CFG.north_char;
    this.worldW=1280; this.groundY=500; this.ambience='night_river'; this.mood='danger';
    this.bgKey=this.cfg.bg; this.canRun=false; this.leftBound=40; this.rightBound=1240;
    this.revealed=false; this.revealVideo=null;

    this.addPlatform(-100,500,460,320);      // বাঁ পাড় (−১০০ → ৩৬০)
    this.addHazard(360,548,620,240);          // মাঝের পানি (৩৬০ → ৯৮০)
    this.logs=[
      this.addPlatform(400,506,120,16,{visual:'log'}),
      this.addPlatform(600,506,120,16,{visual:'log'}),
      this.addPlatform(800,506,120,16,{visual:'log'}),
    ];
    this.addPlatform(980,500,300,320);        // ডান পাড় / শেষ প্রান্ত (৯৮০ → ১২৮০)

    this.checkpoints=[{x:150,y:410},{x:1080,y:410}];
    this.checkpoint=opts.checkpoint||0; this.spawn(0); this.setAudio();

    this.back=this.addInteract({ x:90, y:488, r:76, markY:392, hint:'← গ্রামে ফিরে যাও (E)',
      onE:()=>this._goBack() });
    this.end=this.addInteract({ x:1170, y:488, r:90, markY:392, once:true,
      hint:'সামনে কী দেখো (E)', onE:()=>this._reveal() });

    this.G.setObjective(this.cfg.obj);
    if (!opts.loaded) this.G.ui.startDialogue([{s:'player',t:this.cfg.enter,e:'serious'}],
      ()=>this.G.ui.tip('ভুল মনে অইলে বাঁয়ে ফিরা “← গ্রামে ফিরে যাও”', 4.5));
  }

  onUpdate(dt){
    const px=this.player.x;
    if (px>1000 && this.checkpoint<1){ this.checkpoint=1; this.reachCheckpoint(1); }
  }

  _goBack(){ this._stopVideo(); this.G.state.flags.v_choice=null; this.G.changeScene('village',{recheck:true}); }
  _stopVideo(){ if (this.revealVideo){ try{ this.revealVideo.pause(); this.revealVideo.removeAttribute('src'); this.revealVideo.load(); this.revealVideo.remove(); }catch(e){} this.revealVideo=null; } }

  _reveal(){
    this.revealed=true; this.G.audio.setMusic_mood('danger'); this.G.audio.sfx('fail');
    if (this.cfg.clip){
      const v=document.createElement('video'); v.src=this.cfg.clip; v.loop=true; v.muted=true;
      v.playsInline=true; v.setAttribute('playsinline',''); v.preload='auto';
      v.style.position='fixed'; v.style.left='-9999px'; v.style.width='2px'; v.style.height='2px';
      document.body.appendChild(v); this.revealVideo=v; v.play().catch(()=>{ this.revealVideo=null; this.bgKey=this.cfg.endBg; });
    } else { this.bgKey=this.cfg.endBg; }
    const r=evalDeduction(this.choice, this.G.state.clues);
    this.G.ui.startDialogue([
      { s:'player', t:this.cfg.danger[0], e:'worried' },
      { s:'player', t:this.cfg.danger[1], e:'serious' },
      { s:'player', t:r.msg, e:'think' },
    ], ()=> this._askBack());
  }
  _askBack(){
    this.G.ui.choice('ভুল পথে ম্যালা সময় গেল। অহন কী করবা?',
      [{id:'back', label:'গেরামে ফিইরা আবার ভাবি'}, {id:'stay', label:'আরেকটু চাইয়া দেহি'}],
      (c)=>{ if (c==='back') this._goBack();
        else { this._stopVideo(); this.revealed=false; this.bgKey=this.cfg.bg;
          this.G.ui.tip('এইদিকে আর পথ নাই — বাঁয়ে ফিরা “← গ্রামে ফিরে যাও”।', 3.8); } });
  }

  draw(ctx){
    if (this.revealed && this.revealVideo && this.revealVideo.readyState>=2){
      try{ A.drawImgCover(ctx, this.revealVideo, this.G.W, this.G.H); }catch(e){}
      return;   // UI (সংলাপ) গেম-লুপ নিজেই আঁকবে
    }
    super.draw(ctx);
  }

  drawBackground(ctx,cam){
    const W=this.G.W,H=this.G.H,t=this.t, north=this.choice==='north_char';
    if (this.revealed && !this.revealVideo){
      if (north){ A.sky(ctx,W,H,A.PAL.skyDusk); A.water(ctx,0,300,W,H-300,'#5f7a88',t,true); }
      else { A.sky(ctx,W,H,A.PAL.skyStorm); A.water(ctx,0,360,W,H-360,A.PAL.waterNight,t,true); }
      return;
    }
    if (north){ A.sky(ctx,W,H,A.PAL.skyDusk); A.water(ctx,0,330,W,H-330,'#6b8290',t,true); }
    else { A.sky(ctx,W,H,A.PAL.skyStorm); A.stars(ctx,W,H,16,t); A.treeline(ctx,W,360,'#1c2a22',4,52);
      A.water(ctx,0,380,W,H-380,A.PAL.waterNight,t,true); }
  }
  drawWorld(ctx){
    if (this.revealed) return;
    const t=this.t, g=this.groundY, H=this.G.H;
    // দুই পাড়ের মাটি (আঁকা bg-র উপরে, সংঘর্ষের সাথে মিল রাখতে)
    A.groundStrip(ctx,-200,g,560,H-g+60,'#5a4a34','#3a3020');
    A.groundStrip(ctx,980,g,520,H-g+60,'#5a4a34','#3a3020');
    // মাঝের পানি (৩৬০–৯৮০)
    const gx=360,gw=620,top=g+6;
    const grd=ctx.createLinearGradient(0,top,0,H);
    grd.addColorStop(0,'#35606a'); grd.addColorStop(0.5,'#214851'); grd.addColorStop(1,'#122a30');
    ctx.fillStyle=grd; ctx.fillRect(gx,top,gw,H-top);
    ctx.strokeStyle='rgba(188,224,232,0.2)'; ctx.lineWidth=2;
    for(let i=0;i<4;i++){ const yy=top+18+i*26; ctx.beginPath();
      for(let x=gx+6;x<gx+gw-6;x+=16){ const o=Math.sin(x*0.04+t*2+i)*4; (x===gx+6)?ctx.moveTo(x,yy+o):ctx.lineTo(x,yy+o);} ctx.stroke(); }
    // গুঁড়িগুলো base _drawPlatforms আঁকবে (visual:'log')
    // জলজ গাছ
    if (this.choice==='north_char') A.reeds(ctx,310,g-4,6,t,0.9); else A.hyacinth(ctx,1030,g+10,7,t);
  }
}
