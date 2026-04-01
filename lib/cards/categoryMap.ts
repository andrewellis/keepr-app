/**
 * Maps product categories returned by the scan/identification pipeline
 * to card spending categories used in card_category_rates.
 *
 * The scan pipeline (app/api/scan/route.ts) returns categories from CATEGORY_KEYWORDS:
 *   'Apparel & Accessories', 'Shoes', 'Electronics', 'Home & Garden',
 *   'Beauty', 'Sports', 'Books', 'General'
 *
 * Claude may also return more freeform category strings via mapToCategory().
 * We handle both the structured values and common freeform variants.
 *
 * Valid card categories (from card_category_rates.category check constraint):
 *   'online_shopping' | 'groceries' | 'dining' | 'travel' | 'gas' |
 *   'drugstore' | 'home_improvement' | 'entertainment' | 'electronics' |
 *   'clothing_apparel' | 'fitness_sports' | 'other'
 */

const CATEGORY_MAP: Record<string, string> = {
  // Electronics
  'electronics': 'electronics',
  'Electronics': 'electronics',

  // Apparel / Shoes
  'Apparel & Accessories': 'clothing_apparel',
  'apparel & accessories': 'clothing_apparel',
  'apparel': 'clothing_apparel',
  'Apparel': 'clothing_apparel',
  'clothing': 'clothing_apparel',
  'Clothing': 'clothing_apparel',
  'Shoes': 'clothing_apparel',
  'shoes': 'clothing_apparel',
  'footwear': 'clothing_apparel',
  'Footwear': 'clothing_apparel',
  'fashion': 'clothing_apparel',
  'Fashion': 'clothing_apparel',

  // Home & Garden / Home Improvement
  'Home & Garden': 'home_improvement',
  'home & garden': 'home_improvement',
  'home': 'home_improvement',
  'Home': 'home_improvement',
  'garden': 'home_improvement',
  'Garden': 'home_improvement',
  'furniture': 'home_improvement',
  'Furniture': 'home_improvement',
  'tools': 'home_improvement',
  'Tools': 'home_improvement',
  'hardware': 'home_improvement',
  'Hardware': 'home_improvement',
  'kitchen': 'home_improvement',
  'Kitchen': 'home_improvement',
  'home improvement': 'home_improvement',
  'Home Improvement': 'home_improvement',

  // Groceries / Food
  'groceries': 'groceries',
  'Groceries': 'groceries',
  'food': 'groceries',
  'Food': 'groceries',
  'pantry': 'groceries',
  'Pantry': 'groceries',
  'grocery': 'groceries',
  'Grocery': 'groceries',

  // Dining
  'dining': 'dining',
  'Dining': 'dining',
  'restaurant': 'dining',
  'Restaurant': 'dining',

  // Sports / Fitness
  'Sports': 'fitness_sports',
  'sports': 'fitness_sports',
  'fitness': 'fitness_sports',
  'Fitness': 'fitness_sports',
  'gym': 'fitness_sports',
  'Gym': 'fitness_sports',
  'athletic': 'fitness_sports',
  'Athletic': 'fitness_sports',
  'exercise': 'fitness_sports',
  'Exercise': 'fitness_sports',
  'fitness_sports': 'fitness_sports',

  // Books / Entertainment / Media
  'Books': 'entertainment',
  'books': 'entertainment',
  'book': 'entertainment',
  'Book': 'entertainment',
  'media': 'entertainment',
  'Media': 'entertainment',
  'software': 'entertainment',
  'Software': 'entertainment',
  'streaming': 'entertainment',
  'Streaming': 'entertainment',
  'entertainment': 'entertainment',
  'Entertainment': 'entertainment',
  'music': 'entertainment',
  'Music': 'entertainment',
  'games': 'entertainment',
  'Games': 'entertainment',
  'gaming': 'entertainment',
  'Gaming': 'entertainment',

  // Beauty / Drugstore
  'Beauty': 'drugstore',
  'beauty': 'drugstore',
  'skincare': 'drugstore',
  'Skincare': 'drugstore',
  'cosmetics': 'drugstore',
  'Cosmetics': 'drugstore',
  'pharmacy': 'drugstore',
  'Pharmacy': 'drugstore',
  'drugstore': 'drugstore',

  // Travel
  'travel': 'travel',
  'Travel': 'travel',

  // Gas
  'gas': 'gas',
  'Gas': 'gas',
  'fuel': 'gas',
  'Fuel': 'gas',

  // Online Shopping (catch-all for generic online)
  'online': 'online_shopping',
  'Online': 'online_shopping',
  'online shopping': 'online_shopping',
  'Online Shopping': 'online_shopping',
}

/**
 * Maps a product category string (from the scan/identification pipeline)
 * to a card spending category used in card_category_rates.
 *
 * Falls back to 'other' for unrecognized categories.
 */
export function getCardCategory(productCategory: string): string {
  if (!productCategory) return 'other'

  // Exact match first
  const exact = CATEGORY_MAP[productCategory]
  if (exact) return exact

  // Case-insensitive substring match
  const lower = productCategory.toLowerCase()

  if (lower.includes('electron') || lower.includes('phone') || lower.includes('laptop') ||
      lower.includes('computer') || lower.includes('tablet') || lower.includes('headphone') ||
      lower.includes('speaker') || lower.includes('camera') || lower.includes('tv') ||
      lower.includes('monitor') || lower.includes('keyboard') || lower.includes('charger')) {
    return 'electronics'
  }

  if (lower.includes('apparel') || lower.includes('cloth') || lower.includes('shoe') ||
      lower.includes('fashion') || lower.includes('wear') || lower.includes('shirt') ||
      lower.includes('dress') || lower.includes('jacket') || lower.includes('pant') ||
      lower.includes('sneaker') || lower.includes('boot') || lower.includes('sandal')) {
    return 'clothing_apparel'
  }

  if (lower.includes('grocer') || lower.includes('food') || lower.includes('pantry') ||
      lower.includes('supermarket')) {
    return 'groceries'
  }

  if (lower.includes('dining') || lower.includes('restaurant') || lower.includes('cafe') ||
      lower.includes('coffee')) {
    return 'dining'
  }

  if (lower.includes('home') || lower.includes('garden') || lower.includes('furniture') ||
      lower.includes('kitchen') || lower.includes('tool') || lower.includes('hardware') ||
      lower.includes('decor')) {
    return 'home_improvement'
  }

  if (lower.includes('sport') || lower.includes('fitness') || lower.includes('gym') ||
      lower.includes('athletic') || lower.includes('exercise') || lower.includes('yoga') ||
      lower.includes('bike') || lower.includes('bicycle') || lower.includes('weight') ||
      lower.includes('dumbbell')) {
    return 'fitness_sports'
  }

  if (lower.includes('book') || lower.includes('media') || lower.includes('software') ||
      lower.includes('stream') || lower.includes('music') || lower.includes('game') ||
      lower.includes('entertain')) {
    return 'entertainment'
  }

  if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('skincare') ||
      lower.includes('makeup') || lower.includes('pharmacy') || lower.includes('drug')) {
    return 'drugstore'
  }

  if (lower.includes('travel') || lower.includes('hotel') || lower.includes('flight') ||
      lower.includes('airline')) {
    return 'travel'
  }

  if (lower.includes('gas') || lower.includes('fuel')) {
    return 'gas'
  }

  return 'other'
}
