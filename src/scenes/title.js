// টাইটেল স্ক্রিন — শব্দ চালুর গেট + মেনু।
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { drawCentered, setFont, drawWrapped } from '../engine/text.js';
import { Save } from '../engine/save.js';
import { Assets } from '../engine/assets.js';

export class TitleScene {
  constructor(G){ this.G=G; this.t=0; this.state='gate'; this.buttons=[]; this.showCredits=false; this.noHUD=true; }
  enter(){ this.hasSave=Save.hasSave(); this.checkpoint=0; }

  update(dt){
    this.t+=dt;
    const I=this.G.input;
    // keyboard shortcut
    if (this.state==='gate' && (I.pressed('interact')||I.pressed('jump'))) this._start();
    // button taps
    if (I.pointerTapped && I.lastTap){
      const p=I.lastTap;
      for (const b of this.buttons){ if (p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){ b.action(); I.pointerTapped=false; break; } }
    }
    if (this.showCredits && (I.pressed('pause'))) this.showCredits=false;
  }
  async _start(){
    await this.G.audio.unlock();
    this.G.audio.setAmbience('rain'); this.G.audio.setMusic_mood('calm');
    this.state='menu';
  }

  draw(ctx){
    const W=this.G.W,H=this.G.H;
    this._backdrop(ctx);
    // শিরোনাম প্যানেল (painted ব্যাকগ্রাউন্ড থাকলে gradient-ই যথেষ্ট)
    if (!Assets.titleFrame(this.t)){ ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle='rgba(10,14,26,0.35)'; ctx.fillRect(0,0,W,H); ctx.restore(); }
    // ডিজাইন করা টাইটেল লোগো; না থাকলে লেখা-ফলব্যাক
    const logo=Assets.get('ui_title');
    if (logo){ const lw=Math.min(760,W*0.62), lh=lw*(logo.naturalHeight/logo.naturalWidth);
      ctx.drawImage(logo, W/2-lw/2, 92, lw, lh); }
    else { drawCentered(ctx,S.title,W/2,150,64,'#f6e6b8',700,'rgba(0,0,0,0.6)');
      drawCentered(ctx,S.subtitle,W/2,206,22,'#d9cdb0',400,'rgba(0,0,0,0.5)'); }

    this.buttons=[];
    if (this.state==='gate'){
      this._bigButton(ctx, S.start, W/2, H-210, ()=>this._start());
      drawCentered(ctx,S.startHint,W/2,H-156,15,'#c9c0ac',400);
      this._soundToggle(ctx, W/2, H-108);
      if (Math.sin(this.t*3)>0) drawCentered(ctx,S.tapToStart,W/2,H-66,15,'#f2c879',700);
    } else if (this.showCredits){
      this._credits(ctx);
    } else if (this.state==='gender'){
      this._genderSelect(ctx);
    } else {
      let y=H-300;
      if (this.hasSave){ this._menuButton(ctx,S.continue,y,'#3f7a46',()=>{ if(!this.G.loadInto()) this.G.newGame(); }); y+=74; }
      this._menuButton(ctx,S.newGame,y,'#24304c',()=>{ this.state='gender'; }); y+=74;
      this._menuButton(ctx,S.credits,y,'#24304c',()=>{ this.showCredits=true; }); y+=74;
    }
  }
  _bigButton(ctx,label,cx,cy,act){
    const t=this.t;
    // ডিজাইন করা স্টার্ট বোতাম (ছবি); না থাকলে ভেক্টর
    const img=Assets.get('ui_play');
    if (img){ const pulse=0.5+0.5*Math.sin(t*2.4);
      const w=316+6*pulse, h=w*(img.naturalHeight/img.naturalWidth), x=cx-w/2, y=cy-h/2;
      ctx.save(); ctx.shadowColor='rgba(120,220,150,'+(0.3+0.3*pulse)+')'; ctx.shadowBlur=22+10*pulse;
      ctx.drawImage(img, x, y, w, h); ctx.restore();
      this.buttons.push({x:cx-158,y:cy-h/2,w:316,h,action:act}); return;
    }
    const w=320,h=82,x=cx-w/2,y=cy-h/2;
    ctx.save();
    // স্পন্দিত বাইরের আভা
    const pulse=0.5+0.5*Math.sin(t*2.4);
    ctx.shadowColor='rgba(120,220,150,'+(0.35+0.35*pulse)+')'; ctx.shadowBlur=26+10*pulse;
    // সবুজ গ্রেডিয়েন্ট দেহ
    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'#5fae63'); g.addColorStop(0.5,'#3f8a4a'); g.addColorStop(1,'#2f6d3c');
    ctx.fillStyle=g; A.rr(ctx,x,y,w,h,18); ctx.fill();
    ctx.shadowBlur=0;
    // উপরের হালকা ঝিলিক
    const gl=ctx.createLinearGradient(0,y,0,y+h*0.5); gl.addColorStop(0,'rgba(255,255,255,0.28)'); gl.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gl; A.rr(ctx,x+3,y+3,w-6,h*0.46,14); ctx.fill();
    // সোনালি কিনারা
    ctx.strokeStyle='rgba(246,230,184,0.85)'; ctx.lineWidth=2.5; A.rr(ctx,x,y,w,h,18); ctx.stroke();
    // ▸ + লেখা একসাথে, সুন্দর কেন্দ্রীভূত
    setFont(ctx,30,700); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#ffffff'; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=4;
    ctx.fillText('▸  '+label, cx, cy+1);
    ctx.restore();
    this.buttons.push({x,y,w,h,action:act});
  }
  // শুরুর পর্দায় শব্দ চালু/বন্ধ টগল — ডিজাইন করা আইকন
  _soundToggle(ctx,cx,cy){
    const muted=this.G.audio.settings.muteAll;
    const icon=Assets.get(muted?'ui_sound_off':'ui_sound_on');
    if (icon){ const sz=54, x=cx-sz/2, y=cy-sz/2;
      ctx.drawImage(icon, x, y, sz, sz);
      drawCentered(ctx, muted?S.off:S.on, cx, cy+sz/2+14, 14, muted?'#e8a0a0':'#9be39b', 700);
      this.buttons.push({x:x-8,y:y-8,w:sz+16,h:sz+28,action:()=>{ this.G.audio.setMute(!this.G.audio.settings.muteAll); }});
      return;
    }
    const w=186,h=38,x=cx-w/2,y=cy-h/2;
    ctx.save();
    ctx.fillStyle= muted?'rgba(90,58,58,0.9)':'rgba(36,58,72,0.9)'; A.rr(ctx,x,y,w,h,10); ctx.fill();
    ctx.strokeStyle='rgba(243,231,200,0.5)'; ctx.lineWidth=1.5; A.rr(ctx,x,y,w,h,10); ctx.stroke();
    const ix=x+22, iy=cy; ctx.fillStyle='#f3e7c8';
    ctx.beginPath(); ctx.moveTo(ix-7,iy-5); ctx.lineTo(ix-2,iy-5); ctx.lineTo(ix+3,iy-10); ctx.lineTo(ix+3,iy+10); ctx.lineTo(ix-2,iy+5); ctx.lineTo(ix-7,iy+5); ctx.closePath(); ctx.fill();
    if (muted){ ctx.strokeStyle='#e88'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(ix+7,iy-7); ctx.lineTo(ix+15,iy+7); ctx.stroke(); }
    else { ctx.strokeStyle='#f3e7c8'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(ix+6,iy,5,-0.7,0.7); ctx.arc(ix+6,iy,9,-0.7,0.7); ctx.stroke(); }
    drawCentered(ctx, S.sound+'：'+(muted?S.off:S.on), cx+18, cy, 16, '#f1e8d4', 700);
    ctx.restore();
    this.buttons.push({x,y,w,h,action:()=>{ this.G.audio.setMute(!this.G.audio.settings.muteAll); }});
  }
  _menuButton(ctx,label,y,col,act){
    const w=360,h=58,x=this.G.W/2-w/2;
    ctx.fillStyle=col; A.rr(ctx,x,y,w,h,12); ctx.fill();
    ctx.strokeStyle='rgba(243,231,200,0.3)'; ctx.lineWidth=1.5; ctx.stroke();
    drawCentered(ctx,label,this.G.W/2,y+h/2,22,'#f1e8d4',700);
    this.buttons.push({x,y,w,h,action:act});
  }
  _genderSelect(ctx){
    const W=this.G.W,H=this.G.H;
    drawCentered(ctx,S.choosePlayer,W/2,250,34,'#f6e6b8',700,'rgba(0,0,0,0.6)');
    const cardW=200, cardH=260, gap=60, y=300;
    const total=cardW*2+gap, x0=(W-total)/2;
    const draw=(cx,key,label)=>{
      ctx.fillStyle='rgba(16,20,34,0.72)'; A.rr(ctx,cx,y,cardW,cardH,16); ctx.fill();
      ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.stroke();
      const img=Assets.get(key);
      if (img){ const h=180, w=img.naturalWidth*(h/img.naturalHeight);
        ctx.drawImage(img, cx+cardW/2-w/2, y+16, w, h); }
      ctx.fillStyle='#3f7a46'; A.rr(ctx,cx+20,y+cardH-52,cardW-40,38,10); ctx.fill();
      drawCentered(ctx,label,cx+cardW/2,y+cardH-33,20,'#fff',700);
      this.buttons.push({x:cx,y,w:cardW,h:cardH,action:()=>{ this.G.setGender(key==='char_player_female'?'female':'male'); this.G.newGame(); }});
    };
    draw(x0,'char_player_male',S.boy);
    draw(x0+cardW+gap,'char_player_female',S.girl);
    this._menuButton(ctx,S.back, H-110, '#24304c', ()=>{ this.state='menu'; });
  }

  _credits(ctx){
    const W=this.G.W,H=this.G.H, w=Math.min(760,W-80), x=(W-w)/2, y=260;
    ctx.fillStyle='rgba(16,20,34,0.9)'; A.rr(ctx,x,y,w,H-y-80,14); ctx.fill();
    ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.stroke();
    let yy=y+44; drawCentered(ctx,S.credits,W/2,yy,26,'#f2c879',700); yy+=40;
    const lines=[
      'নির্মাতা — Ahsun Ahmed Sun',
      '   গল্প লেখা · গেম ডিজাইন · সাউন্ড ডিজাইন · QC',
      '',
      'সহযোগী (AI) — Claude · Gemini · ChatGPT',
      '   কোড, শিল্প ও কণ্ঠ তৈরিতে সহায়তা',
      '',
      'ইঞ্জিন: নিজস্ব JavaScript / HTML5 Canvas (তৃতীয়-পক্ষ গেম-ইঞ্জিন নয়)।',
      'ফন্ট: Noto Sans Bengali (SIL Open Font License)।',
      'ভাষা: বরিশালের আঞ্চলিক কথ্য বাংলা।',
      '',
      S.back+' — Esc',
    ];
    for (const l of lines){ yy=drawWrapped(ctx,l,x+36,yy+6,w-72,16,{color:'#d9d2c0',lineHeight:24}); }
    this._menuButton(ctx,S.back, H-120, '#24304c', ()=>{ this.showCredits=false; });
  }

  _backdrop(ctx){
    const W=this.G.W,H=this.G.H,t=this.t;
    const frame=Assets.titleFrame(t);
    if (frame){
      A.drawImgCover(ctx,frame,W,H);
      A.rain(ctx,W,H,t,0.7);                 // বৃষ্টির ওভারলে
      // পড়ার সুবিধায় উপরে-নিচে হালকা অন্ধকার
      const g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'rgba(10,12,24,0.45)'); g.addColorStop(0.4,'rgba(10,12,24,0.05)');
      g.addColorStop(0.75,'rgba(10,12,24,0.15)'); g.addColorStop(1,'rgba(10,12,24,0.55)');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      return;
    }
    A.sky(ctx,W,H,A.PAL.skyDusk);
    A.stars(ctx,W,H,26,t);
    A.moon(ctx,W*0.78,120,26);
    A.cloud(ctx,W*0.3,110,1.2,'rgba(90,70,110,0.5)');
    A.cloud(ctx,W*0.62,150,1.0,'rgba(90,70,110,0.4)');
    A.treeline(ctx,W,440,'#2a3a46',2,46);
    // জল
    A.water(ctx,0,430,W,H-430,A.PAL.waterDusk,t,true);
    A.hyacinth(ctx,W*0.1,560,12,t);
    // ঘাট + নৌকা + ঘর + লণ্ঠন
    A.hut(ctx,80,300,150,110,{});
    A.coconutPalm(ctx,300,330,1.1,t);
    A.bananaTree(ctx,250,420,0.9,t);
    A.jetty(ctx,W*0.5,452,320,t);
    A.boat(ctx,W*0.78,470,1.3,t,{bob:true});
    A.reeds(ctx,W*0.42,470,10,t,1.1);
    A.lantern(ctx,W*0.5+20,410,t,true);
  }
}
