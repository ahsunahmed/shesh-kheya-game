// অধ্যায় ৬: রাতের নদী — নৌকা বাওয়ার চ্যালেঞ্জ।
// cross: বাঁ→ডান (চরের দিকে)। return: ডান→বাঁ (চর থেকে ঘাটে ফেরা, ভারী নৌকা, ঝড় ও প্রবল স্রোত)।
// নিরাপদ করিডোর সবসময় খোলা থাকে। return-এ স্রোত এলে সামনে এগোতে forward-বোতাম দ্রুত চাপতে হয়।
import { Platformer } from '../engine/scene.js';
import { DIALOGUE } from '../data/dialogue.js';
import { UI as S } from '../data/strings.js';
import { drawCentered } from '../engine/text.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

const POOL_CROSS  = ['log','log','log','snag','snag','hyacinth','hyacinth','net','sandbar','whirlpool'];
const POOL_RETURN = ['log','log','log','log','snag','snag','net','whirlpool','whirlpool','hyacinth','sandbar'];

export class RiverScene extends Platformer {
  enter(opts={}){
    this.mode = opts.mode || 'cross';
    this.ret = this.mode==='return';
    this.dir = this.ret ? -1 : 1;                     // +১: বাঁ→ডান, −১: ডান→বাঁ
    this.worldW=1280; this.ambience=this.ret?'storm':'night_river'; this.mood='danger';
    this.bgKey=this.ret?'bg_river3':'bg_river2';
    this.maxHP=5; this.noVitals=false; this.canRun=false; this.controlMode='boat';
    this.t=0; this.hitCd=0; this._flash=0; this.checkpoint=0;
    this.yTop=360; this.yBot=668;
    const bx0 = this.ret? 1045 : 235;
    this.boat={ x:bx0, y:(this.yTop+this.yBot)/2, w:150, h:72, bob:0 };
    this.player={ x:0,y:0,w:1,h:1,dead:false };
    this.scrollSpeed = this.ret? 235 : 225;
    this.moveSpeed   = this.ret? 260 : 285;
    this.goal        = this.ret? 6600 : 6200;
    this.currentDown = this.ret? 46 : 38;
    this.currentBack = this.ret? 24 : 16;
    this.traveled=0; this.obstacles=[]; this._onSandbar=false; this._drag=false;
    this.laneY=(this.yTop+this.yBot)/2;
    this.nextSpawn=560; this.nextHeart=1700;
    this.cpDist=[0, this.goal*0.4, this.goal*0.75];
    this.ripples=[]; for(let i=0;i<16;i++) this.ripples.push({x:Math.random()*1280,y:this.yTop+Math.random()*(this.yBot-this.yTop),l:16+Math.random()*34});
    // নৌকা ভেড়ানোর (docking) নির্দিষ্ট ঘাট — যাওয়ার সময় ডান-নিচে, ফেরার সময় বাঁ-উপরে
    this.dockX = this.ret? 250 : 1010; this.dockY = this.ret? 400 : 606; this._dockHold=0; this._dockReady=false;
    // স্রোত-সার্জ (return)
    this.surgeOn=this.ret; this.surgeT=0; this.surgeCd=5+Math.random()*2; this.rowBoost=95; this.driftBack=58;
    // ঝড় (return)
    this.lightning=0; this.thunderCd=1+Math.random()*1.5;
    this.phase='intro';
    this.setAudio();
    if (this.ret) this.G.audio.setMusic_mood('danger');

    // (চিকিৎসা-ব্যাগ ও লণ্ঠন এখন মিতুর ঘাটে তুলে নিতে হয় — এখানে আর স্বয়ংক্রিয় দেওয়া হয় না)
    if (opts.loaded){ this.checkpoint=Math.min(2,opts.checkpoint||0); this.traveled=this.cpDist[this.checkpoint];
      this.nextSpawn=this.traveled+340; this.nextHeart=this.traveled+900; this.phase='ride';
      this.G.setObjective(this.ret?'ভারী নৌকা সামলাইয়া ঘাটে ফেরো।':'স্রোত-বাধা বাঁচাইয়া চরে পৌঁছাও।'); return; }

    if (this.ret){
      this.G.ui.startDialogue(DIALOGUE.return_intro, ()=>{ this.phase='ride';
        this.G.setObjective('স্রোত এলে forward-বোতাম দ্রুত চাপো — ঘাটে ফেরো।');
        this.G.ui.tip('↑↓ দিয়া বৈঠা সামলাও · স্রোত এলে forward দ্রুত চাপো', 5); });
    } else {
      // মিতু আগেই ঘাটে কথা বলেছে — এখানে সরাসরি বাওয়া শুরু
      this.phase='ride';
      this.G.setObjective('স্রোত-বাধা বাঁচাইয়া ওপারের চরে পৌঁছাও।');
      this.G.ui.tip('↑↓ দিয়া বৈঠা সামলাও · ভাসা গুঁড়ি-কচুরিপানা এড়াও', 5);
    }
  }

  // নদীতে সব জীবন গেলে — নৌকা উল্টাইয়া ডুইবা যায়, খেলা শেষ (রিট্রাই নাই)
  gameOver(){ if (this.phase==='sink'||this.player.dead) return; this.player.dead=true;
    this.phase='sink'; this.sinkT=0; this._gaveOver=false; this.obstacles=[];
    this.G.audio.sfx('splash'); this.G.audio.sfx('fail'); }

  update(dt, blocked){
    this.t+=dt; this.boat.bob=Math.sin(this.t*2.4)*3;
    if (this.hitCd>0) this.hitCd-=dt;
    if (this._flash>0) this._flash-=dt;
    if (this.lightning>0) this.lightning-=dt;
    this.G.ui.setControlMode(blocked?'none':'boat');
    // ডুবে যাওয়ার অ্যানিমেশন
    if (this.phase==='sink'){ this.sinkT+=dt; this.boat.y+=dt*42;
      if (this.ret){ this.thunderCd-=dt; if(this.thunderCd<=0){ this.thunderCd=2; this.lightning=0.6; this.G.audio.sfx('thunder'); } }
      if (this.sinkT>2.4 && !this._gaveOver){ this._gaveOver=true; this.G.ui.gameOver(null, true); }
      return;
    }
    for (const r of this.ripples){ r.x += (this.dir>0?-1:1)*(this.scrollSpeed*0.6)*dt;
      if (r.x<-40) r.x=1300; if (r.x>1320) r.x=-20; if (r.x<-40||r.x>1320){ r.y=this.yTop+Math.random()*(this.yBot-this.yTop); } }
    // ঝড়: বজ্রপাত + মেঘডাক
    if (this.ret){ this.thunderCd-=dt; if (this.thunderCd<=0){ this.thunderCd=1.8+Math.random()*2.2; this.lightning=0.6; this.G.audio.sfx('thunder'); } }
    if (blocked) return;
    if (this.phase==='ride') this._ride(dt);
    else if (this.phase==='dock') this._dock(dt);
  }

  // নৌকা ঘাটে ভেড়ানো — ঠিক জায়গায় নিয়ে কিছুক্ষণ রাখলে (বা E চাপলে) নামা
  _dock(dt){
    const I=this.G.input, b=this.boat;
    let ix=0,iy=0;
    if(I.down('left'))ix-=1; if(I.down('right'))ix+=1; if(I.down('up'))iy-=1; if(I.down('down'))iy+=1;
    b.x += ix*this.moveSpeed*dt; b.y += iy*this.moveSpeed*dt;
    const cl = this.ret? [140,1160] : [120,1120];   // ভেড়ানোর সময় পুরো প্রস্থে যেতে পারে
    b.x=Math.max(cl[0],Math.min(cl[1],b.x)); b.y=Math.max(this.yTop+12,Math.min(this.yBot-22,b.y));
    this._dockReady = Math.abs(b.x-this.dockX)<80 && Math.abs(b.y-this.dockY)<58;
    if (this._dockReady){ this._dockHold+=dt;
      if (this._dockHold>0.8 || I.pressed('interact') || I.pressed('jump')) this._arrive();
    } else this._dockHold=0;
  }

  _spawnGap(){ const base=this.ret?250:320; const ramp=Math.max(0.68, 1-this.traveled/this.goal*0.3); return base*ramp; }
  _pool(){ return this.ret?POOL_RETURN:POOL_CROSS; }
  _driftLane(){ this.laneY += (Math.random()*2-1)*64; this.laneY = Math.max(this.yTop+78, Math.min(this.yBot-78, this.laneY)); }
  _outsideCorridor(){
    const gap = this.ret? 128 : 138;
    const topHi = this.laneY - gap/2 - 22, botLo = this.laneY + gap/2 + 22;
    const topOK = topHi > this.yTop+30, botOK = botLo < this.yBot-30;
    let above = Math.random()<0.5;
    if (above && !topOK) above=false; if (!above && !botOK) above=true;
    if (above) return (this.yTop+30) + Math.random()*Math.max(12, topHi-(this.yTop+30));
    return botLo + Math.random()*Math.max(12, (this.yBot-30)-botLo);
  }
  _spawnX(){ return this.dir>0 ? 1360 : -80; }
  _spawn(){
    this._driftLane();
    const pool=this._pool(); const type=pool[(Math.random()*pool.length)|0];
    this.obstacles.push(this._mk(type, this._spawnX(), this._outsideCorridor()));
    if (Math.random() < (this.ret?0.5:0.35)){
      const t2=pool[(Math.random()*pool.length)|0];
      this.obstacles.push(this._mk(t2, this._spawnX()+this.dir*90, this._outsideCorridor()));
    }
  }
  _spawnHeart(){ this.obstacles.push(this._mk('heart', this._spawnX(), this.laneY + (Math.random()*2-1)*30)); }
  _mk(type,x,y){
    const S={ log:[128,40], snag:[150,60], net:[150,66], hyacinth:[132,58], sandbar:[200,46], whirlpool:[118,96], heart:[46,46] }[type];
    return { type, x, y, w:S[0], h:S[1], hw:S[0]*0.42, hh:S[1]*0.42, img: type==='hyacinth'?(Math.random()<0.5?'hyacinth_a':'hyacinth_b'):null };
  }

  _ride(dt){
    const I=this.G.input, b=this.boat;
    // নিয়ন্ত্রণ (দিক)
    let ix=0,iy=0;
    if(I.down('left'))ix-=1; if(I.down('right'))ix+=1;
    if(I.down('up'))iy-=1; if(I.down('down'))iy+=1;
    const sp = this.moveSpeed * (this._drag?0.55:1);
    b.x += ix*sp*dt; b.y += iy*sp*dt;
    // স্রোত: নিচে + শুরুর দিকে ঠেলে
    b.y += this.currentDown*dt; b.x -= this.dir*this.currentBack*dt;
    // ঘূর্ণির টান
    for (const o of this.obstacles){ if(o.type!=='whirlpool') continue;
      const dx=o.x-b.x, dy=o.y-b.y, d=Math.hypot(dx,dy)||1;
      if (d<150){ const f=(150-d)/150*130; b.x+=dx/d*f*dt; b.y+=dy/d*f*dt; } }
    // সীমা
    const cl = this.ret? [720,1160] : [120,560];
    b.x=Math.max(cl[0],Math.min(cl[1],b.x)); b.y=Math.max(this.yTop+12,Math.min(this.yBot-22,b.y));

    // বাধা সবসময় এগোয় (দিক অনুযায়ী)
    const scroll = this.scrollSpeed * (this._onSandbar?0.4:1);
    for (const o of this.obstacles) o.x -= this.dir*scroll*dt;
    this.obstacles=this.obstacles.filter(o=> (this.dir>0? o.x>-240 : o.x<1520) && !o.dead);

    // অগ্রগতি / স্রোত-সার্জ
    if (this.surgeT>0){
      this.surgeT-=dt;
      const fwd = this.dir>0 ? 'right' : 'left';
      if (I.pressed(fwd)){ this.traveled += this.rowBoost; this.G.audio.sfx('oar'); }
      this.traveled -= this.driftBack*dt; if (this.traveled<0) this.traveled=0;
    } else {
      this.traveled += (this._onSandbar?0.4:1)*this.scrollSpeed*dt;
      if (this.surgeOn){ this.surgeCd-=dt;
        if (this.surgeCd<=0 && this.traveled>600 && this.traveled<this.goal-900){
          this.surgeT=2.6; this.surgeCd=6+Math.random()*3; this.lightning=0.5;
          this.G.audio.sfx('thunder'); this.G.ui.toast('স্রোত! '+(this.dir>0?'▶▶':'◀◀')+' দ্রুত চাপো','fail',2.4); } }
    }

    // স্পন
    if (this.traveled>this.nextSpawn && this.traveled<this.goal-700){ this._spawn(); this.nextSpawn += this._spawnGap(); }
    if (this.traveled>this.nextHeart && this.traveled<this.goal-700){ this._spawnHeart(); this.nextHeart += 1700; }
    if (this.checkpoint<2 && this.traveled>=this.cpDist[this.checkpoint+1]){ this.checkpoint++; this.G.ui.toast(S.saved,'info',1.0); this.G.save&&this.G.save(); }

    this._collisions();
    // লক্ষ্যে পৌঁছলে ভেড়ানোর পর্ব শুরু (সরাসরি পেরিয়ে যায় না)
    if (this.traveled>=this.goal){ this.phase='dock'; this.obstacles=[]; this._dockHold=0;
      this.G.setObjective(this.ret?'নৌকা ঘাটে ভেড়াও — ↑↓ দিয়ে মিলাও':'নৌকা চরের ঘাটে ভেড়াও — ↑↓ দিয়ে মিলাও'); }
  }

  _collisions(){
    const b=this.boat, bw=104, bh=38; this._onSandbar=false; this._drag=false;
    for (const o of this.obstacles){
      const ox=Math.abs(o.x-b.x), oy=Math.abs(o.y-(b.y+6));
      if (!(ox < (o.hw+bw/2) && oy < (o.hh+bh/2))) continue;
      if (o.type==='heart'){ if(this.hp<this.maxHP){ this.hp=this.hp+1; this.G.audio.sfx('success'); this.G.ui.toast('জীবন +১','success',1); } o.dead=true; }
      else if (o.type==='sandbar'){ this._onSandbar=true; }
      else if (o.type==='hyacinth'){ this._drag=true; }
      else if (o.type==='whirlpool'){ if (ox<26 && oy<22 && this.hitCd<=0){ this.damage(1,'hit'); this.G.audio.sfx('splash'); } }
      else { if (this.hitCd<=0){ this.damage(1,'hit'); this.G.audio.sfx('splash');
          b.x+=this.dir*26; b.y += (b.y<o.y? -14: 14);
          this.boat.y=Math.max(this.yTop+12,Math.min(this.yBot-22,b.y));
          if (o.type==='net') this._drag=true; } }
    }
  }

  respawn(){
    this.hp=this.baseHP; this.player.dead=false; this.hitCd=0;
    this.traveled=this.cpDist[this.checkpoint]; this.obstacles=[];
    this.boat.x=this.ret?1045:235; this.boat.y=(this.yTop+this.yBot)/2;
    this.nextSpawn=this.traveled+340; this.nextHeart=this.traveled+900;
    this._onSandbar=false; this._drag=false; this.surgeT=0; this.surgeCd=5; this.phase='ride';
  }

  _arrive(){
    if (this.phase==='arrive') return; this.phase='arrive';
    this.G.audio.sfx('success'); this.obstacles=[];
    if (this.ret) this.G.ui.startDialogue([{s:'player',t:'ঘাটে পৌঁছাইছি! সবাই নিরাপদ।',e:'happy'}], ()=>this.G.changeScene('treatment'));
    else this.G.ui.startDialogue(DIALOGUE.river_arrive, ()=>this.G.changeScene('rescue',{enter:'left'}));
  }

  // ---------- draw ----------
  draw(ctx){
    const W=this.G.W,H=this.G.H,t=this.t;
    if (!(this.bgKey && A.drawSceneBg(ctx,this.bgKey,W,H))){
      A.sky(ctx,W,H,A.PAL.skyStorm); A.stars(ctx,W,H,22,t); A.moon(ctx,W*0.8,110,24);
      A.water(ctx,0,this.yTop-30,W,H-this.yTop+30,A.PAL.waterNight,t,true);
    }
    if (this.ret){ ctx.save(); ctx.globalAlpha=0.35; ctx.fillStyle='#0a1020'; ctx.fillRect(0,0,W,H); ctx.restore(); }
    this._drawFlow(ctx);
    if (this.phase==='dock') this._drawDockStruct(ctx);     // ঘাট-কাঠামো নৌকার পেছনে
    const obs=[...this.obstacles].sort((a,b)=>a.y-b.y);
    for (const o of obs){ if(o.y<=this.boat.y) this._drawObstacle(ctx,o); }
    this._drawBoat(ctx);
    for (const o of obs){ if(o.y>this.boat.y) this._drawObstacle(ctx,o); }
    if (this.ret){ A.rain(ctx,W,H,t,1.8); A.rain(ctx,W,H,t*1.3,1.4); if (this.lightning>0) A.lightningFlash(ctx,W,H,this.lightning); }
    if (this._flash>0){ ctx.save(); ctx.globalAlpha=Math.min(0.5,this._flash); ctx.fillStyle='#b02020'; ctx.fillRect(0,0,W,H); ctx.restore(); }
    if (this.phase==='dock') this._drawDock(ctx);
    this._drawProgress(ctx);
    if (this.surgeT>0) this._drawSurge(ctx);
  }
  // ঘাট-কাঠামো (নৌকার পেছনে আঁকা) — ফেরার সময় গ্রামের জেটি, যাওয়ার সময় চরের ঘাট
  _drawDockStruct(ctx){
    const dx=this.dockX, dy=this.dockY;
    const ghat=Assets.prop(this.ret?'jetty':'charghat');
    if (ghat){ const h=this.ret?176:168, w=ghat.naturalWidth*(h/ghat.naturalHeight);
      ctx.drawImage(ghat, dx-w/2, dy-h+60, w, h); }
    else {
      ctx.save(); ctx.fillStyle='rgba(60,44,30,0.95)';
      for(let i=0;i<4;i++){ A.rr(ctx, dx-70+i*38, dy+18, 12, 54, 3); ctx.fill(); }
      ctx.fillStyle='#6a4a30'; A.rr(ctx, dx-80, dy+6, 160, 18, 4); ctx.fill();
      ctx.fillStyle='#7a5a3a'; for(let i=0;i<8;i++){ ctx.fillRect(dx-78+i*20, dy+6, 2, 18); }
      ctx.restore();
    }
    // নৌকা বাঁধার খুঁটি
    const mp=Assets.prop('mooringpost');
    if (mp){ const h=78, w=mp.naturalWidth*(h/mp.naturalHeight); ctx.drawImage(mp, dx+74, dy-h+42, w, h); }
  }
  _drawDock(ctx){
    const W=this.G.W,H=this.G.H, dx=this.dockX, dy=this.dockY, t=this.t;
    // ভেড়ানোর জায়গা — স্পন্দিত বৃত্ত
    ctx.save(); const pulse=0.5+0.5*Math.sin(t*5);
    ctx.strokeStyle=this._dockReady?'rgba(111,174,94,0.95)':('rgba(242,200,121,'+(0.5+0.4*pulse)+')');
    ctx.lineWidth=4; ctx.setLineDash([12,9]); ctx.lineDashOffset=-t*18;
    ctx.beginPath(); ctx.ellipse(dx,dy,74,44,0,0,7); ctx.stroke(); ctx.setLineDash([]);
    // ভেড়ানোর অগ্রগতি রিং
    if (this._dockReady && this._dockHold>0){ ctx.strokeStyle='#6fae5e'; ctx.lineWidth=6;
      ctx.beginPath(); ctx.arc(dx,dy,52,-Math.PI/2, -Math.PI/2 + Math.min(1,this._dockHold/0.8)*Math.PI*2); ctx.stroke(); }
    ctx.restore();
    // নির্দেশ
    const msg = this._dockReady? 'ভিড়ছে…  (E / ট্যাপ)' : (this.ret?'↑ ↓ ← → দিয়ে ঘাটে নৌকা মিলাও':'↑ ↓ ← → দিয়ে চরের ঘাটে নৌকা মিলাও');
    drawCentered(ctx, msg, W/2, H-150, 22, this._dockReady?'#9be39b':'#f2c879', 700, 'rgba(0,0,0,0.65)');
  }
  _drawFlow(ctx){ ctx.save(); ctx.strokeStyle='rgba(200,220,255,0.16)'; ctx.lineWidth=2; ctx.lineCap='round';
    for (const r of this.ripples){ ctx.beginPath(); ctx.moveTo(r.x,r.y); ctx.lineTo(r.x+r.l,r.y); ctx.stroke(); } ctx.restore(); }

  _drawBoat(ctx){
    const b=this.boat, y=b.y+b.bob;
    const g = this.G.gender==='female'?'female':'male';
    const name = (this.ret?'back_':'go_')+g;
    // ডুবে যাওয়া — নৌকা উল্টাইয়া তলায়
    if (this.phase==='sink'){
      const k=Math.min(1,this.sinkT/2.2);
      ctx.save();
      ctx.translate(b.x, y+k*50); ctx.rotate(Math.PI*k); ctx.globalAlpha=Math.max(0,1-k*0.72);
      if (!A.drawSprite(ctx,'boat',name, 0, 34, 104, this.t, 1, {shadow:false})){
        const img=Assets.prop('boat'); if(img){ const h=b.h,w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img,-w/2,-h*0.72,w,h);} else A.boat(ctx,0,0,1.2,this.t,{}); }
      ctx.restore();
      // ঘূর্ণি + বুদবুদ
      ctx.save(); ctx.strokeStyle='rgba(200,220,235,0.5)'; ctx.lineWidth=2;
      for(let i=0;i<3;i++){ const r2=16+i*13+Math.sin(this.t*4)*3; ctx.beginPath(); ctx.arc(b.x,y+8,r2,0,7); ctx.stroke(); }
      ctx.fillStyle='rgba(220,235,245,0.6)';
      for(let i=0;i<7;i++){ const bx=b.x-32+i*11, by=y-6-((this.t*45+i*18)%64); ctx.beginPath(); ctx.arc(bx,by,2.4,0,7); ctx.fill(); }
      ctx.restore();
      return;
    }
    const wake=Assets.prop('wake');
    if (wake){ const h=46, w=wake.naturalWidth*(h/wake.naturalHeight); ctx.save(); ctx.globalAlpha=0.55;
      ctx.drawImage(wake, b.x - this.dir*w*0.9 - w*0.5 + (this.dir>0?0:0), y-6, w, h); ctx.restore(); }
    // মোড+লিঙ্গ অনুযায়ী নৌকা-অ্যানিমেশন; ফেরার সময় ডান→বাঁ, তাই নৌকার মুখ বাঁয়ে (flip)
    if (A.drawSprite(ctx,'boat',name, b.x, y+34, 104, this.t, this.ret?-1:1, {shadow:false})) return;
    const img=Assets.prop('boat');
    if (img){ const h=b.h, w=img.naturalWidth*(h/img.naturalHeight); ctx.save(); if(this.dir<0){ctx.translate(b.x,0);ctx.scale(-1,1);ctx.translate(-b.x,0);} ctx.drawImage(img, b.x-w*0.5, y-h*0.72, w, h); ctx.restore(); }
    else A.boat(ctx, b.x, y, 1.2, this.t, {});
  }
  _drawObstacle(ctx,o){
    if (o.type==='heart'){ const yy=o.y+Math.sin(this.t*4+o.x*0.01)*4;
      ctx.save(); const g=ctx.createRadialGradient(o.x,yy,2,o.x,yy,20); g.addColorStop(0,'rgba(246,140,150,0.5)'); g.addColorStop(1,'rgba(246,140,150,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,yy,20,0,7); ctx.fill();
      ctx.translate(o.x,yy-5); ctx.scale(1.6,1.6); ctx.fillStyle='#e85566'; ctx.strokeStyle='#ffd0d6'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(0,4); ctx.bezierCurveTo(-8,-5,-10,6,0,12); ctx.bezierCurveTo(10,6,8,-5,0,4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); return; }
    if (o.type==='whirlpool'){ const img=Assets.prop('whirlpool');
      if (img){ const fw=img.naturalWidth/4, fi=(Math.floor(this.t*8)%4); const w=o.w, h=o.h;
        ctx.drawImage(img, fi*fw,0,fw,img.naturalHeight, o.x-w/2,o.y-h/2,w,h); }
      else { ctx.save(); ctx.strokeStyle='rgba(180,200,230,0.7)'; ctx.lineWidth=3; for(let k=0;k<3;k++){ ctx.beginPath(); ctx.arc(o.x,o.y,10+k*12+Math.sin(this.t*4)*3, this.t*3+k, this.t*3+k+4); ctx.stroke(); } ctx.restore(); }
      return; }
    const nm = o.type==='log'?'log' : o.type==='hyacinth'?o.img : o.type;
    const img=Assets.prop(nm);
    if (img){ const w=o.w, h=img.naturalHeight*(w/img.naturalWidth); ctx.drawImage(img, o.x-w/2, o.y-h/2, w, h); }
    else { ctx.save(); ctx.fillStyle = o.type==='sandbar'?'#9a855f':o.type==='net'?'#6a6a5a':'#5a4a34';
      A.rr(ctx,o.x-o.w/2,o.y-o.h/2,o.w,o.h,8); ctx.fill(); ctx.restore(); }
  }
  _drawProgress(ctx){
    const W=this.G.W; const x=W/2-180, y=20, w=360, h=12;
    ctx.save();
    ctx.fillStyle='rgba(12,16,28,0.6)'; A.rr(ctx,x-4,y-4,w+8,h+8,7); ctx.fill();
    ctx.fillStyle='#2a3450'; A.rr(ctx,x,y,w,h,6); ctx.fill();
    const p=Math.max(0,Math.min(1,this.traveled/this.goal));
    ctx.fillStyle='#6fae5e'; A.rr(ctx,x,y,w*p,h,6); ctx.fill();
    ctx.fillStyle='#f2c879'; ctx.beginPath(); ctx.arc(x+w*p,y+h/2,7,0,7); ctx.fill();
    ctx.fillStyle='#d9d2c0'; ctx.font='700 13px NotoBengali,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(this.ret?'ঘাটের পথ':'চরের পথ', W/2, y-6);
    ctx.restore();
  }
  _drawSurge(ctx){
    const W=this.G.W,H=this.G.H;
    ctx.save(); ctx.globalAlpha=0.5+0.3*Math.sin(this.t*10);
    ctx.fillStyle='#d64a4a'; ctx.font='900 40px NotoBengali,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(this.dir>0?'স্রোত! ▶▶ দ্রুত চাপো':'স্রোত! ◀◀ দ্রুত চাপো', W/2, H*0.3);
    ctx.restore();
  }
}
