export interface CardDefault {
  name: string
  issuer: string
  network: 'Visa' | 'Mastercard' | 'Amex' | 'Discover'
  base_rate: number
  has_rotating_categories: boolean
  category_rates: {
    category: string
    rate: number
    is_rotating: boolean
    notes?: string
  }[]
}

export const CARD_DEFAULTS: CardDefault[] = [
  // ── Chase ──────────────────────────────────────────────────────────────────
  {
    name: 'Chase Freedom Flex',
    issuer: 'Chase',
    network: 'Visa',
    base_rate: 1.0,
    has_rotating_categories: true,
    category_rates: [
      { category: 'dining', rate: 3.0, is_rotating: false },
      { category: 'drugstore', rate: 3.0, is_rotating: false },
      { category: 'travel', rate: 5.0, is_rotating: false },
      {
        category: 'online_shopping',
        rate: 5.0,
        is_rotating: true,
        notes: 'Up to $1,500/quarter combined',
      },
      {
        category: 'groceries',
        rate: 5.0,
        is_rotating: true,
        notes: 'Up to $1,500/quarter combined',
      },
      {
        category: 'gas',
        rate: 5.0,
        is_rotating: true,
        notes: 'Up to $1,500/quarter combined',
      },
      {
        category: 'entertainment',
        rate: 5.0,
        is_rotating: true,
        notes: 'Up to $1,500/quarter combined',
      },
    ],
  },
  {
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    network: 'Visa',
    base_rate: 1.5,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 3.0, is_rotating: false },
      { category: 'drugstore', rate: 3.0, is_rotating: false },
      { category: 'travel', rate: 5.0, is_rotating: false },
    ],
  },
  {
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    network: 'Visa',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 3.0, is_rotating: false },
      { category: 'groceries', rate: 3.0, is_rotating: false },
      { category: 'travel', rate: 2.0, is_rotating: false },
      { category: 'entertainment', rate: 2.0, is_rotating: false },
      { category: 'online_shopping', rate: 3.0, is_rotating: false },
    ],
  },
  {
    name: 'Chase Sapphire Reserve',
    issuer: 'Chase',
    network: 'Visa',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 3.0, is_rotating: false },
      { category: 'travel', rate: 3.0, is_rotating: false },
    ],
  },
  {
    name: 'Chase Amazon Prime Visa',
    issuer: 'Chase',
    network: 'Visa',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      {
        category: 'online_shopping',
        rate: 5.0,
        is_rotating: false,
        notes: 'Amazon and Whole Foods only',
      },
      { category: 'dining', rate: 2.0, is_rotating: false },
      { category: 'gas', rate: 2.0, is_rotating: false },
    ],
  },

  // ── Capital One ────────────────────────────────────────────────────────────
  {
    name: 'Capital One SavorOne',
    issuer: 'Capital One',
    network: 'Mastercard',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 3.0, is_rotating: false },
      { category: 'entertainment', rate: 3.0, is_rotating: false },
      { category: 'groceries', rate: 3.0, is_rotating: false },
      { category: 'online_shopping', rate: 3.0, is_rotating: false },
    ],
  },
  {
    name: 'Capital One Savor',
    issuer: 'Capital One',
    network: 'Mastercard',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 4.0, is_rotating: false },
      { category: 'entertainment', rate: 4.0, is_rotating: false },
      { category: 'groceries', rate: 4.0, is_rotating: false },
    ],
  },
  {
    name: 'Capital One Quicksilver',
    issuer: 'Capital One',
    network: 'Visa',
    base_rate: 1.5,
    has_rotating_categories: false,
    category_rates: [],
  },
  {
    name: 'Capital One Venture X',
    issuer: 'Capital One',
    network: 'Visa',
    base_rate: 2.0,
    has_rotating_categories: false,
    category_rates: [{ category: 'travel', rate: 5.0, is_rotating: false }],
  },

  // ── American Express ───────────────────────────────────────────────────────
  {
    name: 'Amex Blue Cash Preferred',
    issuer: 'American Express',
    network: 'Amex',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      {
        category: 'groceries',
        rate: 6.0,
        is_rotating: false,
        notes: 'US supermarkets only',
      },
      { category: 'online_shopping', rate: 6.0, is_rotating: false },
      { category: 'gas', rate: 3.0, is_rotating: false },
      { category: 'travel', rate: 3.0, is_rotating: false },
    ],
  },
  {
    name: 'Amex Blue Cash Everyday',
    issuer: 'American Express',
    network: 'Amex',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'groceries', rate: 3.0, is_rotating: false },
      { category: 'online_shopping', rate: 3.0, is_rotating: false },
      { category: 'gas', rate: 3.0, is_rotating: false },
    ],
  },
  {
    name: 'Amex Gold',
    issuer: 'American Express',
    network: 'Amex',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 4.0, is_rotating: false },
      {
        category: 'groceries',
        rate: 4.0,
        is_rotating: false,
        notes: 'US supermarkets only',
      },
      { category: 'travel', rate: 3.0, is_rotating: false },
    ],
  },
  {
    name: 'Amex Platinum',
    issuer: 'American Express',
    network: 'Amex',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      {
        category: 'travel',
        rate: 5.0,
        is_rotating: false,
        notes: 'Flights booked directly with airlines or via Amex Travel',
      },
    ],
  },

  // ── Citi ───────────────────────────────────────────────────────────────────
  {
    name: 'Citi Double Cash',
    issuer: 'Citi',
    network: 'Mastercard',
    base_rate: 2.0,
    has_rotating_categories: false,
    category_rates: [],
  },
  {
    name: 'Citi Premier',
    issuer: 'Citi',
    network: 'Mastercard',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [
      { category: 'dining', rate: 3.0, is_rotating: false },
      { category: 'groceries', rate: 3.0, is_rotating: false },
      { category: 'gas', rate: 3.0, is_rotating: false },
      { category: 'travel', rate: 3.0, is_rotating: false },
      { category: 'online_shopping', rate: 3.0, is_rotating: false },
    ],
  },

  // ── Discover ───────────────────────────────────────────────────────────────
  {
    name: 'Discover it Cash Back',
    issuer: 'Discover',
    network: 'Discover',
    base_rate: 1.0,
    has_rotating_categories: true,
    category_rates: [
      {
        category: 'online_shopping',
        rate: 5.0,
        is_rotating: true,
        notes: 'Quarterly rotating categories',
      },
      {
        category: 'groceries',
        rate: 5.0,
        is_rotating: true,
        notes: 'Quarterly rotating categories',
      },
      {
        category: 'dining',
        rate: 5.0,
        is_rotating: true,
        notes: 'Quarterly rotating categories',
      },
      {
        category: 'gas',
        rate: 5.0,
        is_rotating: true,
        notes: 'Quarterly rotating categories',
      },
    ],
  },

  // ── Bank of America ────────────────────────────────────────────────────────
  {
    name: 'BofA Unlimited Cash Rewards',
    issuer: 'Bank of America',
    network: 'Visa',
    base_rate: 1.5,
    has_rotating_categories: false,
    category_rates: [],
  },

  // ── Apple ──────────────────────────────────────────────────────────────────
  {
    name: 'Apple Card',
    issuer: 'Apple',
    network: 'Mastercard',
    base_rate: 1.0,
    has_rotating_categories: false,
    category_rates: [],
  },

  // ── Wells Fargo ────────────────────────────────────────────────────────────
  {
    name: 'Wells Fargo Active Cash',
    issuer: 'Wells Fargo',
    network: 'Visa',
    base_rate: 2.0,
    has_rotating_categories: false,
    category_rates: [],
  },

  // ── US Bank ────────────────────────────────────────────────────────────────
  {
    name: 'US Bank Cash+',
    issuer: 'US Bank',
    network: 'Visa',
    base_rate: 1.0,
    has_rotating_categories: true,
    category_rates: [
      { category: 'groceries', rate: 2.0, is_rotating: false },
      {
        category: 'gas',
        rate: 2.0,
        is_rotating: false,
        notes: '5% on two user-selected categories — not tracked in real time',
      },
    ],
  },

  // ── PayPal ─────────────────────────────────────────────────────────────────
  {
    name: 'PayPal Cashback Mastercard',
    issuer: 'PayPal',
    network: 'Mastercard',
    base_rate: 2.0,
    has_rotating_categories: false,
    category_rates: [],
  },
]
