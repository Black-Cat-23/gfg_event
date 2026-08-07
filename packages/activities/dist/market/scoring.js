export function calculatePortfolioValue(cash, holdings, companies, currentPrices) {
    let portfolioValue = cash;
    for (const company of companies) {
        const key = company.name;
        const shares = holdings[key] || 0;
        const price = currentPrices[key] ?? company.initialPrice;
        portfolioValue += shares * price;
    }
    return Math.round(portfolioValue * 100) / 100;
}
