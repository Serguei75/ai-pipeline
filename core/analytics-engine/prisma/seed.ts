// Seed CPM benchmarks from research data
// Source: Research document — Tier-1 market analysis 2025-2026
// CPM = Cost per 1000 impressions (what advertisers pay)
// RPM = Revenue per 1000 impressions (what creators receive ≈ CPM * 0.55)

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

type NicheKey = 'FINANCE' | 'SAAS' | 'EDUCATION' | 'HEALTH' | 'TECH' | 'MARKETING' | 'CRYPTO'

// Tier-1 market CPM ranges (USD) — Q1 2026 estimates
// Based on Google Ads cost data + creator community reports
const BENCHMARKS: Array<{
  niche: NicheKey
  market: string
  cpmMin: number
  cpmMax: number
  cpmAvg: number
  avgCtr: number
  avgRetention: number
}> = [
  // ─── FINANCE — TOP CPM NICHE ───────────────────────────────────
  { niche: 'FINANCE', market: 'US', cpmMin: 15, cpmMax: 50, cpmAvg: 32.50, avgCtr: 4.8, avgRetention: 42 },
  { niche: 'FINANCE', market: 'NO', cpmMin: 14, cpmMax: 48, cpmAvg: 31.00, avgCtr: 4.5, avgRetention: 41 },
  { niche: 'FINANCE', market: 'CH', cpmMin: 14, cpmMax: 46, cpmAvg: 30.00, avgCtr: 4.5, avgRetention: 41 },
  { niche: 'FINANCE', market: 'AU', cpmMin: 10, cpmMax: 35, cpmAvg: 22.50, avgCtr: 4.2, avgRetention: 40 },
  { niche: 'FINANCE', market: 'CA', cpmMin: 11, cpmMax: 38, cpmAvg: 24.50, avgCtr: 4.3, avgRetention: 40 },
  { niche: 'FINANCE', market: 'DE', cpmMin: 11, cpmMax: 36, cpmAvg: 23.50, avgCtr: 4.0, avgRetention: 39 },

  // ─── SAAS ─────────────────────────────────────────────────────────
  { niche: 'SAAS', market: 'US', cpmMin: 10, cpmMax: 25, cpmAvg: 17.50, avgCtr: 4.0, avgRetention: 45 },
  { niche: 'SAAS', market: 'AU', cpmMin: 7, cpmMax: 18, cpmAvg: 12.50, avgCtr: 3.8, avgRetention: 44 },
  { niche: 'SAAS', market: 'CA', cpmMin: 8, cpmMax: 20, cpmAvg: 14.00, avgCtr: 3.9, avgRetention: 44 },
  { niche: 'SAAS', market: 'DE', cpmMin: 8, cpmMax: 19, cpmAvg: 13.50, avgCtr: 3.7, avgRetention: 43 },

  // ─── EDUCATION ──────────────────────────────────────────────────
  { niche: 'EDUCATION', market: 'US', cpmMin: 10, cpmMax: 25, cpmAvg: 17.50, avgCtr: 5.2, avgRetention: 48 },
  { niche: 'EDUCATION', market: 'AU', cpmMin: 7, cpmMax: 18, cpmAvg: 12.50, avgCtr: 5.0, avgRetention: 47 },
  { niche: 'EDUCATION', market: 'CA', cpmMin: 8, cpmMax: 20, cpmAvg: 14.00, avgCtr: 5.0, avgRetention: 47 },
  { niche: 'EDUCATION', market: 'DE', cpmMin: 8, cpmMax: 19, cpmAvg: 13.50, avgCtr: 4.8, avgRetention: 46 },

  // ─── HEALTH ─────────────────────────────────────────────────────────
  { niche: 'HEALTH', market: 'US', cpmMin: 8, cpmMax: 15, cpmAvg: 11.50, avgCtr: 3.5, avgRetention: 44 },
  { niche: 'HEALTH', market: 'AU', cpmMin: 6, cpmMax: 11, cpmAvg: 8.50, avgCtr: 3.3, avgRetention: 43 },
  { niche: 'HEALTH', market: 'CA', cpmMin: 7, cpmMax: 12, cpmAvg: 9.50, avgCtr: 3.4, avgRetention: 43 },

  // ─── TECH ────────────────────────────────────────────────────────────
  { niche: 'TECH', market: 'US', cpmMin: 8, cpmMax: 12, cpmAvg: 10.00, avgCtr: 3.8, avgRetention: 46 },
  { niche: 'TECH', market: 'AU', cpmMin: 6, cpmMax: 9, cpmAvg: 7.50, avgCtr: 3.6, avgRetention: 45 },
  { niche: 'TECH', market: 'DE', cpmMin: 6, cpmMax: 9, cpmAvg: 7.50, avgCtr: 3.5, avgRetention: 45 },

  // ─── MARKETING ────────────────────────────────────────────────────
  { niche: 'MARKETING', market: 'US', cpmMin: 6, cpmMax: 10, cpmAvg: 8.00, avgCtr: 3.5, avgRetention: 43 },
  { niche: 'MARKETING', market: 'AU', cpmMin: 5, cpmMax: 8, cpmAvg: 6.50, avgCtr: 3.3, avgRetention: 42 },

  // ─── CRYPTO ───────────────────────────────────────────────────────
  { niche: 'CRYPTO', market: 'US', cpmMin: 5, cpmMax: 12, cpmAvg: 8.50, avgCtr: 4.0, avgRetention: 41 },
  { niche: 'CRYPTO', market: 'AU', cpmMin: 4, cpmMax: 9, cpmAvg: 6.50, avgCtr: 3.8, avgRetention: 40 },
]

async function seed() {
  console.log('🌱 Seeding niche CPM benchmarks...')
  console.log('   Source: Research — Tier-1 market analysis Q1 2026\n')

  for (const b of BENCHMARKS) {
    await db.nicheBenchmark.upsert({
      where: { niche_market: { niche: b.niche, market: b.market } },
      update: {
        cpmMin: b.cpmMin,
        cpmMax: b.cpmMax,
        cpmAvg: b.cpmAvg,
        avgCtr: b.avgCtr,
        avgRetention: b.avgRetention,
        updatedAt: new Date(),
      },
      create: {
        niche: b.niche,
        market: b.market,
        cpmMin: b.cpmMin,
        cpmMax: b.cpmMax,
        cpmAvg: b.cpmAvg,
        avgCtr: b.avgCtr,
        avgRetention: b.avgRetention,
        validFrom: new Date('2026-01-01'),
      },
    })
    console.log(`  ✓ ${b.niche.padEnd(12)} ${b.market}  CPM $${b.cpmMin}-$${b.cpmMax} (avg $${b.cpmAvg})`)
  }

  console.log(`\n✅ ${BENCHMARKS.length} niche benchmarks seeded`)
  await db.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
