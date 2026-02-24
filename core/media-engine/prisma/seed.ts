// Seed default avatar profiles for HeyGen
// These are HeyGen stock avatars suitable for business/finance/tech content

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// HeyGen stock avatar IDs (business/professional tier)
// https://docs.heygen.com/docs/streaming-avatar-sdk-reference#avatar-list
const HEYGEN_AVATARS = {
  // Male business avatars
  TYLER: 'Tyler-incasualsuit-20220721',
  JOSHUA: 'Joshua_public_pro2_20230809',
  DANIEL: 'Daniel-business-20230717',

  // Female business avatars
  ANNA: 'Anna_public_3_20240108',
  SOFIA: 'Sofia-inblackdress-20220628',
}

async function seed() {
  console.log('🌱 Seeding default avatar profiles...')

  const profiles = [
    // ── FUEL channel ───────────────────────────────────────────────
    {
      name: 'fuel-en-tyler',
      description: 'FUEL channel — casual business, energetic, EN',
      channelType: 'FUEL' as const,
      language: 'en',
      heygenAvatarId: HEYGEN_AVATARS.TYLER,
      heygenAvatarStyle: 'normal',
      backgroundType: 'color',
      backgroundColor: '#111827',
      isDefault: true,
    },
    {
      name: 'fuel-en-anna',
      description: 'FUEL channel — professional female, energetic, EN',
      channelType: 'FUEL' as const,
      language: 'en',
      heygenAvatarId: HEYGEN_AVATARS.ANNA,
      heygenAvatarStyle: 'normal',
      backgroundType: 'color',
      backgroundColor: '#111827',
      isDefault: false,
    },

    // ── INTELLECTUAL channel ───────────────────────────────────────
    {
      name: 'intellectual-en-joshua',
      description: 'INTELLECTUAL channel — authoritative, dark studio, EN',
      channelType: 'INTELLECTUAL' as const,
      language: 'en',
      heygenAvatarId: HEYGEN_AVATARS.JOSHUA,
      heygenAvatarStyle: 'normal',
      backgroundType: 'color',
      backgroundColor: '#0A0A0A',  // dark CTV-optimized background
      isDefault: true,
    },
    {
      name: 'intellectual-en-daniel',
      description: 'INTELLECTUAL channel — business formal, EN',
      channelType: 'INTELLECTUAL' as const,
      language: 'en',
      heygenAvatarId: HEYGEN_AVATARS.DANIEL,
      heygenAvatarStyle: 'normal',
      backgroundType: 'color',
      backgroundColor: '#0A0A0A',
      isDefault: false,
    },
    {
      name: 'intellectual-en-sofia',
      description: 'INTELLECTUAL channel — professional female, EN',
      channelType: 'INTELLECTUAL' as const,
      language: 'en',
      heygenAvatarId: HEYGEN_AVATARS.SOFIA,
      heygenAvatarStyle: 'normal',
      backgroundType: 'color',
      backgroundColor: '#0A0A0A',
      isDefault: false,
    },
  ]

  for (const profile of profiles) {
    await db.avatarProfile.upsert({
      where: { name: profile.name },
      update: profile,
      create: profile,
    })
    console.log(`  ✓ ${profile.name}`)
  }

  console.log(`\n✅ ${profiles.length} avatar profiles seeded`)
  await db.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
