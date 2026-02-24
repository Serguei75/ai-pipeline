// Seed default voice profiles
// Based on ElevenLabs premade voices + channel strategy from research

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ElevenLabs premade voice IDs (verified stable voices)
const VOICE_IDS = {
  // FUEL channel: energetic, fast-paced, clear
  JOSH: 'TxGEqnHWrfWFTfGW9XjX',    // Josh — deep, energetic
  ADAM: 'pNInz6obpgDQGcFmaJgB',    // Adam — narrative, clear

  // INTELLECTUAL channel: authoritative, warm, trustworthy
  ANTONI: 'ErXwobaYiN019PkySvjV',  // Antoni — well-rounded, authoritative
  ARNOLD: 'VR6AewLTigWG4xSOukaG',  // Arnold — confident, commanding

  // Female options
  BELLA: 'EXAVITQu4vr4xnSDxMaL',   // Bella — soft, warm
  RACHEL: '21m00Tcm4TlvDq8ikWAM',  // Rachel — calm, professional
}

async function seed() {
  console.log('🌱 Seeding default voice profiles...')

  const profiles = [
    // ── FUEL channel profiles ──────────────────────────────────────
    {
      name: 'fuel-en-josh',
      description: 'FUEL channel — English, energetic, fast-paced',
      channelType: 'FUEL' as const,
      language: 'en',
      elevenLabsVoiceId: VOICE_IDS.JOSH,
      stability: 0.55,          // slightly less stable = more dynamic
      similarityBoost: 0.80,
      style: 0.60,              // more expressive for FUEL
      speakerBoost: true,
      speed: 1.05,              // slightly faster for energy
      isDefault: true,
    },
    {
      name: 'fuel-de-adam',
      description: 'FUEL channel — German, clear, energetic',
      channelType: 'FUEL' as const,
      language: 'de',
      elevenLabsVoiceId: VOICE_IDS.ADAM,
      stability: 0.60,
      similarityBoost: 0.75,
      style: 0.50,
      speakerBoost: true,
      speed: 1.0,
      isDefault: false,
    },

    // ── INTELLECTUAL channel profiles ──────────────────────────
    {
      name: 'intellectual-en-antoni',
      description: 'INTELLECTUAL channel — English, authoritative, warm brand voice',
      channelType: 'INTELLECTUAL' as const,
      language: 'en',
      elevenLabsVoiceId: VOICE_IDS.ANTONI,
      stability: 0.75,          // more stable = consistent brand voice
      similarityBoost: 0.75,
      style: 0.45,              // measured, not too expressive
      speakerBoost: true,
      speed: 0.95,              // slightly slower for clarity on CTV
      isDefault: true,
    },
    {
      name: 'intellectual-de-arnold',
      description: 'INTELLECTUAL channel — German, commanding, trustworthy',
      channelType: 'INTELLECTUAL' as const,
      language: 'de',
      elevenLabsVoiceId: VOICE_IDS.ARNOLD,
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0.40,
      speakerBoost: true,
      speed: 0.95,
      isDefault: false,
    },
    {
      name: 'intellectual-en-rachel',
      description: 'INTELLECTUAL channel — English female, calm, professional (alternative)',
      channelType: 'INTELLECTUAL' as const,
      language: 'en',
      elevenLabsVoiceId: VOICE_IDS.RACHEL,
      stability: 0.80,
      similarityBoost: 0.70,
      style: 0.35,
      speakerBoost: true,
      speed: 0.95,
      isDefault: false,
    },
  ]

  for (const profile of profiles) {
    await db.voiceProfile.upsert({
      where: { name: profile.name },
      update: profile,
      create: profile,
    })
    console.log(`  ✓ ${profile.name}`)
  }

  console.log(`\n✅ ${profiles.length} voice profiles seeded`)
  await db.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
