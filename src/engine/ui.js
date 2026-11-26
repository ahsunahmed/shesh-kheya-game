// ইউআই: সংলাপ, খাতা, HUD, টোস্ট, পাজল-চয়েস, বিরতি, গেম-ওভার, টাচ বোতাম।
import { UI as S, CHAPTERS } from '../data/strings.js';
import { SPEAKERS } from '../data/dialogue.js';
import { CLUES, clueText } from '../data/clues.js';
import { drawWrapped, drawCentered, setFont, wrapText, toBn } from './text.js';
import { rr, drawChar, drawPortrait } from './art.js';

export class UIManager {
  constructor(G){
    this.G=G; this.W=G.W; this.H=G.H;
    this.dialogue=null;           // {seq,i,onDone,chars,skipHot}
    this.toasts=[];               // {text,type,ttl,max}
    this.notebookOpen=false;
    this.paused=false;
    this.gameover=null;           // {onRetry}
    this.choiceBox=null;          // {title,options,onPick,msg}
    this.buttons=[];              // overlay clickable hotspots
    this.controlMode='none';      // none|platform|boat
    this.showTouch=false;
    this.title=null;              // handled by scene, but blocks? no
    this._typed=0;                // typewriter progress
    this._hint=null;              // interaction hint text (world)
  }

  // ---------------- API ----------------
  startDialogue(seq, onDone){
    if (!seq||!seq.length){ onDone&&onDone(); return; }
    this.dialogue={ seq, i:0, onDone, t:0 }; this._typed=0;
    this.G.audio.duck(true);
    this._speakLine(0);
  }
  // চলতি লাইনটি মানব-কণ্ঠে বলাও (ডিভাইসে বাংলা কণ্ঠ থাকলে)
  _speakLine(i){ const d=this.dialogue; if(!d||!this.G.voice) return; const ln=d.seq[i]; if(ln) this.G.voice.speak(ln.t, ln.s); }
  _endDialogue(){ const cb=this.dialogue&&this.dialogue.onDone; this.dialogue=null;
    this.G.voice&&this.G.voice.stop(); this.G.audio.duck(false); cb&&cb(); }
  isDialogue(){ return !!this.dialogue; }

  toast(text, type='info', dur=2.2){ this.toasts.push({text,type,ttl:dur,max:dur});
    this.G.audio.sfx(type==='success'?'success':type==='fail'?'fail':'ui'); }
  // নির্দেশনা পপ-আপ (খেলোয়াড়ের কণ্ঠে নয়) — উপরে ভাসে, একাধিক লাইন নেয়, কিছুক্ষণ পরে মিলায়
  tip(text, dur=4.5){ this.toasts.push({text,type:'tip',ttl:dur,max:dur}); }
  clueToast(id){ this.toasts.push({text:S.newClue+'：'+(CLUES[id]? '' : ''), type:'clue', ttl:2.6, max:2.6, clueId:id});
    this.G.audio.sfx('clue'); }

  openNotebook(){ this.notebookOpen=true; this.G.audio.sfx('ui'); }
  closeNotebook(){ this.notebookOpen=false; }
  toggleNotebook(){ this.notebookOpen?this.closeNotebook():this.openNotebook(); }

  pauseToggle(){ this.paused=!this.paused; this.G.audio.sfx('ui'); }

  gameOver(onRetry, final){ this.gameover={onRetry, final:!!final}; this.G.audio.sfx('fail'); this.G.audio.duck(true); }

  choice(title, options, onPick, msg){ this.choiceBox={title,options,onPick,msg,scroll:0}; this.G.audio.sfx('ui'); }
  closeChoice(){ this.choiceBox=null; }

  setControlMode(m){ this.controlMode=m; }
  setHint(txt){ this._hint=txt; }

  blocksGameplay(){ return this.isDialogue()||this.notebookOpen||this.paused||!!this.gameover||!!this.choiceBox; }

  // ---------------- update ----------------
  update(dt){
    const I=this.G.input;
    this.hud = !(this.G.scene && this.G.scene.noHUD);
    // detect touch to show on-screen controls
    if (I.isTouch) this.showTouch=true;

    // toasts
    for (const t of this.toasts) t.ttl-=dt;
    this.toasts=this.toasts.filter(t=>t.ttl>0);

    // overlay button registration + hit handling happen in draw order; we handle taps here using last layout.
    // Handle overlays by priority:
    if (this.gameover){ this._handleButtons(); this._registerTopButtons(false); return; }
    if (this.choiceBox){ this._handleButtons(); return; }
    if (this.paused){ this._handleButtons(); return; }
    if (this.notebookOpen){ this._handleButtons(); return; }
    if (this.dialogue){ this._updateDialogue(dt); this._registerTopButtons(false); return; }

    // gameplay: typewriter reset; register HUD + control buttons
    this._registerTopButtons(this.hud);
    // top button taps
    this._handleButtons();
    // pause via key
    if (this.hud && I.pressed('pause')) this.pauseToggle();
  }

  _updateDialogue(dt){
    const I=this.G.input; const d=this.dialogue; d.t+=dt; this._typed+=dt*46;
    const line=d.seq[d.i]; const full=line.t.length;
    // skip button registered in draw; handle via buttons
    this._handleButtons();
    if (I.advance()){
      if (this._typed<full){ this._typed=full; return; }   // first tap finishes typing
      d.i++; this._typed=0;
      if (d.i>=d.seq.length){ this._endDialogue(); }
      else this._speakLine(d.i);
    }
  }

  _registerTopButtons(gameplay){
    const bs=[];
    // notebook + pause top-right (always clickable)
    if (gameplay){
      bs.push({id:'nb', round:true, x:this.W-128, y:16, w:52, h:52, action:()=>this.openNotebook(), icon:'book'});
      bs.push({id:'pause', round:true, x:this.W-68, y:16, w:52, h:52, action:()=>this.pauseToggle(), icon:'pause'});
    }
    // on-screen movement controls
    if (gameplay && this.showTouch){
      if (this.controlMode==='platform'||this.controlMode==='boat'){
        bs.push({id:'left', round:true, x:30, y:this.H-110, w:84, h:84, hold:'left', icon:'left'});
        bs.push({id:'right', round:true, x:134, y:this.H-110, w:84, h:84, hold:'right', icon:'right'});
      }
      if (this.controlMode==='platform'){
        bs.push({id:'jump', round:true, x:this.W-120, y:this.H-180, w:92, h:92, hold:'jump', icon:'up'});
        bs.push({id:'act', round:true, x:this.W-214, y:this.H-110, w:84, h:84, hold:'interact', icon:'E'});
      } else if (this.controlMode==='boat'){
        // নৌকা বাওয়ার জন্য ডি-প্যাড: বাঁ/ডান (বাঁ দিকে), উপর/নিচ (ডান দিকে)
        bs.push({id:'left', round:true, x:30, y:this.H-110, w:84, h:84, hold:'left', icon:'left'});
        bs.push({id:'right', round:true, x:134, y:this.H-110, w:84, h:84, hold:'right', icon:'right'});
        bs.push({id:'up', round:true, x:this.W-120, y:this.H-200, w:84, h:84, hold:'up', icon:'up'});
        bs.push({id:'down', round:true, x:this.W-120, y:this.H-106, w:84, h:84, hold:'down', icon:'down'});
      } else if (this.controlMode==='walk'){
        bs.push({id:'left', round:true, x:30, y:this.H-110, w:84, h:84, hold:'left', icon:'left'});
        bs.push({id:'right', round:true, x:134, y:this.H-110, w:84, h:84, hold:'right', icon:'right'});
        bs.push({id:'act', round:true, x:this.W-120, y:this.H-110, w:84, h:84, hold:'interact', icon:'E'});
      }
    }
    // translate hold buttons into input.touchButtons
    const holds=bs.filter(b=>b.hold).map(b=>({id:b.id, action:b.hold, x:b.x, y:b.y, w:b.w, h:b.h, round:b.round}));
    this.G.input.setTouchButtons(holds);
    this._topButtons=bs.filter(b=>!b.hold); // clickable (notebook/pause)
  }

  _handleButtons(){
    const I=this.G.input;
    if (!I.pointerTapped) return;
    const p=I.lastTap; if (!p) return;
    const all=[...(this.buttons||[]), ...(this._topButtons||[])];
    for (const b of all){
      if (b.slider) continue;             // স্লাইডার টেনে বদলানো হয় (handlePointerDrag) — ট্যাপে নয়
      const hit = b.round
        ? ((p.x-(b.x+b.w/2))**2+(p.y-(b.y+b.h/2))**2 <= (b.w/2)**2)
        : (p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);
      if (hit && b.action){ b.action(); I.pointerTapped=false; return; }
    }
  }

  // ---------------- draw ----------------
  draw(ctx){
    // world interaction hint (small, above-center-bottom) during gameplay
    if (!this.blocksGameplay() && this._hint){
      setFont(ctx,22,700); ctx.textAlign='center'; ctx.textBaseline='middle';
      const w=ctx.measureText(this._hint).width+28;
      ctx.fillStyle='rgba(16,20,34,0.72)'; rr(ctx,this.W/2-w/2,this.H-150,w,34,8); ctx.fill();
      ctx.fillStyle='#f3e7c8'; ctx.fillText(this._hint,this.W/2,this.H-132);
    }
    this._hint=null;

    // HUD top bar (chapter + objective) during gameplay
    if (this.hud && !this.paused && !this.gameover && !this.notebookOpen){
      this._drawHUD(ctx);
    }
    // touch controls
    if (this.hud && this.showTouch && !this.blocksGameplay()) this._drawTouch(ctx);

    // toasts
    this._drawToasts(ctx);

    // overlays
    if (this.dialogue) this._drawDialogue(ctx);
    if (this.choiceBox) this._drawChoice(ctx);
    if (this.notebookOpen) this._drawNotebook(ctx);
    if (this.paused) this._drawPause(ctx);
    if (this.gameover) this._drawGameOver(ctx);
  }

  _drawHUD(ctx){
    const ch=CHAPTERS[this.G.chapterKey]; if(!ch) { this._drawTopIcons(ctx); return; }
    ctx.fillStyle='rgba(16,20,34,0.55)'; rr(ctx,16,14,Math.min(560,this.W-200),58,10); ctx.fill();
    setFont(ctx,15,700); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillStyle='#f2c879';
    ctx.fillText(`${S.chapterLabel} ${toBn(ch.no)} — ${ch.name}`, 30, 38);
    setFont(ctx,14,400); ctx.fillStyle='#d9d2c0';
    const obj=this.G.objectiveText||ch.obj;
    const line=wrapText(ctx,obj,Math.min(520,this.W-240))[0];
    ctx.fillText(line, 30, 60);
    this._drawVitals(ctx);
    this._drawTopIcons(ctx);
  }
  _drawVitals(ctx){
    const sc=this.G.scene; if (!sc || sc.hp==null || sc.noVitals) return;
    // হৃদয়
    let hx=30, hy=84;
    for (let i=0;i<sc.maxHP;i++){ this._heart(ctx, hx+i*30, hy, i<sc.hp); }
    // দম (stamina) — কেবল platform মোডে
    if (sc.canRun && sc.controlMode==='platform'){
      const bx=30+sc.maxHP*30+16, by=hy-9, bw=120;
      ctx.fillStyle='rgba(16,20,34,0.6)'; rr(ctx,bx,by,bw,10,5); ctx.fill();
      ctx.fillStyle='#6fae5e'; rr(ctx,bx,by,bw*Math.max(0,Math.min(1,sc.stamina)),10,5); ctx.fill();
    }
    // তেল (lantern oil) — থাকলে
    if (sc.oil!=null){
      const bx=30+sc.maxHP*30+16, by=hy+6, bw=120;
      ctx.fillStyle='rgba(16,20,34,0.6)'; rr(ctx,bx,by,bw,10,5); ctx.fill();
      ctx.fillStyle='#f2b05e'; rr(ctx,bx,by,bw*Math.max(0,Math.min(1,sc.oil)),10,5); ctx.fill();
    }
  }
  _heart(ctx,x,y,full){
    ctx.save(); ctx.translate(x,y); ctx.fillStyle= full?'#d6464a':'rgba(60,40,44,0.6)';
    ctx.strokeStyle= full?'#f08a8a':'#7a5a5a'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,4); ctx.bezierCurveTo(-8,-5,-10,6,0,12); ctx.bezierCurveTo(10,6,8,-5,0,4); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  _drawTopIcons(ctx){
    for (const b of (this._topButtons||[])){
      ctx.fillStyle='rgba(16,20,34,0.6)'; ctx.beginPath(); ctx.arc(b.x+b.w/2,b.y+b.h/2,b.w/2,0,7); ctx.fill();
      ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.stroke();
      if (b.icon==='book'){
        // খাতা: পৃষ্ঠা + দাগ + বাঁ পাশে স্পাইরাল রিং
        const bx=b.x+16, by=b.y+15, bw=22, bh=24;
        ctx.fillStyle='#f3e7c8'; rr(ctx,bx,by,bw,bh,3); ctx.fill();
        ctx.strokeStyle='#c9a86a'; ctx.lineWidth=1; ctx.stroke();
        ctx.strokeStyle='#2a3450'; ctx.lineWidth=1.4;        // ruled lines
        for (let i=1;i<=3;i++){ const ly=by+6*i; ctx.beginPath(); ctx.moveTo(bx+8,ly); ctx.lineTo(bx+bw-4,ly); ctx.stroke(); }
        ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=1.6;         // spine
        ctx.beginPath(); ctx.moveTo(bx+5,by); ctx.lineTo(bx+5,by+bh); ctx.stroke();
        ctx.fillStyle='#f2c879'; for (let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(bx+5,by+5+i*8,1.8,0,7); ctx.fill(); }
      }
      else if (b.icon==='pause'){ ctx.fillStyle='#f3e7c8'; ctx.fillRect(b.x+18,b.y+16,6,20); ctx.fillRect(b.x+28,b.y+16,6,20); }
    }
  }

  _ctrlBtn(ctx,b,label){
    const cx=b.x+b.w/2, cy=b.y+b.h/2, held=this.G.input.down(b.hold);
    ctx.fillStyle=held?'rgba(242,176,94,0.5)':'rgba(16,20,34,0.4)';
    ctx.beginPath(); ctx.arc(cx,cy,b.w/2,0,7); ctx.fill();
    ctx.strokeStyle='rgba(243,231,200,0.7)'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle='#f3e7c8'; ctx.lineWidth=3; ctx.strokeStyle='#f3e7c8';
    const i=b.icon;
    if (i==='left'){ ctx.beginPath(); ctx.moveTo(cx+8,cy-12); ctx.lineTo(cx-10,cy); ctx.lineTo(cx+8,cy+12); ctx.stroke(); }
    else if (i==='right'){ ctx.beginPath(); ctx.moveTo(cx-8,cy-12); ctx.lineTo(cx+10,cy); ctx.lineTo(cx-8,cy+12); ctx.stroke(); }
    else if (i==='up'){ ctx.beginPath(); ctx.moveTo(cx-12,cy+8); ctx.lineTo(cx,cy-10); ctx.lineTo(cx+12,cy+8); ctx.stroke(); }
    else if (i==='down'){ ctx.beginPath(); ctx.moveTo(cx-12,cy-8); ctx.lineTo(cx,cy+10); ctx.lineTo(cx+12,cy-8); ctx.stroke(); }
    else if (i==='E'){ drawCentered(ctx,'E',cx,cy,30,'#f3e7c8',700); }
    else if (i==='go'){ drawCentered(ctx,'চল',cx,cy,24,'#f3e7c8',700); }
  }
  _drawTouch(ctx){
    // find hold buttons from input.touchButtons + icon info from registration
    const map={left:'left',right:'right',jump:(this.controlMode==='boat'?'go':'up'),interact:'E'};
    for (const tb of this.G.input.touchButtons){
      this._ctrlBtn(ctx,{x:tb.x,y:tb.y,w:tb.w,h:tb.h,hold:tb.action,icon: tb.action==='jump'?(this.controlMode==='boat'?'go':'up'):(tb.action==='interact'?'E':tb.action)});
    }
  }

  _drawToasts(ctx){
    let y=92;
    for (const t of this.toasts){
      const a=Math.min(1,t.ttl/0.4)*Math.min(1,(t.max-t.ttl)/0.2+0.2);
      ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,a));
      // নির্দেশনা পপ-আপ (tip) — অ্যাম্বার বাক্স, দরকারে দুই লাইন, বাঁয়ে ছোট বাতি-চিহ্ন
      if (t.type==='tip'){
        setFont(ctx,17,700); ctx.textAlign='left';
        const maxW=Math.min(760,this.W-120);
        const lines=wrapText(ctx,t.text,maxW-54);
        let tw=0; for(const l of lines) tw=Math.max(tw,ctx.measureText(l).width);
        const w=Math.min(maxW, tw+54), h=16+lines.length*24, bx=this.W/2-w/2;
        ctx.fillStyle='#5a4320'; rr(ctx,bx,y,w,h,10); ctx.fill();
        ctx.strokeStyle='rgba(245,213,138,0.55)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle='#f5d58a'; ctx.beginPath(); ctx.arc(bx+22,y+h/2,6,0,7); ctx.fill();   // বাতি-চিহ্ন
        ctx.fillStyle='#14121c'; ctx.font='700 9px NotoBengali,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('!',bx+22,y+h/2+0.5);
        ctx.fillStyle='#fdf3da'; ctx.textAlign='left'; ctx.textBaseline='middle'; setFont(ctx,17,700);
        let ly=y+(h-lines.length*24)/2+12;
        for (const l of lines){ ctx.fillText(l, bx+40, ly); ly+=24; }
        ctx.restore(); y+=h+10; continue;
      }
      const col = t.type==='success'?'#3f7a46': t.type==='fail'?'#9a3a3a': t.type==='clue'?'#5a4a8a':'#2a3450';
      let txt=t.text; let sub=null;
      if (t.type==='clue'){ txt=S.newClue; sub=clueText(t.clueId); }
      setFont(ctx,18,700); ctx.textAlign='center';
      const w=Math.max(ctx.measureText(txt).width, sub?Math.min(640,ctx.measureText(sub).width):0)+44;
      const h= sub? 66:40;
      ctx.fillStyle=col; rr(ctx,this.W/2-w/2,y,w,h,10); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.textBaseline='middle'; ctx.fillText(txt,this.W/2, y+(sub?18:20));
      if (sub){ setFont(ctx,13,400); const lines=wrapText(ctx,sub,w-30);
        ctx.fillStyle='#efe8d8'; ctx.fillText(lines[0],this.W/2,y+44); }
      ctx.restore();
      y+=h+10;
    }
  }

  _portrait(ctx,speakerKey,x,y){
    const key = this.G.charKeyFor ? this.G.charKeyFor(speakerKey) : speakerKey;
    const line=this.dialogue.seq[this.dialogue.i]; const expr=(line&&line.e)||'idle';
    ctx.save();
    ctx.fillStyle='rgba(16,20,34,0.85)'; rr(ctx,x,y,92,92,12); ctx.fill();
    ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); rr(ctx,x+4,y+4,84,84,10); ctx.clip();
    if (key && key!=='narr'){
      if (!drawPortrait(ctx, key, x+4, y+4, 84, expr, this.dialogue.t)){
        ctx.translate(x+46,y+130); ctx.scale(1.5,1.5);
        try{ drawChar(ctx, key, 0, 0, this.dialogue.t+2, {pose:'talk', face:1, expr}); }catch(e){}
      }
    }
    ctx.restore();
  }

  _drawDialogue(ctx){
    const d=this.dialogue, line=d.seq[d.i]; const sp=SPEAKERS[line.s]||SPEAKERS.narr;
    const boxH=186, y=this.H-boxH-18, x=24, w=this.W-48;
    ctx.fillStyle='rgba(12,16,28,0.92)'; rr(ctx,x,y,w,boxH,16); ctx.fill();
    ctx.strokeStyle='rgba(242,200,121,0.5)'; ctx.lineWidth=2; ctx.stroke();
    let tx=x+28;
    if (line.s!=='narr'){ this._portrait(ctx,line.s,x+18,y+18); tx=x+128;
      // name tag
      setFont(ctx,17,700); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      const nw=ctx.measureText(sp.name).width+24;
      ctx.fillStyle=sp.color; rr(ctx,tx,y+16,nw,28,6); ctx.fill();
      ctx.fillStyle='#14121c'; ctx.fillText(sp.name,tx+12,y+36);
    }
    // text (typewriter)
    const shown = line.t.slice(0, Math.floor(this._typed));
    drawWrapped(ctx, shown, tx, y+ (line.s!=='narr'?70:46), w-(tx-x)-40, 20, {color:'#f1e8d4', weight:400, lineHeight:30});
    // advance indicator
    if (this._typed>=line.t.length){
      ctx.fillStyle='#f2c879'; const ay=y+boxH-20+Math.sin(d.t*6)*2;
      ctx.beginPath(); ctx.moveTo(w+x-34,ay-6); ctx.lineTo(w+x-22,ay-6); ctx.lineTo(w+x-28,ay+2); ctx.closePath(); ctx.fill();
    }
    // skip button
    const sb={x:this.W-150, y:y-2, w:126, h:30};
    ctx.fillStyle='rgba(40,52,80,0.9)'; rr(ctx,sb.x,sb.y,sb.w,sb.h,8); ctx.fill();
    drawCentered(ctx,S.skip, sb.x+sb.w/2, sb.y+sb.h/2, 15,'#d9d2c0',700);
    this.buttons=[{...sb, action:()=>{ this._endDialogue(); }}];
  }

  _drawChoice(ctx){
    const c=this.choiceBox;
    ctx.fillStyle='rgba(8,10,18,0.78)'; ctx.fillRect(0,0,this.W,this.H);
    const w=Math.min(760,this.W-80), h=Math.min(120+c.options.length*74+(c.msg?60:0), this.H-60);
    const x=(this.W-w)/2, y=(this.H-h)/2;
    ctx.fillStyle='#161d30'; rr(ctx,x,y,w,h,16); ctx.fill();
    ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.stroke();
    drawWrapped(ctx,c.title,x+28,y+44,w-56,22,{color:'#f2c879',weight:700,lineHeight:30});
    let oy=y+72+(c.title.length>40?30:0);
    if (c.msg){ oy=drawWrapped(ctx,c.msg,x+28,oy+10,w-56,16,{color:'#cfd8c4',weight:400,lineHeight:22})+8; }
    this.buttons=[];
    for (const opt of c.options){
      const bx=x+28, bw=w-56, bh=58;
      ctx.fillStyle='#24304c'; rr(ctx,bx,oy,bw,bh,10); ctx.fill();
      ctx.strokeStyle='rgba(243,231,200,0.3)'; ctx.lineWidth=1.5; ctx.stroke();
      setFont(ctx,18,700); ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillStyle='#f1e8d4';
      ctx.fillText(opt.label, bx+20, oy+bh/2);
      if (opt.sub){ setFont(ctx,13,400); ctx.fillStyle='#9fb0c0'; ctx.textAlign='right'; ctx.fillText(opt.sub,bx+bw-18,oy+bh/2); }
      this.buttons.push({x:bx,y:oy,w:bw,h:bh, action:()=>{ const f=c.onPick; this.choiceBox=null; f&&f(opt.id); }});
      oy+=bh+16;
    }
  }

  _drawNotebook(ctx){
    ctx.fillStyle='rgba(8,10,18,0.82)'; ctx.fillRect(0,0,this.W,this.H);
    const w=Math.min(820,this.W-60), h=this.H-60, x=(this.W-w)/2, y=30;
    ctx.fillStyle='#efe4c8'; rr(ctx,x,y,w,h,14); ctx.fill();      // কাগজ
    ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=3; ctx.stroke();
    // spine
    ctx.fillStyle='#8a3a3a'; rr(ctx,x+18,y,10,h,3); ctx.fill();
    drawCentered(ctx,S.notebookTitle, x+w/2, y+40, 26, '#5a3a2a', 700);
    ctx.strokeStyle='#c9a86a'; ctx.beginPath(); ctx.moveTo(x+44,y+62); ctx.lineTo(x+w-30,y+62); ctx.stroke();
    // objective
    const ch=CHAPTERS[this.G.chapterKey];
    let yy=y+90;
    setFont(ctx,17,700); ctx.textAlign='left'; ctx.fillStyle='#8a5a2a';
    ctx.fillText('▶ '+S.objective, x+44, yy); yy+=8;
    yy=drawWrapped(ctx,this.G.objectiveText||(ch&&ch.obj)||'', x+54, yy+22, w-100, 16,{color:'#3a2e22',lineHeight:23})+14;
    // clues
    setFont(ctx,17,700); ctx.fillStyle='#8a5a2a'; ctx.fillText('▶ '+S.clues, x+44, yy); yy+=26;
    const clues=[...this.G.state.clues];
    if (!clues.length){ drawWrapped(ctx,S.noClues,x+54,yy,w-100,15,{color:'#6a5a4a',lineHeight:22}); }
    else {
      for (const id of clues){
        if (yy> y+h-40) break;
        ctx.fillStyle='#8a6a3a'; ctx.beginPath(); ctx.arc(x+54,yy-5,3,0,7); ctx.fill();
        yy=drawWrapped(ctx,clueText(id), x+66, yy, w-120, 15,{color:'#2e261c',lineHeight:21})+12;
      }
    }
    // close button
    const cb={x:x+w-54,y:y+14,w:40,h:40};
    ctx.fillStyle='#8a3a3a'; ctx.beginPath(); ctx.arc(cb.x+20,cb.y+20,20,0,7); ctx.fill();
    ctx.strokeStyle='#efe4c8'; ctx.lineWidth=3; ctx.beginPath();
    ctx.moveTo(cb.x+12,cb.y+12); ctx.lineTo(cb.x+28,cb.y+28); ctx.moveTo(cb.x+28,cb.y+12); ctx.lineTo(cb.x+12,cb.y+28); ctx.stroke();
    this.buttons=[{...cb, action:()=>this.closeNotebook()}];
    // key to close
    if (this.G.input.pressed('pause')||this.G.input.pressed('interact')) this.closeNotebook();
  }

  _slider(ctx,x,y,w,val,label,onSet){
    setFont(ctx,16,700); ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillStyle='#d9d2c0';
    ctx.fillText(label,x,y-18);
    ctx.fillStyle='#2a3450'; rr(ctx,x,y-5,w,10,5); ctx.fill();
    ctx.fillStyle='#f2b05e'; rr(ctx,x,y-5,w*val,10,5); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w*val,y,11,0,7); ctx.fillStyle='#f5d58a'; ctx.fill();
    this.buttons.push({x:x-6,y:y-18,w:w+12,h:36, slider:true, action:(px)=>{ const v=(px-x)/w; if(!isFinite(v)) return; onSet(Math.max(0,Math.min(1,v))); }});
  }

  _drawPause(ctx){
    ctx.fillStyle='rgba(8,10,18,0.8)'; ctx.fillRect(0,0,this.W,this.H);
    const w=440, h=560, x=(this.W-w)/2, y=(this.H-h)/2;
    ctx.fillStyle='#161d30'; rr(ctx,x,y,w,h,16); ctx.fill(); ctx.strokeStyle='#f2c879'; ctx.lineWidth=2; ctx.stroke();
    drawCentered(ctx,S.paused,x+w/2,y+40,28,'#f2c879',700);
    this.buttons=[];
    const au=this.G.audio, vo=this.G.voice;
    this._slider(ctx,x+40,y+96,w-80, au.settings.music, S.music+'：'+Math.round(au.settings.music*100), v=>au.setMusic(v));
    this._slider(ctx,x+40,y+150,w-80, au.settings.sfx, S.sfx+'：'+Math.round(au.settings.sfx*100), v=>au.setSfx(v));
    // mute toggle
    const mb={x:x+40,y:y+176,w:(w-92)/2,h:44};
    ctx.fillStyle=au.settings.muteAll?'#9a3a3a':'#24304c'; rr(ctx,mb.x,mb.y,mb.w,mb.h,10); ctx.fill();
    drawCentered(ctx, S.mute+'：'+(au.settings.muteAll?S.on:S.off), mb.x+mb.w/2, mb.y+22, 15, '#f1e8d4',700);
    this.buttons.push({...mb, action:()=>au.toggleMute()});
    // voice toggle
    const von = vo && vo.enabled; const vok = vo && vo.available();
    const vb={x:mb.x+mb.w+12,y:y+176,w:(w-92)/2,h:44};
    ctx.fillStyle=von?'#3f6a7a':'#24304c'; rr(ctx,vb.x,vb.y,vb.w,vb.h,10); ctx.fill();
    drawCentered(ctx, S.voice+'：'+(von?S.on:S.off), vb.x+vb.w/2, vb.y+22, 15, '#f1e8d4',700);
    this.buttons.push({...vb, action:()=>vo&&vo.toggle()});
    if (von && !vok){ setFont(ctx,11,400); ctx.textAlign='center'; ctx.fillStyle='#9fb0c0';
      ctx.fillText('(ডিভাইসে বাংলা কণ্ঠ পাওয়া গেলে শোনা যাবে)', x+w/2, y+238); }
    // resume / checkpoint / menu
    const mk=(label,oy,col,act)=>{ const b={x:x+40,y:oy,w:w-80,h:46}; ctx.fillStyle=col; rr(ctx,b.x,b.y,b.w,b.h,10); ctx.fill();
      drawCentered(ctx,label,b.x+b.w/2,b.y+23,18,'#f1e8d4',700); this.buttons.push({...b,action:act}); };
    const fsOn=this.G.isFullscreen&&this.G.isFullscreen();
    mk('পূর্ণ-পর্দা (Fullscreen)'+(fsOn?' ✓':''), y+252, '#3a5a7a', ()=>{ this.G.toggleFullscreen&&this.G.toggleFullscreen(); });
    mk(S.resume, y+308, '#3f7a46', ()=>this.pauseToggle());
    mk(S.toCheckpoint, y+364, '#24304c', ()=>{ this.paused=false; this.G.respawnCheckpoint(); });
    mk(S.toMenu, y+420, '#24304c', ()=>{ this.paused=false; this.G.goMenu(); });
    if (this.G.input.pressed('pause')) this.pauseToggle();
  }

  _drawGameOver(ctx){
    const fin=this.gameover.final;
    ctx.fillStyle='rgba(30,8,8,0.72)'; ctx.fillRect(0,0,this.W,this.H);
    drawCentered(ctx,fin?'নৌকা ডুইবা গেল':S.gameOver,this.W/2,this.H/2-90,48,'#ff9a9a',700,'#000');
    drawCentered(ctx, fin?'খেলা শেষ — আবার শুরু করতে অইব':'আবার চেষ্টা করলে ২ ধাপ পিছন থেকে শুরু',
      this.W/2,this.H/2-44,17,'#e8c0a0',400,'#000');
    this.buttons=[];
    const mk=(label,oy,col,act)=>{ const b={x:this.W/2-150,y:oy,w:300,h:52}; ctx.fillStyle=col; rr(ctx,b.x,b.y,b.w,b.h,12); ctx.fill();
      drawCentered(ctx,label,b.x+b.w/2,b.y+26,20,'#fff',700); this.buttons.push({...b,action:act}); };
    if (!fin) mk(S.retry, this.H/2-4, '#3f7a46', ()=>{ const f=this.gameover.onRetry; this.gameover=null; this.G.audio.duck(false); f?f():this.G.respawnCheckpoint(); });
    mk(S.toMenu, fin?this.H/2+20:this.H/2+64, '#5a2a2a', ()=>{ this.gameover=null; this.G.audio.duck(false); this.G.goMenu(); });
    if (this.G.input.advance()){ const f=this.gameover.onRetry; this.gameover=null; this.G.audio.duck(false);
      if (fin) this.G.goMenu(); else { f?f():this.G.respawnCheckpoint(); } }
  }

  // for slider drag: called from main when pointer down moving over slider
  handlePointerDrag(){
    const I=this.G.input;
    if (!I.pointer.down) return;
    for (const b of this.buttons){ if (b.slider){
      if (I.pointer.x>=b.x && I.pointer.x<=b.x+b.w && I.pointer.y>=b.y && I.pointer.y<=b.y+b.h){ b.action(I.pointer.x); }
    }}
  }
}
