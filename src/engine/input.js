// একীভূত ইনপুট: কিবোর্ড + অন-স্ক্রিন টাচ বোতাম (মাল্টি-টাচ সহ)।
// কর্ম (actions): left,right,up,down,jump,interact,pause,run
// kb[] কিবোর্ড, touch[] টাচ — প্রতি ফ্রেমে a[k]=kb||touch। কোনো আঙুল না থাকলে touch সাফ (আটকে থাকা রোধ)।
const KEYS = ['left','right','up','down','jump','interact','pause','run'];

export class Input {
  constructor() {
    this.a={}; this.prev={}; this.edge={}; this.kb={}; this.touch={};
    for (const k of KEYS){ this.a[k]=false; this.prev[k]=false; this.edge[k]=false; this.kb[k]=false; this.touch[k]=false; }
    this.touchButtons=[];
    this.pointerDown=new Map();   // pointerId -> action | '__tap__' | '__slideoff__'
    this.pointerTapped=false; this._tapQueued=false; this._lastTapPos=null;
    this.pointer={x:0,y:0,down:false};
    this.isTouch=false;
    this._bind();
  }

  setTouchButtons(list){ this.touchButtons=list||[]; }

  _codeToAction(code){
    switch(code){
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'ArrowUp': case 'KeyW': return 'up';
      case 'ArrowDown': case 'KeyS': return 'down';
      case 'Space': return 'jump';
      case 'KeyE': case 'Enter': return 'interact';
      case 'ShiftLeft': case 'ShiftRight': return 'run';
      case 'Escape': case 'KeyP': return 'pause';
    }
    return null;
  }

  _bind(){
    window.addEventListener('keydown',(e)=>{
      const a=this._codeToAction(e.code);
      if (a){ this.kb[a]=true; if(a!=='left'&&a!=='right') e.preventDefault(); if(e.code==='Space') e.preventDefault(); }
    },{passive:false});
    window.addEventListener('keyup',(e)=>{ const a=this._codeToAction(e.code); if(a) this.kb[a]=false; });

    const canvas=document.getElementById('game');
    // স্ক্রিন-পিক্সেল → খেলার লজিক্যাল ১২৮০×৭২০ স্থানাঙ্ক (হাই-DPI ব্যাকিং-স্টোর নির্বিশেষে)
    const LW=1280, LH=720;
    const toCanvas=(ev)=>{ const r=canvas.getBoundingClientRect();
      return { x:(ev.clientX-r.left)*(LW/r.width), y:(ev.clientY-r.top)*(LH/r.height) }; };

    const onDown=(ev)=>{
      if (ev.pointerType==='touch') this.isTouch=true;
      const p=toCanvas(ev); this.pointer.x=p.x; this.pointer.y=p.y; this.pointer.down=true; this._lastTapPos=p;
      const btn=this._hit(p.x,p.y);
      if (btn){ this.touch[btn.action]=true; this.pointerDown.set(ev.pointerId, btn.action); }
      else { this._tapQueued=true; this.pointerDown.set(ev.pointerId,'__tap__'); }
      ev.preventDefault();
    };
    const onMove=(ev)=>{
      if (!this.pointerDown.has(ev.pointerId)) return;
      const p=toCanvas(ev); this.pointer.x=p.x; this.pointer.y=p.y;
      const prev=this.pointerDown.get(ev.pointerId);
      if (prev==='__tap__') return;                 // ট্যাপ হিসেবেই থাক
      const btn=this._hit(p.x,p.y); const na=btn?btn.action:null;
      if (na!==prev){
        if (prev && prev!=='__slideoff__') this._maybeRelease(prev, ev.pointerId);
        if (na){ this.touch[na]=true; this.pointerDown.set(ev.pointerId,na); }
        else this.pointerDown.set(ev.pointerId,'__slideoff__');
      }
      ev.preventDefault();
    };
    const onUp=(ev)=>{
      const act=this.pointerDown.get(ev.pointerId);
      if (act==='__tap__') this.pointerTapped=true;
      this.pointerDown.delete(ev.pointerId);
      if (act && act!=='__tap__' && act!=='__slideoff__') this._maybeRelease(act, ev.pointerId);
      if (this.pointerDown.size===0) this.pointer.down=false;
      ev.preventDefault();
    };
    canvas.addEventListener('pointerdown',onDown,{passive:false});
    canvas.addEventListener('pointermove',onMove,{passive:false});
    canvas.addEventListener('pointerup',onUp,{passive:false});
    canvas.addEventListener('pointercancel',onUp,{passive:false});
    canvas.addEventListener('pointerleave',onUp,{passive:false});
    canvas.addEventListener('lostpointercapture',onUp,{passive:false});
    window.addEventListener('blur',()=>this.releaseAll());
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) this.releaseAll(); });
  }

  _maybeRelease(action, exceptId){
    for (const [pid,a] of this.pointerDown){ if (pid!==exceptId && a===action) return; }
    this.touch[action]=false;
  }
  _hit(x,y){
    for (const b of this.touchButtons){
      if (b.round){ const dx=x-(b.x+b.w/2), dy=y-(b.y+b.h/2); if (dx*dx+dy*dy<=(b.w/2)*(b.w/2)) return b; }
      else if (x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h) return b;
    }
    return null;
  }

  releaseAll(){
    for (const k of KEYS){ this.kb[k]=false; this.touch[k]=false; this.a[k]=false; }
    this.pointerDown.clear(); this.pointer.down=false;
  }

  update(){
    // কোনো আঙুল না থাকলে টাচ-কর্ম জোর করে সাফ (আটকে থাকা রোধ)
    if (this.pointerDown.size===0){ for (const k of KEYS) this.touch[k]=false; }
    for (const k of KEYS){
      const v=this.kb[k]||this.touch[k];
      this.edge[k]=v && !this.prev[k];
      this.prev[k]=v; this.a[k]=v;
    }
    this.pointerTapped=this._tapQueued; this._tapQueued=false;
  }

  down(k){ return !!this.a[k]; }
  pressed(k){ return !!this.edge[k]; }
  advance(){ return this.edge.interact || this.edge.jump || this.pointerTapped; }
  get lastTap(){ return this._lastTapPos; }
}
