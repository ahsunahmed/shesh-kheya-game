// ছবি অ্যাসেট লোডার — PNG থাকলে ব্যবহার, না থাকলে কোডে-আঁকা ফলব্যাক।
// কোনো ছবি না এলেও গেম ভাঙবে না; তাই "অনুপস্থিত অ্যাসেট তৈরি হয়েছে" বলে দাবি করা হয় না।

const BG='./assets/img/bg/', CH='./assets/img/char/', FACE='./assets/img/face/', PROP='./assets/img/prop/', UI='./assets/img/ui/';

// preload তালিকা (দৃশ্যের ব্যাকগ্রাউন্ড + চরিত্রের পূর্ণ অবয়ব + প্রপ)
export const MANIFEST = {
  bg_storm:BG+'storm.jpg', bg_ghat:BG+'ghat.jpg', bg_ghatdawn:BG+'ghatdawn.jpg',
  bg_village:BG+'village.jpg', bg_bamboo:BG+'bamboo.jpg', bg_pump:BG+'pumphouse.jpg',
  bg_brokenpath:BG+'brokenpath.jpg', bg_broken2:BG+'broken2.jpg', bg_wrongpath:BG+'wrongpath.jpg', bg_fox:BG+'foxfield.jpg',
  // ভুল পথের দুই আলাদা জায়গা + প্রতিটির শেষ-প্রান্তের বিপদ-দৃশ্য (ব্যবহারকারী ছবি দিলে লোড হবে)
  bg_wrong_north:BG+'wrong_north.jpg', bg_wrong_north_end:BG+'wrong_north_end.jpg',
  bg_wrong_south:BG+'wrong_south.jpg', bg_wrong_south_end:BG+'wrong_south_end.jpg',
  // নতুন ডিজাইন করা ব্যাকগ্রাউন্ড: বাঁশঝাড়ের সাঁকো-দৃশ্য + সালমা আপার চিকিৎসা (ছেলে/মেয়ে)
  bg_bamboo2:BG+'bamboo2.jpg', bg_salma:BG+'salma.jpg', bg_salma_female:BG+'salma_female.jpg',
  // UI: টাইটেল লোগো, স্টার্ট বোতাম, শব্দ চালু/বন্ধ আইকন
  ui_title:UI+'title_logo.png', ui_play:UI+'play_button.png', ui_sound_on:UI+'sound_on.png', ui_sound_off:UI+'sound_off.png',
  bg_bigchasm:BG+'bigchasm.jpg', bg_pumpfixed:BG+'pumpfixed.jpg',
  bg_river:BG+'river.jpg', bg_river2:BG+'river2.jpg', bg_river3:BG+'river3.jpg', bg_rescue:BG+'rescue.jpg',
  char_player_male:CH+'player_male.png', char_player_female:CH+'player_female.png',
  char_karim:CH+'karim.png', char_robin:CH+'robin.png',
  char_shop:CH+'shop.png', char_maleka:CH+'maleka.png', char_mitu:CH+'mitu.png',
  char_jalil:CH+'jalil.png', char_hashem:CH+'hashem.png', char_salma:CH+'salma.png',
  prop_boat:PROP+'boat.png', prop_lantern:PROP+'lantern.png', prop_teastall:PROP+'teastall.png',
  prop_pump:PROP+'pump.png', prop_signal:PROP+'signal.png', prop_log:PROP+'log.png',
};

export const Assets = {
  images:{}, status:{}, _lazy:{},
  get(key){ return this.images[key]||null; },
  has(key){ return this.status[key]==='ok'; },
  _load(key,path){ return new Promise(res=>{ const im=new Image();
    im.onload=()=>{ this.images[key]=im; this.status[key]='ok'; res(true); };
    im.onerror=()=>{ this.status[key]='miss'; res(false); }; im.src=path; }); },
  animManifest:null, title:[],
  async preload(onProg){
    const e=Object.entries(MANIFEST); let n=0;
    await Promise.all(e.map(([k,p])=>this._load(k,p).then(()=>{ n++; onProg&&onProg(n,e.length); })));
    // frame-by-frame অ্যানিমেশন তথ্য (frames/fps)
    try{ const r=await fetch(CH+'anim.json',{cache:'no-store'}); if(r.ok) this.animManifest=await r.json(); }catch(e){}
    // অ্যানিমেটেড টাইটেল ব্যাকগ্রাউন্ড ফ্রেম
    try{ await this._loadTitle(); }catch(e){}
    this.ready=true;
  },
  async _loadTitle(){
    let count=16; try{ const r=await fetch(BG+'title/count.txt',{cache:'no-store'}); if(r.ok) count=parseInt(await r.text())||16; }catch(e){}
    const loads=[];
    for (let i=0;i<count;i++){ const key='title_'+i; const idx=String(i).padStart(2,'0');
      loads.push(this._load(key, BG+'title/'+idx+'.jpg').then(ok=>{ if(ok) this.title[i]=this.images[key]; })); }
    await Promise.all(loads);
    this.title=this.title.filter(Boolean);
  },
  titleFrame(t){ if(!this.title.length) return null; const i=Math.floor(t*8)%this.title.length; return this.title[i]; },
  animInfo(key,name){ const id=key+'_'+name; return this.animManifest&&this.animManifest[id] ? this.animManifest[id] : null; },
  // অ্যানিমেশন স্ট্রিপ (horizontal sprite strip) — চাহিদামত লোড
  anim(key,name){
    const id='anim_'+key+'_'+name;
    if (this.status[id]==='ok') return this.images[id];
    if (this.status[id]==='miss') return null;
    if (!this._lazy[id]){ this._lazy[id]=true; this._load(id, CH+key+'_'+name+'.png'); }
    return null;
  },
  // প্রপ ছবি (ঐচ্ছিক overlay) — চাহিদামত লোড
  prop(name){
    const id='prop_'+name;
    if (this.status[id]==='ok') return this.images[id];
    if (this.status[id]==='miss') return null;
    if (!this._lazy[id]){ this._lazy[id]=true; this._load(id, PROP+name+'.png'); }
    return null;
  },
  // মুখভঙ্গির ছবি (ঐচ্ছিক) — চাহিদামত একবার লোডের চেষ্টা
  face(key,expr){
    const id='face_'+key+'_'+expr;
    if (this.status[id]==='ok') return this.images[id];
    if (!this._lazy[id]){ this._lazy[id]=true; this._load(id, FACE+key+'_'+expr+'.png'); }
    return null;
  },
  // সংক্ষিপ্ত হিসাব — কতগুলো ছবি সত্যিই আছে
  report(){ let ok=0,miss=0; for(const k in MANIFEST){ this.status[k]==='ok'?ok++:miss++; } return {ok,miss,total:ok+miss}; },
};
