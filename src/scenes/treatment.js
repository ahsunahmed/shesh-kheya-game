// সমাপ্তি অনুক্রম: (১) সালমা আপার চিকিৎসা-ভিডিও (লুপ) — তার উপর সমাপ্তি-সংলাপ, যাতে লেখা ঠিকমতো শেষ হয়।
// (২) শেষ বাক্যে দুই ব্যাকগ্রাউন্ড উষ্ণ ক্রস-ফেড (ভোরের ঘাট ↔ সেচঘর, কোনো চরিত্র নাই)।
// (৩) সুন্দর “সমাপ্ত” + গ্রাফিক্স টাইটেল + মেনু।
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';
import { DIALOGUE } from '../data/dialogue.js';
import { UI as S } from '../data/strings.js';
import { drawCentered } from '../engine/text.js';

export class TreatmentScene {
  constructor(G){ this.G=G; this.t=0; this.noHUD=true; this.phase='video'; this.mode='loading'; this.finaleT=0; }

  enter(){
    this.G.audio.setAmbience('village'); this.G.audio.setMusic_mood('rescue');
    const female=this.G.gender==='female';
    this.imgKey=female?'bg_salma_female':'bg_salma';
    const src=female?'./assets/Female_Salma_Medic.mp4':'./assets/Male_Salma_Medic.mp4';
    const v=document.createElement('video'); v.src=src; v.loop=true; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='auto';
    v.muted=this.G.audio.settings.muteAll; v.volume=0.8;
    v.style.position='fixed'; v.style.left='-9999px'; v.style.width='2px'; v.style.height='2px';
    document.body.appendChild(v); this.video=v;
    v.addEventListener('error',()=>{ this.mode='image'; });
    const tryPlay=()=> v.play().then(()=>{ this.mode='video'; })
      .catch(()=>{ v.muted=true; v.play().then(()=>{ this.mode='video'; }).catch(()=>{ this.mode='image'; }); });
    if (v.readyState>=1) tryPlay(); else { v.addEventListener('loadedmetadata',tryPlay,{once:true});
      setTimeout(()=>{ if(this.mode==='loading'){ if(v.readyState>=1) tryPlay(); else this.mode='image'; } }, 4000); }
    // চিকিৎসার উপর সমাপ্তি-সংলাপ (শেষ দুই বর্ণনা বাদ — সেগুলো ফিনালেতে দেখানো হবে)
    const lines=DIALOGUE.ending.slice(0, DIALOGUE.ending.length-2);
    this.G.ui.startDialogue(lines, ()=>{ this.phase='finale'; this.finaleT=0; this._stopVideo();
      this.G.audio.setMusic_mood('calm'); });
  }
  _stopVideo(){ if(this.video){ try{ this.video.pause(); this.video.removeAttribute('src'); this.video.load(); this.video.remove(); }catch(e){} this.video=null; } }

  update(dt){ this.t+=dt; const I=this.G.input;
    if (this.phase==='finale'){ this.finaleT+=dt;
      if (this.finaleT>8 || I.pressed('interact')||I.pressed('jump')||I.pointerTapped){ I.pointerTapped=false; this.phase='somapto'; } }
    else if (this.phase==='somapto'){
      if (I.pointerTapped && I.lastTap && this.btn){ const p=I.lastTap,b=this.btn;
        if (p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){ I.pointerTapped=false; this.G.goMenu(); } }
      if (I.pressed('interact')||I.pressed('jump')) this.G.goMenu();
    }
  }

  draw(ctx){ const W=this.G.W,H=this.G.H;
    if (this.phase==='video'){
      if (this.mode==='video' && this.video && this.video.readyState>=2){ try{ A.drawImgCover(ctx,this.video,W,H); }catch(e){} }
      else if (this.mode==='image'){ const img=Assets.get(this.imgKey); if(img) A.drawImgCover(ctx,img,W,H); else { ctx.fillStyle='#10172a'; ctx.fillRect(0,0,W,H); } }
      else { ctx.fillStyle='#0c111d'; ctx.fillRect(0,0,W,H); drawCentered(ctx,'লোড হচ্ছে…',W/2,H/2,24,'#d9d2c0',400); }
      // সংলাপ গেম-লুপ (ui) নিজেই আঁকবে
    } else if (this.phase==='finale'){ this._drawFinale(ctx); }
    else { this._drawSomapto(ctx); }
  }

  _drawFinale(ctx){ const W=this.G.W,H=this.G.H;
    const a=Math.min(1,this.finaleT/8);
    const introBg=Assets.get('bg_ghatdawn')||Assets.get('bg_ghat');
    const pumpBg=Assets.get('bg_pumpfixed')||Assets.get('bg_pump');
    if (introBg) A.drawImgCover(ctx,introBg,W,H); else { ctx.fillStyle='#2a2440'; ctx.fillRect(0,0,W,H); }
    if (pumpBg){ ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,(a-0.35)/0.45)); A.drawImgCover(ctx,pumpBg,W,H); ctx.restore(); }
    // উষ্ণ আভা
    ctx.save(); ctx.globalAlpha=0.20+0.06*Math.sin(this.t*2); ctx.fillStyle='#f0b060'; ctx.fillRect(0,0,W,H); ctx.restore();
    const g=ctx.createLinearGradient(0,H-200,0,H); g.addColorStop(0,'rgba(10,8,6,0)'); g.addColorStop(1,'rgba(10,8,6,0.65)');
    ctx.fillStyle=g; ctx.fillRect(0,H-200,W,200);
    const line = a<0.5 ? 'হেই রাইতের পর নতুন একটা সংকেতবাতি বসল সেচঘরে —' : 'আর কেউ যেন আন্ধারে না হারায়।';
    drawCentered(ctx,line,W/2,H-80,26,'#fff6e0',700,'rgba(0,0,0,0.7)');
  }

  _drawSomapto(ctx){ const W=this.G.W,H=this.G.H;
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#2e2746'); g.addColorStop(0.55,'#7a5748'); g.addColorStop(1,'#caa05a');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    const logo=Assets.get('ui_title');
    if (logo){ const lw=Math.min(560,W*0.46), lh=lw*(logo.naturalHeight/logo.naturalWidth); ctx.drawImage(logo, W/2-lw/2, 72, lw, lh); }
    else drawCentered(ctx,S.title,W/2,150,52,'#f6e6b8',700,'rgba(0,0,0,0.6)');
    this._somaptoArt(ctx, W/2, H/2+40);
    const b={x:W/2-150,y:H-110,w:300,h:52}; this.btn=b;
    ctx.fillStyle='#3f7a46'; A.rr(ctx,b.x,b.y,b.w,b.h,12); ctx.fill();
    ctx.strokeStyle='rgba(246,230,184,0.6)'; ctx.lineWidth=2; A.rr(ctx,b.x,b.y,b.w,b.h,12); ctx.stroke();
    drawCentered(ctx,S.toMenu,b.x+b.w/2,b.y+26,20,'#fff',700);
  }
  _somaptoArt(ctx,cx,cy){
    ctx.save();
    const gl=ctx.createRadialGradient(cx,cy,10,cx,cy,190); gl.addColorStop(0,'rgba(246,220,150,0.5)'); gl.addColorStop(1,'rgba(246,220,150,0)');
    ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(cx,cy,190,0,7); ctx.fill();
    ctx.strokeStyle='rgba(246,230,184,0.85)'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(cx-180,cy+58); ctx.lineTo(cx+180,cy+58); ctx.stroke();
    ctx.fillStyle='#f6e6b8';
    ctx.beginPath(); ctx.arc(cx-196,cy+58,4,0,7); ctx.arc(cx+196,cy+58,4,0,7); ctx.fill();
    for (let i=0;i<3;i++){ const dx=(i-1)*26; ctx.beginPath(); ctx.moveTo(cx+dx,cy+68); ctx.lineTo(cx+dx-5,cy+78); ctx.lineTo(cx+dx+5,cy+78); ctx.closePath(); ctx.fill(); }
    drawCentered(ctx,'সমাপ্ত',cx,cy+6,76,'#f6e6b8',700,'rgba(60,30,10,0.65)');
    ctx.restore();
  }
}
