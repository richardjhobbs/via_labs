/* ═══════════════════════════════════════════════════════
   VIA Labs Finance — UI layer (admin + investor)
   Uses window.FinanceEngine (from finance-engine.js)
   ═══════════════════════════════════════════════════════ */

const DRAFT_KEY = 'finance.draft.v1';

// ── Number formatting ─────────────────────────────
// Table numbers: full comma-separated integer, no currency symbol.
function fmtMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return sign + Math.abs(rounded).toLocaleString('en-US');
}
// Headline cards: shortened notation with $ prefix, e.g. $27.7M, $561K.
function fmtMoneyShort(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  let str;
  if (abs >= 1e9)      str = (abs / 1e9).toFixed(1) + 'B';
  else if (abs >= 1e6) str = (abs / 1e6).toFixed(1) + 'M';
  else if (abs >= 1e3) str = (abs / 1e3).toFixed(0) + 'K';
  else                 str = Math.round(abs).toString();
  return sign + '$' + str;
}
function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return (n * 100).toFixed(1) + '%';
}
function fmtInt(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Math.round(n).toLocaleString('en-US');
}
function tdNumber(n, { money = true, pct = false } = {}) {
  const display = pct ? fmtPct(n) : (money ? fmtMoney(n) : fmtInt(n));
  const cls = n < 0 ? ' class="finance-neg"' : '';
  return `<td${cls}>${display}</td>`;
}

// Clean input value display: round away floating-point artifacts so
// cells show "3" or "12.5" instead of "3.0000000000000004".
function fmtInputVal(v, isPct) {
  let display = isPct ? (v * 100) : v;
  if (typeof display !== 'number' || !isFinite(display)) return display;
  const abs = Math.abs(display);
  if (abs === 0) return 0;
  let out;
  if (abs >= 1000)    out = Math.round(display);
  else if (abs >= 10) out = Math.round(display * 100) / 100;
  else if (abs >= 1)  out = Math.round(display * 1000) / 1000;
  else                out = Math.round(display * 10000) / 10000;
  return out;
}

// ── Path helpers for input binding ─────────────────
function getByPath(obj, path) {
  return path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setByPath(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

// ── Draft (localStorage) ──────────────────────────
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

// ── Table row builders ────────────────────────────
function rowHtml(label, vals, opts = {}) {
  const cls = opts.cls || '';
  const cells = vals.map(v => tdNumber(v, opts)).join('');
  return `<tr class="${cls}"><td>${label}</td>${cells}</tr>`;
}
function inputRowHtml(label, pathPrefix, arr, opts = {}) {
  const cells = arr.map((v, i) => {
    const path = JSON.stringify([...pathPrefix, i]);
    const display = fmtInputVal(v, !!opts.asPercent);
    return `<td><input type="text" inputmode="decimal" autocomplete="off" class="finance-input" data-path='${path}' data-pct='${opts.asPercent ? 1 : 0}' value="${display}" /></td>`;
  }).join('');
  return `<tr><td>${label}</td>${cells}</tr>`;
}

// Tolerant parser that accepts whole numbers, decimals, commas, negatives,
// and returns NaN for "still editing" states like "", "-", "." so the
// caller can skip state updates on intermediate keystrokes.
function parseInputValue(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim().replace(/,/g, '');
  if (s === '' || s === '-' || s === '.' || s === '-.') return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Build the P&L output tbody content for the Via Labs panel.
function renderViaOutputBody(state) {
  const via = state.output.via;
  return [
    `<tr class="finance-category-row"><td colspan="6">Revenue</td></tr>`,
    rowHtml('  Subscription revenue', via.map(v => v.subRev)),
    rowHtml('  Micro-fee revenue',    via.map(v => v.microRev)),
    rowHtml('  Agent top-up revenue', via.map(v => v.topUpRev)),
    rowHtml('Total Revenue', via.map(v => v.revenue), { cls: 'finance-total-row' }),
    rowHtml('Cost of Revenue', via.map(v => v.cogs)),
    rowHtml('Gross Profit', via.map(v => v.gross), { cls: 'finance-total-row' }),
    rowHtml('Gross Margin', via.map(v => v.grossMargin), { pct: true, cls: 'finance-muted-row' }),

    `<tr class="finance-category-row"><td colspan="6">Operating expenses</td></tr>`,
    rowHtml('  Engineering & Product', via.map(v => -v.opexByCat.engineering)),
    rowHtml('  Operations & Admin',    via.map(v => -v.opexByCat.opsAdmin)),
    rowHtml('  Sales & Marketing',     via.map(v => -v.opexByCat.salesMktg)),
    rowHtml('  Infrastructure & Cloud',via.map(v => -v.opexByCat.infra)),
    rowHtml('  Legal & Compliance',    via.map(v => -v.opexByCat.legal)),
    rowHtml('  General & Admin',       via.map(v => -v.opexByCat.gna)),
    rowHtml('Total OpEx', via.map(v => v.opex), { cls: 'finance-total-row' }),

    rowHtml('EBITDA', via.map(v => v.ebitda), { cls: 'finance-highlight-row' }),
    rowHtml('EBITDA margin', via.map(v => v.ebitdaMargin), { pct: true, cls: 'finance-muted-row' }),

    `<tr class="finance-category-row"><td colspan="6">Volume (informational)</td></tr>`,
    rowHtml('  Total intents', via.map(v => v.intents), { money: false }),
    rowHtml('  Total transactions', via.map(v => v.txns), { money: false }),
    rowHtml('  Platform GMV', via.map(v => v.platformGmv)),
  ].join('');
}

// ── Render: Via Labs panel ─────────────────────────
function renderViaPanel(state) {
  const { inputs } = state;
  const years = inputs.years;
  const yearHeaders = years.map(y => `<th>${y}</th>`).join('');

  const assumptionsRows = [
    `<tr class="finance-category-row"><td colspan="6">Merchants & pricing</td></tr>`,
    inputRowHtml('Active Merchants', ['via','activeMerchants'], inputs.via.activeMerchants),
    inputRowHtml('Growth tier $/mo', ['via','tierPrice','growth'], inputs.via.tierPrice.growth),
    inputRowHtml('Professional tier $/mo', ['via','tierPrice','pro'], inputs.via.tierPrice.pro),
    inputRowHtml('Enterprise tier $/mo', ['via','tierPrice','enterprise'], inputs.via.tierPrice.enterprise),

    `<tr class="finance-category-row"><td colspan="6">Subscription mix (%)</td></tr>`,
    inputRowHtml('Starter (Free) %', ['via','tierMix','starter'], inputs.via.tierMix.starter, { asPercent: true }),
    inputRowHtml('Growth %',         ['via','tierMix','growth'],  inputs.via.tierMix.growth,  { asPercent: true }),
    inputRowHtml('Professional %',   ['via','tierMix','pro'],     inputs.via.tierMix.pro,     { asPercent: true }),
    inputRowHtml('Enterprise %',     ['via','tierMix','enterprise'], inputs.via.tierMix.enterprise, { asPercent: true }),

    `<tr class="finance-category-row"><td colspan="6">Micro fees</td></tr>`,
    inputRowHtml('Intent fee $', ['via','microFee','intent'], inputs.via.microFee.intent),
    inputRowHtml('Quote fee $',  ['via','microFee','quote'],  inputs.via.microFee.quote),
    inputRowHtml('Txn fee % of order', ['via','microFee','txnPct'], inputs.via.microFee.txnPct, { asPercent: true }),
    inputRowHtml('Txn fee cap $', ['via','microFee','txnCap'], inputs.via.microFee.txnCap),

    `<tr class="finance-category-row"><td colspan="6">Volume drivers</td></tr>`,
    inputRowHtml('Intents/merchant/mo', ['via','volume','intentsPerMerchantMo'], inputs.via.volume.intentsPerMerchantMo),
    inputRowHtml('Quote rate %',        ['via','volume','quoteRate'],        inputs.via.volume.quoteRate,        { asPercent: true }),
    inputRowHtml('Conversion rate %',   ['via','volume','conversionRate'],   inputs.via.volume.conversionRate,   { asPercent: true }),
    inputRowHtml('Avg order value $',   ['via','volume','aov'],              inputs.via.volume.aov),

    `<tr class="finance-category-row"><td colspan="6">Agent top-up</td></tr>`,
    inputRowHtml('Top-up volume $',  ['via','topUp','volume'], inputs.via.topUp.volume),
    inputRowHtml('Top-up margin %',  ['via','topUp','margin'], inputs.via.topUp.margin, { asPercent: true }),

    `<tr class="finance-category-row"><td colspan="6">COGS</td></tr>`,
    inputRowHtml('COGS % of revenue', ['via','cogsPct'], inputs.via.cogsPct, { asPercent: true }),
  ].join('');

  return `
    <section class="finance-section">
      <header class="finance-section-header">
        <h2>VIA Labs: Assumptions</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        <table class="finance-table">
          <thead><tr><th>Input</th>${yearHeaders}</tr></thead>
          <tbody>${assumptionsRows}</tbody>
        </table>
      </div>
    </section>
    <section class="finance-section">
      <header class="finance-section-header">
        <h2>VIA Labs: P&amp;L</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        <table class="finance-table">
          <thead><tr><th></th>${yearHeaders}</tr></thead>
          <tbody id="via-pnl-body">${renderViaOutputBody(state)}</tbody>
        </table>
      </div>
    </section>
    <section class="finance-section" id="via-opex-detail">
      <header class="finance-section-header">
        <h2>VIA Labs: OpEx detail (quarterly)</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        ${renderOpexDetail(inputs.via.opex, ['via','opex'], inputs.years)}
      </div>
    </section>
  `;
}

// Build the P&L output tbody content for the RRG panel.
function renderRrgOutputBody(state) {
  const rrg = state.output.rrg;
  return [
    `<tr class="finance-category-row"><td colspan="6">Commission by drop type</td></tr>`,
    rowHtml('  Co-created',          rrg.map(v => v.commCoCreated)),
    rowHtml('  Brand (under $10)',   rrg.map(v => v.commBrandUnder10)),
    rowHtml('  Brand ($10 to $100)', rrg.map(v => v.commBrand10to100)),
    rowHtml('  Brand ($100+)',       rrg.map(v => v.commBrand100plus)),
    rowHtml('Total Commission', rrg.map(v => v.commissionTotal), { cls: 'finance-total-row' }),
    rowHtml('Blended rate', rrg.map(v => v.blendedRate), { pct: true, cls: 'finance-muted-row' }),
    rowHtml('Co-creation revenue', rrg.map(v => v.coCreationRev)),
    rowHtml('Total Revenue', rrg.map(v => v.revenue), { cls: 'finance-total-row' }),
    rowHtml('Cost of Revenue', rrg.map(v => v.cogs)),
    rowHtml('Gross Profit', rrg.map(v => v.gross), { cls: 'finance-total-row' }),
    rowHtml('Gross Margin', rrg.map(v => v.grossMargin), { pct: true, cls: 'finance-muted-row' }),

    `<tr class="finance-category-row"><td colspan="6">Operating expenses</td></tr>`,
    rowHtml('  Design & Creative',     rrg.map(v => -v.opexByCat.designCreative)),
    rowHtml('  Brand Partnerships',    rrg.map(v => -v.opexByCat.brandPartnerships)),
    rowHtml('  Marketing & Community', rrg.map(v => -v.opexByCat.mktgCommunity)),
    rowHtml('  Platform & Tech',       rrg.map(v => -v.opexByCat.platformTech)),
    rowHtml('  General & Admin',       rrg.map(v => -v.opexByCat.gna)),
    rowHtml('Total OpEx', rrg.map(v => v.opex), { cls: 'finance-total-row' }),

    rowHtml('EBITDA', rrg.map(v => v.ebitda), { cls: 'finance-highlight-row' }),
    rowHtml('EBITDA margin', rrg.map(v => v.ebitdaMargin), { pct: true, cls: 'finance-muted-row' }),
  ].join('');
}

// ── Render: RRG panel ─────────────────────────────
function renderRrgPanel(state) {
  const { inputs } = state;
  const years = inputs.years;
  const yearHeaders = years.map(y => `<th>${y}</th>`).join('');

  const assumptionsRows = [
    `<tr class="finance-category-row"><td colspan="6">Top-line</td></tr>`,
    inputRowHtml('Total GMV $', ['rrg','gmv'], inputs.rrg.gmv),
    inputRowHtml('Co-creation revenue $', ['rrg','coCreationRevenue'], inputs.rrg.coCreationRevenue),
    inputRowHtml('COGS % of revenue', ['rrg','cogsPct'], inputs.rrg.cogsPct, { asPercent: true }),

    `<tr class="finance-category-row"><td colspan="6">Drop mix: GMV share (%)</td></tr>`,
    inputRowHtml('Co-created drops',         ['rrg','dropMix','coCreated','share'],    inputs.rrg.dropMix.coCreated.share,    { asPercent: true }),
    inputRowHtml('Brand drops (under $10)',  ['rrg','dropMix','brandUnder10','share'], inputs.rrg.dropMix.brandUnder10.share, { asPercent: true }),
    inputRowHtml('Brand drops ($10 to $100)',['rrg','dropMix','brand10to100','share'], inputs.rrg.dropMix.brand10to100.share, { asPercent: true }),
    inputRowHtml('Brand drops ($100+)',      ['rrg','dropMix','brand100plus','share'], inputs.rrg.dropMix.brand100plus.share, { asPercent: true }),

    `<tr class="finance-category-row"><td colspan="6">Platform take rates (%): 3-tier deployed scale</td></tr>`,
    inputRowHtml('Co-created rate (30%)',        ['rrg','dropMix','coCreated','rate'],    inputs.rrg.dropMix.coCreated.rate,    { asPercent: true }),
    inputRowHtml('Brand under $10 rate (30%)',   ['rrg','dropMix','brandUnder10','rate'], inputs.rrg.dropMix.brandUnder10.rate, { asPercent: true }),
    inputRowHtml('Brand $10 to $100 blended',    ['rrg','dropMix','brand10to100','rate'], inputs.rrg.dropMix.brand10to100.rate, { asPercent: true }),
    inputRowHtml('Brand $100+ rate (2.5%)',      ['rrg','dropMix','brand100plus','rate'], inputs.rrg.dropMix.brand100plus.rate, { asPercent: true }),
  ].join('');

  return `
    <section class="finance-section">
      <header class="finance-section-header">
        <h2>RealReal Genuine: Assumptions</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        <table class="finance-table">
          <thead><tr><th>Input</th>${yearHeaders}</tr></thead>
          <tbody>${assumptionsRows}</tbody>
        </table>
      </div>
    </section>
    <section class="finance-section">
      <header class="finance-section-header">
        <h2>RealReal Genuine: P&amp;L</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        <table class="finance-table">
          <thead><tr><th></th>${yearHeaders}</tr></thead>
          <tbody id="rrg-pnl-body">${renderRrgOutputBody(state)}</tbody>
        </table>
      </div>
    </section>
    <section class="finance-section" id="rrg-opex-detail">
      <header class="finance-section-header">
        <h2>RealReal Genuine: OpEx detail (quarterly)</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        ${renderOpexDetail(inputs.rrg.opex, ['rrg','opex'], inputs.years)}
      </div>
    </section>
  `;
}

// Build the output tbody content for the Consolidated panel.
function renderConsOutputBody(state) {
  const con = state.output.consolidated;
  return [
    rowHtml('  VIA Labs revenue', con.map(v => v.viaRevenue)),
    rowHtml('  RRG revenue',      con.map(v => v.rrgRevenue)),
    rowHtml('Combined Revenue', con.map(v => v.revenue), { cls: 'finance-total-row' }),
    rowHtml('  VIA Labs % of total', con.map(v => v.viaSharePct), { pct: true, cls: 'finance-muted-row' }),
    rowHtml('  RRG % of total',      con.map(v => v.rrgSharePct), { pct: true, cls: 'finance-muted-row' }),

    rowHtml('Combined Cost of Revenue', con.map(v => v.cogs)),
    rowHtml('Combined Gross Profit', con.map(v => v.gross), { cls: 'finance-total-row' }),
    rowHtml('Gross Margin', con.map(v => v.grossMargin), { pct: true, cls: 'finance-muted-row' }),

    rowHtml('Combined OpEx', con.map(v => v.opex)),
    rowHtml('COMBINED EBITDA', con.map(v => v.ebitda), { cls: 'finance-highlight-row' }),
    rowHtml('EBITDA margin', con.map(v => v.ebitdaMargin), { pct: true, cls: 'finance-muted-row' }),

    `<tr class="finance-category-row"><td colspan="6">Cash</td></tr>`,
    rowHtml('Cash balance (EOY)', con.map(v => v.cash), { cls: 'finance-total-row' }),
    rowHtml('ARR / raise multiple', con.map(v => v.arrRaiseMultiple), { pct: false, money: false, cls: 'finance-muted-row' }),
  ].join('');
}

// ── Render: Consolidated panel ─────────────────────
function renderConsolidatedPanel(state) {
  const { inputs } = state;
  const years = inputs.years;
  const yearHeaders = years.map(y => `<th>${y}</th>`).join('');

  const seedDisplay = fmtInputVal(inputs.seedRaise, false);

  return `
    <section class="finance-section">
      <header class="finance-section-header">
        <h2>Consolidated: Inputs</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        <table class="finance-table">
          <thead><tr><th>Input</th>${yearHeaders}</tr></thead>
          <tbody>
            <tr>
              <td>Seed raise (starting cash)</td>
              <td><input type="text" inputmode="decimal" autocomplete="off" class="finance-input"
                         data-path='["seedRaise"]' data-pct='0' data-scalar='1' value="${seedDisplay}" /></td>
              <td colspan="4"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="finance-section">
      <header class="finance-section-header">
        <h2>Consolidated P&amp;L</h2>
        <span class="finance-section-chev">▼</span>
      </header>
      <div class="finance-section-body">
        <table class="finance-table">
          <thead><tr><th></th>${yearHeaders}</tr></thead>
          <tbody id="cons-pnl-body">${renderConsOutputBody(state)}</tbody>
        </table>
      </div>
    </section>
  `;
}

// ── OpEx detail (quarterly) renderer ───────────────
function renderOpexDetail(opex, pathPrefix, years) {
  const quarters = [];
  years.forEach(y => { for (let q = 1; q <= 4; q++) quarters.push(`Q${q} ${y}`); });
  const qHeaders = quarters.map(q => `<th>${q}</th>`).join('');

  let html = '';
  for (const cat in opex) {
    const category = opex[cat];
    const lineItems = Object.keys(category);
    if (!lineItems.length) continue;
    html += `<h3 style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--amber);margin:18px 0 8px;">${cat}</h3>`;
    html += `<table class="finance-table"><thead><tr><th>Line item</th>${qHeaders}</tr></thead><tbody>`;
    for (const li of lineItems) {
      const arr = category[li];
      const cells = arr.map((v, i) => {
        const path = JSON.stringify([...pathPrefix, cat, li, i]);
        const display = fmtInputVal(v, false);
        return `<td><input type="text" inputmode="decimal" autocomplete="off" class="finance-input" data-path='${path}' data-pct='0' value="${display}" /></td>`;
      }).join('');
      html += `<tr><td>${li}</td>${cells}</tr>`;
    }
    html += '</tbody></table>';
  }
  return html;
}

// ── Render: investor page ──────────────────────────
function renderInvestor(data, output, notes) {
  const years = data.years;
  const con = output.consolidated;
  const via = output.via;
  const rrg = output.rrg;

  const headlineCards = years.map((y, i) => {
    const e = con[i].ebitda;
    const cls = e > 0 ? 'positive' : (e < 0 ? 'negative' : '');
    return `
      <div class="finance-headline-card">
        <div class="year">FY${y}</div>
        <div class="rev-label">Revenue</div>
        <div class="rev">${fmtMoneyShort(con[i].revenue)}</div>
        <div class="ebitda ${cls}">EBITDA ${fmtMoneyShort(e)}</div>
      </div>`;
  }).join('');

  const yearHeaders = years.map(y => `<th>${y}</th>`).join('');

  const viaRows = [
    rowHtml('  Subscription', via.map(v => v.subRev)),
    rowHtml('  Micro-fees',   via.map(v => v.microRev)),
    rowHtml('  Agent top-up', via.map(v => v.topUpRev)),
    rowHtml('Total Revenue', via.map(v => v.revenue), { cls: 'finance-total-row' }),
    rowHtml('Cost of Revenue', via.map(v => v.cogs)),
    rowHtml('Operating Expenses', via.map(v => v.opex)),
    rowHtml('EBITDA', via.map(v => v.ebitda), { cls: 'finance-highlight-row' }),
    rowHtml('EBITDA margin', via.map(v => v.ebitdaMargin), { pct: true, cls: 'finance-muted-row' }),
  ].join('');

  const rrgRows = [
    rowHtml('Platform Commission', rrg.map(v => v.commissionTotal)),
    rowHtml('Co-creation Revenue', rrg.map(v => v.coCreationRev)),
    rowHtml('Total Revenue', rrg.map(v => v.revenue), { cls: 'finance-total-row' }),
    rowHtml('Cost of Revenue', rrg.map(v => v.cogs)),
    rowHtml('Operating Expenses', rrg.map(v => v.opex)),
    rowHtml('EBITDA', rrg.map(v => v.ebitda), { cls: 'finance-highlight-row' }),
    rowHtml('EBITDA margin', rrg.map(v => v.ebitdaMargin), { pct: true, cls: 'finance-muted-row' }),
  ].join('');

  const conRows = [
    rowHtml('  VIA Labs',  con.map(v => v.viaRevenue)),
    rowHtml('  RealReal Genuine', con.map(v => v.rrgRevenue)),
    rowHtml('Combined Revenue', con.map(v => v.revenue), { cls: 'finance-total-row' }),
    rowHtml('Combined Gross Profit', con.map(v => v.gross)),
    rowHtml('Combined Operating Expenses', con.map(v => v.opex)),
    rowHtml('COMBINED EBITDA', con.map(v => v.ebitda), { cls: 'finance-highlight-row' }),
    rowHtml('Cash balance (EOY)', con.map(v => v.cash), { cls: 'finance-total-row' }),
  ].join('');

  const notesHtml = (notes && notes.blocks ? notes.blocks : []).map(b =>
    `<div class="finance-notes-block"><h3>${b.title}</h3>${(b.paragraphs||[]).map(p => `<p>${p}</p>`).join('')}</div>`
  ).join('');

  return `
    <div class="finance-eyebrow">Investor Materials</div>
    <h1 class="finance-title">VIA Labs <em>Projected</em> Financials</h1>
    <p class="finance-sub">Combined five-year outlook for VIA Labs and RealReal Genuine. All figures are projections derived from current assumptions.</p>

    <div class="finance-headline-strip">${headlineCards}</div>

    <section class="finance-section">
      <header class="finance-section-header"><h2>VIA Labs: Summary P&amp;L</h2><span class="finance-section-chev">▼</span></header>
      <div class="finance-section-body">
        <table class="finance-table"><thead><tr><th></th>${yearHeaders}</tr></thead><tbody>${viaRows}</tbody></table>
      </div>
    </section>

    <section class="finance-section">
      <header class="finance-section-header"><h2>RealReal Genuine: Summary P&amp;L</h2><span class="finance-section-chev">▼</span></header>
      <div class="finance-section-body">
        <table class="finance-table"><thead><tr><th></th>${yearHeaders}</tr></thead><tbody>${rrgRows}</tbody></table>
      </div>
    </section>

    <section class="finance-section">
      <header class="finance-section-header"><h2>Consolidated Group</h2><span class="finance-section-chev">▼</span></header>
      <div class="finance-section-body">
        <table class="finance-table"><thead><tr><th></th>${yearHeaders}</tr></thead><tbody>${conRows}</tbody></table>
      </div>
    </section>

    ${notesHtml}

    <div class="finance-disclaimer">
      <h3>Important notice: forward-looking information</h3>
      <p>
        This document contains financial projections and forward-looking statements
        prepared by VIA Labs in good faith and on a best-endeavours basis. The figures
        reflect management's current expectations, assumptions and view of market
        conditions as at the date of preparation, and are inherently subject to
        significant business, economic, regulatory, competitive, technological and
        other risks and uncertainties, many of which are outside the company's control.
      </p>
      <p>
        Actual results may differ materially from those projected. No representation,
        warranty or guarantee, express or implied, is made as to the accuracy,
        completeness, reasonableness or achievability of any projection or assumption
        set out in this document, and neither VIA Labs nor any of its officers,
        employees or advisers accepts any liability for any loss arising from any use
        of this information.
      </p>
      <p>
        This document is strictly confidential and is provided for information only.
        It does not constitute an offer to sell, or the solicitation of an offer to
        buy, any security or financial instrument in any jurisdiction, nor does it
        constitute investment, legal, tax or other advice. Recipients should conduct
        their own independent investigation and analysis before making any investment
        decision.
      </p>
    </div>

    <div class="finance-actions">
      <span class="finance-actions-status">CONFIDENTIAL: for authorised investors only</span>
      <div class="spacer"></div>
      <button class="finance-btn" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div class="finance-print-footer">
      Accurate as at time and date of print. Data may change. Log in with password for latest version.
    </div>
  `;
}

// ── State management + recalc ─────────────────────
const state = {
  inputs: null,      // mutable
  canonical: null,   // original from server
  output: null,
  currentTab: 'via',
  dirty: false,
};

function recalc() {
  state.output = window.FinanceEngine.calculate(state.inputs);
}

function renderCurrentPanel() {
  const root = document.getElementById('finance-root');
  if (!root) return;
  let html = '';
  if (state.currentTab === 'via')           html = renderViaPanel(state);
  else if (state.currentTab === 'rrg')      html = renderRrgPanel(state);
  else if (state.currentTab === 'combined') html = renderConsolidatedPanel(state);
  root.innerHTML = html;
  bindInputs(root);
  bindSectionToggles(root);
  updateScenarioPill();
}

function bindInputs(root) {
  root.querySelectorAll('input.finance-input').forEach(el => {
    el.addEventListener('input', () => {
      const path = JSON.parse(el.dataset.path);
      const isPct = el.dataset.pct === '1';
      let raw = parseInputValue(el.value);
      if (!Number.isFinite(raw)) return; // intermediate edit like "" or "-"
      if (isPct) raw = raw / 100;
      if (el.dataset.scalar === '1') {
        state.inputs[path[0]] = raw;
      } else {
        setByPath(state.inputs, path, raw);
      }
      state.dirty = true;
      saveDraft(state.inputs);
      recalc();
      el.classList.add('dirty');
      // Update only the output tbodies — never touch the input the user is typing in.
      updateOutputTables();
      updateScenarioPill();
    });
  });
}

// Update the output tbodies in place without touching any input cells.
function updateOutputTables() {
  if (state.currentTab === 'via') {
    const b = document.getElementById('via-pnl-body');
    if (b) b.innerHTML = renderViaOutputBody(state);
  } else if (state.currentTab === 'rrg') {
    const b = document.getElementById('rrg-pnl-body');
    if (b) b.innerHTML = renderRrgOutputBody(state);
  } else if (state.currentTab === 'combined') {
    const b = document.getElementById('cons-pnl-body');
    if (b) b.innerHTML = renderConsOutputBody(state);
  }
}

function bindSectionToggles(root) {
  root.querySelectorAll('.finance-section-header').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
  });
}

function updateScenarioPill() {
  const pill = document.getElementById('finance-scenario-pill');
  if (!pill) return;
  if (state.dirty) {
    pill.textContent = '● Draft (unsaved)';
    pill.classList.add('draft');
  } else {
    pill.textContent = 'Baseline';
    pill.classList.remove('draft');
  }
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.finance-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  renderCurrentPanel();
}

function revertToCanonical() {
  if (!confirm('Discard all draft edits and reload canonical data?')) return;
  clearDraft();
  state.inputs = JSON.parse(JSON.stringify(state.canonical));
  state.dirty = false;
  recalc();
  renderCurrentPanel();
}

function exportDataJson() {
  const blob = new Blob([JSON.stringify(state.inputs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Public init: admin ─────────────────────────────
async function initAdmin() {
  const res = await fetch('/api/finance-data?level=admin', { credentials: 'same-origin' });
  if (!res.ok) {
    document.getElementById('finance-root').innerHTML = '<p style="padding:24px;color:var(--red);">Unauthorised or data unavailable. <a href="/finance/admin">Reload</a></p>';
    return;
  }
  const canonical = await res.json();
  state.canonical = canonical;
  const draft = loadDraft();
  state.inputs = draft || JSON.parse(JSON.stringify(canonical));
  state.dirty = !!draft;
  recalc();

  // Wire up top-level UI
  document.querySelectorAll('.finance-tab').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
  document.getElementById('finance-revert-btn')?.addEventListener('click', revertToCanonical);
  document.getElementById('finance-export-btn')?.addEventListener('click', exportDataJson);

  switchTab('via');
}

// ── Public init: investor ──────────────────────────
async function initInvestor() {
  const [dataRes, notesRes] = await Promise.all([
    fetch('/api/finance-data?level=investor', { credentials: 'same-origin' }),
    fetch('/finance/notes.json').catch(() => null),
  ]);
  if (!dataRes.ok) {
    document.getElementById('finance-root').innerHTML = '<p style="padding:24px;color:var(--red);">Unauthorised. <a href="/finance/investor">Reload</a></p>';
    return;
  }
  const data = await dataRes.json();
  const notes = notesRes && notesRes.ok ? await notesRes.json() : { blocks: [] };

  // For investor we need to reconstruct opex shape the engine expects (quarterly)
  // The stripped payload has annual subtotals; convert each annual into a "category"
  // with a single "fake" line item containing 20 values (annual/4 per quarter).
  const hydrate = (opexAnnual) => {
    const out = {};
    for (const cat in opexAnnual) {
      const annuals = opexAnnual[cat];
      const quarterly = [];
      annuals.forEach(y => { for (let q = 0; q < 4; q++) quarterly.push(y / 4); });
      out[cat] = { [cat]: quarterly };
    }
    return out;
  };
  const inputs = {
    seedRaise: data.seedRaise,
    years: data.years,
    via: { ...data.via, opex: hydrate(data.via.opexAnnual) },
    rrg: { ...data.rrg, opex: hydrate(data.rrg.opexAnnual) },
  };
  delete inputs.via.opexAnnual;
  delete inputs.rrg.opexAnnual;

  const output = window.FinanceEngine.calculate(inputs);
  const html = renderInvestor(data, output, notes);
  document.getElementById('finance-root').innerHTML = html;
  document.querySelectorAll('.finance-section-header').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
  });
}

window.FinanceUI = { initAdmin, initInvestor };
