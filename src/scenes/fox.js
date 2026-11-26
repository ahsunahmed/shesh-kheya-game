// অধ্যায় ৫: শেয়ালের মাঠ — লাঠি কুড়িয়ে চঞ্চল শেয়ালের সাথে লড়াই (৫ বার আঘাত = পালায়)।
import { Platformer } from '../engine/scene.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class FoxScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=615; this.ambience='bamboo'; this.mood='danger'; this.bgKey='bg_fox';
    this.canRun=true; this.leftBound=40; this.rightBound=1260;
    this.addGround(615); this.checkpoints=[{x:120,y:520}]; this.setAudio();

    this.foxGone=!!this.G.state.flags.fox_gone;
    this.hasStick=!!this.G.state.flags.has_stick;
    this.stick=this.addInteract({ x:250, y:605, r:70, markY:540, once:true, hidden:this.hasStick,
      hint:'লাঠি তোলো (E)', onE:()=>{ this.hasStick=true; this.G.state.flags.has_stick=1;
        this.G.ui.toast('লাঠি পেলে! এবার E/আঘাত দিয়ে শেয়ালকে মারো।','success',3); } });

    // শেয়াল
    this.fox={ x:900, y:this.groundY, vx:0, dir:-1, state:'roam', hits:0, timer:1.2, lungeT:0, stun:0, anim:0, flee:false, gone:this.foxGone, hurtFlash:0 };
    this.swingT=0; this.atkCd=0; this.howlCd=0;

    // ভাসমান হৃদয়
    this.addHeart(640, 560, 'heart_fox');

    // ডান দিক থেকে ফিরলে ডানে, নইলে বাঁয়ে
    if (opts.enter==='right'){ this.player.x=1200; this.player.y=520; this.player.vx=this.player.vy=0; }
    else this.spawn(0);

    this.back=this.addInteract({ x:60, y:605, r:70, markY:540, hint:'← বড় খাদে ফেরো (E)',
      onE:()=>this.G.changeScene('bigchasm',{enter:'right'}) });
    this.exit=this.addInteract({ x:1210, y:605, r:80, hidden:!this.foxGone, hint:'সেচঘরের পথ → (E)',
      onE:()=>this.G.changeScene('pumphouse',{enter:'left'}) });

    // শেয়াল হাজির — গর্জন (আগে হারালে নয়)
    if (!this.foxGone){ this.G.audio.sfx('howl'); this.howlCd=2.5; }

    if (!opts.loaded && !this.foxGone && opts.enter!=='right'){ this.G.ui.startDialogue([
      {s:'player',t:'একটা শেয়াল! রাস্তা আটকাইয়া ঘুরঘুর করতাছে, সুযোগ পাইলেই ঝাঁপ দিব।',e:'worried'},
      {s:'player',t:'আগে ওই লাঠিডা তুলি — তারপর ঠিক সময়ে বাড়ি দিতে অইব। হে এক জায়গায় থাহে না!',e:'serious'}]); }
  }

  onUpdate(dt){
    const p=this.player, f=this.fox;
    if (this.atkCd>0) this.atkCd-=dt; if (this.swingT>0) this.swingT-=dt; if (f.hurtFlash>0) f.hurtFlash-=dt;
    if (this.howlCd>0) this.howlCd-=dt;
    if (this.boomFx){ this.boomFx.ttl-=dt; if (this.boomFx.ttl<=0) this.boomFx=null; }
    f.anim+=dt;

    // আক্রমণ (লাঠি): E/interact চাপলে
    if (this.hasStick && this.G.input.pressed('interact') && this.atkCd<=0 && !f.gone){
      this.atkCd=0.45; this.swingT=0.28; this.attackT=0.28; this.G.audio.sfx('hit');   // আসল আঘাতের শব্দ
      const reach=120, infront=(p.face>0? f.x>p.x : f.x<p.x);
      if (!f.flee && f.stun<=0 && Math.abs(f.x-(p.x+p.w/2))<reach && infront){
        f.hits++; f.stun=0.6; f.hurtFlash=0.3; f.vx=(f.x>p.x?1:-1)*320;
        this.boomFx={ x:f.x, y:this.groundY-46, ttl:0.42, max:0.42 };   // 💥 আঘাতের ঝলক
        this.G.ui.toast('আঘাত! ('+this._bn(f.hits)+'/৫)', 'info',0.9);
        if (f.hits>=5){ f.flee=true; this.G.ui.toast('শেয়াল পালাচ্ছে!','success',2); }
      }
    }

    // শেয়ালের গতি
    if (f.gone){ /* nothing */ }
    else if (f.flee){ f.dir=(f.x>p.x?1:-1); f.vx=f.dir*420; f.x+=f.vx*dt;
      if (f.x<-80||f.x>1360){ f.gone=true; this.foxGone=true; this.G.state.flags.fox_gone=1; this.G.save&&this.G.save();
        this.exit.hidden=false; this.G.setObjective('শেয়াল পালিয়েছে — ডান দিকে সেচঘরের পথে যাও।'); } }
    else if (f.stun>0){ f.stun-=dt; f.vx*=0.86; f.x+=f.vx*dt; }
    else {
      f.timer-=dt;
      if (f.state==='lunge'){ f.lungeT-=dt; f.vx=f.dir*430; f.x+=f.vx*dt;
        if (Math.abs(f.x-(p.x+p.w/2))<42 && !f.lungeHit){ f.lungeHit=true; this.damage(1,'force'); f.vx=-f.dir*180; }
        if (f.lungeT<=0){ f.state='roam'; f.timer=1.0+Math.random()*1.2; }
      } else {
        if (f.timer<=0){
          if (Math.random()<0.55){ f.state='lunge'; f.lungeT=0.5; f.dir=(p.x>f.x?1:-1); f.lungeHit=false;
            this.G.audio.sfx('step'); if (this.howlCd<=0){ this.G.audio.sfx('howl'); this.howlCd=4; } }
          else { f.dir=-f.dir; f.timer=0.8+Math.random()*1.0; }
        }
        f.vx=f.dir*150; f.x+=f.vx*dt;
      }
      if (f.x<90){ f.x=90; f.dir=1; } if (f.x>1170){ f.x=1170; f.dir=-1; }
    }
    if (Math.abs(f.vx)>5) f.face=f.vx<0?-1:1;
  }
  _bn(n){ return String(n).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[+d]); }

  drawBackground(ctx,cam){ const W=this.G.W,H=this.G.H,t=this.t;
    A.sky(ctx,W,H,A.PAL.skyDusk); A.treeline(ctx,W,460,'#243a2e',2,40); }
  drawWorld(ctx){
    const t=this.t;
    if (!Assets.has('bg_fox')){ A.groundStrip(ctx,-200,this.groundY,this.worldW+400,200,'#8a6a40','#5a4a30'); }
    if (!this.hasStick && !this.stick.done){ // মাটিতে লাঠি (ছবি থাকলে ছবি)
      const img=Assets.prop('stick');
      if (img){ const h=96, w=img.naturalWidth*(h/img.naturalHeight); ctx.save(); ctx.translate(252,this.groundY-18); ctx.rotate(-0.5);
        ctx.drawImage(img,-w/2,-h/2,w,h); ctx.restore(); }
      else { ctx.save(); ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=7; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(226,this.groundY-2); ctx.lineTo(282,this.groundY-20); ctx.stroke(); ctx.restore(); } }
    if (!this.fox.gone) this._drawFox(ctx,this.fox);
    this._drawBoom(ctx);
  }
  _drawBoom(ctx){
    const bf=this.boomFx; if(!bf) return; const k=1-(bf.ttl/bf.max);
    const img=Assets.prop('boom');
    ctx.save(); ctx.globalAlpha=Math.max(0,1-k);
    const sc=0.7+k*0.8;
    if (img){ const h=130*sc, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, bf.x-w/2, bf.y-h/2, w,h); }
    else { ctx.translate(bf.x,bf.y); ctx.fillStyle='#ffd24a'; ctx.strokeStyle='#ff7a2a'; ctx.lineWidth=3;
      ctx.beginPath(); for(let i=0;i<12;i++){ const a=i/12*Math.PI*2, r=(i%2?14:30)*sc; const fn=i?'lineTo':'moveTo'; ctx[fn](Math.cos(a)*r,Math.sin(a)*r); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  // আক্রমণের ভঙ্গি এখন player_<gender>_attack অ্যানিমেশন দেখায় (base draw), আলাদা ভেক্টর ঝাপট নয়।
  drawOverlay(ctx){
    // শেয়ালের স্বাস্থ্য (৫ পিপ)
    if (this.fox.gone) return;
    const W=this.G.W; ctx.save(); ctx.textAlign='center';
    ctx.fillStyle='#d9d2c0'; ctx.font='700 15px NotoBengali,sans-serif';
    ctx.fillText('শেয়াল', W/2-70, 36);
    for(let i=0;i<5;i++){ ctx.fillStyle= i<(5-this.fox.hits)?'#d6464a':'#4a3a3a'; ctx.beginPath(); ctx.arc(W/2-20+i*22,31,7,0,7); ctx.fill(); }
    ctx.restore();
  }

  _drawFox(ctx,f){
    // ছবি থাকলে sprite, নইলে ভেক্টর
    const anim = f.flee?'run' : f.state==='lunge'?'run' : (Math.abs(f.vx)>5?'walk':'idle');
    // sprite ডিফল্টে বামমুখী; পালানোর সময় চলার দিকে, নইলে খেলোয়াড়ের দিকে মুখ
    const face = f.flee ? (f.vx<0?1:-1) : (this.player.x < f.x ? 1 : -1);
    const alpha = (f.hurtFlash>0 && Math.floor(f.anim*30)%2===0)?0.5:1;
    if (A.drawSprite(ctx,'fox',anim, f.x, this.groundY, 150, f.anim, face, {alpha})) return;
    const t=this.t, x=f.x, base=this.groundY, run=Math.abs(f.vx)>5?Math.sin(f.anim*16)*4:Math.sin(f.anim*3)*1.5;
    ctx.save(); ctx.translate(x,base); ctx.scale(f.face,1);
    if (f.hurtFlash>0 && Math.floor(f.anim*30)%2===0) ctx.globalAlpha=0.5;
    ctx.fillStyle=A.PAL.shadow; ctx.beginPath(); ctx.ellipse(0,0,26,6,0,0,7); ctx.fill();
    const col='#c8632a', belly='#e8dccb';
    // লেজ
    ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(-18,-20); ctx.quadraticCurveTo(-48,-30,-40,-6); ctx.quadraticCurveTo(-30,-16,-18,-14); ctx.fill();
    ctx.fillStyle=belly; ctx.beginPath(); ctx.ellipse(-42,-10,6,5,0,0,7); ctx.fill();
    // পা
    ctx.strokeStyle=col; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-10,-14); ctx.lineTo(-10+run,0); ctx.moveTo(12,-14); ctx.lineTo(12-run,0); ctx.stroke();
    // দেহ
    ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,-22,20,12,0,0,7); ctx.fill();
    ctx.fillStyle=belly; ctx.beginPath(); ctx.ellipse(2,-16,14,6,0,0,7); ctx.fill();
    // মাথা
    ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(20,-30,11,9,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(28,-30); ctx.lineTo(38,-26); ctx.lineTo(28,-24); ctx.fill(); // থুতনি
    ctx.fillStyle='#2a2018'; ctx.beginPath(); ctx.arc(38,-26,2,0,7); ctx.fill(); // নাক
    // কান
    ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(16,-38); ctx.lineTo(13,-50); ctx.lineTo(22,-40); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24,-38); ctx.lineTo(24,-50); ctx.lineTo(30,-39); ctx.fill();
    // চোখ
    ctx.fillStyle='#1a140e'; ctx.beginPath(); ctx.arc(22,-31,1.8,0,7); ctx.fill();
    ctx.restore();
  }
}
