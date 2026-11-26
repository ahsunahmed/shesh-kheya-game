// অধ্যায় ৫: পুরোনো সেচঘর — জলিল মিস্ত্রি + সংকেতবাতির বর্তনী পাজল (পপ-আপ, তার জোড়ার ধাঁধা)।
import { Platformer } from '../engine/scene.js';
import { DIALOGUE } from '../data/dialogue.js';
import { UI as S } from '../data/strings.js';
import { drawCentered, drawWrapped, setFont } from '../engine/text.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

// সঠিক বর্তনী: ব্যাটারি(+) → ফিউজ → সুইচ → বাতি → ব্যাটারি(−)
const REQUIRED = [ ['batp','fa'], ['fb','swa'], ['swb','bula'], ['bulb','batn'] ];

export class PumpHouseScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=605; this.ambience='quiet'; this.mood='mystery';
    this.canRun=false; this.noVitals=true;
    const _done0=!!this.G.state.flags.p_signal;
    this.bgKey = _done0 ? 'bg_pumpfixed' : 'bg_pump';   // বর্তনী ঠিক হলে "ঠিক-করা" ছবি
    this.addGround(605); this.leftBound=60; this.rightBound=1180;
    this.checkpoints=[{x:140,y:510}];
    if (opts.enter==='right'){ this.player.x=1120; this.player.y=510; this.player.vx=this.player.vy=0; }
    else this.spawn(0);
    this.setAudio();
    const F=this.G.state.flags; this.done=!!F.p_signal;
    this.back=this.addInteract({ x:95, y:596, r:70, markY:500, hint:'← শেয়ালের মাঠে ফেরো (E)',
      onE:()=>this.G.changeScene('fox',{enter:'right'}) });

    this.jalil=this.addNPC({ key:'jalil', x:250, groundY:593, facesPlayer:true });
    this.addInteract({ x:280, y:596, r:90, talk:true, onE:()=>{ this.jalil.talking=true;
      if(!F.p_jalil){ F.p_jalil=1; this.G.addClue('jalil_rope'); this.G.addClue('jalil_signal'); }
      this.G.ui.startDialogue(DIALOGUE.jalil, ()=>{ this.jalil.talking=false; }); } });

    // দেয়ালের প্যানেলের নিচে দাঁড়ালে পাজল পপ-আপ
    this.addInteract({ x:720, y:596, r:95, markY:300, hint:'সংকেতবাতির প্যানেল (E)', onE:()=>this._openPuzzle() });

    this.exit=this.addInteract({ x:1150, y:596, r:80, hidden:!this.done, hint:'নদীর পথ → (E)',
      onE:()=>this.G.changeScene('mitughat') });

    this._buildPuzzle();
    if (!opts.loaded) this.G.ui.startDialogue(DIALOGUE.pump_intro);
  }

  // পপ-আপের ভেতরের নোড (টার্মিনাল) অবস্থান (১২৮০×৭২০ স্থানাঙ্কে)
  _buildPuzzle(){
    const goodLeft=Math.random()<0.5;
    this.puz={ active:false, stage:'clean', sel:null, tries:5, edges:[], switchOn:false, solved:false, spark:0, msg:'',
      rust:{ fa:2, swa:2, bula:2 }, cleaned:new Set(),           // ধাপ ০: মরচে (হালকা)
      fuses:[ {x:555,y:300,good:goodLeft}, {x:725,y:300,good:!goodLeft} ], fuseChosen:false,  // ধাপ ১: ফিউজ
      // ডিকয় নোড সরানো হয়েছে — শুধু বর্তনীর আসল খুঁটিগুলো, ক্রম-সংখ্যা সহ
      nodes:{
        batp:{x:338,y:312,kind:'pos',comp:'ব্যাটারি',step:1}, batn:{x:382,y:312,kind:'neg',comp:'ব্যাটারি',step:5},
        fa:{x:578,y:200,kind:'term',comp:'ফিউজ',step:2},      fb:{x:672,y:200,kind:'term',comp:'ফিউজ',step:3},
        swa:{x:620,y:362,kind:'term',comp:'সুইচ',step:4},      swb:{x:720,y:362,kind:'term',comp:'সুইচ',step:5},
        bula:{x:900,y:304,kind:'term',comp:'বাতি',step:4},     bulb:{x:900,y:398,kind:'term',comp:'বাতি',step:6},
      }};
  }
  _rusty(id){ return this.puz.rust[id]!==undefined && !this.puz.cleaned.has(id); }
  _bn2(n){ return String(n).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[+d]); }
  _openPuzzle(){ if (this.done){ this.G.ui.toast('বাতি তো জ্বলছেই — ডান দিকে যাও।','info',1.5); return; }
    if (!this.G.state.flags.p_jalil){ this.G.ui.toast('আগে জলিল মিস্ত্রির কাছে শোনো।','info',2.2); return; }
    this.puz.active=true; this.blockWalk=true; this.G.ui.setControlMode&&this.G.ui.setControlMode('none'); }
  _closePuzzle(){ this.puz.active=false; this.blockWalk=false; }

  _edgeExists(a,b){ return this.puz.edges.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)); }
  _isRequired(a,b){ return REQUIRED.some(r=>(r[0]===a&&r[1]===b)||(r[0]===b&&r[1]===a)); }
  _circuitComplete(){ return REQUIRED.every(r=>this._edgeExists(r[0],r[1])); }
  // নির্বাচিত খুঁটির সঠিক সঙ্গী (যেটি এখনো জোড়া হয়নি) — আলো দেখানোর জন্য
  _validPartner(id){ for (const r of REQUIRED){ if (r[0]===id) return r[1]; if (r[1]===id) return r[0]; } return null; }

  _tapNode(id){
    const puz=this.puz;
    if (puz.sel==null){ puz.sel=id; this.G.audio.sfx('ui');
      puz.msg='এবার যে খুঁটিতে জুড়বে, সেটিতে টোকা দাও।'; return; }
    if (puz.sel===id){ puz.sel=null; puz.msg=''; return; }
    const a=puz.sel, b=id; puz.sel=null;
    if (this._edgeExists(a,b)){ puz.msg='এই তার তো জোড়াই আছে।'; return; }
    if (this._isRequired(a,b)){
      puz.edges.push({a,b}); this.G.audio.sfx('switch'); puz.msg='ঠিক জোড়া লাগল! ✓';
      if (this._circuitComplete()) puz.msg='বর্তনী তৈরি! এবার সুইচ টেপো।';
    } else {
      // ভুল জোড়া — কোনো শাস্তি নয়, শুধু মৃদু ইঙ্গিত
      this.G.audio.sfx('ui'); puz.spark=0.18;
      puz.msg='ও দুটো মেলে না — ক্রম মনে করো: ব্যাটারি(+) → ফিউজ → সুইচ → বাতি → ব্যাটারি(−)।';
    }
  }
  _tapSwitch(){
    const puz=this.puz;
    if (!this._circuitComplete()){ puz.msg='আগে সব তার ঠিকমতো জোড়ো।'; this.G.audio.sfx('fail'); return; }
    puz.switchOn=!puz.switchOn;
    if (puz.switchOn){ puz.solved=true; this.G.audio.sfx('light_on'); this._solved(); }
  }
  _solved(){
    const F=this.G.state.flags; F.p_signal=1; this.done=true; this.exit.hidden=false;
    this.bgKey='bg_pumpfixed';                 // বর্তনী ঠিক — ব্যাকগ্রাউন্ড বদলে যায়
    this.G.addClue('signal_reply'); this.G.setObjective('সংকেতবাতি জ্বলেছে — নদীর পথে যাও।');
    setTimeout(()=>{ this._closePuzzle(); this.G.ui.startDialogue(DIALOGUE.pump_ok); }, 900);
  }

  onUpdate(dt){
    if (this.puz.spark>0) this.puz.spark-=dt;
    if (!this.puz.active) return;
    const I=this.G.input;
    if (I.pressed('pause')){ this._closePuzzle(); return; }
    if (!(I.pointerTapped && I.lastTap)) return;
    const p=I.lastTap; I.pointerTapped=false; const puz=this.puz;
    if (this._hit(p,this._closeBtn)){ this._closePuzzle(); return; }
    if (puz.stage==='clean'){ this._tapClean(p); return; }
    if (puz.stage==='fuse'){ this._tapFuse(p); return; }
    // wire stage
    if (this._hit(p,this._leverBtn)){ this._tapSwitch(); return; }
    for (const id in puz.nodes){ const n=puz.nodes[id];
      if ((p.x-n.x)**2+(p.y-n.y)**2 <= 24*24){ this._tapNode(id); return; } }
    puz.sel=null;
  }
  _tapClean(p){
    const puz=this.puz;
    for (const id of ['fa','swa','bula']){ if (puz.cleaned.has(id)) continue; const n=puz.nodes[id];
      if ((p.x-n.x)**2+(p.y-n.y)**2 <= 28*28){ puz.rust[id]--; this.G.audio.sfx('rope');
        if (puz.rust[id]<=0){ puz.cleaned.add(id); this.G.audio.sfx('ui'); }
        if (['fa','swa','bula'].every(k=>puz.cleaned.has(k))){ puz.stage='fuse'; puz.msg='খুঁটি পরিষ্কার! এবার ভালো ফিউজটা বেছে বসাও।'; }
        else puz.msg='ঘষে পরিষ্কার করো…';
        return; } }
    puz.msg='মরচে-ধরা খুঁটিগুলোতে (বাদামি) টোকা দিয়ে ঘষো।';
  }
  _tapFuse(p){
    const puz=this.puz;
    for (const f of puz.fuses){ if (p.x>=f.x-46&&p.x<=f.x+46&&p.y>=f.y-26&&p.y<=f.y+26){
      if (f.good){ puz.stage='wire'; puz.fuseChosen=true; this.G.audio.sfx('switch'); puz.msg='ভালো ফিউজ বসল — এবার তার জোড়ো।'; }
      else { puz.spark=0.4; this.G.audio.sfx('fail'); puz.msg='এই ফিউজটা তো পোড়া! ভালোটা ভালো করে দেখো।'; }
      return; } }
  }
  _hit(p,b){ return b && p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h; }

  // ---- draw ----
  drawBackground(ctx,cam){ A.sky(ctx,this.G.W,this.G.H,A.PAL.skyStorm); A.stars(ctx,this.G.W,this.G.H,22,this.t); }
  drawWorld(ctx){
    const t=this.t;
    if (!Assets.has('bg_pump')){
      A.groundStrip(ctx,-200,this.groundY,this.worldW+400,200,'#5a4a34','#3a3020');
      A.hut(ctx,620,this.groundY-170,200,150,{wall:'#b79a6a',roof:'#9a5a44'});
      A.lantern(ctx,735,this.groundY-96,t,this.done);
    }
    // বাতি জ্বললে দেয়ালের বাতির জায়গায় আভা
    if (this.done){ const bx=770,by=220; const g=ctx.createRadialGradient(bx,by,4,bx,by,90);
      g.addColorStop(0,'rgba(255,225,140,'+(0.45+0.1*Math.sin(t*6))+')'); g.addColorStop(1,'rgba(255,225,140,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,90,0,7); ctx.fill(); }
  }

  drawOverlay(ctx){ if (this.puz.active) this._drawPuzzle(ctx); }
  _drawPuzzle(ctx){
    const W=this.G.W,H=this.G.H, puz=this.puz, wire=(puz.stage==='wire');
    ctx.fillStyle='rgba(6,8,14,0.82)'; ctx.fillRect(0,0,W,H);
    const px=220,py=96,pw=840,ph=540;
    if (!Assets.prop('panel')){
      ctx.fillStyle='#2a2620'; A.rr(ctx,px,py,pw,ph,16); ctx.fill();
      ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=3; ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
      for(let x=px+40;x<px+pw;x+=60){ ctx.beginPath(); ctx.moveTo(x,py+10); ctx.lineTo(x,py+ph-10); ctx.stroke(); }
    } else A.drawProp(ctx,'panel',px+pw/2,py+ph,pw);
    drawCentered(ctx,'সংকেতবাতির বর্তনী ঠিক করো',W/2,py+30,23,'#f2c879',700);

    // ধাপ সূচক + নির্দেশ
    const stepNo = puz.stage==='clean'?1: puz.stage==='fuse'?2:3;
    const instr = puz.stage==='clean' ? 'ধাপ ১/৩ — মরচে-ধরা খুঁটিগুলোতে (বাদামি) কয়েকবার টোকা দিয়ে ঘষে পরিষ্কার করো।'
      : puz.stage==='fuse' ? 'ধাপ ২/৩ — দুটো ফিউজের ভালোটা (অক্ষত তার) বেছে টোকা দাও; পোড়াটা নয়।'
      : 'ধাপ ৩/৩ — নোডে টোকা, তারপর আরেক নোডে: ব্যাটারি(+) → ফিউজ → সুইচ → বাতি → ব্যাটারি(−)';
    setFont(ctx,13,400); ctx.textAlign='center'; ctx.fillStyle='#9fb0c0'; ctx.fillText(instr,W/2,py+60);

    // তার (wire ধাপে)
    if (wire){ for (const e of puz.edges){ const a=puz.nodes[e.a], b=puz.nodes[e.b];
        ctx.strokeStyle='#6fae5e'; ctx.lineWidth=5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-24,b.x,b.y); ctx.stroke(); }
      if (puz.sel){ const a=puz.nodes[puz.sel]; const p=this.G.input.pointer;
        ctx.strokeStyle='rgba(242,200,121,0.6)'; ctx.lineWidth=3; ctx.setLineDash([6,6]);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.setLineDash([]); } }

    // কম্পোনেন্ট
    this._comp(ctx,'ব্যাটারি',360,360,'#3a5a8a','battery');
    this._comp(ctx,'ফিউজ',625,200,'#7a5a3a', puz.fuseChosen?'fuse':null);
    this._comp(ctx,'সুইচ',670,360,'#5a5a5a', puz.switchOn?'switch_on':'switch_off');
    this._comp(ctx,'বাতি',900,350, puz.switchOn?'#e2b23a':'#4a4a3a', puz.switchOn?'bulb_on':'bulb_off');

    // ফিউজ-ট্রে (fuse ধাপে)
    if (puz.stage==='fuse'){ setFont(ctx,13,700); ctx.fillStyle='#d9d2c0'; ctx.textAlign='center';
      ctx.fillText('কোনটা ভালো?', 640, 250);
      for (const f of puz.fuses) this._drawFuse(ctx,f.x,f.y,!f.good); }

    // নোড
    for (const id in puz.nodes){ const n=puz.nodes[id]; const used=puz.edges.some(e=>e.a===id||e.b===id);
      ctx.beginPath(); ctx.arc(n.x,n.y,12,0,7);
      ctx.fillStyle = n.kind==='pos'?'#d6464a': n.kind==='neg'?'#2a2a2a':'#c9a84a';
      ctx.fill(); ctx.strokeStyle = puz.sel===id?'#fff':'rgba(0,0,0,0.4)'; ctx.lineWidth= puz.sel===id?3:1.5; ctx.stroke();
      // মরচে
      if (puz.stage==='clean' && this._rusty(id)){
        ctx.fillStyle='#8a5a2a'; ctx.beginPath(); ctx.arc(n.x,n.y,12,0,7); ctx.fill();
        ctx.fillStyle='#6a3a18'; for(let k=0;k<5;k++){ ctx.beginPath(); ctx.arc(n.x+Math.cos(k*1.6)*7,n.y+Math.sin(k*1.6)*7,2.2,0,7); ctx.fill(); }
        ctx.strokeStyle='#6fae5e'; ctx.lineWidth=3; ctx.beginPath();
        ctx.arc(n.x,n.y,16,-Math.PI/2, -Math.PI/2 + (1-(puz.rust[id]/2))*Math.PI*2); ctx.stroke();
      }
      if (used){ ctx.fillStyle='#6fae5e'; ctx.beginPath(); ctx.arc(n.x,n.y,4,0,7); ctx.fill(); }
      setFont(ctx,11,700); ctx.fillStyle='#d9d2c0'; ctx.textAlign='center';
      ctx.fillText(n.kind==='pos'?'+':n.kind==='neg'?'–':'', n.x, n.y+4);
    }

    // সুইচ লিভার + অগ্রগতি (wire ধাপে)
    if (wire){
      this._leverBtn={x:640,y:300,w:90,h:34};
      const ready=this._circuitComplete();
      ctx.fillStyle=puz.switchOn?'#3f7a46':(ready?'#3a6a5a':'#5a3a3a'); A.rr(ctx,this._leverBtn.x,this._leverBtn.y,this._leverBtn.w,this._leverBtn.h,8); ctx.fill();
      drawCentered(ctx, puz.switchOn?'সুইচ: চালু':'সুইচ টেপো', this._leverBtn.x+45,this._leverBtn.y+17,13,'#fff',700);
      // কত তার জোড়া হলো
      setFont(ctx,15,700); ctx.textAlign='left'; ctx.fillStyle='#d9d2c0';
      ctx.fillText('তার জোড়া: '+this._bn2(puz.edges.length)+'/'+this._bn2(REQUIRED.length), px+30, py+ph-30);
      for(let i=0;i<REQUIRED.length;i++){ ctx.fillStyle= i<puz.edges.length?'#6fae5e':'#3a4454'; ctx.beginPath(); ctx.arc(px+200+i*22,py+ph-35,7,0,7); ctx.fill(); }
    } else this._leverBtn=null;

    if (puz.msg) drawCentered(ctx,puz.msg,W/2,py+ph-32,15, puz.spark>0?'#ff9a9a':'#f2c879',700);
    if (puz.spark>0){ ctx.save(); ctx.globalAlpha=puz.spark; ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); ctx.restore(); }
    this._closeBtn={x:px+pw-44,y:py+14,w:34,h:34};
    ctx.fillStyle='#8a3a3a'; ctx.beginPath(); ctx.arc(this._closeBtn.x+17,this._closeBtn.y+17,17,0,7); ctx.fill();
    ctx.strokeStyle='#efe4c8'; ctx.lineWidth=3; ctx.beginPath();
    ctx.moveTo(this._closeBtn.x+9,this._closeBtn.y+9); ctx.lineTo(this._closeBtn.x+25,this._closeBtn.y+25);
    ctx.moveTo(this._closeBtn.x+25,this._closeBtn.y+9); ctx.lineTo(this._closeBtn.x+9,this._closeBtn.y+25); ctx.stroke();
  }
  _drawFuse(ctx,x,y,blown){
    const img=Assets.prop('fuse');
    if (img){ const h=76, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img,x-w/2,y-h/2,w,h);
      if (blown){ ctx.save(); ctx.fillStyle='rgba(18,12,8,0.55)'; ctx.beginPath(); ctx.arc(x,y,15,0,7); ctx.fill();
        ctx.strokeStyle='#141414'; ctx.lineWidth=3; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(x-11,y-9); ctx.lineTo(x+11,y+9); ctx.moveTo(x+11,y-9); ctx.lineTo(x-11,y+9); ctx.stroke(); ctx.restore(); }
      return; }
    ctx.fillStyle='#e8ddc2'; A.rr(ctx,x-40,y-16,80,32,8); ctx.fill();
    ctx.fillStyle='#9a8a6a'; A.rr(ctx,x-48,y-10,10,20,2); ctx.fill(); A.rr(ctx,x+38,y-10,10,20,2); ctx.fill();
    if (!blown){ ctx.strokeStyle='#c98a3a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-28,y); ctx.lineTo(x+28,y); ctx.stroke(); }
    else { ctx.strokeStyle='#2a2a2a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-28,y); ctx.lineTo(x-6,y); ctx.moveTo(x+6,y); ctx.lineTo(x+28,y); ctx.stroke();
      ctx.fillStyle='rgba(20,20,20,0.5)'; ctx.beginPath(); ctx.arc(x,y,10,0,7); ctx.fill(); }
  }
  _comp(ctx,label,x,y,color,prop){
    const img=prop&&Assets.prop(prop);
    if (img){ const h=96, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img,x-w/2,y-h/2,w,h); return; }
    ctx.fillStyle=color; A.rr(ctx,x-46,y-34,92,68,8); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=2; ctx.stroke();
    setFont(ctx,14,700); ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.fillText(label,x,y+5);
  }
}
