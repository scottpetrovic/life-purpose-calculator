class SocialSecurityCalculator {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.baseYear = 2024;
        this.baseBendPoint1 = 1174;
        this.baseBendPoint2 = 7078;
        this.annualIncreasePercent = 1.03;
    }

    calculateAIME(earningsHistory) {
        const validEarnings = earningsHistory.filter(earning => earning > 0);
        const sortedEarnings = validEarnings.sort((a, b) => b - a);
        const yearsToConsider = Math.min(35, sortedEarnings.length);
        const topEarnings = sortedEarnings.slice(0, yearsToConsider);
        const totalEarnings = topEarnings.reduce((sum, earning) => sum + earning, 0);
        return totalEarnings / (35 * 12); // Convert to monthly
    }

    calculatePIA(aime, year) {
        const { bendPoint1, bendPoint2 } = this.getBendPoints(year);

        let pia = 0;

        if (aime <= bendPoint1) {
            pia = aime * 0.9;
        } else if (aime <= bendPoint2) {
            pia = (bendPoint1 * 0.9) + ((aime - bendPoint1) * 0.32);
        } else {
            pia = (bendPoint1 * 0.9) + ((bendPoint2 - bendPoint1) * 0.32) + ((aime - bendPoint2) * 0.15);
        }

        return pia;
    }

    getBendPoints(year) {
        const yearsSinceBase = year - this.baseYear;
        const inflationFactor = Math.pow(this.annualIncreasePercent, yearsSinceBase);
        
        return {
            bendPoint1: Math.round(this.baseBendPoint1 * inflationFactor),
            bendPoint2: Math.round(this.baseBendPoint2 * inflationFactor)
        };
    }

    calculateRetirementBenefits(birthYear, retirementAge, earningsHistory) {
        const age = this.currentYear - birthYear;
        const fullRetirementAge = this.getFullRetirementAge(birthYear);
        
        const aime = this.calculateAIME(earningsHistory);
        const pia = this.calculatePIA(aime, this.currentYear);
        
        let adjustedPia;
        
        if (retirementAge < fullRetirementAge) {
            const reduction = (fullRetirementAge - retirementAge) * 12 * 0.005556;  // 5.56% per year
            adjustedPia = pia * (1 - reduction);
        } else if (retirementAge > fullRetirementAge) {
            const increase = (retirementAge - fullRetirementAge) * 12 * 0.00667;  // 8% per year
            adjustedPia = pia * (1 + increase);
        } else {
            adjustedPia = pia;
        }
        
        return adjustedPia;
    }

    getFullRetirementAge(birthYear) {
        if (birthYear <= 1937) {
            return 65;
        } else if (birthYear <= 1942) {
            return 65 + (birthYear - 1937) * 2 / 12;
        } else if (birthYear <= 1954) {
            return 66;
        } else if (birthYear <= 1959) {
            return 66 + (birthYear - 1954) * 2 / 12;
        } else {
            return 67;
        }
    }
}