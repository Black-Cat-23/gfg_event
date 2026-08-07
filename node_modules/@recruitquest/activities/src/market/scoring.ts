import { Company, Portfolio } from '@recruitquest/types';

export function calculatePortfolioValue(
  cash: number,
  holdings: Record<string, number>,
  companies: Company[],
  currentPrices: Record<string, number>
): number {
  let portfolioValue = cash;

  for (const company of companies) {
    const key = company.name;
    const shares = holdings[key] || 0;
    const price = currentPrices[key] ?? company.initialPrice;
    portfolioValue += shares * price;
  }

  return Math.round(portfolioValue * 100) / 100;
}
