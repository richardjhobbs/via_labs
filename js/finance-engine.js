/* ═══════════════════════════════════════════════════════
   VIA Labs + RRG P&L Engine
   Pure calc — no DOM. Port of xlsx formulas.
   Attaches to window.FinanceEngine. Plain browser script.
   ═══════════════════════════════════════════════════════ */
(function () {
// Sum all quarterly cells (20 values) inside a single category for a given year index (0-4).
// Each line item is a flat array of 20 quarterly values: [Q1'26, Q2'26, Q3'26, Q4'26, Q1'27, ...]
function sumCategoryYear(category, yearIdx) {
  const start = yearIdx * 4;
  let total = 0;
  for (const lineItem in category) {
    const arr = category[lineItem] || [];
    for (let q = 0; q < 4; q++) {
      total += Number(arr[start + q]) || 0;
    }
  }
  return total;
}

function sumAllOpex(opex, yearIdx) {
  let total = 0;
  for (const cat in opex) {
    total += sumCategoryYear(opex[cat], yearIdx);
  }
  return total;
}

function calculate(inputs) {
  const years = inputs.years.slice();
  const n = years.length;

  // ── VIA LABS ─────────────────────────────────────────
  const via = [];
  for (let i = 0; i < n; i++) {
    const am = Number(inputs.via.activeMerchants[i]) || 0;

    const subGrowth     = am * inputs.via.tierMix.growth[i]     * inputs.via.tierPrice.growth[i]     * 12;
    const subPro        = am * inputs.via.tierMix.pro[i]        * inputs.via.tierPrice.pro[i]        * 12;
    const subEnterprise = am * inputs.via.tierMix.enterprise[i] * inputs.via.tierPrice.enterprise[i] * 12;
    const subRev = subGrowth + subPro + subEnterprise;

    const intents = am * inputs.via.volume.intentsPerMerchantMo[i] * 12;
    const quotes  = intents * inputs.via.volume.quoteRate[i];
    const txns    = quotes  * inputs.via.volume.conversionRate[i];
    const gmv     = txns    * inputs.via.volume.aov[i];

    const intentRev = intents * inputs.via.microFee.intent[i];
    const quoteRev  = quotes  * inputs.via.microFee.quote[i];
    const perTxnFee = Math.min(
      inputs.via.volume.aov[i] * inputs.via.microFee.txnPct[i],
      inputs.via.microFee.txnCap[i]
    );
    const txnRev  = perTxnFee * txns;
    const microRev = intentRev + quoteRev + txnRev;

    const topUpRev = inputs.via.topUp.volume[i] * inputs.via.topUp.margin[i];

    const revenue = subRev + microRev + topUpRev;
    const cogs    = -revenue * inputs.via.cogsPct[i];
    const gross   = revenue + cogs;

    const opexByCat = {};
    for (const cat in inputs.via.opex) {
      opexByCat[cat] = sumCategoryYear(inputs.via.opex[cat], i);
    }
    const opexTotal = -sumAllOpex(inputs.via.opex, i);
    const ebitda = gross + opexTotal;

    via.push({
      subRev, subGrowth, subPro, subEnterprise,
      intents, quotes, txns, platformGmv: gmv,
      intentRev, quoteRev, txnRev, microRev,
      topUpRev,
      revenue, cogs, gross,
      grossMargin: revenue ? gross / revenue : 0,
      opex: opexTotal,
      opexByCat,
      ebitda,
      ebitdaMargin: revenue ? ebitda / revenue : 0,
    });
  }

  // ── REAL REAL GENUINE ────────────────────────────────
  const rrg = [];
  for (let i = 0; i < n; i++) {
    const gmvTotal = Number(inputs.rrg.gmv[i]) || 0;
    const mix = inputs.rrg.dropMix;

    const commDigital  = gmvTotal * mix.digital.share[i]  * mix.digital.rate[i];
    const commPhysical = gmvTotal * mix.physical.share[i] * mix.physical.rate[i];
    const commissionTotal = commDigital + commPhysical;

    const blendedRate = gmvTotal ? commissionTotal / gmvTotal : 0;

    const coCreationRev = Number(inputs.rrg.coCreationRevenue[i]) || 0;
    const revenue = commissionTotal + coCreationRev;
    const cogs    = -revenue * inputs.rrg.cogsPct[i];
    const gross   = revenue + cogs;

    const opexByCat = {};
    for (const cat in inputs.rrg.opex) {
      opexByCat[cat] = sumCategoryYear(inputs.rrg.opex[cat], i);
    }
    const opexTotal = -sumAllOpex(inputs.rrg.opex, i);
    const ebitda = gross + opexTotal;

    rrg.push({
      gmv: gmvTotal,
      commDigital, commPhysical,
      commissionTotal, blendedRate,
      coCreationRev,
      revenue, cogs, gross,
      grossMargin: revenue ? gross / revenue : 0,
      opex: opexTotal,
      opexByCat,
      ebitda,
      ebitdaMargin: revenue ? ebitda / revenue : 0,
    });
  }

  // ── CONSOLIDATED ─────────────────────────────────────
  const seedRaise = Number(inputs.seedRaise) || 0;
  const consolidated = [];
  let cumulativeEbitda = 0;
  for (let i = 0; i < n; i++) {
    const revenue = via[i].revenue + rrg[i].revenue;
    const cogs    = via[i].cogs    + rrg[i].cogs;
    const gross   = via[i].gross   + rrg[i].gross;
    const opex    = via[i].opex    + rrg[i].opex;
    const ebitda  = via[i].ebitda  + rrg[i].ebitda;
    cumulativeEbitda += ebitda;
    const cash = seedRaise + cumulativeEbitda;

    consolidated.push({
      viaRevenue: via[i].revenue,
      rrgRevenue: rrg[i].revenue,
      revenue, cogs, gross, opex, ebitda,
      viaSharePct: revenue ? via[i].revenue / revenue : 0,
      rrgSharePct: revenue ? rrg[i].revenue / revenue : 0,
      grossMargin: revenue ? gross / revenue : 0,
      ebitdaMargin: revenue ? ebitda / revenue : 0,
      cash,
      arrRaiseMultiple: seedRaise ? revenue / seedRaise : 0,
    });
  }

  return { years, via, rrg, consolidated };
}

// Attach to global
const api = { calculate };
if (typeof window !== 'undefined') window.FinanceEngine = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
