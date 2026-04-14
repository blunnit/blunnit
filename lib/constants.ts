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

