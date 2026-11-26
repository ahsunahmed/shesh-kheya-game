// অধ্যায় ২: চায়ের দোকান ও গ্রাম — ৩ সাক্ষী (দোকানি, হাশেম দাদা, মালেকা আপা) + মানচিত্রে পথ-নির্বাচন।
// ভুল পথ বাছলে সরাসরি "ভুল" বলা হয় না — খেলোয়াড় সেই পথে গিয়ে নিজে বোঝে, তারপর ফেরে।
import { Platformer } from '../engine/scene.js';
import { DIALOGUE } from '../data/dialogue.js';
import { PATHS, evalDeduction } from '../data/puzzles.js';
import { UI as S } from '../data/strings.js';
import * as A from '../engine/art.js';
import { Assets } from '../engine/assets.js';

export class VillageScene extends Platformer {
  enter(opts={}){
    this.worldW=1280; this.groundY=612; this.ambience='village'; this.mood='mystery'; this.bgKey='bg_village';
    this.canRun=false; this.noVitals=true;
    this.addGround(612); this.leftBound=70; this.rightBound=1210;
    this.checkpoints=[{x:150,y:520}];
    if (opts.enter==='right'){ this.player.x=1150; this.player.y=520; this.player.vx=this.player.vy=0; }
    else this.spawn(0);
    this.setAudio();
    const F=this.G.state.flags;
    this.back=this.addInteract({ x:100, y:600, r:70, markY:500, hint:'← ঘাটে ফেরো (E)',
      onE:()=>this.G.changeScene('ghat',{enter:'right'}) });

    this.sShop  =this.addNPC({ key:'shop',   x:230, groundY:598, facesPlayer:true });
    this.sHashem=this.addNPC({ key:'hashem', x:600, groundY:598, facesPlayer:true });
    this.sMaleka=this.addNPC({ key:'maleka', x:970, groundY:598, facesPlayer:true });

    this.addInteract({ x:230, y:600, r:90, talk:true, onE:()=>this._talk(this.sShop, this._shop) });
    this.addInteract({ x:600, y:600, r:85, talk:true, onE:()=>this._talk(this.sHashem, this._hashem) });
    this.addInteract({ x:970, y:600, r:85, talk:true, onE:()=>this._talk(this.sMaleka, this._maleka) });
    this.board=this.addInteract({ x:1080, y:600, r:75, markY:470, hint:'মানচিত্রে পথ বাছো (E)', onE:()=>this._deduce() });

    this.exit=this.addInteract({ x:1200, y:600, r:80, hidden:!F.v_choice, hint:'এগিয়ে যাও → (E)',
      onE:()=>{ if (F.v_path) this.G.changeScene('bamboogrove',{enter:'left'}); else this.G.changeScene('wrongpath'); } });

    // আগে কথা বলা/পথ বাছা থাকলে আর বলতে বাধ্য নয় — অবজেক্টিভ সেই অনুযায়ী
    if (F.v_path) this.G.setObjective('পথ ঠিক করা আছে — ডান দিকে এগোও।');
    else if (F.v_maleka) this.G.setObjective('মানচিত্রে করিম চাচার পথ বাছো (বোর্ডে E)।');
    else this.G.setObjective('দোকানি, হাশেম দাদা ও মালেকা আপার কথা শুনে মানচিত্রে করিম চাচার পথ বাছো।');
    if (opts.recheck){ this.G.ui.startDialogue([{s:'player',t:'ওই পথে অইল না। সবার কথা আবার মিলাইয়া দেহি।',e:'think'}]); }
    else if (!opts.loaded && !F.v_maleka){ this.G.ui.startDialogue([{s:'player',t:'গেরামের সবাই কিছু না কিছু জানে। সবার কথা মিলাইয়া দেহি।',e:'think'}]); }
  }

  _talk(npc, fn){ npc.talking=true; fn.call(this, ()=>{ npc.talking=false; }); }

  _shop(done){ const F=this.G.state.flags;
    if (!F.v_shop){ F.v_shop=1; this.G.addClue('shop_time'); this.G.addClue('shop_words'); }
    this.G.ui.startDialogue(DIALOGUE.shop, done); }
  _hashem(done){ const F=this.G.state.flags;
    if (!F.v_shop){ if(!F.v_hashem1){ F.v_hashem1=1; this.G.addClue('hashem_light'); }
      this.G.ui.startDialogue(DIALOGUE.hashem_1, ()=>this.G.ui.startDialogue(
        [{s:'player',t:'দাদার সময় গুলাইয়া যাইতাছে। আগে দোকানির কাছে পাকা সময়ডা জাইনা আহি।',e:'think'}], done));
    } else if (!F.v_hashem2){ F.v_hashem2=1; if(!F.v_hashem1){F.v_hashem1=1;this.G.addClue('hashem_light');} this.G.addClue('hashem_time');
      this.G.ui.startDialogue(DIALOGUE.hashem_2, done);
    } else this.G.ui.startDialogue([{s:'hashem',t:'ওই আলোডা রাইত দশটারই আছিল রে।',e:'serious'}], done); }
  _maleka(done){ const F=this.G.state.flags;
    if (!F.v_maleka){ F.v_maleka=1; this.G.addClue('maleka_map'); this.G.addClue('maleka_tide'); }
    this.G.ui.startDialogue(DIALOGUE.maleka, done); }

  _deduce(){
    const F=this.G.state.flags;
    if (F.v_path){ this.G.ui.toast('পথ ঠিক করা হয়ে গেছে — ডান দিকে এগোও।','info',1.6); return; }
    if (!F.v_maleka){ this.G.ui.toast('আগে মালেকা আপার মানচিত্র ও কথা শোনো।','info',2.2); return; }
    this.G.ui.choice('সাক্ষীদের কথা, সময় আর জোয়ার মিলিয়ে করিম চাচা কোন পথে গেছেন?',
      PATHS.map(p=>({id:p.id,label:p.name,sub:p.hint})),
      (choice)=>{
        F.v_choice=choice; this.exit.hidden=false;
        const r=evalDeduction(choice, this.G.state.clues);
        const pth=PATHS.find(p=>p.id===choice);
        if (r.ok){ F.v_path=1; this.G.setObjective('এই পথেই মনে অয় — ডান দিকে বাঁশঝাড়ের পথে আগাও।');
          setTimeout(()=>this.G.ui.startDialogue([{s:'player',t:'সব মিলা যাইতাছে।',e:'serious'},{s:'player',t:r.msg,e:'serious'}]),250);
        } else { this.G.setObjective(pth.name+' দিয়া রওনা দাও — ডান দিকে আগাও।');
          setTimeout(()=>this.G.ui.startDialogue([{s:'player',t:'ঠিক আছে, এই পথ দিয়াই একবার দেইখা আহি।',e:'think'}]),250);
        }
      });
  }

  drawWorld(ctx){
    const t=this.t;
    if (!Assets.has('bg_village')){
      A.groundStrip(ctx,-200,this.groundY,this.worldW+400,200,'#9a7a4e','#6f5a3c');
      A.teaStall(ctx,160,this.groundY-130,150,120,t); return;
    }
    A.liveWater(ctx, 0, 300, this.worldW, 150, t);
    A.liveGrass(ctx, 120, this.groundY-6, 10, t);
    A.liveGrass(ctx, 1080, this.groundY-6, 9, t);
    A.fireflies(ctx, 300, 360, 700, 180, 10, t);
  }
}
