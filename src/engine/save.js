// চেকপয়েন্ট সংরক্ষণ — localStorage, ব্যর্থ হলে মেমরিতে (রিফ্রেশে হারাবে)।
const KEY = 'sesh_kheyar_sanket_save_v1';
const SET = 'sesh_kheyar_sanket_settings_v1';

function storageOK(){
  try{
    const t='__t'; localStorage.setItem(t,'1'); localStorage.removeItem(t); return true;
  }catch(e){ return false; }
}

export const Save = {
  available: (typeof localStorage!=='undefined') && storageOK(),
  _mem: null,
  _memSet: null,

  // খেলা অবস্থা { chapter, checkpoint, clues:[], flags:{} }
  write(state){
    const data = JSON.stringify({ v:1, t:Date.now(), state });
    if (this.available){ try{ localStorage.setItem(KEY, data); return true; }catch(e){ this.available=false; } }
    this._mem = data; return false;
  },
  read(){
    let raw = null;
    if (this.available){ try{ raw = localStorage.getItem(KEY); }catch(e){} }
    if (raw==null) raw = this._mem;
    if (!raw) return null;
    try{ const o=JSON.parse(raw); return o && o.state ? o.state : null; }catch(e){ return null; }
  },
  clear(){
    if (this.available){ try{ localStorage.removeItem(KEY); }catch(e){} }
    this._mem = null;
  },
  hasSave(){ return !!this.read(); },

  writeSettings(s){
    const data = JSON.stringify(s);
    if (this.available){ try{ localStorage.setItem(SET, data); return; }catch(e){} }
    this._memSet = data;
  },
  readSettings(){
    let raw=null;
    if (this.available){ try{ raw=localStorage.getItem(SET); }catch(e){} }
    if (raw==null) raw=this._memSet;
    if (!raw) return null;
    try{ return JSON.parse(raw); }catch(e){ return null; }
  }
};
