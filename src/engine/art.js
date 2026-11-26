// কোডে আঁকা ২ডি শিল্প — রেফারেন্স ছবির নরম রঙের সঙ্গে মিল রেখে।
// PNG অ্যাসেট থাকলে সেটি ব্যবহার হয় (art.drawActor / drawSceneBg); না থাকলে এই vector ফলব্যাক।
import { Assets } from './assets.js';

// মুখভঙ্গি → ছবি-ফাইলের নাম (ঐচ্ছিক face crops)
const EXPR2FACE = { idle:'neutral', smile:'happy', happy:'happy', worried:'worried', sad:'worried', think:'think', serious:'think' };

// একটি ছবি/ভিডিও cover-fit করে আঁকা (পূর্ণ স্ক্রিন)
export function drawImgCover(ctx,img,W,H){
  const iw=img.naturalWidth||img.videoWidth||img.width, ih=img.naturalHeight||img.videoHeight||img.height;
  if (!iw||!ih) return;
  const ir=iw/ih, sr=W/H; let dw,dh;
  if (ir>sr){ dh=H; dw=H*ir; } else { dw=W; dh=W/ir; }
  ctx.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);
}

// দৃশ্যের পূর্ণ ব্যাকগ্রাউন্ড ছবি (cover-fit, হালকা parallax pan)
export function drawSceneBg(ctx, key, W, H, cam=0, worldW=W){
  const img=Assets.get(key); if(!img) return false;
  // cover-fit, এবং ক্যামেরা অনুযায়ী সামান্য pan (ছবি স্ক্রিনের চেয়ে চওড়া হলে পুরো স্ক্রল)
  const ir=img.naturalWidth/img.naturalHeight, sr=W/H;
  let dw,dh; if (ir>sr){ dh=H; dw=H*ir; } else { dw=W; dh=W/ir; }
  const extra=Math.max(0, dw-W);
  const panRange=Math.max(0, worldW-W);
  const px = panRange>0 ? (cam/panRange)*extra : 0;
  ctx.drawImage(img, -px - (extra-(panRange>0?extra:0))*0, (H-dh)/2, dw, dh);
  return true;
}

// অ্যানিমেশন সংজ্ঞা: frames (স্ট্রিপে ক’টি ফ্রেম) ও fps
export const ANIM = {
  idle:{frames:4,fps:6,loop:true}, walk:{frames:8,fps:12,loop:true},
  jump:{frames:3,fps:8,loop:false}, talk:{frames:3,fps:7,loop:true},
  rope:{frames:4,fps:8,loop:true}, row:{frames:4,fps:6,loop:true},
};
// pose → অ্যানিমেশন নাম (fallback চেইন সহ)
function poseAnim(pose,moving){
  if (pose==='walk') return moving?['walk','idle']:['idle'];
  if (pose==='run')  return moving?['run','walk','idle']:['idle'];
  if (pose==='jump') return ['jump','fall','idle'];
  if (pose==='fall') return ['fall','jump','idle'];
  if (pose==='hurt') return ['hurt','idle'];
  if (pose==='attack') return ['attack','idle'];
  if (pose==='wave') return ['wave','idle'];
  if (pose==='talk') return ['talk','idle'];
  if (pose==='rope') return ['rope','idle'];
  if (pose==='boat'||pose==='row') return ['row','idle'];
  return ['idle'];
}

// অভিনেতা (player/NPC):
//  ১) অ্যানিমেশন স্ট্রিপ থাকলে সঠিক ফ্রেম  ২) একক standing ছবি + কোড-দোলা  ৩) vector drawChar
export function drawActor(ctx, key, x, groundY, t, opts={}){
  const c=CHARS[key]||CHARS.player; const face=opts.face||1; const pose=opts.pose||'idle'; const moving=!!opts.moving;
  const targetH=(c.h||104)*1.6;
  // ১) স্ট্রিপ
  for (const name of poseAnim(pose,moving)){
    const strip=Assets.anim(key,name); if(!strip) continue;
    const def=Assets.animInfo(key,name) || ANIM[name] || {frames:1,fps:6,loop:true};
    if (def.loop===undefined) def.loop=true;
    const fw=strip.naturalWidth/def.frames, fh=strip.naturalHeight;
    let fi=Math.floor((opts.animT!=null?opts.animT:t)*def.fps);
    fi = def.loop ? (fi%def.frames) : Math.min(def.frames-1, fi%def.frames);
    const scale=targetH/fh, w=fw*scale, h=targetH;
    ctx.save();
    ctx.fillStyle=PAL.shadow; ctx.beginPath(); ctx.ellipse(x,groundY,w*0.3,6,0,0,7); ctx.fill();
    ctx.translate(x,groundY); ctx.scale(face,1);
    ctx.drawImage(strip, fi*fw,0,fw,fh, -w/2,-h, w,h);
    ctx.restore();
    return;
  }
  // ২) একক ছবি
  const img=Assets.get('char_'+key);
  if (img){
    const w=img.naturalWidth*(targetH/img.naturalHeight), h=targetH;
    const bob = pose==='walk'&&moving ? Math.abs(Math.sin(t*10))*4 : Math.sin(t*2)*1.6;
    const lean = pose==='walk'&&moving ? Math.sin(t*10)*0.03 : 0;
    const jump = pose==='jump'? -6 : 0;
    ctx.save();
    ctx.fillStyle=PAL.shadow; ctx.beginPath(); ctx.ellipse(x,groundY,w*0.3,6,0,0,7); ctx.fill();
    ctx.translate(x, groundY - bob + jump); ctx.rotate(lean); ctx.scale(face,1);
    ctx.drawImage(img,-w/2,-h,w,h);
    ctx.restore(); return;
  }
  // ৩) vector
  drawChar(ctx,key,x,groundY,t,opts);
}

// সরাসরি স্ট্রিপ-ফ্রেম আঁকা (প্রাণী/বস্তু) — targetH উচ্চতায়, cx কেন্দ্র, baseY তল। ছবি না থাকলে false।
export function drawSprite(ctx, key, name, cx, baseY, targetH, t, face=1, opt={}){
  const strip=Assets.anim(key,name); if(!strip) return false;
  const def=Assets.animInfo(key,name)||ANIM[name]||{frames:1,fps:6,loop:true};
  const frames=def.frames||1, fps=def.fps||6, loop=def.loop!==false;
  const fw=strip.naturalWidth/frames, fh=strip.naturalHeight;
  let fi=Math.floor(t*fps); fi=loop?(((fi%frames)+frames)%frames):Math.min(frames-1,Math.max(0,fi));
  const scale=targetH/fh, w=fw*scale, h=targetH;
  ctx.save();
  if (opt.shadow!==false){ ctx.fillStyle=PAL.shadow; ctx.beginPath(); ctx.ellipse(cx,baseY,w*0.32,6,0,0,7); ctx.fill(); }
  if (opt.alpha!=null) ctx.globalAlpha=opt.alpha;
  ctx.translate(cx,baseY); ctx.scale(face,1);
  ctx.drawImage(strip, fi*fw,0,fw,fh, -w/2,-h, w,h);
  ctx.restore(); return true;
}

// সংলাপের portrait — face crop > full body > vector
export function drawPortrait(ctx, key, x, y, size, expr, t){
  const fc=Assets.face(key, EXPR2FACE[expr]||'neutral');
  const body=Assets.get('char_'+key);
  if (fc){ const s=size/Math.max(fc.naturalWidth,fc.naturalHeight); ctx.drawImage(fc, x+(size-fc.naturalWidth*s)/2, y+(size-fc.naturalHeight*s)/2, fc.naturalWidth*s, fc.naturalHeight*s); return true; }
  if (body){ // মাথা/উপরের অংশ দেখাও
    const ar=body.naturalWidth/body.naturalHeight; const dw=size*1.1, dh=dw/ar;
    ctx.save(); ctx.beginPath(); rr(ctx,x,y,size,size,8); ctx.clip();
    ctx.drawImage(body, x+(size-dw)/2, y-dh*0.04, dw, dh); ctx.restore(); return true; }
  return false;
}

export const PAL = {
  skyStorm:['#20233b','#33314c','#5a3f59','#8a4f45'],
  skyDawn: ['#5f7bb0','#9fb0cf','#e6c49a','#f2cf9c'],
  skyDusk: ['#3a3a66','#6a5a8a','#c87a5a','#efb97a'],
  skyDay:  ['#6f93b8','#9ec0d6','#cfe0dc','#e9d6ad'],
  waterDay:'#52707e', waterNight:'#2d3f52', waterDusk:'#4a4a66',
  foliageDark:'#2c4d32', foliageMid:'#3f7a46', foliageLite:'#73ad5c',
  bamboo:'#8a9f4a', bambooDark:'#5d6f34',
  earth:'#9a7a4e', mud:'#6f5a3c', brick:'#8a5a46', sand:'#b79a6a',
  hutWall:'#d8ccae', tinRoof:'#86604e', tinRoofRust:'#9a5a44', woven:'#bfa072',
  lantern:'#f6c766', lanternCore:'#fff0c0',
  reed:'#c9b78a', hyacinth:'#4f7a46', hyacinthFlower:'#b79ad0',
  shadow:'rgba(20,20,30,0.25)',
};

export function rr(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
export function lerpC(a,b,t){
  const pa=hx(a), pb=hx(b);
  return `rgb(${Math.round(pa[0]+(pb[0]-pa[0])*t)},${Math.round(pa[1]+(pb[1]-pa[1])*t)},${Math.round(pa[2]+(pb[2]-pa[2])*t)})`;
}
function hx(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }

export function sky(ctx,W,H,colors,t=0){
  const g=ctx.createLinearGradient(0,0,0,H);
  for (let i=0;i<colors.length;i++) g.addColorStop(i/(colors.length-1), colors[i]);
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
export function stars(ctx,W,H,n=40,t=0){
  ctx.save();
  for (let i=0;i<n;i++){
    const x=(i*73.3)%W, y=(i*41.7)%(H*0.5);
    const tw=0.5+0.5*Math.sin(t*2+i);
    ctx.globalAlpha=0.3+0.5*tw; ctx.fillStyle='#e9e6ff';
    ctx.fillRect(x,y,1.6,1.6);
  }
  ctx.restore();
}
export function moon(ctx,x,y,r){
  const g=ctx.createRadialGradient(x,y,r*0.3,x,y,r*2.4);
  g.addColorStop(0,'rgba(255,248,220,0.9)'); g.addColorStop(1,'rgba(255,248,220,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*2.4,0,7); ctx.fill();
  ctx.fillStyle='#fdf6d8'; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
}

// দূরের গাছের সারি (silhouette)
export function treeline(ctx,W,yBase,color,seed=1,amp=38){
  ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(0,yBase);
  for (let x=0;x<=W;x+=22){
    const h=amp*(0.5+0.5*Math.sin(x*0.03+seed)) + 12*Math.sin(x*0.11+seed*2);
    ctx.lineTo(x,yBase-h-18);
    ctx.lineTo(x+11,yBase-h*0.7-10);
  }
  ctx.lineTo(W,yBase); ctx.closePath(); ctx.fill();
  // পাম গাছের ছায়া
  for (let i=0;i<5;i++){
    const x=((i*191+seed*57)%W);
    palmSilhouette(ctx,x,yBase, color, 0.6+((i*13)%5)/10);
  }
}
function palmSilhouette(ctx,x,base,color,s){
  ctx.save(); ctx.translate(x,base); ctx.scale(s,s); ctx.strokeStyle=color; ctx.fillStyle=color;
  ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(4,-40,2,-78); ctx.stroke();
  for (let a=-2;a<=2;a++){ ctx.beginPath(); ctx.moveTo(2,-78);
    ctx.quadraticCurveTo(2+a*14,-96-Math.abs(a)*2, 2+a*30,-84-Math.abs(a)*4); ctx.lineWidth=3; ctx.stroke(); }
  ctx.restore();
}

export function water(ctx,x,y,w,h,color,t,moonlit=false){
  ctx.fillStyle=color; ctx.fillRect(x,y,w,h);
  ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle='#ffffff'; ctx.lineWidth=2;
  for (let i=0;i<h;i+=18){
    ctx.beginPath();
    for (let xx=x;xx<=x+w;xx+=14){
      const yy=y+i + Math.sin(xx*0.05 + t*1.2 + i)*2.2;
      xx===x?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  if (moonlit){ ctx.save(); ctx.globalAlpha=0.25; const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'#fdf6d8'); g.addColorStop(1,'rgba(253,246,216,0)');
    ctx.fillStyle=g; ctx.fillRect(x+w*0.55,y,w*0.12,h); ctx.restore(); }
}
export function hyacinth(ctx,x,y,n,t){
  for (let i=0;i<n;i++){
    const px=x+i*26 + Math.sin(t*0.5+i)*4, py=y+((i*7)%10);
    ctx.fillStyle=PAL.hyacinth; ctx.beginPath(); ctx.ellipse(px,py,10,5,0,0,7); ctx.fill();
    ctx.fillStyle=PAL.foliageLite; ctx.beginPath(); ctx.ellipse(px-3,py-1,4,3,0,0,7); ctx.fill();
    if (i%3===0){ ctx.fillStyle=PAL.hyacinthFlower; ctx.beginPath(); ctx.arc(px+2,py-5,2.2,0,7); ctx.fill(); }
  }
}

// কাশফুল / নলখাগড়া
export function reeds(ctx,x,base,n,t,scale=1){
  ctx.save(); ctx.translate(x,base); ctx.scale(scale,scale);
  for (let i=0;i<n;i++){
    const rx=i*9-(n*4), sway=Math.sin(t*1.3+i)*6;
    ctx.strokeStyle=PAL.bambooDark; ctx.lineWidth=2; ctx.beginPath();
    ctx.moveTo(rx,0); ctx.quadraticCurveTo(rx+sway*0.5,-30,rx+sway,-58); ctx.stroke();
    ctx.fillStyle=PAL.reed; ctx.beginPath(); ctx.ellipse(rx+sway,-62,4,9,sway*0.02,0,7); ctx.fill();
  }
  ctx.restore();
}

export function bambooClump(ctx,x,base,h,t,scale=1){
  ctx.save(); ctx.translate(x,base); ctx.scale(scale,scale);
  for (let i=0;i<6;i++){
    const bx=(i-3)*12, sway=Math.sin(t*0.8+i*0.6)*5, hh=h*(0.7+((i*7)%5)/10);
    ctx.strokeStyle= i%2?PAL.bamboo:PAL.bambooDark; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(bx,0); ctx.quadraticCurveTo(bx+sway*0.5,-hh*0.6,bx+sway,-hh); ctx.stroke();
    // পাতা
    ctx.strokeStyle=PAL.foliageMid; ctx.lineWidth=2;
    for (let l=0;l<4;l++){ const ly=-hh+ l*14; ctx.beginPath(); ctx.moveTo(bx+sway*((hh-Math.abs(ly))/hh),ly);
      ctx.lineTo(bx+sway+ (l%2?16:-16), ly-10); ctx.stroke(); }
  }
  ctx.restore();
}

export function bananaTree(ctx,x,base,scale=1,t=0){
  ctx.save(); ctx.translate(x,base); ctx.scale(scale,scale);
  ctx.fillStyle='#6f7d4a'; rr(ctx,-7,-120,14,120,6); ctx.fill();
  const sway=Math.sin(t*0.6)*0.08;
  for (let a=0;a<6;a++){
    ctx.save(); ctx.translate(0,-120); ctx.rotate((a-2.5)*0.5 + sway);
    ctx.fillStyle= a%2?PAL.foliageMid:PAL.foliageDark;
    ctx.beginPath(); ctx.ellipse(0,-34,16,46,0,0,7); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle='#d8c24a'; // কাঁদি
  for(let b=0;b<4;b++){ ctx.beginPath(); ctx.ellipse(6,-96+b*6,4,9,0.3,0,7); ctx.fill(); }
  ctx.restore();
}

export function coconutPalm(ctx,x,base,scale=1,t=0){
  ctx.save(); ctx.translate(x,base); ctx.scale(scale,scale);
  const sway=Math.sin(t*0.5)*4;
  ctx.strokeStyle='#7a6246'; ctx.lineWidth=9; ctx.beginPath();
  ctx.moveTo(0,0); ctx.quadraticCurveTo(10,-90,6+sway,-168); ctx.stroke();
  for (let a=-3;a<=3;a++){ ctx.strokeStyle= a%2?PAL.foliageMid:PAL.foliageDark; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(6+sway,-168);
    ctx.quadraticCurveTo(6+sway+a*26,-188-Math.abs(a)*3, 6+sway+a*54,-158-Math.abs(a)*8); ctx.stroke(); }
  ctx.fillStyle='#6b5a3a'; for(let c=0;c<3;c++){ ctx.beginPath(); ctx.arc(6+sway+(c-1)*7,-158,5,0,7); ctx.fill(); }
  ctx.restore();
}

// টিনের চালের ঘর (খালপাড়ের বাড়ি)
export function hut(ctx,x,y,w,h,opt={}){
  const wall=opt.wall||PAL.hutWall, roof=opt.roof||PAL.tinRoof;
  // দেয়াল
  ctx.fillStyle=wall; rr(ctx,x,y,w,h,3); ctx.fill();
  // দরজা/জানালা
  ctx.fillStyle=opt.door||'#5a4636'; rr(ctx,x+w*0.12,y+h*0.35,w*0.2,h*0.65,2); ctx.fill();
  ctx.fillStyle=opt.win||'#7fa0a0'; rr(ctx,x+w*0.55,y+h*0.25,w*0.24,h*0.3,2); ctx.fill();
  ctx.strokeStyle='#4a5a5a'; ctx.lineWidth=1.5; ctx.strokeRect(x+w*0.55,y+h*0.25,w*0.24,h*0.3);
  ctx.beginPath(); ctx.moveTo(x+w*0.67,y+h*0.25); ctx.lineTo(x+w*0.67,y+h*0.55); ctx.stroke();
  // টিনের চাল
  ctx.fillStyle=roof; ctx.beginPath();
  ctx.moveTo(x-8,y); ctx.lineTo(x+w*0.5,y-h*0.42); ctx.lineTo(x+w+8,y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1;
  for (let i=1;i<6;i++){ ctx.beginPath(); ctx.moveTo(x-8+(w+16)*i/6, y - (h*0.42)*(1-Math.abs(i/6-0.5)*2)); ctx.lineTo(x-8+(w+16)*i/6,y); ctx.stroke(); }
}

// চায়ের দোকান (খোলা চালা, বেঞ্চ, কেটলি)
export function teaStall(ctx,x,y,w,h,t){
  ctx.fillStyle=PAL.woven; rr(ctx,x,y,w,h*0.6,3); ctx.fill();              // পেছনের বেড়া
  ctx.fillStyle='#b0463a'; ctx.beginPath();                               // লাল ত্রিপল চাল
  ctx.moveTo(x-10,y); ctx.lineTo(x+w*0.5,y-26); ctx.lineTo(x+w+10,y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#8a4a3a'; ctx.lineWidth=4; // খুঁটি
  ctx.beginPath(); ctx.moveTo(x+6,y); ctx.lineTo(x+6,y+h); ctx.moveTo(x+w-6,y); ctx.lineTo(x+w-6,y+h); ctx.stroke();
  // কাউন্টার + কেটলি + বাষ্প
  ctx.fillStyle='#7a5a3a'; rr(ctx,x+8,y+h*0.5,w*0.5,h*0.5,2); ctx.fill();
  ctx.fillStyle='#c8c8cc'; ctx.beginPath(); ctx.ellipse(x+22,y+h*0.5-6,8,6,0,0,7); ctx.fill();
  ctx.fillStyle='#9a9a9e'; rr(ctx,x+28,y+h*0.5-9,5,6,1); ctx.fill();
  ctx.save(); ctx.globalAlpha=0.3+0.2*Math.sin(t*3); ctx.strokeStyle='#fff'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(x+22,y+h*0.5-12); ctx.quadraticCurveTo(x+30,y+h*0.5-24,x+22,y+h*0.5-34); ctx.stroke(); ctx.restore();
}

// মাচা/বেঞ্চ
export function bench(ctx,x,y,w){ ctx.fillStyle='#7a5a3a'; rr(ctx,x,y,w,8,2); ctx.fill();
  rr(ctx,x+4,y+8,6,14,1); ctx.fill(); rr(ctx,x+w-10,y+8,6,14,1); ctx.fill(); }

// বাজারের ডালা (ফল/সবজি)
export function marketStall(ctx,x,y,w,h,t){
  ctx.strokeStyle='#8a6a4a'; ctx.lineWidth=4; ctx.beginPath();
  ctx.moveTo(x,y); ctx.lineTo(x,y+h); ctx.moveTo(x+w,y); ctx.lineTo(x+w,y+h); ctx.stroke();
  ctx.fillStyle='#4a6ea0'; ctx.beginPath(); ctx.moveTo(x-6,y); ctx.quadraticCurveTo(x+w/2,y-14,x+w+6,y);
  ctx.lineTo(x+w+6,y+6); ctx.quadraticCurveTo(x+w/2,y-8,x-6,y+6); ctx.closePath(); ctx.fill(); // ছাউনি
  ctx.fillStyle='#7a5a3a'; rr(ctx,x,y+h*0.5,w,h*0.5,2); ctx.fill(); // টেবিল
  const fruit=['#e2b23a','#c0452f','#6f8f3a','#8a4a8a'];
  for (let i=0;i<8;i++){ ctx.fillStyle=fruit[i%4]; ctx.beginPath();
    ctx.arc(x+8+i*((w-12)/8), y+h*0.5-5, 4,0,7); ctx.fill(); }
}

// খেয়াঘাট / জেটি (কাঠের)
export function jetty(ctx,x,y,w,t){
  ctx.fillStyle='#8a6a46';
  for (let i=0;i<Math.floor(w/22);i++){ rr(ctx,x+i*22,y,20,10,2); ctx.fill(); }
  ctx.fillStyle='#6a4e34'; // পিলার
  for (let i=0;i<Math.floor(w/44);i++){ rr(ctx,x+10+i*44,y+10,8,40,2); ctx.fill(); }
}

// নৌকা (ছইওয়ালা) — pose: 'moored'|'float'; rower বাইরে আঁকা হয়
export function boat(ctx,x,y,scale=1,t=0,opt={}){
  ctx.save(); ctx.translate(x,y+Math.sin(t*1.5)*2*(opt.bob?1:0)); ctx.scale(scale,scale);
  ctx.fillStyle='#6a4e34'; ctx.beginPath();
  ctx.moveTo(-54,0); ctx.quadraticCurveTo(-64,-10,-50,-14);
  ctx.lineTo(50,-14); ctx.quadraticCurveTo(66,-10,56,0);
  ctx.quadraticCurveTo(0,14,-54,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#7a5a3c'; ctx.beginPath(); ctx.moveTo(-50,-14); ctx.lineTo(50,-14);
  ctx.quadraticCurveTo(0,8,-50,-14); ctx.closePath(); ctx.fill();
  if (opt.canopy!==false){ ctx.fillStyle=PAL.woven; ctx.beginPath();
    ctx.moveTo(-18,-14); ctx.quadraticCurveTo(0,-40,22,-14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#8a7050'; ctx.lineWidth=1.5;
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*8,-14); ctx.lineTo(i*5,-30+Math.abs(i)*3); ctx.stroke(); } }
  ctx.restore();
}

export function lantern(ctx,x,y,t,on=true){
  if (on){ const fl=0.85+0.15*Math.sin(t*8+Math.random()*0.2);
    const g=ctx.createRadialGradient(x,y,2,x,y,46);
    g.addColorStop(0,`rgba(255,220,130,${0.55*fl})`); g.addColorStop(1,'rgba(255,220,130,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,46,0,7); ctx.fill(); }
  ctx.fillStyle='#4a3a2a'; rr(ctx,x-5,y-10,10,16,2); ctx.fill();
  ctx.fillStyle= on?PAL.lanternCore:'#5a5a50'; rr(ctx,x-3,y-7,6,10,1); ctx.fill();
  ctx.strokeStyle='#3a2e22'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x,y-10); ctx.lineTo(x,y-16); ctx.stroke();
}

export function fallenLog(ctx,x,y,len){
  ctx.save(); ctx.fillStyle='#6a4e34'; rr(ctx,x,y,len,20,8); ctx.fill();
  ctx.fillStyle='#3f7a46'; for(let i=0;i<len;i+=24){ ctx.beginPath(); ctx.ellipse(x+i,y,7,4,0,0,7); ctx.fill(); } // শ্যাওলা
  ctx.fillStyle='#5a3e28'; ctx.beginPath(); ctx.arc(x,y+10,11,0,7); ctx.fill();
  ctx.strokeStyle='#7a5a3c'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y+10,6,0,7); ctx.stroke();
  ctx.restore();
}

export function post(ctx,x,base,h,kind='thick'){
  if (kind==='thin_bamboo'){ ctx.strokeStyle=PAL.bamboo; ctx.lineWidth=5; }
  else if (kind==='rotten_post'){ ctx.strokeStyle='#6a5a44'; ctx.lineWidth=9; }
  else { ctx.strokeStyle='#7a5a3c'; ctx.lineWidth=12; }
  ctx.beginPath(); ctx.moveTo(x,base); ctx.lineTo(x,base-h); ctx.stroke();
  if (kind==='rotten_post'){ ctx.strokeStyle='#3f5a34'; ctx.lineWidth=2; // শ্যাওলা
    ctx.beginPath(); ctx.moveTo(x-3,base-h*0.3); ctx.lineTo(x+3,base-h*0.5); ctx.stroke(); }
}

export function rope(ctx,x1,y1,x2,y2,sag=10){
  ctx.strokeStyle='#caa96a'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x1,y1);
  ctx.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+sag,x2,y2); ctx.stroke();
}

export function cloud(ctx,x,y,s,color='rgba(60,55,80,0.6)'){
  ctx.fillStyle=color;
  for (let i=0;i<4;i++){ ctx.beginPath(); ctx.ellipse(x+i*26*s-30*s,y+Math.sin(i)*6*s,26*s,16*s,0,0,7); ctx.fill(); }
}
export function rain(ctx,W,H,t,intensity=1){
  ctx.save(); ctx.strokeStyle='rgba(180,195,220,0.35)'; ctx.lineWidth=1.4;
  for (let i=0;i<120*intensity;i++){
    const x=((i*137 + t*600)%W), y=((i*83 + t*900)%H);
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y+14); ctx.stroke();
  }
  ctx.restore();
}
export function lightningFlash(ctx,W,H,a){ if(a<=0)return; ctx.save(); ctx.globalAlpha=a*0.5; ctx.fillStyle='#dfe6ff'; ctx.fillRect(0,0,W,H); ctx.restore(); }

// painted দৃশ্যের উপর সূক্ষ্ম জীবন্ত উপাদান
export function liveWater(ctx,x,y,w,h,t){
  ctx.save(); ctx.globalCompositeOperation='screen';
  for (let i=0;i<6;i++){ const yy=y+(i+0.5)*h/6; ctx.globalAlpha=Math.max(0,0.05+0.04*Math.sin(t*1.2+i));
    ctx.strokeStyle='#ffe9c0'; ctx.lineWidth=2; ctx.beginPath();
    for (let xx=x;xx<=x+w;xx+=22){ const o=Math.sin(xx*0.02+t*1.5+i)*2; xx===x?ctx.moveTo(xx,yy+o):ctx.lineTo(xx,yy+o); }
    ctx.stroke(); }
  ctx.restore();
}
export function liveGrass(ctx,x,base,n,t,color='#3f6a34'){
  ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineCap='round';
  for (let i=0;i<n;i++){ const gx=x+i*10-(n*5), sway=Math.sin(t*1.6+i*0.7)*5;
    ctx.beginPath(); ctx.moveTo(gx,base); ctx.quadraticCurveTo(gx+sway*0.5,base-14,gx+sway,base-24); ctx.stroke(); }
  ctx.restore();
}
export function fireflies(ctx,x,y,w,h,n,t){
  ctx.save(); for (let i=0;i<n;i++){ const fx=x+((i*127.3)%w), fy=y+((i*71.7)%h)+Math.sin(t*0.8+i)*6;
    ctx.globalAlpha=0.3+0.5*Math.abs(Math.sin(t*2+i*1.3)); ctx.fillStyle='#ffe79a';
    ctx.beginPath(); ctx.arc(fx,fy,1.8,0,7); ctx.fill(); } ctx.restore();
}

// prop PNG আঁকা (কেন্দ্র x, নিচ bottomY)
export function drawProp(ctx,name,x,bottomY,w){
  const img=Assets.prop(name); if(!img) return false;
  const h=img.naturalHeight*(w/img.naturalWidth); ctx.drawImage(img, x-w/2, bottomY-h, w, h); return true;
}
// দৃশ্যমান সূত্র (ভেক্টর ফলব্যাক)
export function footprints(ctx,x,base,seen){
  ctx.save(); ctx.globalAlpha=seen?0.35:0.8; ctx.fillStyle='#3f2c18';
  for (let i=0;i<5;i++){ const fx=x+i*22, fy=base-i*7;
    ctx.beginPath(); ctx.ellipse(fx,fy,6,3.4,-0.4,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx+10,fy-6,6,3.4,-0.4,0,7); ctx.fill(); }
  ctx.restore();
}
export function tornRope(ctx,x,y,seen){
  ctx.save(); ctx.globalAlpha=seen?0.6:1; ctx.lineCap='round';
  // খুঁটির গায়ে ঝোলানো মোটা পাকানো দড়ি (স্পষ্ট)
  ctx.strokeStyle='#caa15a'; ctx.lineWidth=10;
  ctx.beginPath(); ctx.moveTo(x,y-74); ctx.quadraticCurveTo(x+12,y-32,x+4,y+8); ctx.stroke();
  ctx.strokeStyle='#a9823f'; ctx.lineWidth=2.2;            // পাকানো দাগ
  for(let i=0;i<10;i++){ const yy=y-70+i*8; ctx.beginPath(); ctx.moveTo(x-5,yy); ctx.lineTo(x+9,yy+4); ctx.stroke(); }
  // ছেঁড়া মুখ — আঁশ বাইর অইয়া আছে (ঘষা লেগে ছিঁড়ছে)
  ctx.strokeStyle='#e0c187'; ctx.lineWidth=2.4;
  for(let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(x+4,y+8); ctx.lineTo(x+4+i*4,y+8+18+Math.abs(i)*2); ctx.stroke(); }
  ctx.restore();
}
export function boatMarks(ctx,x,base,seen){
  ctx.save(); ctx.globalAlpha=seen?0.3:0.55; ctx.strokeStyle='#3f2c18'; ctx.lineWidth=7; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x-34,base+8); ctx.lineTo(x+42,base-26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-20,base+15); ctx.lineTo(x+56,base-19); ctx.stroke();
  ctx.restore();
}

export function groundStrip(ctx,x,y,w,h,top,bottom){
  const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,top); g.addColorStop(1,bottom);
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
}
export function puddle(ctx,x,y,w){ ctx.save(); ctx.globalAlpha=0.5; ctx.fillStyle='#8fb0c0';
  ctx.beginPath(); ctx.ellipse(x,y,w,w*0.3,0,0,7); ctx.fill(); ctx.restore(); }

// ---------------- চরিত্র ----------------
// preset: { skin,hair,shirt,lower,acc,accColor,lowerType('lungi'|'pants'|'sari'|'shorts'),h }
export const CHARS = {
  player:{ skin:'#d8a878', hair:'#2e241e', shirt:'#d8cdb0', lower:'#6b7a46', lowerType:'pants', acc:'bag', accColor:'#8a3a4a', h:104 },
  karim: { skin:'#b98658', hair:'#2a2420', shirt:'#8fa0b4', lower:'#3f5a8a', lowerType:'lungi', acc:'sash', accColor:'#9a3a3a', h:116, beard:true },
  robin: { skin:'#cf9a66', hair:'#2a241e', shirt:'#7a9a56', lower:'#5a5246', lowerType:'shorts', acc:'basket', accColor:'#8a6a3a', h:104 },
  shop:  { skin:'#c99266', hair:'#241e1a', shirt:'#b04a4a', lower:'#c9a84a', lowerType:'sari', acc:'apron', accColor:'#5a4636', h:106 },
  hashem:{ skin:'#b08a60', hair:'#d8d2c4', shirt:'#cfc7b2', lower:'#7a8290', lowerType:'lungi', acc:'cane', accColor:'#6a4e34', h:110, beard:true, glasses:true },
  maleka:{ skin:'#cf9a6e', hair:'#b8b2a4', shirt:'#c9a0ba', lower:'#b2929a', lowerType:'sari', acc:'book', accColor:'#3a4a7a', h:108, glasses:true },
  mitu:  { skin:'#c99064', hair:'#241e1a', shirt:'#c98a6a', lower:'#5a6a8a', lowerType:'sari', acc:'net', accColor:'#d8cdb0', h:100 },
  jalil: { skin:'#a87a50', hair:'#2a241e', shirt:'#b5aa94', lower:'#4a6a5a', lowerType:'lungi', acc:'wrench', accColor:'#8a8a90', h:112, beard:true, big:true },
  salma: { skin:'#cf9a6e', hair:'#2a241e', shirt:'#6f8f5a', lower:'#9a7aa0', lowerType:'pants', acc:'medbag', accColor:'#8a6a4a', h:106, hood:true },
};

// pose: idle|walk|jump|talk|rope|boat ; face facing ±1 ; expr idle/smile/worried/think/sad/happy/serious
export function drawChar(ctx, key, x, groundY, t, {pose='idle', face=1, expr='idle', moving=false}={}){
  const c = CHARS[key] || CHARS.player;
  const H = c.h, scale = H/104;
  ctx.save(); ctx.translate(x, groundY); ctx.scale(face*scale, scale);
  // ছায়া
  ctx.fillStyle=PAL.shadow; ctx.beginPath(); ctx.ellipse(0,0,20,6,0,0,7); ctx.fill();

  const bob = pose==='walk'&&moving ? Math.abs(Math.sin(t*10))*3 : Math.sin(t*2)*1.2;
  const yTop = -H;
  const hipY = -H*0.46, shY = -H*0.72, headY=-H*0.86;

  // পা
  const legSwing = pose==='walk'&&moving ? Math.sin(t*10)*10 : 0;
  const jumpTuck = pose==='jump'? 8 : 0;
  ctx.strokeStyle=c.skin; ctx.lineWidth=7;
  drawLeg(ctx, -6, hipY, legSwing, jumpTuck);
  drawLeg(ctx, 6, hipY, -legSwing, jumpTuck);
  // নিম্নাংশ (lungi/pants/sari/shorts)
  drawLower(ctx, c, hipY, bob);

  // শরীর
  ctx.fillStyle=c.shirt;
  rr(ctx,-11, shY+bob, 22, (hipY-shY)+2, 6); ctx.fill();
  // হাত + accessory pose
  drawArms(ctx, c, shY+bob, pose, t, moving, expr);

  // মাথা
  drawHead(ctx, c, headY+bob, expr, pose, t);

  // accessory সামনে
  drawAccessory(ctx, c, shY+bob, hipY, pose);
  ctx.restore();
}
function drawLeg(ctx,x,hipY,swing,tuck){
  ctx.beginPath(); ctx.moveTo(x,hipY); ctx.lineTo(x+swing*0.4, hipY+ (22) + tuck);
  ctx.lineTo(x+swing, -2); ctx.stroke();
  // পায়ের স্যান্ডেল
  ctx.save(); ctx.lineWidth=1; ctx.fillStyle='#4a3524';
  ctx.beginPath(); ctx.ellipse(x+swing,-1,5,2.5,0,0,7); ctx.fill(); ctx.restore();
}
function drawLower(ctx,c,hipY,bob){
  ctx.fillStyle=c.lower;
  if (c.lowerType==='sari'){ ctx.beginPath(); ctx.moveTo(-13,hipY+bob); ctx.lineTo(13,hipY+bob);
    ctx.lineTo(16,-2); ctx.lineTo(-16,-2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-10,hipY+bob+6); ctx.lineTo(-13,-2); ctx.stroke(); }
  else if (c.lowerType==='lungi'){ ctx.beginPath(); ctx.moveTo(-12,hipY+bob); ctx.lineTo(12,hipY+bob);
    ctx.lineTo(13,-1); ctx.lineTo(-13,-1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1;
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*5,hipY+bob); ctx.lineTo(i*6,-1); ctx.stroke(); } }
  else if (c.lowerType==='shorts'){ rr(ctx,-11,hipY+bob,22,16,3); ctx.fill(); }
  else { rr(ctx,-10,hipY+bob,9,hipY<-40? -hipY-2:20,3); ctx.fill(); rr(ctx,1,hipY+bob,9,-hipY-2,3); ctx.fill(); }
}
function drawArms(ctx,c,shY,pose,t,moving,expr){
  ctx.strokeStyle=c.skin; ctx.lineWidth=6;
  let swing = pose==='walk'&&moving? Math.sin(t*10)*8 : Math.sin(t*2)*2;
  if (pose==='talk'){ swing = Math.sin(t*5)*6; }
  // পেছনের হাত
  ctx.beginPath(); ctx.moveTo(-9,shY+4); ctx.lineTo(-13-swing*0.3, shY+22);
  if (pose==='rope'||pose==='boat'){ ctx.lineTo(-18, shY+30); } else ctx.lineTo(-11-swing, shY+30);
  ctx.stroke();
  // সামনের হাত
  ctx.beginPath(); ctx.moveTo(9,shY+4);
  if (pose==='rope'){ ctx.lineTo(16,shY+14); ctx.lineTo(24,shY+6); }
  else if (pose==='boat'){ ctx.lineTo(16,shY+16); ctx.lineTo(26,shY+2); }
  else if (pose==='jump'){ ctx.lineTo(14,shY+2); ctx.lineTo(18,shY-8); }
  else { ctx.lineTo(13+swing*0.3,shY+22); ctx.lineTo(11+swing,shY+30); }
  ctx.stroke();
}
function drawHead(ctx,c,headY,expr,pose,t){
  // মুখ
  ctx.fillStyle=c.skin; ctx.beginPath(); ctx.arc(0,headY,10,0,7); ctx.fill();
  // চুল
  ctx.fillStyle=c.hair; ctx.beginPath(); ctx.arc(0,headY-2,10.5,Math.PI*1.05,Math.PI*2-0.05); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-2,headY-5,10,7,0,0,7); ctx.fill();
  if (c.beard){ ctx.fillStyle=c.hair; ctx.beginPath(); ctx.arc(2,headY+5,7,0,Math.PI); ctx.fill(); }
  // চোখ ও অভিব্যক্তি
  ctx.fillStyle='#22202a';
  const eyeY=headY-1;
  if (expr==='worried'||expr==='sad'){ ctx.fillRect(2,eyeY-1,2,2); ctx.fillRect(6.5,eyeY-1,2,2);
    ctx.strokeStyle='#22202a'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(1,eyeY-3); ctx.lineTo(4,eyeY-2); ctx.stroke(); }
  else if (expr==='happy'||expr==='smile'){ ctx.fillRect(2,eyeY-1,2,2); ctx.fillRect(6.5,eyeY-1,2,2); }
  else if (expr==='serious'||expr==='think'){ ctx.fillRect(2,eyeY,2.4,1.6); ctx.fillRect(6.5,eyeY,2.4,1.6); }
  else { ctx.fillRect(2.5,eyeY-1,2,2); ctx.fillRect(6.5,eyeY-1,2,2); }
  // মুখভঙ্গি
  ctx.strokeStyle='#5a2a2a'; ctx.lineWidth=1.3; ctx.beginPath();
  const my=headY+5;
  const talk = pose==='talk'? Math.abs(Math.sin(t*9))*2 : 0;
  if (expr==='happy'||expr==='smile') ctx.arc(4,my-1,3,0.1,Math.PI-0.1);
  else if (expr==='sad'||expr==='worried') ctx.arc(4,my+2,3,Math.PI+0.2,Math.PI*2-0.2);
  else { ctx.moveTo(2,my+talk); ctx.lineTo(7,my+talk); }
  ctx.stroke();
  if (c.glasses){ ctx.strokeStyle='#30302a'; ctx.lineWidth=1; ctx.beginPath();
    ctx.arc(3,eyeY,2.6,0,7); ctx.arc(7.5,eyeY,2.6,0,7); ctx.moveTo(5.6,eyeY); ctx.lineTo(5.9,eyeY); ctx.stroke(); }
  // টুপি/গামছা/হুড
  if (c.key==='hashem'){}
}
function drawAccessory(ctx,c,shY,hipY,pose){
  switch(c.acc){
    case 'bag': ctx.fillStyle=c.accColor; ctx.save(); // কাঁধব্যাগ
      ctx.strokeStyle=c.accColor; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-9,shY); ctx.lineTo(10,hipY-6); ctx.stroke();
      rr(ctx,8,hipY-14,12,14,2); ctx.fill(); ctx.restore(); break;
    case 'medbag': ctx.strokeStyle=c.accColor; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-9,shY); ctx.lineTo(10,hipY-6); ctx.stroke();
      ctx.fillStyle=c.accColor; rr(ctx,8,hipY-14,13,15,2); ctx.fill();
      ctx.strokeStyle='#d84a4a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(14.5,hipY-10); ctx.lineTo(14.5,hipY-3); ctx.moveTo(11,hipY-6.5); ctx.lineTo(18,hipY-6.5); ctx.stroke(); break;
    case 'basket': ctx.fillStyle=c.accColor; rr(ctx,-20,shY+4,12,16,2); ctx.fill(); // পিঠের ঝুড়ি
      ctx.strokeStyle='#6a4e34'; ctx.lineWidth=1; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(-20,shY+6+i*3.5); ctx.lineTo(-8,shY+6+i*3.5); ctx.stroke(); } break;
    case 'cane': ctx.strokeStyle=c.accColor; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(16,shY+10); ctx.lineTo(18,-1); ctx.stroke(); break;
    case 'book': ctx.fillStyle=c.accColor; rr(ctx,10,hipY-2,10,13,1); ctx.fill(); break;
    case 'net': ctx.strokeStyle=c.accColor; ctx.lineWidth=1; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(-16,shY+16,6+i*2,0,Math.PI); ctx.stroke(); } break;
    case 'wrench': ctx.fillStyle=c.accColor; ctx.save(); ctx.translate(16,shY+16); ctx.rotate(0.5);
      rr(ctx,-1.5,-2,3,14,1); ctx.fill(); ctx.beginPath(); ctx.arc(0,-3,3,0,7); ctx.fill(); ctx.restore(); break;
    case 'sash': ctx.fillStyle=c.accColor; rr(ctx,-11,hipY-4,22,4,1); ctx.fill(); break;
    case 'apron': ctx.fillStyle=c.accColor; rr(ctx,-9,hipY+2,18,16,2); ctx.fill(); break;
  }
}
