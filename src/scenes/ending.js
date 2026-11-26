// সমাপ্তি দৃশ্য।
import { DIALOGUE } from '../data/dialogue.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';
import { drawCentered } from '../engine/text.js';
export class EndingScene {
  constructor(G){ this.G=G; this.t=0; this.checkpoint=0; this.done=false; this.noHUD=true; }
  enter(){ this.G.audio.setAmbience('village'); this.G.audio.setMusic_mood('rescue');
    this.G.ui.startDialogue(DIALOGUE.ending, ()=>{ this.done=true; }); }
  update(dt){ this.t+=dt;
    if (this.done){ const I=this.G.input;
      if (I.pointerTapped && I.lastTap && this.btn){ const p=I.lastTap,b=this.btn;
        if (p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){ I.pointerTapped=false; this.G.goMenu(); } }
      if (I.pressed('interact')||I.pressed('jump')) this.G.goMenu();
    }
  }
  draw(ctx){ const W=this.G.W,H=this.G.H,t=this.t;
    A.sky(ctx,W,H,A.PAL.skyDawn); A.treeline(ctx,W,440,'#3a5a4a',2,40);
    A.water(ctx,0,430,W,H-430,A.PAL.waterDay,t,false);
    A.hut(ctx,100,300,150,110,{}); A.coconutPalm(ctx,330,330,1.1,t);
    A.jetty(ctx,W*0.5,452,320,t); A.boat(ctx,W*0.5+40,470,1.2,t,{bob:true});
    if (this.done){ const logo=Assets.get('ui_title');
      if (logo){ const lw=Math.min(520,W*0.44), lh=lw*(logo.naturalHeight/logo.naturalWidth); ctx.drawImage(logo, W/2-lw/2, 56, lw, lh); }
      else drawCentered(ctx,S.title,W/2,120,48,'#f6e6b8',700,'rgba(0,0,0,0.6)');
      const b={x:W/2-150,y:H-140,w:300,h:52}; this.btn=b;
      ctx.fillStyle='#3f7a46'; A.rr(ctx,b.x,b.y,b.w,b.h,12); ctx.fill();
      drawCentered(ctx,S.toMenu,b.x+b.w/2,b.y+26,20,'#fff',700);
    }
  }
}
