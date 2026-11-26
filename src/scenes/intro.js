// ইন্ট্রো — করিম চাচার ভিডিও (অ্যাসেট) + সময়-মিলানো ক্যাপশন; ভিডিও না চললে ছবি-কাটসিন ফলব্যাক।
import { UI as S } from '../data/strings.js';
import { DIALOGUE } from '../data/dialogue.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';
import { drawWrapped, drawCentered } from '../engine/text.js';

const VIDEO_SRC = './assets/game_intro_Karim_chacha.mp4';
const SPEED = 1.0;            // দরকারে গতি বদলানো যায়

export class IntroScene {
  constructor(G){ this.G=G; this.t=0; this.noHUD=true; this.mode='loading';
    this.caps=DIALOGUE.intro; this._gone=false; this._capIdx=-1;
    // ছবি-ফলব্যাকের জন্য
    this.ci=0; this.ct=0; this.phase='storm'; this.flash=0; this.flashT=2.2; this.boatX=900;
  }
  // ইন্ট্রো ভিডিও দ্রুত চলে — কণ্ঠ শেষ হওয়ার সময় পায় না; তাই শুধু লেখা, কণ্ঠ নয়।
  _speakCap(idx){ this._capIdx=idx; }

  enter(){
    this.G.audio.setMusic_mood('danger');
    const v=document.createElement('video');
    v.src=VIDEO_SRC; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='auto';
    v.muted=this.G.audio.settings.muteAll; v.volume=0.9; v.playbackRate=SPEED;
    v.style.position='fixed'; v.style.left='-9999px'; v.style.width='2px'; v.style.height='2px';
    document.body.appendChild(v); this.video=v;
    v.addEventListener('ended',()=>this._toGhat());
    v.addEventListener('error',()=>this._fallback());
    const tryPlay=()=> v.play().then(()=>{ this.mode='video'; })
      .catch(()=>{ v.muted=true; v.play().then(()=>{ this.mode='video'; }).catch(()=>this._fallback()); });
    // metadata এলে চালাও
    if (v.readyState>=1) tryPlay(); else { v.addEventListener('loadedmetadata',tryPlay,{once:true});
      setTimeout(()=>{ if(this.mode==='loading') { if(v.readyState>=1) tryPlay(); else this._fallback(); } }, 4000); }
    // ঝড়ের পরিবেশ
    this.G.audio.setAmbience('storm');
  }
  _fallback(){ if(this.mode==='video'||this._gone) return; this.mode='images'; }

  _toGhat(){ if (this._gone) return; this._gone=true;
    if (this.video){ try{ this.video.pause(); this.video.removeAttribute('src'); this.video.load(); this.video.remove(); }catch(e){} this.video=null; }
    this.G.changeScene('ghat',{fromIntro:true});
  }

  update(dt){
    this.t+=dt;
    const I=this.G.input;
    // স্কিপ
    if (I.pressed('pause')) return this._toGhat();
    if (I.pointerTapped && I.lastTap && this.skipBtn){ const p=I.lastTap,b=this.skipBtn;
      if (p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){ I.pointerTapped=false; return this._toGhat(); } }

    if (this.mode==='images'){ this._updImages(dt, I); return; }
    // video মোড: শেষ হলে ended ইভেন্ট সামলায়; নিরাপত্তা হিসেবে সময়ও দেখি
    if (this.mode==='video' && this.video && this.video.duration && this.video.currentTime>=this.video.duration-0.05) this._toGhat();
  }
  _updImages(dt, I){
    this._speakCap(this.ci);
    this.phase = this.ci>=3 ? 'morning' : 'storm';
    if (this.phase==='storm'){ this.boatX-=24*dt; this.flashT-=dt;
      if (this.flashT<=0){ this.flashT=1.6+Math.random()*2.4; this.flash=1; this.G.audio.sfx('thunder'); } }
    else if (this.G.audio.ambName!=='quiet'){ this.G.audio.setAmbience('quiet'); this.G.audio.setMusic_mood('mystery'); }
    if (this.flash>0) this.flash=Math.max(0,this.flash-dt*2.5);
    if (I.pointerTapped){ I.pointerTapped=false; this._advImg(); }
    else if (I.pressed('interact')||I.pressed('jump')) this._advImg();
    this.ct+=dt; if (this.ct>5.5) this._advImg();
  }
  _advImg(){ this.ci++; this.ct=0; if (this.ci>=this.caps.length) this._toGhat(); }

  draw(ctx){
    const W=this.G.W,H=this.G.H,t=this.t;
    if (this.mode==='video' && this.video && this.video.readyState>=2){
      try{ A.drawImgCover(ctx, this.video, W, H); }catch(e){}
      // সময়-মিলানো ক্যাপশন
      const d=this.video.duration||10, seg=d/this.caps.length;
      const idx=Math.min(this.caps.length-1, Math.floor((this.video.currentTime||0)/seg));
      this._speakCap(idx);
      this._caption(ctx, this.caps[idx] && this.caps[idx].t);
    } else if (this.mode==='images'){
      this._drawImages(ctx);
    } else {
      ctx.fillStyle='#0c111d'; ctx.fillRect(0,0,W,H);
      drawCentered(ctx,'লোড হচ্ছে…',W/2,H/2,24,'#d9d2c0',400);
    }
    // skip button (সব মোডে)
    this.skipBtn={x:W-160,y:30,w:130,h:40};
    ctx.fillStyle='rgba(40,52,80,0.85)'; A.rr(ctx,this.skipBtn.x,this.skipBtn.y,this.skipBtn.w,this.skipBtn.h,10); ctx.fill();
    drawCentered(ctx,S.skip,this.skipBtn.x+this.skipBtn.w/2,this.skipBtn.y+20,16,'#f3e7c8',700);
  }

  _caption(ctx, txt){ if(!txt) return; const W=this.G.W,H=this.G.H;
    const bx=60,bw=W-120,bh=92,by=H-bh-70;
    ctx.fillStyle='rgba(10,12,22,0.78)'; A.rr(ctx,bx,by,bw,bh,14); ctx.fill();
    ctx.strokeStyle='rgba(242,200,121,0.4)'; ctx.lineWidth=2; ctx.stroke();
    drawWrapped(ctx,txt,bx+28,by+38,bw-56,21,{color:'#f1e8d4',lineHeight:30});
  }

  _drawImages(ctx){
    const W=this.G.W,H=this.G.H,t=this.t;
    if (this.phase==='storm'){
      if (Assets.has('bg_storm')){ A.drawImgCover(ctx,Assets.get('bg_storm'),W,H); A.rain(ctx,W,H,t,1.4); A.lightningFlash(ctx,W,H,this.flash); }
      else { A.sky(ctx,W,H,A.PAL.skyStorm); A.treeline(ctx,W,430,'#161a2a',3,52); A.water(ctx,0,420,W,H-420,A.PAL.waterNight,t,false);
        A.boat(ctx,this.boatX,470,1.4,t,{bob:true}); A.lantern(ctx,this.boatX,452,t,true); A.rain(ctx,W,H,t,1.3); A.lightningFlash(ctx,W,H,this.flash); }
    } else {
      if (Assets.has('bg_ghatdawn')){ A.drawImgCover(ctx,Assets.get('bg_ghatdawn'),W,H); A.liveWater(ctx,0,330,W,160,t); }
      else { A.sky(ctx,W,H,A.PAL.skyDawn); A.treeline(ctx,W,440,'#3a5a4a',2,40); A.water(ctx,0,430,W,H-430,A.PAL.waterDay,t,false); A.hut(ctx,90,300,150,110,{}); }
    }
    this._caption(ctx, this.caps[Math.min(this.ci,this.caps.length-1)] && this.caps[Math.min(this.ci,this.caps.length-1)].t);
    drawCentered(ctx,S.tapToStart+' / '+S.next, W/2, H-36, 14, 'rgba(243,231,200,0.7)',400);
  }
}
