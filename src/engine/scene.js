// সাইড-স্ক্রোলিং বেস দৃশ্য: খেলোয়াড়, প্ল্যাটফর্ম (স্থির/চলমান/ভাঙা/ডুবন্ত), বিপদ, হৃদয়(HP),
// দম(stamina), ইন্টারঅ্যাক্ট, NPC, ক্যামেরা, চেকপয়েন্ট, নিরাপদ-রিস্পন।
import { drawActor, drawSceneBg, rr, PAL, fallenLog } from './art.js';
import { Assets } from './assets.js';
import { UI as S } from '../data/strings.js';

export class Platformer {
  constructor(G){
    this.G=G; this.cam=0; this.t=0; this.worldW=2400; this.worldFloor=720;
    this.player={ x:120,y:420,vx:0,vy:0,w:30,h:86,onGround:false,face:1,anim:0,pose:'idle',moving:false,dead:false };
    this.platforms=[]; this.interactables=[]; this.hazards=[]; this.npcs=[]; this.props=[];
    this.checkpoints=[{x:120,y:420}]; this.checkpoint=0;
    this.ambience='quiet'; this.mood='mystery';
    this.controlMode='platform'; this.leftBound=0;
    this.maxHP=5; this.baseHP=3; this.hitCd=0; this._flash=0; this.attackT=0;   // শুরুতে ৩, হৃদয় কুড়িয়ে সর্বোচ্চ ৫
    this.stamina=1; this.canRun=true; this.doubleJump=false;   // doubleJump: শূন্যে থাকতে আরেকবার লাফ
    this.safe=null;
    this.pickups=[];
  }
  // জীবন (হৃদয়) দৃশ্য জুড়ে থাকে — G.state.hp-এ রাখা, দৃশ্য বদলালে নিজে থেকে পূর্ণ হয় না
  get hp(){ const v=this.G.state.hp; return v==null? this.baseHP : Math.min(v,this.maxHP); }
  set hp(v){ this.G.state.hp = Math.max(0, Math.min(this.maxHP, v)); }
  // ভাসমান হৃদয় — কুড়ালে জীবন বাড়ে (সর্বোচ্চ maxHP=৫)
  // flag দিলে: আগে কুড়ানো থাকলে আর দেখা যায় না (একবারই নেওয়া যায়, লেভেল বদলালেও ফিরে আসে না)
  addHeart(x,y,flag){ if (flag && this.G.state.flags[flag]) return null;
    const h={x,y,type:'heart',taken:false,ph:Math.random()*6,flag}; this.pickups.push(h); return h; }
  enter(opts){}
  setAudio(){ this.G.audio.setAmbience(this.ambience); this.G.audio.setMusic_mood(this.mood); }

  // opts: { kind:'osc'|'sink'|'break', amp, speed, phase, axis:'x'|'y', maxSink, sinkSpeed, delay, respawn, visual:'log'|'plank', noSafe }
  addPlatform(x,y,w,h,opts={}){ const pl={x,y,w,h,baseX:x,baseY:y,...opts}; this.platforms.push(pl); return pl; }
  addGround(y){ this.platforms.push({x:-400,y,w:this.worldW+800,h:600}); this.groundY=y; return this; }
  addHazard(x,y,w,h,opts={}){ const hz={x,y,w,h,...opts}; this.hazards.push(hz); return hz; }
  addInteract(o){ o.r=o.r||70; o.done=false; this.interactables.push(o); return o; }
  addNPC(o){ o.face=o.face||-1; o.expr=o.expr||'idle'; o.basePose=o.pose||'idle'; o.pose=o.basePose; o.anim=Math.random()*3; o.baseX=o.x; o.dir=1; this.npcs.push(o); return o; }

  spawn(cp=this.checkpoint){ const c=this.checkpoints[cp]||this.checkpoints[0];
    this.player.x=c.x; this.player.y=c.y; this.player.vx=0; this.player.vy=0; this.player.onGround=false; }
  setCheckpoint(i,x,y){ this.checkpoints[i]={x,y}; }
  reachCheckpoint(i){ if(i>this.checkpoint){ this.checkpoint=i; this.G.save(); this.G.ui.toast(S.saved,'info',1.1); } }
  respawn(){ this.hp=this.baseHP; this.player.dead=false; this.hitCd=0; this.safe=null; this.spawn(this.checkpoint); }  // "আবার খেলো" → ৩ হৃদয়

  // ক্ষতি — বিপদে পড়লে/পড়ে গেলে ১ হৃদয় যায়; শূন্য হলে চেকপয়েন্ট থেকে
  damage(n=1, mode='hit'){
    const p=this.player; if (p.dead) return;
    if (this.hitCd>0 && mode!=='force') return;
    this.hp-=n; this._flash=0.55; this.hitCd=1.1;
    this.G.audio.sfx(mode==='fall'?'splash':'fail');
    if (this.hp<=0){ this.hp=0; this.gameOver(); return; }
    p.vx=0; p.vy=0;
    if ((mode==='fall'||mode==='reset') && this.safe){ p.x=this.safe.x; p.y=this.safe.y; p.onGround=false; }
  }
  gameOver(){ if (this.player.dead) return; this.player.dead=true;
    this.G.ui.gameOver(()=>{ if (this.G.deathRestart) this.G.deathRestart(); else this.respawn(); }); }

  update(dt, blocked){
    this.t+=dt;
    if (this.hitCd>0) this.hitCd-=dt;
    if (this.attackT>0) this.attackT-=dt;
    if (this._flash>0) this._flash-=dt;
    this.G.ui.setControlMode(blocked? 'none' : this.controlMode);
    for (const n of this.npcs){ n.anim+=dt;
      if (n.wander){ n.x += n.dir* n.wander.speed*dt; n.pose='walk'; n.moving=true;
        if (n.x> n.baseX+n.wander.range) n.dir=-1; if (n.x< n.baseX-n.wander.range) n.dir=1; n.face=n.dir;
      } else { n.pose= n.talking?'talk':(n.basePose||'idle'); n.moving=false; }
      if (n.facesPlayer) n.face = this.player.x> n.x?1:-1;
    }
    this._updatePlatforms(dt);
    this._updateHazards(dt);
    if (blocked){ this.player.moving=false; if(this.player.onGround)this.player.pose='idle'; return; }
    if (this.onUpdate) this.onUpdate(dt);
    if (!this.blockWalk) this._control(dt); else { this.player.moving=false; }
    this._physics(dt);
    this._interact();
    this._updatePickups();
    this._camera();
  }
  _updatePickups(){
    if (!this.pickups.length) return;
    const p=this.player, cx=p.x+p.w/2, cy=p.y+p.h/2;
    for (const h of this.pickups){ if (h.taken) continue;
      if ((cx-h.x)**2+(cy-h.y)**2 < 44*44){
        if (this.hp>=this.maxHP){ continue; }       // ভরা থাকলে পরে কুড়ানোর জন্য রেখে দাও
        h.taken=true; this.hp=this.hp+1; this.G.audio.sfx('success');
        if (h.flag) this.G.state.flags[h.flag]=1;              // স্থায়ীভাবে কুড়ানো হিসেবে চিহ্নিত
        this.G.ui.toast('জীবন +১','success',1.1); this.G.save&&this.G.save();
      }
    }
  }
  _drawPickups(ctx){
    for (const h of this.pickups){ if (h.taken) continue;
      const y=h.y+Math.sin(this.t*3+h.ph)*5;
      ctx.save();
      const g=ctx.createRadialGradient(h.x,y,2,h.x,y,22); g.addColorStop(0,'rgba(246,140,150,0.5)'); g.addColorStop(1,'rgba(246,140,150,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(h.x,y,22,0,7); ctx.fill();
      ctx.translate(h.x,y-6); ctx.scale(1.7,1.7);
      ctx.fillStyle='#e85566'; ctx.strokeStyle='#ffd0d6'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(0,4); ctx.bezierCurveTo(-8,-5,-10,6,0,12); ctx.bezierCurveTo(10,6,8,-5,0,4); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  _riding(pl){ const p=this.player; return p.onGround && p.x+p.w>pl.x+2 && p.x<pl.x+pl.w-2 && Math.abs((p.y+p.h)-pl.y)<10; }
  _updatePlatforms(dt){
    const t=this.t;
    for (const pl of this.platforms){
      if (!pl.kind) continue;
      const riding=this._riding(pl);
      if (pl.kind==='osc'){
        const nv=Math.sin(t*(pl.speed||1)+(pl.phase||0))*(pl.amp||40);
        if ((pl.axis||'x')==='x'){ const nx=pl.baseX+nv; const dx=nx-pl.x; pl.x=nx; if(riding) this.player.x+=dx; }
        else { const ny=pl.baseY+nv; const dy=ny-pl.y; pl.y=ny; if(riding) this.player.y+=dy; }
      } else if (pl.kind==='sink'){
        if (riding) pl.sink=Math.min(pl.maxSink||70,(pl.sink||0)+dt*(pl.sinkSpeed||90));
        else pl.sink=Math.max(0,(pl.sink||0)-dt*55);
        pl.y=pl.baseY+pl.sink; pl.sunk = pl.sink>=(pl.maxSink||70);
      } else if (pl.kind==='break'){
        if (!pl.broken){ if (riding){ pl.standT=(pl.standT||0)+dt;
            if (pl.standT>(pl.delay||1.1)){ pl.broken=true; pl.respawnAt=t+(pl.respawn||3.5); this.G.audio.sfx('knock'); } } }
        else if (t>pl.respawnAt){ pl.broken=false; pl.standT=0; }
      }
    }
  }
  _updateHazards(dt){ for (const h of this.hazards){ if (h.update) h.update(dt,this); } }

  _control(dt){
    const I=this.G.input, p=this.player;
    const running = this.canRun && I.down('run') && this.stamina>0.05;
    const sp = running?360:240;
    let ax=0; if (I.down('left')) ax-=1; if (I.down('right')) ax+=1;
    p.vx = ax*sp;
    const airPose = p.vy<0?'jump':'fall';
    if (ax!==0){ p.face=ax>0?1:-1; p.moving=true; p.pose= p.onGround? (running?'run':'walk') : airPose; }
    else { p.moving=false; p.pose=p.onGround?'idle':airPose; }
    // stamina
    if (running && ax!==0) this.stamina=Math.max(0,this.stamina-dt*0.45);
    else this.stamina=Math.min(1,this.stamina+dt*0.35);
    if (p.moving && p.onGround){ this._stepT=(this._stepT||0)+dt; const iv=running?0.2:0.28;
      if(this._stepT>iv){ this._stepT=0; this.G.audio.sfx('step'); } }
    if (I.pressed('jump')||I.pressed('up')){
      if (p.onGround){ p.vy= running?-700:-640; p.onGround=false; p.pose='jump'; this.G.audio.sfx('jump'); }
      else if (this.doubleJump && (p._airLeft||0)>0){ p._airLeft--; p.vy=-640; p.pose='jump'; this.G.audio.sfx('jump'); }
    }
  }
  _physics(dt){
    const p=this.player;
    p.vy += 1800*dt; if (p.vy>1500) p.vy=1500;
    p.x += p.vx*dt; this._collide('x');
    if (p.x < this.leftBound) p.x=this.leftBound;
    if (this.rightBound!=null && p.x+p.w> this.rightBound) p.x=this.rightBound-p.w;
    p.y += p.vy*dt; p.onGround=false;
    let landedPl=this._collide('y');
    if (p.onGround) p._airLeft = this.doubleJump?1:0;   // মাটিতে নামলে ডাবল-লাফ রিসেট
    // নিরাপদ অবস্থান মনে রাখা (শক্ত, স্থির প্ল্যাটফর্মে দাঁড়ালে)
    if (p.onGround && landedPl && !landedPl.kind && !landedPl.noSafe && this.hitCd<=0){
      this.safe={ x:p.x, y:p.y-2 };
    }
    if (!p.dead){
      const feetY=p.y+p.h, cx=p.x+p.w/2;
      for (const h of this.hazards){ if (h.off) continue;
        // নিচের দিকে ধরার পরিসর: ডিফল্ট ৯০ (জলের খাদ), কিন্তু h.tol দিলে আঁটসাঁট (সাপের মতো)
        const below=(h.tol!=null)?h.tol:90;
        if (cx>h.x && cx<h.x+h.w && feetY>h.y-6 && feetY<h.y+h.h+below){ this.damage(h.dmg||1, h.mode||'fall'); break; } }
      if (p.y> this.worldFloor+140) this.damage(1,'fall');
    }
  }
  _collide(axis){
    const p=this.player; let landed=null;
    for (const pl of this.platforms){
      if (pl.broken||pl.sunk) continue;
      if (p.x < pl.x+pl.w && p.x+p.w>pl.x && p.y<pl.y+pl.h && p.y+p.h>pl.y){
        if (axis==='y'){
          if (p.vy>0 && (p.y+p.h-pl.y) < 46){ p.y=pl.y-p.h; p.vy=0; p.onGround=true; landed=pl; }
          else if (p.vy<0){ p.y=pl.y+pl.h; p.vy=0; }
        } else {
          if (p.vx>0) p.x=pl.x-p.w; else if (p.vx<0) p.x=pl.x+pl.w;
        }
      }
    }
    return landed;
  }
  _interact(){
    const p=this.player, cx=p.x+p.w/2;
    let near=null, nd=1e9;
    for (const it of this.interactables){ if (it.hidden) continue; if (it.once&&it.done) continue;
      if (Math.abs(it.x-cx)<it.r && Math.abs(it.y-(p.y+p.h))<170){ const d=Math.abs(it.x-cx); if(d<nd){nd=d;near=it;} } }
    this._near=near;
    if (near){ this.G.ui.setHint(near.hint || (near.talk?S.talkHint:S.interactHint));
      if (this.G.input.pressed('interact')){ near.onE && near.onE(near); if (near.once) near.done=true; } }
  }
  _camera(){
    const target=this.player.x+this.player.w/2 - this.G.W*0.42;
    this.cam += (target-this.cam)*0.12;
    const maxCam=Math.max(0,this.worldW-this.G.W);
    if (this.cam<0) this.cam=0; if (this.cam>maxCam) this.cam=maxCam;
  }

  // ---- draw ----
  draw(ctx){
    ctx.save();
    if (!(this.bgKey && drawSceneBg(ctx, this.bgKey, this.G.W, this.G.H, this.cam, this.worldW))){
      this.drawBackground(ctx, this.cam);
    }
    ctx.translate(-this.cam,0);
    if (this.drawWorld) this.drawWorld(ctx);
    this._drawPlatforms(ctx);
    this._drawPickups(ctx);
    for (const n of this.npcs){ drawActor(ctx, n.key, n.x, n.groundY!=null?n.groundY:(this.groundY||560), n.anim, {pose:n.pose,face:n.face,expr:n.expr,moving:n.moving}); }
    for (const it of this.interactables){ if (it.hidden||(it.once&&it.done)||it.noMarker) continue; this._marker(ctx,it); }
    const p=this.player;
    if (!p.hidden){ const pose = this.attackT>0 ? 'attack' : (this.hitCd>0.55 ? 'hurt' : p.pose);
      drawActor(ctx, this.G.playerKey||'player', p.x+p.w/2, p.y+p.h, this.attackT>0?(0.28-this.attackT):this.t, {pose,face:p.face,expr:p.expr||'idle',moving:p.moving&&p.onGround}); }
    if (this.drawFore) this.drawFore(ctx);
    ctx.restore();
    if (this.drawOverlay) this.drawOverlay(ctx);
    // ক্ষতির লাল ঝলক
    if (this._flash>0){ ctx.save(); ctx.globalAlpha=Math.min(0.5,this._flash); ctx.fillStyle='#b02020'; ctx.fillRect(0,0,this.G.W,this.G.H); ctx.restore(); }
  }
  _drawPlatforms(ctx){
    for (const pl of this.platforms){
      if (!pl.visual || pl.broken || pl.sunk) continue;
      if (pl.visual==='log'){
        const img=Assets.prop('log');
        if (img){ const h=pl.w*(img.naturalHeight/img.naturalWidth); ctx.drawImage(img, pl.x, pl.y-h*0.34, pl.w, h); }
        else fallenLog(ctx, pl.x, pl.y, pl.w);
      }
      else if (pl.visual==='plank'){
        const cracking = pl.kind==='break' && (pl.standT||0)>0.3 && !pl.broken;
        ctx.fillStyle= cracking? '#7a6a34' : PAL.bamboo; rr(ctx,pl.x,pl.y,pl.w,pl.h,4); ctx.fill();
        ctx.strokeStyle=PAL.bambooDark; ctx.lineWidth=2; ctx.strokeRect(pl.x,pl.y,pl.w,pl.h);
        if (cracking){ ctx.strokeStyle='#3a2e1a'; ctx.lineWidth=1.5; ctx.beginPath();
          ctx.moveTo(pl.x+pl.w*0.3,pl.y); ctx.lineTo(pl.x+pl.w*0.45,pl.y+pl.h); ctx.moveTo(pl.x+pl.w*0.6,pl.y); ctx.lineTo(pl.x+pl.w*0.7,pl.y+pl.h); ctx.stroke(); }
      } else if (pl.visual==='stone'){ ctx.fillStyle='#8a8276'; rr(ctx,pl.x,pl.y,pl.w,pl.h,4); ctx.fill(); }
    }
  }
  _marker(ctx,it){
    const y=(it.markY!=null?it.markY:it.y-70) + Math.sin(this.t*3+it.x)*4;
    ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle='#f2c879';
    ctx.beginPath(); ctx.arc(it.x,y,5,0,7); ctx.fill();
    ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(it.x,y,11,0,7); ctx.stroke();
    ctx.restore();
  }
}
