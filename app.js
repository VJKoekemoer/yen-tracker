'use strict';

/* ============================================================
   Yen Tracker — Japan, 5–24 October 2026
   Local-first: every entry is written to this device immediately.
   Cloud backup is a manual push to Drive via the Android share sheet.
   ============================================================ */

const KEY = 'jpn2026';

/* ---------- reference data ---------- */

const CUR = {
  JPY: { sym: '¥',   dp: 0 },
  SGD: { sym: 'S$',  dp: 2 },
  USD: { sym: '$',   dp: 2 },
  ZAR: { sym: 'R',   dp: 2 }
};

// type 'cash'  -> holds physical notes, has a blended rand cost basis
// type 'card'  -> spends directly, cost = market + that card's FX margin
const WALLETS = [
  { id:'jpy',    label:'Yen cash',    short:'¥ cash',  cur:'JPY', type:'cash' },
  { id:'sgd',    label:'SGD cash',    short:'S$ cash', cur:'SGD', type:'cash' },
  { id:'usd',    label:'USD cash',    short:'$ cash',  cur:'USD', type:'cash' },
  // label = how you pay with it · acct = the account it draws on (statements, withdrawals)
  { id:'fnbd', label:'FNB debit — tap',  short:'FNB tap',    acct:'FNB Premier debit',   cur:null, type:'card', fx:'debitFxPct' },
  { id:'fnbc', label:'FNB credit card',  short:'FNB credit', acct:'FNB credit card',     cur:null, type:'card', fx:'creditFxPct' },
  { id:'mymo', label:'Std Bank MyMo',    short:'MyMo',       acct:'Standard Bank MyMo',  cur:null, type:'card', fx:'mymoFxPct', danger:true }
];
const W = Object.fromEntries(WALLETS.map(w => [w.id, w]));

const CATS = [
  { id:'transport',  label:'Transport',  ic:'🚆' },
  { id:'food',       label:'Food & drink', ic:'🍜' },
  { id:'gifts',      label:'Gifts',      ic:'🎁' },
  { id:'sights',     label:'Sightseeing', ic:'⛩️' },
  { id:'toiletries', label:'Toiletries', ic:'🧴' },
  { id:'other',      label:'Other',      ic:'✨' }
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

// Where you sleep each night, from the route plan
const ITIN = {
  '2026-10-05':'In transit','2026-10-06':'Singapore','2026-10-07':'Kurashiki',
  '2026-10-08':'Hiroshima','2026-10-09':'Matsuyama','2026-10-10':'Takamatsu',
  '2026-10-11':'Takamatsu','2026-10-12':'Kyoto','2026-10-13':'Kyoto',
  '2026-10-14':'Nagoya','2026-10-15':'Kanazawa','2026-10-16':'Kanazawa',
  '2026-10-17':'Matsumoto','2026-10-18':'Nakatsugawa','2026-10-19':'Nagoya',
  '2026-10-20':'Kamakura','2026-10-21':'Tokyo','2026-10-22':'Tokyo',
  '2026-10-23':'Tokyo','2026-10-24':'In transit'
};
const TRIP_START = '2026-10-05', TRIP_END = '2026-10-24';

const CITIES = ['Singapore','Osaka','Okayama','Kurashiki','Takehara','Kure','Hiroshima','Miyajima',
  'Matsuyama','Takamatsu','Kobe','Nara','Uji','Kyoto','Nagoya','Gifu','Gero Onsen','Takayama',
  'Shirakawa-go','Kanazawa','Toyama','Kamikochi','Matsumoto','Nakatsugawa','Magome','Tsumago',
  'Shizuoka','Enoshima','Kamakura','Tokyo','In transit','Other'];

/* ---------- state ---------- */

const DEFAULTS = {
  v: 1,
  tx: [],
  notes: [],
  settings: {
    // foreign units per 1 ZAR — refreshed automatically when online
    rates: { JPY: 8.3, SGD: 0.073, USD: 0.055 },
    ratesAt: null,
    atmFeeZar: 85,      // FNB flat international ATM fee
    debitFxPct: 2.75,   // FNB debit currency conversion margin
    creditFxPct: 2.75,  // FNB credit card margin
    mymoFxPct: 5.0,     // Standard Bank MyMo — emergency only
    giftedUsdFree: true // USD was a gift: counts as R0 out of pocket
  },
  lastBackup: null,
  ui: { wallet:'jpy', cat:'food', city:null }
};

let S = load();
let draft = { amount:'', cat:S.ui.cat, wallet:S.ui.wallet, city:null, date:today() };

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const p = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...p,
             notes: Array.isArray(p.notes) ? p.notes : [],
             settings:{ ...DEFAULTS.settings, ...(p.settings||{}) },
             ui:{ ...DEFAULTS.ui, ...(p.ui||{}) } };
  } catch(e){ return structuredClone(DEFAULTS); }
}
function save(){
  localStorage.setItem(KEY, JSON.stringify(S));
}

/* ---------- helpers ---------- */

const $ = s => document.querySelector(s);
const el = (t,c,h) => { const n=document.createElement(t); if(c)n.className=c; if(h!==undefined)n.innerHTML=h; return n; };
const esc = s => String(s??'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function today(){
  const n = new Date();
  const d = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  // Before the trip starts, default to day 1 so pre-trip testing lands somewhere sensible
  if (d < TRIP_START) return TRIP_START;
  if (d > TRIP_END)   return TRIP_END;
  return d;
}
function dayNo(d){
  const ms = new Date(d+'T00:00:00') - new Date(TRIP_START+'T00:00:00');
  return Math.round(ms/86400000) + 1;
}
function prettyDate(d){
  return new Date(d+'T00:00:00').toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
}
function money(v, cur){
  const c = CUR[cur] || CUR.ZAR;
  return c.sym + Number(v||0).toLocaleString('en-ZA',{minimumFractionDigits:c.dp,maximumFractionDigits:c.dp});
}
const R = v => money(v,'ZAR');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function rate(cur){ return S.settings.rates[cur] || 1; }        // foreign per ZAR
function toZarMarket(amt, cur){ return amt / rate(cur); }        // pure market value

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(()=>{ t.hidden = true; }, 1900);
}

/* ============================================================
   LEDGER — the heart of it.

   A yen is not a yen. Yen drawn at an ATM cost R85 + an FX margin;
   yen from converting gifted dollars cost nothing. So each cash
   wallet carries a blended cost basis, and a spend is charged at
   that wallet's real rate at that moment.

   Every entry stores two numbers:
     zarCost  — what actually left your pocket
     zarValue — what it was worth at market rate
   ============================================================ */

function ledger(){
  const cash = { jpy:{units:0,cost:0}, sgd:{units:0,cost:0}, usd:{units:0,cost:0} };
  const spendByWallet = {};
  let feesPaid = 0;          // ATM fees + FX margin, in rands
  const priced = [];         // every tx with zarCost / zarValue resolved

  // What each card has actually cost its account. A withdrawal and a tap both
  // drain the same FNB account, but only the tap is an expense — so these are
  // tracked separately from spending and never added into the spend totals.
  const card = {};
  WALLETS.filter(w => w.type==='card').forEach(w => card[w.id] = { tap:0, atm:0, fee:0 });

  // Cash spent beyond what was recorded as received — almost always a withdrawal
  // that never got logged. Surfaced rather than silently absorbed.
  const unfunded = {};

  // Order matters: a spend drawn before a top-up is charged at the older,
  // more expensive basis. Date first, then the moment it was entered.
  const rows = [...S.tx].sort((a,b) =>
    a.date.localeCompare(b.date) || (a.at||0) - (b.at||0) || String(a.id).localeCompare(String(b.id)));

  for (const t of rows){
    const p = { ...t };

    if (t.kind === 'fund'){
      const c = cash[t.wallet];
      const market = t.amount / (t.spot || rate(t.cur));
      p.zarCost  = t.zarCost;
      p.zarValue = market;
      p.fee      = Math.max(0, t.zarCost - market);
      feesPaid  += p.fee;
      if (c){ c.units += t.amount; c.cost += t.zarCost; }
      if (t.source === 'atm'){
        const k = card[t.card || 'fnbd'];   // older entries pre-date the card field
        if (k){ k.atm += t.zarCost; k.fee += p.fee; }
      }
    }

    else if (t.kind === 'fx'){
      const from = cash[t.from], to = cash[t.to];
      const avail = from ? Math.max(0, from.units) : 0;
      const basis = avail > 0 ? from.cost / avail : 0;
      const moved = basis * Math.min(t.fromAmount, avail);
      if (from){ from.units -= t.fromAmount; from.cost = Math.max(0, from.cost - moved); }
      if (to)  { to.units   += t.toAmount;   to.cost   += moved; }
      p.zarCost  = 0;
      p.zarValue = 0;
    }

    else { // spend
      const w = W[t.wallet];
      const market = t.amount / (t.spot || rate(t.cur));
      p.zarValue = market;

      if (w && w.type === 'cash'){
        const c = cash[t.wallet];
        const avail = Math.max(0, c.units);
        const basis = avail > 0 ? c.cost / avail : 0;
        const covered = Math.min(t.amount, avail);
        const short   = t.amount - covered;
        // Cash spent that was never recorded as received still cost real money —
        // value the shortfall at market rather than pretending it was free.
        p.zarCost  = covered * basis + short / (t.spot || rate(t.cur));
        p.unfunded = short;
        // Let the balance go negative. That IS the signal something wasn't logged;
        // clamping it to zero hides the problem.
        c.units -= t.amount;
        c.cost   = Math.max(0, c.cost - covered * basis);
        if (short > 0) unfunded[t.wallet] = (unfunded[t.wallet] || 0) + short;
      } else {
        const pct = w ? (S.settings[w.fx] || 0) : 0;
        p.zarCost = market * (1 + pct/100);
        feesPaid += p.zarCost - market;
        if (card[t.wallet]){
          card[t.wallet].tap += p.zarCost;
          card[t.wallet].fee += p.zarCost - market;
        }
      }
      spendByWallet[t.wallet] = (spendByWallet[t.wallet]||0) + p.zarCost;
    }
    priced.push(p);
  }

  return { cash, priced, feesPaid, spendByWallet, card, unfunded };
}

/* ---------- daily burn + runway ---------- */

function burn(walletId, days = 3){
  const L = ledger();
  const spends = L.priced.filter(t => t.kind==='spend' && t.wallet===walletId);
  if (!spends.length) return 0;
  const dates = [...new Set(spends.map(t=>t.date))].sort().slice(-days);
  const total = spends.filter(t=>dates.includes(t.date)).reduce((a,t)=>a+t.amount,0);
  return total / dates.length;
}

function daysLeft(){
  const d = today();
  return Math.max(0, Math.round((new Date(TRIP_END) - new Date(d))/86400000));
}

/* ============================================================
   VIEW: ADD SPEND
   ============================================================ */

function currentCur(){
  const w = W[draft.wallet];
  if (w.type === 'cash') return w.cur;
  // Cards: currency follows where you are
  return (draft.city || ITIN[draft.date]) === 'Singapore' ? 'SGD' : 'JPY';
}

function renderAdd(){
  const d = draft.date;
  $('#addDayLabel').textContent = ITIN[d] ? `Day ${dayNo(d)} · ${ITIN[d]}` : `Day ${dayNo(d)}`;
  $('#addDateLabel').textContent = prettyDate(d);
  $('#addCityBtn').textContent = draft.city || ITIN[d] || 'Set city';

  const cur = currentCur();
  $('#addCur').textContent = CUR[cur].sym;
  const amt = parseFloat(draft.amount||'0') || 0;
  $('#addAmount').textContent = draft.amount === '' ? '0'
    : (draft.amount.endsWith('.') ? draft.amount : amt.toLocaleString('en-ZA',{maximumFractionDigits:2}));

  // live rand cost using the same rules the ledger will apply
  let zarTxt = '';
  if (amt > 0){
    const w = W[draft.wallet];
    const market = toZarMarket(amt, cur);
    if (w.type === 'cash'){
      const c = ledger().cash[w.id];
      const held  = Math.max(0, c.units);
      const basis = held > 0 ? c.cost/held : 0;
      if (held <= 0){
        zarTxt = `${R(market)} at market rate · nothing recorded in your ${w.short} yet`;
      } else if (amt > held){
        // part comes from the wallet, the rest is money we've no record of
        const cost = held*basis + (amt-held)/rate(cur);
        zarTxt = `${R(cost)} · ⚠ ${money(amt-held,cur)} more than you're holding`;
      } else if (basis <= 0){
        zarTxt = `${R(market)} of value · gifted, so costs you nothing`;
      } else {
        zarTxt = `${R(basis*amt)} · from your ${w.short}`;
      }
    } else {
      const pct = S.settings[w.fx] || 0;
      zarTxt = `${R(market*(1+pct/100))} · incl. ${pct}% card fee`;
    }
  }
  $('#addZar').textContent = zarTxt;

  $('#saveSpend').disabled = !(amt > 0);
}

function buildAddChrome(){
  const cw = $('#addCats'); cw.innerHTML = '';
  CATS.forEach(c => {
    const b = el('button', draft.cat===c.id?'on':'', `<b>${c.ic}</b>${esc(c.label)}`);
    b.type='button';
    b.onclick = () => { draft.cat=c.id; S.ui.cat=c.id; save(); buildAddChrome(); renderAdd(); };
    cw.appendChild(b);
  });

  const ww = $('#addWallets'); ww.innerHTML = '';
  const L = ledger();
  WALLETS.forEach(w => {
    let label = w.short;
    if (w.type === 'cash'){
      const c = L.cash[w.id];
      label = `${w.short} · ${money(c.units, w.cur)}`;
    }
    const b = el('button', (draft.wallet===w.id?'on ':'') + (w.danger?'danger':''), esc(label));
    b.type='button';
    b.onclick = () => {
      draft.wallet=w.id; S.ui.wallet=w.id; save();
      if (CUR[currentCur()].dp === 0) draft.amount = draft.amount.split('.')[0];
      if (w.danger) toast('MyMo is your emergency card — fees are steep');
      buildAddChrome(); renderAdd();
    };
    ww.appendChild(b);
  });
}

function keyPress(k){
  if (k === 'del') draft.amount = draft.amount.slice(0,-1);
  else if (k === 'dot'){
    if (CUR[currentCur()].dp === 0) return;      // yen has no cents
    if (!draft.amount.includes('.')) draft.amount = (draft.amount||'0') + '.';
  } else {
    const dp = draft.amount.split('.')[1];
    if (dp && dp.length >= 2) return;
    if (draft.amount === '0') draft.amount = k; else draft.amount += k;
  }
  renderAdd();
}

function saveSpend(){
  const amt = parseFloat(draft.amount);
  if (!(amt > 0)) return;
  const cur = currentCur();
  S.tx.push({
    id: uid(), kind:'spend', date: draft.date, at: Date.now(),
    wallet: draft.wallet, cur, amount: amt,
    cat: draft.cat,
    city: draft.city || ITIN[draft.date] || '',
    note: $('#addNote').value.trim(),
    spot: rate(cur)
  });
  save();
  draft.amount = ''; $('#addNote').value = '';
  buildAddChrome(); renderAdd();
  toast(`${money(amt,cur)} logged`);
}

/* ============================================================
   VIEW: CASH
   ============================================================ */

function renderCash(){
  const L = ledger();

  // spent-more-than-recorded warning
  const shorts = Object.entries(L.unfunded).filter(([,v]) => v > 0);
  const al = $('#shortAlert');
  al.hidden = shorts.length === 0;
  if (shorts.length){
    const bits = shorts.map(([id,v]) => `<b>${money(v, W[id].cur)}</b> of ${W[id].label.toLowerCase()}`);
    al.innerHTML = `You've spent ${bits.join(' and ')} more than you've recorded receiving. ` +
      `Most likely an ATM withdrawal or an exchange that didn't get logged — add it and these ` +
      `figures will correct themselves. Until then that cash is being valued at the market rate.`;
  }

  // runway
  const yen = L.cash.jpy.units;
  const perDay = burn('jpy');
  const rw = $('#runway');
  if (perDay > 0 && yen > 0){
    const d = yen / perDay;
    const left = daysLeft();
    rw.className = 'runway';
    rw.innerHTML = `You're spending about <b>${money(perDay,'JPY')}</b> of yen cash a day. ` +
      `<b>${money(yen,'JPY')}</b> in hand lasts roughly <b>${d.toFixed(1)} days</b>` +
      (d < left ? ` — you'll want another withdrawal before the trip ends.` : ` — that should see you through.`);
  } else if (yen > 0){
    rw.className = 'runway';
    rw.innerHTML = `<b>${money(yen,'JPY')}</b> in hand. Log a few spends and this will start predicting when you next need an ATM.`;
  } else {
    rw.className = 'runway hide';
  }

  // wallet cards
  const wc = $('#walletCards'); wc.innerHTML = '';
  WALLETS.forEach(w => {
    const card = el('div','wcard' + (w.danger?' danger':''));
    if (w.type === 'cash'){
      const c = L.cash[w.id];
      const basis = c.units > 0 ? c.cost/c.units : 0;
      if (c.units < 0) card.classList.add('short');
      else if (c.units === 0) card.classList.add('empty');
      // Yen are worth fractions of a rand, so quote the cost per 100 rather than
      // per 1, otherwise it rounds to a meaningless "R0,07".
      let costLine;
      if (c.units < 0)       costLine = `Spent ${money(-c.units, w.cur)} more than you've recorded getting`;
      else if (c.units === 0) costLine = 'Nothing in hand';
      else if (basis <= 0)   costLine = 'A gift — cost you nothing';
      else if (basis < 0.5)  costLine = `Cost you ${R(basis*100)} per ${CUR[w.cur].sym}100`;
      else                   costLine = `Cost you ${R(basis)} per ${CUR[w.cur].sym}1`;
      card.innerHTML =
        `<div class="top"><span class="nm">${esc(w.label)}</span>` +
        `<span class="bal">${money(c.units, w.cur)}</span></div>` +
        `<div class="sub"><span>${costLine}</span>` +
        `<span>${c.cost>0 ? `${R(c.cost)} tied up` : ''}</span></div>`;
    } else {
      const k = L.card[w.id] || { tap:0, atm:0, fee:0 };
      const total = k.tap + k.atm;
      const pct = S.settings[w.fx] || 0;
      if (total <= 0) card.classList.add('empty');
      // Tapped + cash drawn = what this account has actually paid out. Only the
      // tapped half is spending; the cash half shows up as spending as you use it.
      const parts = [];
      if (k.tap > 0) parts.push(`Tapped ${R(k.tap)}`);
      if (k.atm > 0) parts.push(`Cash drawn ${R(k.atm)}`);
      card.innerHTML =
        `<div class="top"><span class="nm">${esc(w.acct || w.label)}</span>` +
        `<span class="bal">${R(total)}</span></div>` +
        `<div class="sub"><span>${parts.length ? parts.join(' · ') : `${pct}% conversion fee`}` +
        `${w.danger && total<=0 ? ' · emergency only' : ''}</span>` +
        `<span>${total>0 ? 'off this account' : ''}</span></div>`;
    }
    wc.appendChild(card);
  });

  renderMoneyIn(L);

  // fee report
  const spendCost = L.priced.filter(t=>t.kind==='spend').reduce((a,t)=>a+t.zarCost,0);
  const spendVal  = L.priced.filter(t=>t.kind==='spend').reduce((a,t)=>a+t.zarValue,0);
  const atm = L.priced.filter(t=>t.kind==='fund').reduce((a,t)=>a+(t.fee||0),0);
  const cardFee = L.priced.filter(t=>t.kind==='spend' && W[t.wallet]?.type==='card')
                          .reduce((a,t)=>a+(t.zarCost-t.zarValue),0);
  $('#feeBox').innerHTML =
    `<div class="fr"><span>Spent, at market rate</span><b>${R(spendVal)}</b></div>` +
    `<div class="fr"><span>ATM fees &amp; cash FX margin</span><b>${R(atm)}</b></div>` +
    `<div class="fr"><span>Card conversion fees</span><b>${R(cardFee)}</b></div>` +
    `<div class="fr big"><span>Cost of getting at your money</span><b>${R(atm+cardFee)}</b></div>`;
}

/* ---------- money-in history ----------
   Every event that put cash in your hand, dated, so it can be laid alongside
   a bank statement months later. Spending lives on the Data tab; this is only
   the money coming in.                                                        */

function renderMoneyIn(L){
  const rows = L.priced
    .filter(t => t.kind === 'fund' || t.kind === 'fx')
    .sort((a,b) => b.date.localeCompare(a.date) || (b.at||0) - (a.at||0));

  $('#moneyInHd').hidden = rows.length === 0;
  $('#moneyInList').innerHTML = rows.map(t => {
    const when = `${prettyDate(t.date)} · Day ${dayNo(t.date)}`;

    if (t.kind === 'fx'){
      return `<div class="tx"><div class="ic">🔁</div>
        <div class="mid">
          <div class="t1">Changed ${money(t.fromAmount, W[t.from]?.cur)} into ${money(t.toAmount, W[t.to]?.cur)}</div>
          <div class="t2">${when} · rate ${(t.toAmount/t.fromAmount).toFixed(2)}</div>
        </div>
        <div class="rt"><div class="a1">${money(t.toAmount, W[t.to]?.cur)}</div>
        <div class="a2">−${money(t.fromAmount, W[t.from]?.cur)}</div></div></div>`;
    }

    const label = t.source === 'atm'  ? `ATM withdrawal · ${W[t.card||'fnbd']?.acct || 'card'}`
                : t.source === 'gift' ? 'Gifted cash'
                : 'Cash bought before leaving';
    return `<div class="tx in"><div class="ic">${t.source==='atm'?'🏧':'💵'}</div>
      <div class="mid">
        <div class="t1">${esc(label)}</div>
        <div class="t2">${when}${t.fee > 0 ? ` · ${R(t.fee)} in fees` : ''}</div>
      </div>
      <div class="rt"><div class="a1">+${money(t.amount, t.cur)}</div>
      <div class="a2">${t.zarCost > 0 ? R(t.zarCost) : 'free'}</div></div></div>`;
  }).join('');
}

/* ---------- ATM / exchange / cash-in dialogs ---------- */

function dlgAtm(){
  const s = S.settings;
  modal('ATM withdrawal', `
    <div class="f">
      <label>Which card?</label>
      <select id="aCard">
        <option value="fnbd">FNB Premier debit</option>
        <option value="mymo">Standard Bank MyMo (emergency)</option>
      </select>
    </div>
    <div class="f2">
      <div class="f"><label>Currency</label>
        <select id="aCur"><option value="JPY">Japanese yen</option><option value="SGD">Singapore dollars</option></select>
      </div>
      <div class="f"><label>Cash received</label>
        <input type="number" id="aAmt" inputmode="numeric" placeholder="30000">
      </div>
    </div>
    <div class="f">
      <label>Rands taken off your account <span style="color:var(--faint);font-weight:400">— if you know it</span></label>
      <input type="number" id="aZar" inputmode="decimal" placeholder="leave blank to estimate">
      <div class="hint">Check your banking app if you can. An exact figure makes every rand total in this app exact too.</div>
    </div>
    <div class="f"><label>Date</label><input type="date" id="aDate" value="${draft.date}" min="${TRIP_START}" max="${TRIP_END}"></div>
    <div class="calc" id="aCalc"></div>
    <button class="mbtn" id="aGo" type="button">Record withdrawal</button>
  `);

  const recalc = () => {
    const cur = $('#aCur').value, amt = parseFloat($('#aAmt').value)||0;
    const pct = s[W[$('#aCard').value].fx];
    const market = toZarMarket(amt, cur);
    const est = market*(1+pct/100) + s.atmFeeZar;
    const zar = parseFloat($('#aZar').value) || est;
    const fee = Math.max(0, zar - market);
    $('#aCalc').innerHTML = amt > 0
      ? `Market value <b>${R(market)}</b><br>You pay <b>${R(zar)}</b>` +
        `${$('#aZar').value ? '' : ` <span style="color:var(--faint)">(estimated: ${pct}% margin + ${R(s.atmFeeZar)} fee)</span>`}` +
        `<br>Cost of this cash: <b class="hi">${R(fee)}</b> — that's ${(fee/market*100).toFixed(1)}%` +
        `<br>Each ${CUR[cur].sym}1 in your pocket cost <b>${R(zar/amt)}</b>`
      : 'Enter the amount the machine gave you.';
  };
  ['aCard','aCur','aAmt','aZar'].forEach(i => $('#'+i).oninput = recalc);
  $('#aCard').onchange = recalc; $('#aCur').onchange = recalc;
  recalc();

  $('#aGo').onclick = () => {
    const cur = $('#aCur').value, amt = parseFloat($('#aAmt').value)||0;
    if (!(amt>0)) return toast('How much cash came out?');
    const card = $('#aCard').value;
    const pct = s[W[card].fx];
    const market = toZarMarket(amt, cur);
    const zar = parseFloat($('#aZar').value) || (market*(1+pct/100) + s.atmFeeZar);
    S.tx.push({ id:uid(), kind:'fund', date:$('#aDate').value, at:Date.now(),
                wallet: cur==='JPY'?'jpy':'sgd', cur, amount:amt,
                zarCost: zar, spot: rate(cur), source:'atm', card });
    save(); closeModal(); renderCash(); buildAddChrome();
    toast(`${money(amt,cur)} added`);
  };
}

function dlgFx(){
  const L = ledger();
  modal('Change cash', `
    <p class="hint" style="margin:0 0 14px">Only if you actually hand cash over a counter. Dollars you spend
      as dollars don't belong here — log those on the Add screen against <b>$ cash</b>.</p>
    <div class="f2">
      <div class="f"><label>From</label>
        <select id="xFrom">
          <option value="usd">USD cash — ${money(L.cash.usd.units,'USD')} in hand</option>
          <option value="sgd">SGD cash — ${money(L.cash.sgd.units,'SGD')} in hand</option>
          <option value="jpy">Yen cash — ${money(L.cash.jpy.units,'JPY')} in hand</option>
        </select>
      </div>
      <div class="f"><label>To</label>
        <select id="xTo">
          <option value="jpy">Yen cash</option>
          <option value="sgd">SGD cash</option>
          <option value="usd">USD cash</option>
        </select>
      </div>
    </div>
    <div class="f2">
      <div class="f"><label>Handed over</label><input type="number" id="xFrA" inputmode="decimal" placeholder="200"></div>
      <div class="f"><label id="xToLbl">Yen received</label><input type="number" id="xToA" inputmode="decimal" placeholder="29000"></div>
    </div>
    <div class="f"><label>Date</label><input type="date" id="xDate" value="${draft.date}" min="${TRIP_START}" max="${TRIP_END}"></div>
    <div class="calc" id="xCalc"></div>
    <button class="mbtn" id="xGo" type="button">Record exchange</button>
  `);

  const recalc = () => {
    const fromId = $('#xFrom').value, toId = $('#xTo').value;
    const fCur = W[fromId].cur, tCur = W[toId].cur;
    $('#xToLbl').textContent = `${tCur === 'JPY' ? 'Yen' : tCur === 'SGD' ? 'Singapore dollars' : 'US dollars'} received`;

    if (fromId === toId)
      return $('#xCalc').innerHTML = '<b class="hi">Pick two different currencies.</b>';

    const f = parseFloat($('#xFrA').value)||0, t = parseFloat($('#xToA').value)||0;
    const held = ledger().cash[fromId].units;
    if (!(f>0 && t>0))
      return $('#xCalc').innerHTML = `Enter both sides and I'll tell you what rate you were given. You're holding <b>${money(held,fCur)}</b>.`;

    const got = t/f, mkt = rate(tCur)/rate(fCur);
    const lossPct = (1 - got/mkt) * 100;
    $('#xCalc').innerHTML =
      `You got <b>${got.toFixed(tCur==='JPY'?2:4)} ${tCur}</b> per ${CUR[fCur].sym}1. Market is about <b>${mkt.toFixed(tCur==='JPY'?2:4)}</b>.<br>` +
      (lossPct > 0.5
        ? `That counter took roughly <b class="hi">${lossPct.toFixed(1)}%</b> — worth shopping around if you've more to change.`
        : `<b style="color:var(--good)">Good rate.</b>`) +
      (f > held ? `<br><b class="hi">⚠ That's more than the ${money(held,fCur)} you're holding.</b>` : '');
  };
  ['xFrA','xToA'].forEach(i => $('#'+i).oninput = recalc);
  $('#xFrom').onchange = recalc;
  $('#xTo').onchange = recalc;
  recalc();

  $('#xGo').onclick = () => {
    const f = parseFloat($('#xFrA').value)||0, t = parseFloat($('#xToA').value)||0;
    const fromId = $('#xFrom').value, toId = $('#xTo').value;
    if (fromId === toId) return toast('Pick two different currencies');
    if (!(f>0 && t>0)) return toast('Both amounts, please');
    S.tx.push({ id:uid(), kind:'fx', date:$('#xDate').value, at:Date.now(),
                from:fromId, fromAmount:f, to:toId, toAmount:t });
    save(); closeModal(); renderCash(); buildAddChrome();
    toast('Exchange recorded');
  };
}

function dlgCashIn(){
  modal('Cash on hand', `
    <div class="f2">
      <div class="f"><label>Currency</label>
        <select id="cCur"><option value="USD">US dollars</option><option value="JPY">Japanese yen</option><option value="SGD">Singapore dollars</option></select>
      </div>
      <div class="f"><label>Amount</label><input type="number" id="cAmt" inputmode="decimal" placeholder="500"></div>
    </div>
    <div class="f">
      <label>Where did it come from?</label>
      <select id="cSrc">
        <option value="gift">A gift — cost me nothing</option>
        <option value="bought">I bought it before leaving</option>
      </select>
      <div class="hint">Gifted cash still counts towards what you've spent, but is kept out of "money out of your own pocket".</div>
    </div>
    <div class="f" id="cZarWrap" hidden>
      <label>What you paid for it (rands)</label>
      <input type="number" id="cZar" inputmode="decimal" placeholder="9500">
    </div>
    <div class="f"><label>Date</label><input type="date" id="cDate" value="${TRIP_START}" min="${TRIP_START}" max="${TRIP_END}"></div>
    <button class="mbtn" id="cGo" type="button">Add to wallet</button>
  `);

  $('#cSrc').onchange = e => { $('#cZarWrap').hidden = e.target.value !== 'bought'; };

  $('#cGo').onclick = () => {
    const cur = $('#cCur').value, amt = parseFloat($('#cAmt').value)||0;
    if (!(amt>0)) return toast('How much?');
    const gift = $('#cSrc').value === 'gift';
    const zar = gift ? 0 : (parseFloat($('#cZar').value) || toZarMarket(amt,cur));
    S.tx.push({ id:uid(), kind:'fund', date:$('#cDate').value, at:Date.now(),
                wallet: cur==='JPY'?'jpy':cur==='SGD'?'sgd':'usd', cur, amount:amt,
                zarCost: zar, spot: rate(cur), source: gift?'gift':'bought' });
    save(); closeModal(); renderCash(); buildAddChrome();
    toast(`${money(amt,cur)} added`);
  };
}

/* ============================================================
   VIEW: STATS
   ============================================================ */

let seg = 'cat';

function renderStats(){
  const L = ledger();
  const spends = L.priced.filter(t => t.kind === 'spend');
  const cost = spends.reduce((a,t)=>a+t.zarCost,0);
  const val  = spends.reduce((a,t)=>a+t.zarValue,0);
  const ownPocket = cost;  // cost basis already excludes gifted cash
  const days = new Set(spends.map(t=>t.date)).size || 1;

  $('#statTotals').innerHTML =
    `<div><div class="lbl">Spent so far</div><div class="val">${R(val)}</div></div>` +
    `<div><div class="lbl">Out of your pocket</div><div class="val">${R(ownPocket)}</div></div>` +
    `<div><div class="lbl">Per day</div><div class="val">${R(val/days)}</div></div>` +
    `<div><div class="lbl">Entries</div><div class="val">${spends.length}</div></div>`;

  const body = $('#statBody');
  if (!spends.length){
    body.innerHTML = `<div class="empty-msg">Nothing logged yet.<br>Head to the Add tab and record your first spend.</div>`;
    return;
  }

  const groups = {};
  for (const t of spends){
    let k, sub;
    if (seg==='cat')       { k = CAT[t.cat]?.label || t.cat; sub = CAT[t.cat]?.ic || ''; }
    else if (seg==='day')  { k = t.date; }
    else if (seg==='city') { k = t.city || 'Unrecorded'; }
    else                   { k = W[t.wallet]?.label || t.wallet; }
    groups[k] = groups[k] || { val:0, n:0, sub };
    groups[k].val += t.zarValue;
    groups[k].n++;
  }

  let entries = Object.entries(groups);
  if (seg === 'day') entries.sort((a,b)=>a[0].localeCompare(b[0]));
  else entries.sort((a,b)=>b[1].val - a[1].val);

  const max = Math.max(...entries.map(e=>e[1].val));
  body.innerHTML = entries.map(([k,g]) => {
    const label = seg==='day' ? `Day ${dayNo(k)} · ${prettyDate(k)}` : `${g.sub?g.sub+' ':''}${esc(k)}`;
    const pct = (g.val/val*100);
    return `<div class="bar">
      <div class="bl"><span>${label}</span><b>${R(g.val)}</b></div>
      <div class="bt"><div class="bf" style="width:${(g.val/max*100).toFixed(1)}%"></div></div>
      <div class="sub">${g.n} ${g.n===1?'entry':'entries'} · ${pct.toFixed(0)}% of spend</div>
    </div>`;
  }).join('');
}

/* ============================================================
   VIEW: NOTES
   The escape hatch. Anything the app has no field for — a cost to
   split later, a receipt to keep, an ATM that refused the card.
   ============================================================ */

let editingNote = null;

function renderNotes(){
  const d = draft.date;
  $('#noteCityBtn').textContent = draft.city || ITIN[d] || 'Set city';
  $('#addNoteBtn').disabled = !$('#noteText').value.trim();

  const rows = [...S.notes].sort((a,b) => b.date.localeCompare(a.date) || (b.at||0) - (a.at||0));
  $('#notesHd').hidden = rows.length === 0;

  $('#notesList').innerHTML = rows.map(n => {
    const when = `${prettyDate(n.date)} · Day ${dayNo(n.date)}${n.city ? ' · ' + esc(n.city) : ''}`;
    if (editingNote === n.id){
      return `<div class="note"><div class="nhd"><span class="nwhen">${when}</span></div>
        <textarea data-edit="${n.id}">${esc(n.text)}</textarea>
        <div class="nact" style="justify-content:flex-end;margin-top:8px">
          <button data-cancel="${n.id}">Cancel</button>
          <button data-save="${n.id}" style="color:var(--accent-t);font-weight:700">Save</button>
        </div></div>`;
    }
    return `<div class="note"><div class="nhd"><span class="nwhen">${when}</span>
      <span class="nact"><button data-edit-note="${n.id}" aria-label="Edit">✎</button>
      <button data-del-note="${n.id}" aria-label="Delete">✕</button></span></div>
      <div class="ntxt">${esc(n.text)}</div></div>`;
  }).join('');

  const L = $('#notesList');
  L.querySelectorAll('[data-edit-note]').forEach(b =>
    b.onclick = () => { editingNote = b.dataset.editNote; renderNotes();
                        L.querySelector('[data-edit]')?.focus(); });
  L.querySelectorAll('[data-cancel]').forEach(b =>
    b.onclick = () => { editingNote = null; renderNotes(); });
  L.querySelectorAll('[data-save]').forEach(b =>
    b.onclick = () => {
      const t = L.querySelector(`[data-edit="${b.dataset.save}"]`).value.trim();
      const n = S.notes.find(x => x.id === b.dataset.save);
      if (n && t){ n.text = t; save(); toast('Note updated'); }
      editingNote = null; renderNotes();
    });
  L.querySelectorAll('[data-del-note]').forEach(b =>
    b.onclick = () => {
      if (!confirm('Delete this note?')) return;
      S.notes = S.notes.filter(n => n.id !== b.dataset.delNote);
      save(); renderNotes(); toast('Deleted');
    });
}

function addNote(){
  const t = $('#noteText').value.trim();
  if (!t) return;
  S.notes.push({ id:uid(), at:Date.now(), date:draft.date,
                 city: draft.city || ITIN[draft.date] || '', text:t });
  save();
  $('#noteText').value = '';
  renderNotes();
  toast('Note saved');
}

/* ============================================================
   VIEW: DATA
   ============================================================ */

function renderData(){
  // backup status
  const bb = $('#backupBox');
  const last = S.lastBackup ? new Date(S.lastBackup) : null;
  const ageDays = last ? (Date.now()-last)/86400000 : 999;
  bb.className = 'backup-box' + (ageDays > 2 ? ' stale' : '');
  bb.innerHTML = last
    ? `Last backed up <b>${last.toLocaleString('en-ZA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</b>` +
      (ageDays > 2 ? ` — that's ${Math.floor(ageDays)} days ago. Worth doing again next time you have signal.`
                   : ` · ${S.tx.length} entries safe.`)
    : `<b>Not backed up yet.</b> Everything lives on this phone only. Tap "Back up to Drive" whenever you have a connection — it takes two seconds.`;

  // transaction list, newest first
  const L = ledger();
  const list = $('#txList');
  if (!S.tx.length){
    list.innerHTML = `<div class="empty-msg">No entries yet.</div>`;
    return;
  }
  const rows = [...L.priced].sort((a,b) =>
    b.date.localeCompare(a.date) || (b.at||0) - (a.at||0));
  const byDay = {};
  rows.forEach(t => (byDay[t.date] = byDay[t.date] || []).push(t));

  list.innerHTML = Object.entries(byDay).sort((a,b)=>b[0].localeCompare(a[0])).map(([d,ts]) => {
    const dayTotal = ts.filter(t=>t.kind==='spend').reduce((a,t)=>a+t.zarValue,0);
    return `<div class="txday"><span>Day ${dayNo(d)} · ${prettyDate(d)}</span><span>${dayTotal?R(dayTotal):''}</span></div>` +
      ts.map(t => {
        if (t.kind === 'fund'){
          const w = W[t.wallet];
          return `<div class="tx in"><div class="ic">${t.source==='atm'?'🏧':'💵'}</div>
            <div class="mid"><div class="t1">${t.source==='atm'?'ATM withdrawal':t.source==='gift'?'Gifted cash':'Cash brought along'}</div>
            <div class="t2">into ${esc(w?.label||'')}${t.zarCost?` · cost ${R(t.zarCost)}`:' · free'}</div></div>
            <div class="rt"><div class="a1">+${money(t.amount,t.cur)}</div><div class="a2">${t.fee>0?`${R(t.fee)} fee`:''}</div></div>
            <button class="del" data-del="${t.id}" type="button">✕</button></div>`;
        }
        if (t.kind === 'fx'){
          return `<div class="tx"><div class="ic">🔁</div>
            <div class="mid"><div class="t1">Changed cash</div>
            <div class="t2">${esc(W[t.from]?.label)} → ${esc(W[t.to]?.label)}</div></div>
            <div class="rt"><div class="a1">${money(t.toAmount,W[t.to]?.cur)}</div>
            <div class="a2">−${money(t.fromAmount,W[t.from]?.cur)}</div></div>
            <button class="del" data-del="${t.id}" type="button">✕</button></div>`;
        }
        const c = CAT[t.cat];
        return `<div class="tx"><div class="ic">${c?.ic||'✨'}</div>
          <div class="mid"><div class="t1">${esc(t.note || c?.label || 'Spend')}</div>
          <div class="t2">${esc(t.city||'')}${t.city?' · ':''}${esc(W[t.wallet]?.short||'')}</div></div>
          <div class="rt"><div class="a1">${money(t.amount,t.cur)}</div><div class="a2">${R(t.zarValue)}</div></div>
          <button class="del" data-del="${t.id}" type="button">✕</button></div>`;
      }).join('');
  }).join('');

  list.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => {
      if (!confirm('Delete this entry?')) return;
      S.tx = S.tx.filter(t => t.id !== b.dataset.del);
      save(); renderData(); toast('Deleted');
    };
  });
}

/* ---------- settings ---------- */

function dlgSettings(){
  const s = S.settings;
  modal('Rates &amp; fees', `
    <div class="calc" id="rateStatus"></div>
    <button class="mbtn ghost" id="sFetch" type="button" style="margin-bottom:16px">Refresh rates from the internet</button>

    <h2 class="sec" style="margin-top:0">Exchange rates — per R1</h2>
    <div class="f2">
      <div class="f"><label>Japanese yen</label><input type="number" step="0.01" id="sJPY" value="${s.rates.JPY}"></div>
      <div class="f"><label>Singapore $</label><input type="number" step="0.0001" id="sSGD" value="${s.rates.SGD}"></div>
    </div>
    <div class="f"><label>US dollars</label><input type="number" step="0.0001" id="sUSD" value="${s.rates.USD}"></div>

    <h2 class="sec">Your bank's fees</h2>
    <div class="f"><label>Flat ATM fee per withdrawal (rands)</label><input type="number" id="sAtm" value="${s.atmFeeZar}">
      <div class="hint">Same fee whether you draw ¥5,000 or ¥50,000 — which is exactly why fewer, larger withdrawals win.</div></div>
    <div class="f2">
      <div class="f"><label>FNB debit margin %</label><input type="number" step="0.05" id="sD" value="${s.debitFxPct}"></div>
      <div class="f"><label>FNB credit margin %</label><input type="number" step="0.05" id="sC" value="${s.creditFxPct}"></div>
    </div>
    <div class="f"><label>MyMo margin %</label><input type="number" step="0.05" id="sM" value="${s.mymoFxPct}">
      <div class="hint">Confirm these three with FNB and Standard Bank before you fly — the app's rand totals are only as good as these numbers.</div></div>

    <button class="mbtn" id="sGo" type="button">Save</button>
    <button class="mbtn ghost" id="sWipe" type="button" style="margin-top:10px;color:var(--accent-t)">Clear all entries and start fresh</button>
    <div class="hint" style="margin-top:8px">Use this once you've finished playing and the trip actually starts. Back up first if you want to keep anything.</div>
  `);

  const status = () => {
    $('#rateStatus').innerHTML = s.ratesAt
      ? `Rates last refreshed <b>${new Date(s.ratesAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</b>. They're stored on the phone, so everything keeps working offline.`
      : `<b class="hi">Using rough starting rates.</b> Refresh once before you fly, and they'll be cached for the whole trip.`;
  };
  status();

  $('#sFetch').onclick = async () => {
    $('#sFetch').textContent = 'Fetching…';
    const ok = await fetchRates();
    if (ok){ $('#sJPY').value=s.rates.JPY; $('#sSGD').value=s.rates.SGD; $('#sUSD').value=s.rates.USD; status(); toast('Rates updated'); }
    else toast('No connection — rates unchanged');
    $('#sFetch').textContent = 'Refresh rates from the internet';
  };

  $('#sWipe').onclick = () => {
    if (!confirm(`Delete all ${S.tx.length} entries and ${S.notes.length} notes? ` +
                 `Your rates and fee settings stay put.`)) return;
    S.tx = []; S.notes = []; S.lastBackup = null; save(); closeModal(); renderAll(); show('add');
    toast('Cleared — ready for the trip');
  };

  $('#sGo').onclick = () => {
    s.rates.JPY = parseFloat($('#sJPY').value)||s.rates.JPY;
    s.rates.SGD = parseFloat($('#sSGD').value)||s.rates.SGD;
    s.rates.USD = parseFloat($('#sUSD').value)||s.rates.USD;
    s.atmFeeZar = parseFloat($('#sAtm').value)||0;
    s.debitFxPct = parseFloat($('#sD').value)||0;
    s.creditFxPct = parseFloat($('#sC').value)||0;
    s.mymoFxPct = parseFloat($('#sM').value)||0;
    save(); closeModal(); renderAll(); toast('Saved');
  };
}

async function fetchRates(){
  try{
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=ZAR&symbols=JPY,SGD,USD',{cache:'no-store'});
    if (!r.ok) return false;
    const j = await r.json();
    if (!j.rates?.JPY) return false;
    S.settings.rates = { JPY:j.rates.JPY, SGD:j.rates.SGD, USD:j.rates.USD };
    S.settings.ratesAt = Date.now();
    save();
    return true;
  } catch(e){ return false; }
}

/* ---------- backup / export ---------- */

function backupJson(){
  return JSON.stringify({ app:'yen-tracker', v:S.v, exported:new Date().toISOString(),
                          tx:S.tx, notes:S.notes, settings:S.settings }, null, 2);
}

function csv(){
  const L = ledger();
  const head = ['Date','Day','City','Type','Category','Note','Wallet / card','Currency','Amount','Rand value','Rand cost','Fee'];
  const FUND_LABEL = { atm:'ATM withdrawal', gift:'Gifted cash', bought:'Cash bought at home' };
  const rows = [...L.priced].sort((a,b)=>a.date.localeCompare(b.date)).map(t => {
    const isSpend = t.kind==='spend';
    // Fees hide in two places: baked into an ATM's rand cost, and added as a
    // card's conversion margin. Surface both in one column.
    const fee = t.fee != null ? t.fee
              : (isSpend && W[t.wallet]?.type === 'card') ? (t.zarCost - t.zarValue)
              : 0;
    return [
      t.date, dayNo(t.date), t.city||'',
      t.kind==='fund'?'Money in':t.kind==='fx'?'Exchange':'Spend',
      isSpend ? (CAT[t.cat]?.label||t.cat) : (t.kind==='fund' ? (FUND_LABEL[t.source]||'Money in') : 'Currency exchange'),
      t.note||'',
      W[t.wallet||t.to]?.label||'',
      t.cur || (W[t.to]?.cur||''),
      t.kind==='fx' ? t.toAmount : t.amount,
      (t.zarValue||0).toFixed(2), (t.zarCost||0).toFixed(2), fee.toFixed(2)
    ];
  });
  // Notes ride along in the same file so nothing is stranded in a second export.
  const noteRows = [...S.notes]
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(n => [n.date, dayNo(n.date), n.city||'', 'Note', '', n.text, '', '', '', '', '', '']);

  return [head, ...rows, ...noteRows].map(r => r.map(v => {
    const s = String(v??'');
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  }).join(',')).join('\r\n');
}

async function shareFile(name, text, mime){
  const file = new File([text], name, { type: mime });
  if (navigator.canShare?.({ files:[file] })){
    try {
      await navigator.share({ files:[file], title:name });
      return true;
    } catch(e){
      if (e.name === 'AbortError') return false;   // user backed out
    }
  }
  // fallback: straight download into the phone's Downloads folder
  const url = URL.createObjectURL(new Blob([text],{type:mime}));
  const a = el('a'); a.href = url; a.download = name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
  return true;
}

async function doBackup(){
  const stamp = new Date().toISOString().slice(0,10);
  const ok = await shareFile(`japan-expenses-${stamp}.json`, backupJson(), 'application/json');
  if (ok){
    S.lastBackup = Date.now(); save(); renderData();
    toast('Backed up — pick Drive from the share sheet');
  }
}

async function doCsv(){
  const stamp = new Date().toISOString().slice(0,10);
  await shareFile(`japan-expenses-${stamp}.csv`, csv(), 'text/csv');
}

function doRestore(file){
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const j = JSON.parse(fr.result);
      if (!Array.isArray(j.tx)) throw 0;
      const inNotes = Array.isArray(j.notes) ? j.notes.length : 0;
      if (!confirm(`Replace what's on this phone (${S.tx.length} entries, ${S.notes.length} notes) ` +
                   `with the backup (${j.tx.length} entries, ${inNotes} notes)?`)) return;
      S.tx = j.tx;
      S.notes = Array.isArray(j.notes) ? j.notes : [];
      if (j.settings) S.settings = { ...S.settings, ...j.settings };
      save(); renderAll(); toast(`Restored ${j.tx.length} entries and ${inNotes} notes`);
    } catch(e){ toast("That file isn't a backup from this app"); }
  };
  fr.readAsText(file);
}

/* ============================================================
   MODAL + PICKERS
   ============================================================ */

function modal(title, html){
  $('#modalTitle').innerHTML = title;
  $('#modalBody').innerHTML = html;
  $('#modalBack').hidden = false;
}
function closeModal(){ $('#modalBack').hidden = true; }

function dlgCity(){
  const cur = draft.city || ITIN[draft.date];
  modal('Where are you?', `
    <div class="f"><label>Date</label>
      <input type="date" id="pDate" value="${draft.date}" min="${TRIP_START}" max="${TRIP_END}"></div>
    <div class="picklist">${
      CITIES.map(c => `<button type="button" class="${c===cur?'on':''}" data-city="${esc(c)}">${esc(c)}${
        ITIN[draft.date]===c ? ' <span style="color:var(--faint);font-weight:400">· tonight\'s stop</span>' : ''}</button>`).join('')
    }</div>
  `);
  // renderAll, not renderAdd — this dialog is reachable from Notes too.
  $('#pDate').onchange = e => {
    draft.date = e.target.value; draft.city = null;
    closeModal(); renderAll(); toast(`Switched to ${prettyDate(draft.date)}`);
  };
  $('#modalBody').querySelectorAll('[data-city]').forEach(b => {
    b.onclick = () => { draft.city = b.dataset.city; closeModal(); renderAll(); };
  });
}

/* ============================================================
   DEMO DATA — only ever loads from ?demo, and only into an empty
   app, so it can never overwrite a real trip. Safe to leave in.
   ============================================================ */

function seedDemo(){
  if (S.tx.length) return false;
  let n = 0;
  const add = o => S.tx.push(Object.assign({ id:uid(), at: 1e12 + (n++) }, o));
  const sp = (date, wallet, cur, amount, cat, city, note) =>
    add({ kind:'spend', date, wallet, cur, amount, cat, city, note, spot: rate(cur) });

  add({kind:'fund', date:'2026-10-05', wallet:'usd', cur:'USD', amount:500, zarCost:0, spot:rate('USD'), source:'gift'});
  add({kind:'fund', date:'2026-10-06', wallet:'sgd', cur:'SGD', amount:50,  zarCost:733,  spot:rate('SGD'), source:'atm'});
  add({kind:'fund', date:'2026-10-07', wallet:'jpy', cur:'JPY', amount:50000, zarCost:5266, spot:rate('JPY'), source:'atm'});

  sp('2026-10-06','sgd','SGD',18.50,'food','Singapore','Lunch at Jewel');
  sp('2026-10-06','fnbd','SGD',12.00,'transport','Singapore','Grab to Gardens');
  sp('2026-10-06','fnbd','SGD',24.00,'gifts','Singapore','Kaya jam');

  sp('2026-10-07','jpy','JPY',1170,'transport','Osaka','Loop line from KIX');
  sp('2026-10-07','jpy','JPY',980,'food','Okayama','Station lunch');
  sp('2026-10-07','fnbd','JPY',3400,'food','Kurashiki','Dinner');
  sp('2026-10-07','fnbd','JPY',1250,'toiletries','Kurashiki','Sunscreen');

  add({kind:'fx', date:'2026-10-08', from:'usd', fromAmount:200, to:'jpy', toAmount:28500});
  sp('2026-10-08','jpy','JPY',832,'transport','Hiroshima','Trains');
  sp('2026-10-08','jpy','JPY',400,'transport','Miyajima','Ferry');
  sp('2026-10-08','jpy','JPY',500,'sights','Miyajima','Itsukushima Shrine');
  sp('2026-10-08','jpy','JPY',1800,'food','Hiroshima','Okonomiyaki');
  sp('2026-10-08','fnbc','JPY',4200,'gifts','Miyajima','Momiji manju + fan');

  sp('2026-10-09','fnbd','JPY',2400,'transport','Matsuyama','Ferry from Kure');
  sp('2026-10-09','jpy','JPY',1450,'food','Matsuyama','Lunch');
  sp('2026-10-09','jpy','JPY',1200,'sights','Matsuyama','Dogo Onsen');
  sp('2026-10-09','jpy','JPY',2200,'food','Matsuyama','Dinner');
  sp('2026-10-09','jpy','JPY',680,'toiletries','Matsuyama','Plasters, tissues');

  draft.date = '2026-10-09'; draft.city = null;
  save();
  return true;
}

/* ============================================================
   NAV + BOOT
   ============================================================ */

const VIEWS = ['add','cash','stats','notes','data'];

function show(v){
  VIEWS.forEach(n => { $('#view-'+n).hidden = (n !== v); });
  $('#tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v==='cash') renderCash();
  if (v==='stats') renderStats();
  if (v==='notes'){ editingNote = null; renderNotes(); }
  if (v==='data') renderData();
  if (v==='add'){ buildAddChrome(); renderAdd(); }
}

function renderAll(){
  buildAddChrome(); renderAdd();
  if (!$('#view-cash').hidden) renderCash();
  if (!$('#view-stats').hidden) renderStats();
  if (!$('#view-notes').hidden) renderNotes();
  if (!$('#view-data').hidden) renderData();
}

function init(){
  $('#tabs').querySelectorAll('button').forEach(b => b.onclick = () => show(b.dataset.v));

  $('#keypad').querySelectorAll('button').forEach(b => b.onclick = () => keyPress(b.dataset.k));
  $('#saveSpend').onclick = saveSpend;
  $('#addCityBtn').onclick = dlgCity;

  $('#noteText').oninput = () => { $('#addNoteBtn').disabled = !$('#noteText').value.trim(); };
  $('#addNoteBtn').onclick = addNote;
  $('#noteCityBtn').onclick = dlgCity;

  $('#btnAtm').onclick = dlgAtm;
  $('#btnFx').onclick = dlgFx;
  $('#btnCashIn').onclick = dlgCashIn;

  $('#btnBackup').onclick = doBackup;
  $('#btnCsv').onclick = doCsv;
  $('#btnSettings').onclick = dlgSettings;
  $('#btnRestore').onclick = () => $('#restoreFile').click();
  $('#restoreFile').onchange = e => { if (e.target.files[0]) doRestore(e.target.files[0]); e.target.value=''; };

  $('#modalX').onclick = closeModal;
  $('#modalBack').onclick = e => { if (e.target.id === 'modalBack') closeModal(); };

  $('#statSeg').querySelectorAll('button').forEach(b => b.onclick = () => {
    seg = b.dataset.seg;
    $('#statSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    renderStats();
  });

  // ?reset wipes entries (handy while testing); ?demo fills an empty app with a sample trip
  if (location.search.includes('reset')){
    S.tx = []; S.notes = []; S.lastBackup = null; save();
    setTimeout(() => toast('Cleared — empty book'), 400);
  }

  if (location.search.includes('demo') && seedDemo()){
    show('stats');
    setTimeout(() => toast('Sample trip loaded — have a play'), 400);
  } else {
    show('add');
  }

  // Ask Android not to evict our data
  navigator.storage?.persist?.().catch(()=>{});

  // Refresh rates on launch if online and they're over a day old
  const age = S.settings.ratesAt ? Date.now() - S.settings.ratesAt : Infinity;
  if (navigator.onLine && age > 86400000) fetchRates().then(ok => { if (ok) renderAll(); });
  window.addEventListener('online', () => {
    const a = S.settings.ratesAt ? Date.now() - S.settings.ratesAt : Infinity;
    if (a > 86400000) fetchRates().then(ok => { if (ok) renderAll(); });
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

document.addEventListener('DOMContentLoaded', init);
