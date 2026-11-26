// অধ্যায় ৬ক: ঘাটে মিতু — নদীতে নামার আগে মিতু পথ-পরামর্শ দেয়; খেলোয়াড় লণ্ঠন ও
// চিকিৎসা-ব্যাগ তুইলা নিয়া তবে নৌকায় ওঠে (দুইটাই না নিলে ওঠা যায় না)।
import { Platformer } from '../engine/scene.js';
import { DIALOGUE } from '../data/dialogue.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class MituGhatScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=612; this.ambience='night_river'; this.mood='mystery';
    this.bgKey='bg_ghatdawn'; this.canRun=false; this.noVitals=true;
    this.addGround(612); this.leftBound=70; this.rightBound=1210;
    this.player.x=230; this.player.y=526; this.player.vx=this.player.vy=0; this.player.face=1;
    this.setAudio();
    const F=this.G.state.flags;

    this.mitu=this.addNPC({ key:'mitu', x:470, groundY:598, facesPlayer:true, pose:'talk' });
    this.addInteract({ x:470, y:600, r:90, talk:true, markY:470, hint:'মিতুর কথা শোনো (E)',
      onE:()=>{ this.mitu.talking=true;
        this.G.ui.startDialogue(DIALOGUE.mitu.concat(DIALOGUE.river_prep), ()=>{ this.mitu.talking=false; }); } });

    // লণ্ঠন ও চিকিৎসা-ব্যাগ তুলে নিতে হবে
    this.lanternIt=this.addInteract({ x:650, y:600, r:52, markY:552, hidden:!!F.has_lantern,
      hint:'লণ্ঠন তোলো (E)', onE:()=>{ F.has_lantern=1; this.lanternIt.hidden=true; this.G.audio.sfx('success');
        this.G.ui.tip('লণ্ঠন নিলা — ওইপারে আন্ধার, কাজে লাগব।',3.2); this._refresh(); this.G.save&&this.G.save(); } });
    this.bagIt=this.addInteract({ x:780, y:600, r:52, markY:552, hidden:!!F.has_medbag,
      hint:'চিকিৎসা-ব্যাগ তোলো (E)', onE:()=>{ F.has_medbag=1; this.bagIt.hidden=true; this.G.audio.sfx('success');
        this.G.ui.tip('চিকিৎসা-ব্যাগ নিলা — রবিনের পাও বাঁধতে লাগব।',3.2); this._refresh(); this.G.save&&this.G.save(); } });

    this.board=this.addInteract({ x:1060, y:600, r:85, markY:500, hint:'নৌকায় ওঠো → (E)',
      onE:()=>this._board() });

    this._refresh();
    if (!opts.loaded) this.G.ui.startDialogue(DIALOGUE.mitu.concat(DIALOGUE.river_prep));
  }

  _refresh(){
    const F=this.G.state.flags;
    if (F.has_lantern && F.has_medbag) this.G.setObjective('সব নিছ — নৌকায় উইঠা চরের দিকে রওনা দাও।');
    else this.G.setObjective('মিতুর কথা শোনো, লণ্ঠন ও চিকিৎসা-ব্যাগ তুইলা নাও, তারপর নৌকায় ওঠো।');
  }
  _board(){
    const F=this.G.state.flags;
    if (!F.has_lantern || !F.has_medbag){ this.G.audio.sfx('fail');
      this.G.ui.tip('লণ্ঠন আর চিকিৎসা-ব্যাগ — দুইটাই নিয়া তবে ওঠো।',3.2); return; }
    this.G.changeScene('river',{enter:'left'});
  }

  drawWorld(ctx){
    const t=this.t, g=this.groundY;
    if (!Assets.has('bg_ghatdawn')){
      A.sky(ctx,this.G.W,this.G.H,A.PAL.skyDusk); A.water(ctx,0,300,this.G.W,360,A.PAL.waterNight,t,true);
      A.groundStrip(ctx,-200,g,this.worldW+400,200,'#5a4a34','#3a3020'); A.jetty(ctx,980,g-110,300,t);
    } else { A.liveWater(ctx, 0, 300, this.worldW, 150, t); }
    const F=this.G.state.flags;
    // লণ্ঠন (না তোলা থাকলে)
    if (!F.has_lantern){ const img=Assets.prop('lantern');
      if (img){ const h=60, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, 650-w/2, g-h+6, w, h); }
      else A.lantern(ctx,650,g-42,t,true); }
    // চিকিৎসা-ব্যাগ
    if (!F.has_medbag){ const img=Assets.prop('medbag');
      if (img){ const h=54, w=img.naturalWidth*(h/img.naturalHeight); ctx.drawImage(img, 780-w/2, g-h+6, w, h); }
      else { ctx.save(); ctx.fillStyle='#8a6a4a'; A.rr(ctx,762,g-32,36,28,4); ctx.fill();
        ctx.strokeStyle='#d64a4a'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(780,g-26); ctx.lineTo(780,g-12); ctx.moveTo(773,g-19); ctx.lineTo(787,g-19); ctx.stroke(); ctx.restore(); } }
  }
}
