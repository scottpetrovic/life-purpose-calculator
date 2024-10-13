class TaxCalculator {
    constructor() {
        this.taxBracketsByYear = {
            2022: [
                { rate: 0.37, min: 539900 },
                { rate: 0.35, min: 215950 },
                { rate: 0.32, min: 170050 },
                { rate: 0.24, min: 89075 },
                { rate: 0.22, min: 41775 },
                { rate: 0.12, min: 10275 },
                { rate: 0.10, min: 0 }
            ],
            2023: [
                { rate: 0.37, min: 578125 },
                { rate: 0.35, min: 231250 },
                { rate: 0.32, min: 182100 },
                { rate: 0.24, min: 95375 },
                { rate: 0.22, min: 44725 },
                { rate: 0.12, min: 11000 },
                { rate: 0.10, min: 0 }
            ]
        };
    }

    extrapolateTaxBrackets(year) {
        const latestYear = Math.max(...Object.keys(this.taxBracketsByYear).map(Number));
        const baseYear = latestYear - 1;
        
        if (year <= latestYear) {
            return this.taxBracketsByYear[year];
        }

        const yearDiff = year - latestYear;
        const baseBrackets = this.taxBracketsByYear[baseYear];
        const latestBrackets = this.taxBracketsByYear[latestYear];

        return latestBrackets.map((bracket, index) => {
            const baseMin = baseBrackets[index].min;
            const latestMin = bracket.min;
            const yearlyChange = latestMin - baseMin;
            const projectedMin = Math.round(latestMin + yearlyChange * yearDiff);
            
            return {
                rate: bracket.rate,
                min: projectedMin
            };
        });
    }

    calculateEffectiveTaxRate(income, year) {
        const currentYear = new Date().getFullYear();
        year = year || currentYear;

        let brackets;
        if (this.taxBracketsByYear[year]) {
            brackets = this.taxBracketsByYear[year];
        } else {
            brackets = this.extrapolateTaxBrackets(year);
        }

        let totalTax = 0;
        let remainingIncome = income;

        for (let i = 0; i < brackets.length - 1; i++) {
            const currentBracket = brackets[i];
            const nextBracket = brackets[i + 1];
            
            if (income > currentBracket.min) {
                const taxableInThisBracket = Math.min(remainingIncome, currentBracket.min - nextBracket.min);
                totalTax += taxableInThisBracket * currentBracket.rate;
                remainingIncome -= taxableInThisBracket;
            }
        }

        if (remainingIncome > 0) {
            totalTax += remainingIncome * brackets[brackets.length - 1].rate;
        }

        const effectiveRate = totalTax / income;

        return {
            year: year,
            brackets: brackets,
            effectiveRate: effectiveRate,
            effectiveRatePercentage: (effectiveRate * 100).toFixed(2) + '%',
            totalTax: totalTax,
            incomeAfterTax: income - totalTax
        };
    }

}