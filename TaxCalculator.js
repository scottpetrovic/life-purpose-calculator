class TaxCalculator {
    constructor() {
        this.taxBracketsByYearAndStatus = {
            2022: {
                single: [
                    { rate: 0.37, min: 539900 },
                    { rate: 0.35, min: 215950 },
                    { rate: 0.32, min: 170050 },
                    { rate: 0.24, min: 89075 },
                    { rate: 0.22, min: 41775 },
                    { rate: 0.12, min: 10275 },
                    { rate: 0.10, min: 0 }
                ],
                marriedJointly: [
                    { rate: 0.37, min: 647850 },
                    { rate: 0.35, min: 431900 },
                    { rate: 0.32, min: 340100 },
                    { rate: 0.24, min: 178150 },
                    { rate: 0.22, min: 83550 },
                    { rate: 0.12, min: 20550 },
                    { rate: 0.10, min: 0 }
                ],
                marriedSeparately: [
                    { rate: 0.37, min: 323925 },
                    { rate: 0.35, min: 215950 },
                    { rate: 0.32, min: 170050 },
                    { rate: 0.24, min: 89075 },
                    { rate: 0.22, min: 41775 },
                    { rate: 0.12, min: 10275 },
                    { rate: 0.10, min: 0 }
                ],
                headOfHousehold: [
                    { rate: 0.37, min: 539900 },
                    { rate: 0.35, min: 215950 },
                    { rate: 0.32, min: 170050 },
                    { rate: 0.24, min: 89050 },
                    { rate: 0.22, min: 55900 },
                    { rate: 0.12, min: 14650 },
                    { rate: 0.10, min: 0 }
                ]
            },
            2023: {
                single: [
                    { rate: 0.37, min: 578125 },
                    { rate: 0.35, min: 231250 },
                    { rate: 0.32, min: 182100 },
                    { rate: 0.24, min: 95375 },
                    { rate: 0.22, min: 44725 },
                    { rate: 0.12, min: 11000 },
                    { rate: 0.10, min: 0 }
                ],
                marriedJointly: [
                    { rate: 0.37, min: 693750 },
                    { rate: 0.35, min: 462500 },
                    { rate: 0.32, min: 364200 },
                    { rate: 0.24, min: 190750 },
                    { rate: 0.22, min: 89450 },
                    { rate: 0.12, min: 22000 },
                    { rate: 0.10, min: 0 }
                ],
                marriedSeparately: [
                    { rate: 0.37, min: 346875 },
                    { rate: 0.35, min: 231250 },
                    { rate: 0.32, min: 182100 },
                    { rate: 0.24, min: 95375 },
                    { rate: 0.22, min: 44725 },
                    { rate: 0.12, min: 11000 },
                    { rate: 0.10, min: 0 }
                ],
                headOfHousehold: [
                    { rate: 0.37, min: 578100 },
                    { rate: 0.35, min: 231250 },
                    { rate: 0.32, min: 182100 },
                    { rate: 0.24, min: 95350 },
                    { rate: 0.22, min: 59850 },
                    { rate: 0.12, min: 15700 },
                    { rate: 0.10, min: 0 }
                ]
            }
        };
    }

    extrapolateTaxBrackets(year, filingStatus) {
        const latestYear = Math.max(...Object.keys(this.taxBracketsByYearAndStatus).map(Number));
        const baseYear = latestYear - 1;
        
        if (year <= latestYear) {
            return this.taxBracketsByYearAndStatus[year][filingStatus];
        }

        const yearDiff = year - latestYear;
        const baseBrackets = this.taxBracketsByYearAndStatus[baseYear][filingStatus];
        const latestBrackets = this.taxBracketsByYearAndStatus[latestYear][filingStatus];

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

    calculateEffectiveTaxRate(income, year, filingStatus) {
        const currentYear = new Date().getFullYear();
        year = year || currentYear;
    
        let brackets;
        if (this.taxBracketsByYearAndStatus[year]) {
            brackets = this.taxBracketsByYearAndStatus[year][filingStatus];
        } else {
            brackets = this.extrapolateTaxBrackets(year, filingStatus);
        }
    
        // Explicitly sort brackets from lowest to highest
        brackets = brackets.sort((a, b) => a.min - b.min);
    
        let totalTax = 0;
        let remainingIncome = income;
        let marginalTaxRate = 0;
    
        for (let i = 0; i < brackets.length; i++) {
            const currentBracket = brackets[i];
            const nextBracket = brackets[i + 1];
            
            if (income > currentBracket.min) {
                const taxableInThisBracket = nextBracket 
                    ? Math.min(remainingIncome, nextBracket.min - currentBracket.min)
                    : remainingIncome;
                
                const taxForBracket = taxableInThisBracket * currentBracket.rate;
                totalTax += taxForBracket;
                remainingIncome -= taxableInThisBracket;
                marginalTaxRate = currentBracket.rate;
            }
        }
    
        const effectiveRate = totalTax / income;
    
        return {
            year: year,
            filingStatus: filingStatus,
            brackets: brackets,
            effectiveRate: effectiveRate,
            effectiveRatePercentage: (effectiveRate * 100).toFixed(2) + '%',
            marginalRate: marginalTaxRate,
            marginalRatePercentage: (marginalTaxRate * 100).toFixed(2) + '%',
            totalTax: totalTax,
            incomeAfterTax: income - totalTax
        };
    }
}