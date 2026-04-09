"""
Via Labs & RealReal Genuine — Draft P&L Projections
====================================================
5-Year Financial Model (2026–2030)
Context: $5M USD Seed Raise

Revenue Streams:
  Via Labs:
    1. Merchant Subscriptions (SaaS MRR)
    2. Micro Transaction Fees (per-intent, per-quote, per-transaction)
    3. Agent Top-Up Margins (fiat-to-stablecoin conversion margin)

  RealReal Genuine:
    1. Platform Commission (staggered % of GMV)
    2. Co-Creation Revenue Share (smart-contract distributed)
"""

import csv
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# =============================================================================
# KEY ASSUMPTIONS
# =============================================================================

ASSUMPTIONS = {
    "raise_amount": 5_000_000,
    "currency": "USD",
    "projection_years": 5,  # 2026-2030
    "start_year": 2026,
}

# ---------------------------------------------------------------------------
# VIA LABS ASSUMPTIONS
# ---------------------------------------------------------------------------

# Merchant Growth (cumulative active merchants at year-end)
VIA_MERCHANTS = {
    2026: 75,
    2027: 350,
    2028: 1_500,
    2029: 5_000,
    2030: 15_000,
}

# Subscription Tiers
VIA_SUB_TIERS = {
    "Starter (Free)":    {"monthly": 0,     "share": {2026: 0.50, 2027: 0.40, 2028: 0.30, 2029: 0.25, 2030: 0.20}},
    "Growth":            {"monthly": 149,   "share": {2026: 0.30, 2027: 0.30, 2028: 0.30, 2029: 0.30, 2030: 0.30}},
    "Professional":      {"monthly": 499,   "share": {2026: 0.15, 2027: 0.20, 2028: 0.25, 2029: 0.25, 2030: 0.25}},
    "Enterprise":        {"monthly": 1_499, "share": {2026: 0.05, 2027: 0.10, 2028: 0.15, 2029: 0.20, 2030: 0.25}},
}

# Micro Fee Structure
VIA_MICRO_FEES = {
    "intent_fee": 0.005,        # $ per intent broadcast received by merchant
    "quote_fee": 0.01,          # $ per quote generated
    "transaction_fee_pct": 0.005,  # 0.5% of transaction value
    "transaction_fee_cap": 2.00,   # max $2 per transaction
}

# Transaction Volume Assumptions
VIA_TRANSACTIONS = {
    # intents_per_merchant_per_month, quote_rate, conversion_rate, avg_order_value
    2026: {"intents_per_merchant_mo": 200,  "quote_rate": 0.40, "conversion_rate": 0.10, "aov": 85},
    2027: {"intents_per_merchant_mo": 500,  "quote_rate": 0.45, "conversion_rate": 0.12, "aov": 95},
    2028: {"intents_per_merchant_mo": 800,  "quote_rate": 0.50, "conversion_rate": 0.15, "aov": 110},
    2029: {"intents_per_merchant_mo": 1200, "quote_rate": 0.55, "conversion_rate": 0.18, "aov": 120},
    2030: {"intents_per_merchant_mo": 1800, "quote_rate": 0.60, "conversion_rate": 0.20, "aov": 130},
}

# Agent Top-Up Margins
VIA_TOPUP = {
    # total_topup_volume through platform, margin %
    2026: {"volume": 150_000,      "margin_pct": 0.025},
    2027: {"volume": 1_200_000,    "margin_pct": 0.023},
    2028: {"volume": 8_000_000,    "margin_pct": 0.020},
    2029: {"volume": 35_000_000,   "margin_pct": 0.018},
    2030: {"volume": 120_000_000,  "margin_pct": 0.015},
}

# Via Labs Operating Expenses
VIA_OPEX = {
    2026: {
        "Engineering & Product":  720_000,
        "Operations & Admin":     180_000,
        "Sales & Marketing":      200_000,
        "Infrastructure & Cloud": 96_000,
        "Legal & Compliance":     120_000,
        "General & Admin":        84_000,
    },
    2027: {
        "Engineering & Product":  1_440_000,
        "Operations & Admin":     360_000,
        "Sales & Marketing":      500_000,
        "Infrastructure & Cloud": 200_000,
        "Legal & Compliance":     180_000,
        "General & Admin":        120_000,
    },
    2028: {
        "Engineering & Product":  2_400_000,
        "Operations & Admin":     600_000,
        "Sales & Marketing":      1_000_000,
        "Infrastructure & Cloud": 400_000,
        "Legal & Compliance":     250_000,
        "General & Admin":        200_000,
    },
    2029: {
        "Engineering & Product":  3_600_000,
        "Operations & Admin":     900_000,
        "Sales & Marketing":      2_000_000,
        "Infrastructure & Cloud": 750_000,
        "Legal & Compliance":     350_000,
        "General & Admin":        300_000,
    },
    2030: {
        "Engineering & Product":  5_000_000,
        "Operations & Admin":     1_200_000,
        "Sales & Marketing":      3_500_000,
        "Infrastructure & Cloud": 1_200_000,
        "Legal & Compliance":     500_000,
        "General & Admin":        400_000,
    },
}

# ---------------------------------------------------------------------------
# REALREAL GENUINE ASSUMPTIONS
# ---------------------------------------------------------------------------

# GMV (Gross Merchandise Value) flowing through RRG platform
RRG_GMV = {
    2026: 180_000,
    2027: 950_000,
    2028: 4_500_000,
    2029: 15_000_000,
    2030: 45_000_000,
}

# Staggered Commission Tiers (applied to GMV mix)
# Higher-value items = lower commission, but premium fashion skews higher AOV
RRG_COMMISSION_TIERS = {
    "Tier 1: Items under $100":       {"rate": 0.10, "gmv_share": {2026: 0.20, 2027: 0.15, 2028: 0.12, 2029: 0.10, 2030: 0.08}},
    "Tier 2: Items $100–$500":        {"rate": 0.07, "gmv_share": {2026: 0.40, 2027: 0.35, 2028: 0.33, 2029: 0.30, 2030: 0.27}},
    "Tier 3: Items $500–$2,000":      {"rate": 0.05, "gmv_share": {2026: 0.30, 2027: 0.35, 2028: 0.35, 2029: 0.35, 2030: 0.35}},
    "Tier 4: Items $2,000+":          {"rate": 0.03, "gmv_share": {2026: 0.10, 2027: 0.15, 2028: 0.20, 2029: 0.25, 2030: 0.30}},
}

# Co-Creation Revenue (revenue share from collaborative designs)
RRG_COCREATION = {
    2026: 25_000,
    2027: 120_000,
    2028: 400_000,
    2029: 1_000_000,
    2030: 2_500_000,
}

# RRG Operating Expenses (leaner — leverages Via Labs infrastructure)
RRG_OPEX = {
    2026: {
        "Design & Creative":       120_000,
        "Brand Partnerships":       60_000,
        "Marketing & Community":    80_000,
        "Operations & Fulfillment": 100_000,
        "Platform & Tech":          40_000,
        "General & Admin":          50_000,
    },
    2027: {
        "Design & Creative":       200_000,
        "Brand Partnerships":      120_000,
        "Marketing & Community":   180_000,
        "Operations & Fulfillment": 200_000,
        "Platform & Tech":          80_000,
        "General & Admin":          70_000,
    },
    2028: {
        "Design & Creative":       350_000,
        "Brand Partnerships":      250_000,
        "Marketing & Community":   400_000,
        "Operations & Fulfillment": 450_000,
        "Platform & Tech":         150_000,
        "General & Admin":         100_000,
    },
    2029: {
        "Design & Creative":       500_000,
        "Brand Partnerships":      400_000,
        "Marketing & Community":   800_000,
        "Operations & Fulfillment": 900_000,
        "Platform & Tech":         250_000,
        "General & Admin":         150_000,
    },
    2030: {
        "Design & Creative":       700_000,
        "Brand Partnerships":      600_000,
        "Marketing & Community":   1_500_000,
        "Operations & Fulfillment": 1_800_000,
        "Platform & Tech":         400_000,
        "General & Admin":         250_000,
    },
}


# =============================================================================
# CALCULATIONS
# =============================================================================

def calc_via_labs_pl():
    """Calculate Via Labs P&L for each year."""
    years = list(range(2026, 2031))
    results = []

    for yr in years:
        merchants = VIA_MERCHANTS[yr]

        # 1. Subscription Revenue
        sub_revenue = 0
        sub_breakdown = {}
        for tier_name, tier in VIA_SUB_TIERS.items():
            tier_merchants = merchants * tier["share"][yr]
            annual = tier_merchants * tier["monthly"] * 12
            sub_breakdown[tier_name] = round(annual)
            sub_revenue += annual
        sub_revenue = round(sub_revenue)

        # 2. Micro Transaction Fees
        tx = VIA_TRANSACTIONS[yr]
        total_intents_annual = merchants * tx["intents_per_merchant_mo"] * 12
        total_quotes = total_intents_annual * tx["quote_rate"]
        total_transactions = total_quotes * tx["conversion_rate"]

        intent_fees = total_intents_annual * VIA_MICRO_FEES["intent_fee"]
        quote_fees = total_quotes * VIA_MICRO_FEES["quote_fee"]

        # Transaction fee: 0.5% capped at $2
        per_tx_fee = min(tx["aov"] * VIA_MICRO_FEES["transaction_fee_pct"], VIA_MICRO_FEES["transaction_fee_cap"])
        transaction_fees = total_transactions * per_tx_fee

        micro_fee_total = round(intent_fees + quote_fees + transaction_fees)
        gmv = round(total_transactions * tx["aov"])

        # 3. Agent Top-Up Margin
        topup = VIA_TOPUP[yr]
        topup_revenue = round(topup["volume"] * topup["margin_pct"])

        # Total Revenue
        total_revenue = sub_revenue + micro_fee_total + topup_revenue

        # Operating Expenses
        opex = VIA_OPEX[yr]
        total_opex = sum(opex.values())

        # COGS (payment processing, infrastructure variable costs)
        cogs_pct = 0.12  # 12% of revenue
        cogs = round(total_revenue * cogs_pct)

        gross_profit = total_revenue - cogs
        ebitda = gross_profit - total_opex

        results.append({
            "year": yr,
            "merchants": merchants,
            "subscription_revenue": sub_revenue,
            "sub_breakdown": sub_breakdown,
            "micro_fee_revenue": micro_fee_total,
            "micro_detail": {
                "intent_fees": round(intent_fees),
                "quote_fees": round(quote_fees),
                "transaction_fees": round(transaction_fees),
                "total_intents": round(total_intents_annual),
                "total_quotes": round(total_quotes),
                "total_transactions": round(total_transactions),
                "gmv": gmv,
            },
            "topup_revenue": topup_revenue,
            "total_revenue": total_revenue,
            "cogs": cogs,
            "gross_profit": gross_profit,
            "gross_margin_pct": round(gross_profit / total_revenue * 100, 1) if total_revenue else 0,
            "opex": opex,
            "total_opex": total_opex,
            "ebitda": ebitda,
            "ebitda_margin_pct": round(ebitda / total_revenue * 100, 1) if total_revenue else 0,
        })

    return results


def calc_rrg_pl():
    """Calculate RealReal Genuine P&L for each year."""
    years = list(range(2026, 2031))
    results = []

    for yr in years:
        gmv = RRG_GMV[yr]

        # Commission Revenue (staggered)
        commission_revenue = 0
        commission_breakdown = {}
        for tier_name, tier in RRG_COMMISSION_TIERS.items():
            tier_gmv = gmv * tier["gmv_share"][yr]
            tier_commission = tier_gmv * tier["rate"]
            commission_breakdown[tier_name] = {
                "gmv": round(tier_gmv),
                "rate": f"{tier['rate']*100:.0f}%",
                "commission": round(tier_commission),
            }
            commission_revenue += tier_commission
        commission_revenue = round(commission_revenue)

        # Blended commission rate
        blended_rate = commission_revenue / gmv * 100 if gmv else 0

        # Co-Creation Revenue
        cocreation = RRG_COCREATION[yr]

        # Total Revenue
        total_revenue = commission_revenue + cocreation

        # COGS (payment processing, fulfillment variable costs)
        cogs_pct = 0.18  # 18% — higher due to physical goods handling
        cogs = round(total_revenue * cogs_pct)

        gross_profit = total_revenue - cogs

        # Operating Expenses
        opex = RRG_OPEX[yr]
        total_opex = sum(opex.values())

        ebitda = gross_profit - total_opex

        results.append({
            "year": yr,
            "gmv": gmv,
            "commission_revenue": commission_revenue,
            "blended_commission_pct": round(blended_rate, 1),
            "commission_breakdown": commission_breakdown,
            "cocreation_revenue": cocreation,
            "total_revenue": total_revenue,
            "cogs": cogs,
            "gross_profit": gross_profit,
            "gross_margin_pct": round(gross_profit / total_revenue * 100, 1) if total_revenue else 0,
            "opex": opex,
            "total_opex": total_opex,
            "ebitda": ebitda,
            "ebitda_margin_pct": round(ebitda / total_revenue * 100, 1) if total_revenue else 0,
        })

    return results


# =============================================================================
# CSV OUTPUT
# =============================================================================

def write_via_labs_csv(results):
    path = os.path.join(OUTPUT_DIR, "via_labs_pl.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["VIA LABS — P&L PROJECTION (USD)", "", "", "", "", ""])
        w.writerow(["", "2026", "2027", "2028", "2029", "2030"])
        w.writerow([])

        # KPIs
        w.writerow(["KEY METRICS"])
        w.writerow(["Active Merchants"] + [r["merchants"] for r in results])
        w.writerow(["Platform GMV"] + [f'{r["micro_detail"]["gmv"]:,}' for r in results])
        w.writerow(["Total Transactions"] + [f'{r["micro_detail"]["total_transactions"]:,.0f}' for r in results])
        w.writerow(["Total Intents Processed"] + [f'{r["micro_detail"]["total_intents"]:,.0f}' for r in results])
        w.writerow([])

        # Revenue
        w.writerow(["REVENUE"])
        w.writerow([])
        w.writerow(["  Merchant Subscriptions"] + [f'{r["subscription_revenue"]:,}' for r in results])
        for tier_name in VIA_SUB_TIERS:
            w.writerow([f"    {tier_name}"] + [f'{r["sub_breakdown"][tier_name]:,}' for r in results])
        w.writerow([])
        w.writerow(["  Micro Transaction Fees"] + [f'{r["micro_fee_revenue"]:,}' for r in results])
        w.writerow(["    Intent Fees ($0.005/intent)"] + [f'{r["micro_detail"]["intent_fees"]:,}' for r in results])
        w.writerow(["    Quote Fees ($0.01/quote)"] + [f'{r["micro_detail"]["quote_fees"]:,}' for r in results])
        w.writerow(["    Transaction Fees (0.5% capped $2)"] + [f'{r["micro_detail"]["transaction_fees"]:,}' for r in results])
        w.writerow([])
        w.writerow(["  Agent Top-Up Margins"] + [f'{r["topup_revenue"]:,}' for r in results])
        w.writerow([])
        w.writerow(["TOTAL REVENUE"] + [f'{r["total_revenue"]:,}' for r in results])
        w.writerow([])

        # COGS & Gross Profit
        w.writerow(["Cost of Revenue (12%)"] + [f'({r["cogs"]:,})' for r in results])
        w.writerow(["GROSS PROFIT"] + [f'{r["gross_profit"]:,}' for r in results])
        w.writerow(["Gross Margin %"] + [f'{r["gross_margin_pct"]}%' for r in results])
        w.writerow([])

        # Operating Expenses
        w.writerow(["OPERATING EXPENSES"])
        opex_keys = list(VIA_OPEX[2026].keys())
        for key in opex_keys:
            w.writerow([f"  {key}"] + [f'({r["opex"][key]:,})' for r in results])
        w.writerow(["TOTAL OPERATING EXPENSES"] + [f'({r["total_opex"]:,})' for r in results])
        w.writerow([])

        # EBITDA
        w.writerow(["EBITDA"] + [f'{r["ebitda"]:,}' for r in results])
        w.writerow(["EBITDA Margin %"] + [f'{r["ebitda_margin_pct"]}%' for r in results])
        w.writerow([])

        # YoY Growth
        w.writerow(["GROWTH METRICS"])
        rev_list = [r["total_revenue"] for r in results]
        growth = ["—"] + [f'{((rev_list[i]-rev_list[i-1])/rev_list[i-1]*100):.0f}%' for i in range(1, len(rev_list))]
        w.writerow(["Revenue YoY Growth"] + growth)

    print(f"  Written: {path}")
    return path


def write_rrg_csv(results):
    path = os.path.join(OUTPUT_DIR, "rrg_pl.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["REALREAL GENUINE — P&L PROJECTION (USD)", "", "", "", "", ""])
        w.writerow(["", "2026", "2027", "2028", "2029", "2030"])
        w.writerow([])

        # KPIs
        w.writerow(["KEY METRICS"])
        w.writerow(["Gross Merchandise Value (GMV)"] + [f'{r["gmv"]:,}' for r in results])
        w.writerow(["Blended Commission Rate"] + [f'{r["blended_commission_pct"]}%' for r in results])
        w.writerow([])

        # Revenue
        w.writerow(["REVENUE"])
        w.writerow([])
        w.writerow(["  Platform Commission"] + [f'{r["commission_revenue"]:,}' for r in results])
        for tier_name in RRG_COMMISSION_TIERS:
            rates = [r["commission_breakdown"][tier_name] for r in results]
            w.writerow([f"    {tier_name}"] + [f'{d["commission"]:,} ({d["rate"]} of {d["gmv"]:,})' for d in rates])
        w.writerow([])
        w.writerow(["  Co-Creation Revenue Share"] + [f'{r["cocreation_revenue"]:,}' for r in results])
        w.writerow([])
        w.writerow(["TOTAL REVENUE"] + [f'{r["total_revenue"]:,}' for r in results])
        w.writerow([])

        # COGS & Gross Profit
        w.writerow(["Cost of Revenue (18%)"] + [f'({r["cogs"]:,})' for r in results])
        w.writerow(["GROSS PROFIT"] + [f'{r["gross_profit"]:,}' for r in results])
        w.writerow(["Gross Margin %"] + [f'{r["gross_margin_pct"]}%' for r in results])
        w.writerow([])

        # Operating Expenses
        w.writerow(["OPERATING EXPENSES"])
        opex_keys = list(RRG_OPEX[2026].keys())
        for key in opex_keys:
            w.writerow([f"  {key}"] + [f'({r["opex"][key]:,})' for r in results])
        w.writerow(["TOTAL OPERATING EXPENSES"] + [f'({r["total_opex"]:,})' for r in results])
        w.writerow([])

        # EBITDA
        w.writerow(["EBITDA"] + [f'{r["ebitda"]:,}' for r in results])
        w.writerow(["EBITDA Margin %"] + [f'{r["ebitda_margin_pct"]}%' for r in results])
        w.writerow([])

        # YoY Growth
        w.writerow(["GROWTH METRICS"])
        rev_list = [r["total_revenue"] for r in results]
        growth = ["—"] + [f'{((rev_list[i]-rev_list[i-1])/rev_list[i-1]*100):.0f}%' for i in range(1, len(rev_list))]
        w.writerow(["Revenue YoY Growth"] + growth)

    print(f"  Written: {path}")
    return path


def write_combined_csv(via_results, rrg_results):
    path = os.path.join(OUTPUT_DIR, "combined_pl.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["COMBINED GROUP P&L — VIA LABS + REALREAL GENUINE (USD)", "", "", "", "", ""])
        w.writerow(["", "2026", "2027", "2028", "2029", "2030"])
        w.writerow([])

        # Combined Revenue by Stream
        w.writerow(["REVENUE BY ENTITY"])
        w.writerow([])
        w.writerow(["Via Labs"])
        w.writerow(["  Merchant Subscriptions"] + [f'{v["subscription_revenue"]:,}' for v in via_results])
        w.writerow(["  Micro Transaction Fees"] + [f'{v["micro_fee_revenue"]:,}' for v in via_results])
        w.writerow(["  Agent Top-Up Margins"] + [f'{v["topup_revenue"]:,}' for v in via_results])
        via_rev = [v["total_revenue"] for v in via_results]
        w.writerow(["  Via Labs Total"] + [f'{r:,}' for r in via_rev])
        w.writerow([])

        w.writerow(["RealReal Genuine"])
        w.writerow(["  Platform Commission"] + [f'{r["commission_revenue"]:,}' for r in rrg_results])
        w.writerow(["  Co-Creation Revenue"] + [f'{r["cocreation_revenue"]:,}' for r in rrg_results])
        rrg_rev = [r["total_revenue"] for r in rrg_results]
        w.writerow(["  RRG Total"] + [f'{r:,}' for r in rrg_rev])
        w.writerow([])

        combined_rev = [v + r for v, r in zip(via_rev, rrg_rev)]
        w.writerow(["COMBINED TOTAL REVENUE"] + [f'{r:,}' for r in combined_rev])
        w.writerow([])

        # Revenue Mix
        w.writerow(["REVENUE MIX"])
        w.writerow(["Via Labs %"] + [f'{v/c*100:.0f}%' for v, c in zip(via_rev, combined_rev)])
        w.writerow(["RealReal Genuine %"] + [f'{r/c*100:.0f}%' for r, c in zip(rrg_rev, combined_rev)])
        w.writerow([])

        # Combined COGS
        combined_cogs = [v["cogs"] + r["cogs"] for v, r in zip(via_results, rrg_results)]
        combined_gp = [v["gross_profit"] + r["gross_profit"] for v, r in zip(via_results, rrg_results)]
        w.writerow(["COMBINED COST OF REVENUE"] + [f'({c:,})' for c in combined_cogs])
        w.writerow(["COMBINED GROSS PROFIT"] + [f'{g:,}' for g in combined_gp])
        gm = [round(g/r*100, 1) if r else 0 for g, r in zip(combined_gp, combined_rev)]
        w.writerow(["Combined Gross Margin %"] + [f'{m}%' for m in gm])
        w.writerow([])

        # Combined OpEx
        combined_opex = [v["total_opex"] + r["total_opex"] for v, r in zip(via_results, rrg_results)]
        w.writerow(["COMBINED OPERATING EXPENSES"] + [f'({o:,})' for o in combined_opex])
        w.writerow([])

        # Combined EBITDA
        combined_ebitda = [v["ebitda"] + r["ebitda"] for v, r in zip(via_results, rrg_results)]
        w.writerow(["COMBINED EBITDA"] + [f'{e:,}' for e in combined_ebitda])
        em = [round(e/r*100, 1) if r else 0 for e, r in zip(combined_ebitda, combined_rev)]
        w.writerow(["Combined EBITDA Margin %"] + [f'{m}%' for m in em])
        w.writerow([])

        # Cash Position (simplified — starting with $5M raise)
        w.writerow(["INDICATIVE CASH POSITION"])
        cash = ASSUMPTIONS["raise_amount"]
        cash_positions = []
        for e in combined_ebitda:
            cash += e
            cash_positions.append(cash)
        w.writerow(["Cash Balance (cumulative)"] + [f'{c:,}' for c in cash_positions])
        w.writerow([])

        # Growth
        w.writerow(["GROWTH METRICS"])
        growth = ["—"] + [f'{((combined_rev[i]-combined_rev[i-1])/combined_rev[i-1]*100):.0f}%' for i in range(1, len(combined_rev))]
        w.writerow(["Combined Revenue YoY Growth"] + growth)

        # Revenue per employee estimate
        w.writerow([])
        w.writerow(["FUNDRAISE CONTEXT"])
        w.writerow(["Seed Raise"] + [f'$5,000,000'] + [""] * 4)
        w.writerow(["Use of Funds: 24-month runway with revenue acceleration"])
        w.writerow(["Target: Series A readiness by end of Year 2 (2027)"])
        arr_list = [r * 1 for r in combined_rev]  # already annual
        w.writerow(["ARR at Year-End"] + [f'{a:,}' for a in arr_list])
        multiples = [round(a / ASSUMPTIONS["raise_amount"], 1) for a in arr_list]
        w.writerow(["ARR / Raise Multiple"] + [f'{m}x' for m in multiples])

    print(f"  Written: {path}")
    return path


def write_assumptions_csv(via_results, rrg_results):
    path = os.path.join(OUTPUT_DIR, "assumptions.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["KEY ASSUMPTIONS & NOTES"])
        w.writerow([])
        w.writerow(["FUNDRAISE"])
        w.writerow(["Amount", "$5,000,000 USD"])
        w.writerow(["Stage", "Seed"])
        w.writerow(["Runway Target", "24 months"])
        w.writerow(["HQ", "Singapore"])
        w.writerow([])

        w.writerow(["VIA LABS — SUBSCRIPTION PRICING"])
        w.writerow(["Tier", "Monthly Price", "Description"])
        w.writerow(["Starter", "$0", "Free tier — agent-readable catalogue, basic MCP endpoint"])
        w.writerow(["Growth", "$149/mo", "Advanced config, analytics dashboard, priority intent routing"])
        w.writerow(["Professional", "$499/mo", "Custom agent rules, multi-channel, API access, dedicated support"])
        w.writerow(["Enterprise", "$1,499/mo", "White-glove onboarding, SLA, custom integrations, dedicated CSM"])
        w.writerow([])

        w.writerow(["VIA LABS — MICRO FEE STRUCTURE"])
        w.writerow(["Fee Type", "Rate", "Notes"])
        w.writerow(["Intent Broadcast Fee", "$0.005 per intent", "Charged to merchant when intent is received"])
        w.writerow(["Quote Generation Fee", "$0.01 per quote", "Charged when merchant agent generates a quote"])
        w.writerow(["Transaction Fee", "0.5% of order value", "Capped at $2.00 per transaction"])
        w.writerow([])

        w.writerow(["VIA LABS — AGENT TOP-UP MARGINS"])
        w.writerow(["Year", "Volume", "Margin %", "Notes"])
        for yr in range(2026, 2031):
            t = VIA_TOPUP[yr]
            w.writerow([yr, f'${t["volume"]:,}', f'{t["margin_pct"]*100:.1f}%', "Fiat-to-stablecoin conversion margin"])
        w.writerow([])

        w.writerow(["REALREAL GENUINE — COMMISSION TIERS"])
        w.writerow(["Tier", "Item Price Range", "Commission Rate"])
        w.writerow(["Tier 1", "Under $100", "10%"])
        w.writerow(["Tier 2", "$100 – $500", "7%"])
        w.writerow(["Tier 3", "$500 – $2,000", "5%"])
        w.writerow(["Tier 4", "$2,000+", "3%"])
        w.writerow(["Note: As GMV grows, mix shifts toward higher-value items (lower blended rate)"])
        w.writerow([])

        w.writerow(["MERCHANT GROWTH ASSUMPTIONS"])
        w.writerow(["Year", "Active Merchants", "Intents/Merchant/Mo", "Quote Rate", "Conversion Rate", "AOV"])
        for yr in range(2026, 2031):
            tx = VIA_TRANSACTIONS[yr]
            w.writerow([yr, VIA_MERCHANTS[yr], tx["intents_per_merchant_mo"],
                        f'{tx["quote_rate"]*100:.0f}%', f'{tx["conversion_rate"]*100:.0f}%', f'${tx["aov"]}'])
        w.writerow([])

        w.writerow(["COST ASSUMPTIONS"])
        w.writerow(["Via Labs COGS", "12% of revenue", "Payment processing, infrastructure variable costs"])
        w.writerow(["RRG COGS", "18% of revenue", "Payment processing, fulfillment, physical goods handling"])

    print(f"  Written: {path}")
    return path


# =============================================================================
# SUMMARY PRINT
# =============================================================================

def print_summary(via_results, rrg_results):
    print("\n" + "=" * 80)
    print("DRAFT P&L PROJECTIONS — SUMMARY")
    print("=" * 80)

    print("\n--- VIA LABS ---")
    print(f"{'Year':<8} {'Merchants':>10} {'Revenue':>14} {'Gross Profit':>14} {'EBITDA':>14} {'EBITDA %':>10}")
    print("-" * 72)
    for r in via_results:
        print(f'{r["year"]:<8} {r["merchants"]:>10,} {r["total_revenue"]:>14,} {r["gross_profit"]:>14,} {r["ebitda"]:>14,} {r["ebitda_margin_pct"]:>9.1f}%')

    print("\n--- REALREAL GENUINE ---")
    print(f"{'Year':<8} {'GMV':>12} {'Revenue':>14} {'Gross Profit':>14} {'EBITDA':>14} {'EBITDA %':>10}")
    print("-" * 74)
    for r in rrg_results:
        print(f'{r["year"]:<8} {r["gmv"]:>12,} {r["total_revenue"]:>14,} {r["gross_profit"]:>14,} {r["ebitda"]:>14,} {r["ebitda_margin_pct"]:>9.1f}%')

    print("\n--- COMBINED ---")
    print(f"{'Year':<8} {'Combined Rev':>14} {'Combined EBITDA':>16} {'Cash Position':>14}")
    print("-" * 54)
    cash = 5_000_000
    for v, r in zip(via_results, rrg_results):
        rev = v["total_revenue"] + r["total_revenue"]
        ebitda = v["ebitda"] + r["ebitda"]
        cash += ebitda
        print(f'{v["year"]:<8} {rev:>14,} {ebitda:>16,} {cash:>14,}')

    print("\n" + "=" * 80)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print("Generating P&L projections...")
    via_results = calc_via_labs_pl()
    rrg_results = calc_rrg_pl()

    write_via_labs_csv(via_results)
    write_rrg_csv(rrg_results)
    write_combined_csv(via_results, rrg_results)
    write_assumptions_csv(via_results, rrg_results)

    print_summary(via_results, rrg_results)
    print("\nDone. CSV files ready in projections/ directory.")
