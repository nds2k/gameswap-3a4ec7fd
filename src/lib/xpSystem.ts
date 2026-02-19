// XP & Rank System for GameSwapp

export interface Rank {
  name: string;
  nameEn: string;
  emoji: string;
  minXP: number;
  maxXP: number | null;
  multiplier: number;
  color: string;
  bgColor: string;
  perks: string[];
  freeBoostsPerMonth: number;
}

export const RANKS: Rank[] = [
  {
    name: "Bronze",
    nameEn: "bronze",
    emoji: "🥉",
    minXP: 0,
    maxXP: 499,
    multiplier: 1.0,
    color: "text-amber-700",
    bgColor: "bg-amber-700/10",
    perks: ["Accès de base"],
    freeBoostsPerMonth: 0,
  },
  {
    name: "Silver",
    nameEn: "silver",
    emoji: "🥈",
    minXP: 500,
    maxXP: 1499,
    multiplier: 1.05,
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
    perks: ["1 boost XP gratuit/mois", "+5% visibilité"],
    freeBoostsPerMonth: 1,
  },
  {
    name: "Gold",
    nameEn: "gold",
    emoji: "🥇",
    minXP: 1500,
    maxXP: 3999,
    multiplier: 1.1,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    perks: ["2 boosts XP gratuits/mois", "Badge « Vendeur de confiance »", "+10% visibilité"],
    freeBoostsPerMonth: 2,
  },
  {
    name: "Platinum",
    nameEn: "platinum",
    emoji: "💎",
    minXP: 4000,
    maxXP: 9999,
    multiplier: 1.15,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    perks: ["Profil mis en avant par catégorie", "3 boosts XP gratuits/mois", "+15% visibilité"],
    freeBoostsPerMonth: 3,
  },
  {
    name: "Elite",
    nameEn: "elite",
    emoji: "👑",
    minXP: 10000,
    maxXP: null,
    multiplier: 1.2,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    perks: ["Accès prioritaire à la page d'accueil", "5 boosts XP gratuits/mois", "+20% visibilité", "Suggestions d'échanges prioritaires"],
    freeBoostsPerMonth: 5,
  },
];

export const XP_REWARDS = {
  SALE: 100,
  PURCHASE: 40,
  TRADE: 120,
  FIVE_STAR_REVIEW: 20,
  DAILY_LOGIN: 5,
  LISTING_POSTED: 10,
} as const;

export const XP_BOOST_COSTS = {
  "48H": 300,
  "7D": 900,
} as const;

export const PAID_BOOST_OPTIONS = [
  { id: "PAID_24H", label: "24h Boost", duration: "24h", price: 2.99, priceStr: "2,99€" },
  { id: "PAID_72H", label: "72h Boost", duration: "72h", price: 5.99, priceStr: "5,99€" },
  { id: "PAID_7D", label: "7 Jours", duration: "7 jours", price: 11.99, priceStr: "11,99€" },
] as const;

export function getUserRank(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(xp: number): Rank | null {
  const current = getUserRank(xp);
  const currentIndex = RANKS.findIndex((r) => r.name === current.name);
  return currentIndex < RANKS.length - 1 ? RANKS[currentIndex + 1] : null;
}

export function getXPProgress(xp: number): number {
  const current = getUserRank(xp);
  const next = getNextRank(xp);
  if (!next) return 100;
  const rangeXP = next.minXP - current.minXP;
  const userXP = xp - current.minXP;
  return Math.min((userXP / rangeXP) * 100, 100);
}

export function calculateListingScore({
  relevance,
  sellerReliability,
  sellerXP,
  isBoosted,
}: {
  relevance: number;
  sellerReliability: number;
  sellerXP: number;
  isBoosted?: boolean;
}): number {
  const rank = getUserRank(sellerXP);
  let score =
    relevance * 0.6 +
    sellerReliability * 0.25 +
    rank.multiplier * 0.15;

  if (isBoosted) score += 0.25;
  return score;
}
