// ═══════════════════════════════════════════════════════════
// BLUNNIT Constants
// ═══════════════════════════════════════════════════════════

export const TIERS = {
  anonymous: {
    reflectionsPerSession: 3,
    label: 'Guest',
  },
  free: {
    reflectionsPerWeek: 10,
    label: 'Free',
  },
  paid: {
    reflectionsPerWeek: Infinity,
    label: 'Full Access',
    priceMonthly: 9.99,
    priceYearly: 79,
  },
} as const;

export const CONFRONTATION_LEVELS = [
  { key: 'gentle', label: 'Gentle', desc: 'A soft mirror. Space to breathe.' },
  { key: 'clear', label: 'Clear', desc: 'Honest reflection. What you might not see.' },
  { key: 'piercing', label: 'Piercing', desc: 'The illusion stripped bare.' },
] as const;
