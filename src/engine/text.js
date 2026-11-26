// বাংলা লেখা আঁকা ও শব্দ অনুযায়ী ভাঙা (word-wrap)।
// বাংলা শব্দের মাঝে স্পেস থাকে, তাই স্পেস ধরে ভাঙলেই যুক্তাক্ষর ঠিক থাকে।
export const FONT = 'NotoBengali';

export async function loadFont() {
  // @font-face দুটো ওজন আগেই লোড করিয়ে নিই যাতে canvas-এ প্রথম ফ্রেমেই ঠিক দেখায়।
  if (!('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`400 40px ${FONT}`, 'বাংলা'),
      document.fonts.load(`700 40px ${FONT}`, 'বাংলা'),
    ]);
    await document.fonts.ready;
  } catch (e) { /* ফন্ট না এলেও খেলা চলবে */ }
}

const BN='০১২৩৪৫৬৭৮৯';
export function toBn(n){ return String(n).replace(/[0-9]/g, d=>BN[+d]); }

export function setFont(ctx, size, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT}, sans-serif`;
}

// একটি লাইনকে maxWidth-এ আঁটানোর জন্য একাধিক লাইনে ভাঙে।
export function wrapText(ctx, text, maxWidth) {
  const out = [];
  const paragraphs = String(text).split('\n');
  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

// বক্সের মধ্যে একাধিক লাইন লেখা; line height সহ। প্রথম লাইনের y ফেরত দেয় পরের ব্যবহারের জন্য।
export function drawWrapped(ctx, text, x, y, maxWidth, size, opts = {}) {
  const weight = opts.weight || 400;
  const lh = opts.lineHeight || size * 1.45;
  const align = opts.align || 'left';
  setFont(ctx, size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const lines = wrapText(ctx, text, maxWidth);
  let yy = y;
  for (const ln of lines) {
    if (opts.shadow) {
      ctx.fillStyle = opts.shadow;
      ctx.fillText(ln, x + (opts.shadowDx || 1.5), yy + (opts.shadowDy || 1.5));
    }
    ctx.fillStyle = opts.color || '#f3e9d6';
    ctx.fillText(ln, x, yy);
    yy += lh;
  }
  return yy;
}

// এক লাইনে কেন্দ্র করে লেখা
export function drawCentered(ctx, text, x, y, size, color = '#f3e9d6', weight = 400, shadow = null) {
  setFont(ctx, size, weight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(text, x + 2, y + 2); }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
