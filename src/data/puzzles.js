// পাজলের বিশুদ্ধ যুক্তি (pure functions) — কোনো ব্রাউজার নির্ভরতা নেই, Node টেস্টে চলে।

// ---- অধ্যায় ২: ঘাটে ছেঁড়া দড়ি ----
// খেলোয়াড় দড়ি পরীক্ষা করে ঠিক করে: কেউ কেটেছে নাকি ঘষা লেগে ছিঁড়েছে।
export const ROPE_OPTIONS = [
  { id:'cut',    label:'কেউ ধারালো কিছু দিয়ে কেটেছে' },
  { id:'frayed', label:'খুঁটিতে ঘষা লেগে ছিঁড়েছে' },
  { id:'rotten', label:'পচে গিয়ে এমনিই ছিঁড়েছে' },
];
export function evalRope(choice){
  if (choice==='frayed') return { ok:true, clue:'ghat_rope',
    msg:'দড়ির মুখ ছেঁড়া-ছেঁড়া, কাটা না। খুঁটির গায়ে ঘষার দাগ — তাড়াহুড়ায় টান লাইগা ছিঁড়ছে।' };
  if (choice==='cut') return { ok:false,
    msg:'কাটলে মুখ অইতো মসৃণ। এইহানে আঁশ ছিঁড়া বাইর অইয়া রইছে — ভালো কইরা দেহো।' };
  return { ok:false, msg:'পচা দড়ির রং অন্যরকম অয়; এইডা তো শক্ত পাকানো দড়ি। আবার দেহো।' };
}

// ---- অধ্যায় ৩: সাক্ষীদের সময় মিলিয়ে সঠিক নদীপথ ----
// তিনটি পথ। সঠিকটি সেচঘরের খাল — কারণ রাত ১০টার জোয়ারে বাকি দুটো অচল।
export const PATHS = [
  { id:'north_char',  name:'উত্তরের চর',      hint:'অগভীর; জোয়ারে ডুবে যায়।' },
  { id:'sechghar_khal', name:'সেচঘরের খাল',   hint:'সরু কিন্তু জোয়ারেও পেরোনো যায়।' },
  { id:'south_baor',  name:'দক্ষিণের বাঁওড়', hint:'জোয়ারে স্রোত উল্টো টানে।' },
];
// সিদ্ধান্তের জন্য দরকারি সূত্র
export const DEDUCTION_NEEDS = ['shop_time','hashem_time','maleka_tide'];
export function evalDeduction(choice, clues){
  const have = (id)=> clues && (clues.has ? clues.has(id) : clues.includes(id));
  if (choice==='sechghar_khal') return { ok:true,
    msg:'সব মিলা দাঁড়াইল: রাইত ১০টার জোয়ারে উত্তরের চর ডোবা, দক্ষিণের বাঁওড়ে উল্টা স্রোত। করিম চাচা গ্যাছে সেচঘরের খাল দিয়া।' };
  if (choice==='north_char') return { ok:false,
    msg:'হাশেম দাদার পরথম কওয়া সইন্ধ্যা ৭টা ধরলে এই পথ মেলে। কিন্তু দোকানি কইল চাচা রওনা দেয় রাইত ৯টায়। একজনের ভুল সময়ে সিদ্ধান্ত লইয়ো না।' };
  return { ok:false,
    msg:'দক্ষিণের বাঁওড়ে জোয়ারের সময় স্রোত উল্টা; আহত মানুষ লইয়া ওইদিকে যাওন যায় না। সময় আর জোয়ার আবার মিলা দেহো।' };
}

// ---- অধ্যায় ৪: দড়ি বাঁধার নিরাপদ খুঁটি ----
export const POSTS = [
  { id:'thin_bamboo', label:'চিকন কাঁচা বাঁশ' },
  { id:'rotten_post', label:'পচা পুরোনো খুঁটি' },
  { id:'thick_post',  label:'মোটা শক্ত খুঁটি' },
];
export function evalPost(choice){
  if (choice==='thick_post') return { ok:true, clue:'bamboo_lesson',
    msg:'মোটা শক্ত খুঁটিতে দড়ি বান্ধলে ভার সয়। অহন নিরাপদে পার অও।' };
  if (choice==='thin_bamboo') return { ok:false, msg:'চিকন বাঁশ টান পড়লেই ব্যাঁকা অইয়া যাইব। শক্ত কিছু খোঁজো।' };
  return { ok:false, msg:'পচা খুঁটি হাত দিলেই নড়ে — ভার দিলে ভাইঙ্গা পড়ব।' };
}

// ---- অধ্যায় ৫: সেচঘরের সংকেতবাতি সংযোগ ----
// দৃশ্যমান চিহ্ন: ব্যাটারির দুই মাথা (লাল=+, কালো=−), সুইচ, বাতি। সঠিক ক্রম ও রং।
// wiring = { batteryToSwitch:boolean(লাল তার), switchToBulb:boolean(কালো তার), switchOn:boolean }
export function evalSignal(w){
  if (!w.batteryToSwitch) return { ok:false, msg:'ব্যাটারির লাল মাথা থিকা তার আগে সুইচে যাক।' };
  if (!w.switchToBulb)    return { ok:false, msg:'সুইচ থিকা বাতিতে তার জোড়া অয় নাই।' };
  if (!w.switchOn)        return { ok:false, msg:'সব জোড়া ঠিক আছে — অহন সুইচ টেপো।' };
  return { ok:true, clue:'signal_reply', msg:'বাতি জ্বইলা উঠল! ওপার থিকা দুইবার আলোর জবাব আইল।' };
}

// ---- অধ্যায় ৭: উদ্ধারের প্রস্তুতি (সব দরকারি জিনিস নেওয়া) ----
export const RESCUE_ITEMS = ['med_bag','dry_cloth','lantern'];
export function evalRescuePrep(carry){
  const set = carry.has ? carry : new Set(carry);
  const missing = RESCUE_ITEMS.filter(i=> !set.has(i));
  if (missing.length===0) return { ok:true, msg:'চিকিৎসা-ব্যাগ, শুকনা কাপড় আর লণ্ঠন — সব লওয়া অইল। অহন আগাও।' };
  const names = { med_bag:'চিকিৎসা-ব্যাগ', dry_cloth:'শুকনা কাপড়', lantern:'লণ্ঠন' };
  return { ok:false, msg:'অহনও বাকি: ' + missing.map(m=>names[m]).join(', ') + '।' };
}
