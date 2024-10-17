var projectedMonthlyExpensesAtRetirement;
let socialSecurityStartingMonthlyBenefit;
let accumulationData = [];


function estimateSocialSecurityBenefit(averageIndexedMonthlyEarnings, fullRetirementAge, retirementAge) {
    // Constants
    const FIRST_BEND_POINT = 1024;
    const SECOND_BEND_POINT = 6172;
    const FIRST_MULTIPLIER = 0.9;
    const SECOND_MULTIPLIER = 0.32;
    const THIRD_MULTIPLIER = 0.15;

    // Calculate PIA (Primary Insurance Amount)
    let pia = 0;
    if (averageIndexedMonthlyEarnings <= FIRST_BEND_POINT) {
        pia = averageIndexedMonthlyEarnings * FIRST_MULTIPLIER;
    } else if (averageIndexedMonthlyEarnings <= SECOND_BEND_POINT) {
        pia = (FIRST_BEND_POINT * FIRST_MULTIPLIER) +
            ((averageIndexedMonthlyEarnings - FIRST_BEND_POINT) * SECOND_MULTIPLIER);
    } else {
        pia = (FIRST_BEND_POINT * FIRST_MULTIPLIER) +
            ((SECOND_BEND_POINT - FIRST_BEND_POINT) * SECOND_MULTIPLIER) +
            ((averageIndexedMonthlyEarnings - SECOND_BEND_POINT) * THIRD_MULTIPLIER);
    }

    // Adjust for early or late retirement
    const monthsAdjustment = (retirementAge - fullRetirementAge) * 12;
    let adjustmentFactor = 1;

    if (monthsAdjustment < 0) {
        // Early retirement reduction
        adjustmentFactor = 1 - (Math.abs(monthsAdjustment) * (5/9) * 0.01);
    } else if (monthsAdjustment > 0) {
        // Delayed retirement credits
        adjustmentFactor = 1 + (monthsAdjustment * (8/12) * 0.01);
    }

    // Calculate final benefit
    const estimatedBenefit = pia * adjustmentFactor;

    return Math.round(estimatedBenefit * 100) / 100; // Round to 2 decimal places
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function openTab(evt, tabName) {
  var i, tabContent, tabLinks;
  tabContent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabContent.length; i++) {
    tabContent[i].style.display = "none";
  }
  tabLinks = document.getElementsByClassName("tab");
  for (i = 0; i < tabLinks.length; i++) {
    tabLinks[i].className = tabLinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "flex";
  evt.currentTarget.className += " active";

  // Calculate distribution phase when switching to the distribution tab
  if (tabName === "distribution") {
    calculateDistributionPhase();
  }
}

// This is for calculating social security payout
function calculateAverageMonthlyIncomeOverLife(data) {

    if (data.length === 0) {
        return 0; // Check if the array is empty
    }

    // Use reduce to sum up all income values
    const totalIncome = data.reduce((sum, entry) => sum + entry.income, 0);

    // Calculate and return the average
    const yearlyAverageIncom = totalIncome / data.length;
    return yearlyAverageIncom / 12;
}

function calculateAccumulationPhase() {
  const inputs = getAccumulationInputValues();
  accumulationData = [];
  let currentValues = {
    savings: inputs.currentSavings,
    income: inputs.annualIncome,
    contributions: inputs.monthlyContributions * 12,
    currentYear: new Date().getFullYear(),
  };

  // get filing status which affects how taxes are calculated
  const filingStatusSelect = document.getElementById('filing-status-input');

  for (let age = inputs.currentAge; age <= inputs.retirementAge; age++) {
    const yearData = calculateAccumulationYearlyData(
      age,
      inputs,
      currentValues,
      filingStatusSelect.value
    );
    accumulationData.push(yearData);

    currentValues = {
      savings: yearData.endAmount,
      income: yearData.income,
      contributions: yearData.contributions,
      currentYear: yearData.year + 1,
    };
  }

  // calculate the estimated living expenses when the person retires
  const yearsUntilRetirement = inputs.retirementAge - inputs.currentAge;

  projectedMonthlyExpensesAtRetirement = inputs.currentMonthlyExpenses *
    Math.pow(1 + inputs.inflationRate, yearsUntilRetirement);

  document.getElementById( "monthlyExpensesAtRetirement").innerHTML = 
    `${currencyFormatter.format(projectedMonthlyExpensesAtRetirement)} monthly expenses at retirement `;
  
  document.getElementById("monthlyExpensesAtRetirement").value =
    projectedMonthlyExpensesAtRetirement;

  updateAccumulationChart(accumulationData);
  updateAccumulationTable(accumulationData);
  updatePreretirementTaxTable(accumulationData)

  // put the final amount that we saved for retirement in a couple areas
  document.getElementById("retirementSavings").value = Math.round(
    accumulationData[accumulationData.length - 1].endAmount).toLocaleString("en-US");
    document.getElementById("retirementLastAccumulation").innerHTML =  document.getElementById("retirementSavings").value

}

function calculateDistributionPhase() {
  const inputs = getDistributionInputValues();
  const distributionData = [];

  // calculate starting social security amount. fill
  // in the DOM element and provide a bit of info about this
  const aime = calculateAverageMonthlyIncomeOverLife(accumulationData); // Average Indexed Monthly Earnings
  const fra = 67; // Full Retirement Age
  const retirementAge = getAccumulationInputValues().retirementAge
  socialSecurityStartingMonthlyBenefit = estimateSocialSecurityBenefit(aime, fra, retirementAge);
  document.getElementById("monthlySocialSecurity").value = currencyFormatter.format(socialSecurityStartingMonthlyBenefit)


  let currentValues = {
    savings: inputs.retirementSavings,
    age: inputs.retirementAge,
    currentYear:
      new Date().getFullYear() +
      (inputs.retirementAge - getAccumulationInputValues().currentAge),
  };

  for (let age = inputs.retirementAge; age <= inputs.lifeExpectancy; age++) {
    const yearData = calculateDistributionYearlyData(
      age,
      inputs,
      currentValues
    );
    distributionData.push(yearData);

    currentValues = {
      savings: yearData.remainingSavings,
      age: age + 1,
      currentYear: yearData.year + 1,
    };

    if (yearData.remainingSavings <= 0) {
      // console.log(`Retirement savings depleted at age ${age}`);
      break;
    }
  }

  // update the DOM element with the final value from the distrubution data with our final savings retirementLastDistribution ID
  document.getElementById("retirementLastDistribution").innerHTML = Math.round(distributionData[distributionData.length - 1].remainingSavings).toLocaleString("en-US");

  // find out if we ran out of money before we hit retirement age. Find the age if we did
  let ageRanOutOfMoney = distributionData.findIndex((element) => element.remainingSavings <= 0);

  if(ageRanOutOfMoney !== -1) {
    document.getElementById("ran-out-of-money-message").innerHTML = `You ran out of money at age ${ageRanOutOfMoney + inputs.retirementAge}`; 
    document.getElementById("distribution-final-amount").style.display = "none";
  } else {
    document.getElementById("ran-out-of-money-message").innerHTML = `What you will die with`;
    document.getElementById("distribution-final-amount").style.display = "block";
  }


  updateDistributionChart(distributionData);
  updateDistributionTable(distributionData);
}

function getAccumulationInputValues() {
  return {
    currentAge: parseInt(document.getElementById("currentAge").value),
    annualIncome: parseFloat(
      document.getElementById("annualIncome").value.replace(/,/g, "")
    ),
    currentSavings: parseFloat(
      document.getElementById("currentSavings").value.replace(/,/g, "")
    ),
    monthlyContributions: parseFloat(
      document.getElementById("monthlyContributions").value.replace(/,/g, "")
    ),
    retirementAge: parseInt(document.getElementById("retirementAge").value),
    preReturnRate:
      parseFloat(document.getElementById("preReturnRate").value) / 100,
    inflationRate:
      parseFloat(document.getElementById("inflationRate").value) / 100,
    incomeIncrease:
      parseFloat(document.getElementById("incomeIncrease").value) / 100,
    currentMonthlyExpenses: parseFloat(
      document.getElementById("currentMonthlyExpenses").value.replace(/,/g, "")
    ),
  };
}

function getDistributionInputValues() {
  return {
    retirementSavings: parseFloat(
      document.getElementById("retirementSavings").value.replace(/,/g, "")
    ),
    monthlyBudget: parseFloat(
      document.getElementById("currentMonthlyExpenses").value
    ),
    otherIncome: parseFloat(
      document.getElementById("otherIncome").value.replace(/,/g, "")
    ),
    lifeExpectancy: parseInt(document.getElementById("lifeExpectancy").value),
    postReturnRate:
      parseFloat(document.getElementById("postReturnRate").value) / 100,
    inflationRate:
      parseFloat(document.getElementById("inflationRateDistribution").value) /
      100,
    retirementAge: parseInt(document.getElementById("retirementAge").value),
  };
}

function calculateAccumulationYearlyData(age, inputs, currentValues, taxFilingStatus) {
  const { preReturnRate, inflationRate, incomeIncrease } = inputs;
  const { savings, income, contributions, currentYear } = currentValues;

  const startAmount = savings;
  const investmentIncome = savings * preReturnRate;
  const newSavings = savings + contributions + investmentIncome;
  const newIncome = income * (1 + incomeIncrease);
  const newContributions = contributions ; // flat contributions


  // options are: single, marriedJointly, marriedSeparately, headOfHousehold
  const tax_calculator = new TaxCalculator();
  const taxInformationForYear = tax_calculator.calculateEffectiveTaxRate(newIncome, currentYear, taxFilingStatus);

  return {
    year: currentYear,
    age: age,
    income: newIncome,
    taxedIncome: taxInformationForYear,
    contributions: newContributions,
    investmentIncome: investmentIncome,
    startAmount: startAmount,
    endAmount: newSavings,
  };
}

function calculateDistributionYearlyData(age, inputs, currentValues) {
  const { otherIncome, postReturnRate, inflationRate } =
    inputs;
  
  const { savings, currentYear } = currentValues;
  
  const annualExpenses =  projectedMonthlyExpensesAtRetirement * 12 *
     Math.pow(1 + inflationRate, age - inputs.retirementAge);

  const annualSocialSecurity = socialSecurityStartingMonthlyBenefit * 12 *
      Math.pow(1 + inflationRate, age - inputs.retirementAge);
  
  const annualOtherIncome = otherIncome * 12 * 
      Math.pow(1 + inflationRate, age - inputs.retirementAge);
  
  const investmentIncome = savings * postReturnRate;
  const withdrawal = annualExpenses - annualSocialSecurity - annualOtherIncome - investmentIncome
  const remainingSavings = savings - withdrawal;

  return {
    year: currentYear,
    age: age,
    expenses: annualExpenses,
    socialSecurity: annualSocialSecurity,
    otherIncome: annualOtherIncome,
    investmentIncome: investmentIncome,
    withdrawal: withdrawal,
    remainingSavings: remainingSavings,
  };
}

function formatYAxis(value) {
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(2) + ' M';
  } 
  return '$' +  value + ' K';
}



function updateAccumulationChart(data) {
  const ctx = document.getElementById("accumulationChart").getContext("2d");

  const labels = data.map((d) => d.age);
  const savings = data.map((d) => d.endAmount / 1000); // Convert to thousands

  if (window.accumulationChart instanceof Chart) {
    window.accumulationChart.destroy();
  }

  // Create a linear gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Adjust the coordinates as needed
  gradient.addColorStop(0, 'rgba(75, 192, 192, 0.5)'); // Start color
  gradient.addColorStop(1, 'rgba(75, 192, 192, 0.03)'); // End color

  window.accumulationChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Investments",
          data: savings,
          borderColor: "#7dc2ff",
          borderWidth: 2,
          fill: true,
          backgroundColor: gradient, // Fill color (with transparency)
          pointBackgroundColor:'#7dc2ff', // Color of the data points
          pointRadius: 4, // Size of the points
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
            backgroundColor: 'rgba(240, 240, 240, 1.0)', // Background color
            titleColor: '#000', // Title text color
            bodyColor: '#000', // Body text color
            borderColor: 'rgba(255, 255, 255, 0.5)', // Border color
            borderWidth: 1, // Border width
            padding: 20, // Padding inside the tooltip
            cornerRadius: 5, // Rounded corners
            displayColors: false, // Hide color boxes
            callbacks: {
              title: function(tooltipItems) {
                return `${tooltipItems[0].label} Years Old`; // Use the label of the first item
            },
              label: function(tooltipItem) {
                  return currencyFormatter.format(tooltipItem.raw * 1000);
              }
          }
        },
       },
      scales: {
        x: {
          title: {
            display: true,
            text: "Age",
          },
        },
        y: {
          title: {
            display: false,
            text: "", // don't do a Y axis label as it should be obvious
          },
          ticks: {
            callback: function(value, index, values) {             
              return formatYAxis(value);
            }
          },
          beginAtZero: true,
        },
      },
    },
  });
}



function updateDistributionChart(data) {
  const ctx = document.getElementById("distributionChart").getContext("2d");

  const labels = data.map((d) => d.age);
  const savings = data.map((d) => d.remainingSavings / 1000); // Convert to thousands

  if (window.distributionChart instanceof Chart) {
    window.distributionChart.destroy();
  }

  // Create a linear gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Adjust the coordinates as needed
  gradient.addColorStop(0, 'rgba(58, 211, 99, 0.4)'); // Start color
  gradient.addColorStop(1, 'rgba(58, 211, 99, 0.03)'); // End color

  window.distributionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Remaining Savings",
          data: savings,
          borderColor: "#43a32c",
          borderWidth: 2,
          fill: true,
          backgroundColor: gradient, // Fill color (with transparency)
          pointBackgroundColor:'#43a32c', // Color of the data points
          pointRadius: 4, // Size of the points
          
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
            backgroundColor: 'rgba(240, 240, 240, 1.0)', // Background color
            titleColor: '#000', // Title text color
            bodyColor: '#000', // Body text color
            borderColor: 'rgba(255, 255, 255, 0.5)', // Border color
            borderWidth: 1, // Border width
            padding: 20, // Padding inside the tooltip
            cornerRadius: 5, // Rounded corners
            displayColors: false, // Hide color boxes
            callbacks: {
              title: function(tooltipItems) {
                return `${tooltipItems[0].label} Years Old`; // Use the label of the first item
            },
              label: function(tooltipItem) {
                  return currencyFormatter.format(tooltipItem.raw * 1000);
              }
          }
        },
       },
      scales: {
        x: {
          title: {
            display: true,
            text: "Age",
          },
        },
        y: {
          title: {
            display: false,
            text: "Amount",
          },
          ticks: {
            callback: function(value, index, values) {             
              return formatYAxis(value);
            }
          },
          beginAtZero: true,
        },
      },
    },
  });
}

function decimalToPercentage(decimal) {
  const percentage = decimal * 100;
  return percentage.toFixed(1) + '%';
}

const formatTaxBracket = (bracket, nextBracket) => {
  const rate = decimalToPercentage(bracket.rate);
  const minAmount = currencyFormatter.format(bracket.min);
  const maxAmount = nextBracket ? currencyFormatter.format(nextBracket.min - 0.01) : "and above";
  
  return ` ${rate} : ${minAmount} to ${maxAmount}`;
};

function updatePreretirementTaxTable(data) {

  const template = document.getElementById("taxesPreretirementTemplate");
  const content = template.content 
  const tbody = content.querySelector('tbody');
  tbody.innerHTML = "";

  data.forEach((row) => {

    // format/show estimated tax bracket breakdown
    const taxBracketBreakdown = row.taxedIncome.brackets
    .map((bracket, index, array) => {
      const nextBracket = array[index + 1];
      return formatTaxBracket(bracket, nextBracket);
    })
    .join("<br>");


  const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${row.age}</td>
        <td>${currencyFormatter.format(row.income) }</td> <!-- pretax income -->
        <td>${ currencyFormatter.format(row.taxedIncome.incomeAfterTax)   }</td>
        <td>${ currencyFormatter.format(row.taxedIncome.totalTax)   }</td>
        <td>${ row.taxedIncome.effectiveRatePercentage }</td>
        <td>${ row.taxedIncome.marginalRatePercentage }</td>
        <td>        
            <span class="tooltip-container">
                  <span class="tooltip-icon"> i </span>
                  <span class="tooltip-text">${taxBracketBreakdown}</span>
            </span>        
        </td>
      `;
      tbody.appendChild(tr);
  });

}

function updateAccumulationTable(data) {
  const tbody = document.querySelector("#accumulationTable tbody");
  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${row.year}</td>
          <td>${row.age}</td>
          <td>${currencyFormatter.format(row.income)} 
             <span class="small-notes">(${row.taxedIncome.effectiveRatePercentage} effective tax)</span>
          </td>
          <td>${currencyFormatter.format(row.contributions)}</td>
          <td>${currencyFormatter.format(row.investmentIncome)}</td>
          <td>${currencyFormatter.format(row.endAmount)}</td>
      `;
    tbody.appendChild(tr);
  });

}

function updateDistributionTable(data) {
  const tbody = document.querySelector("#distributionTable tbody");
  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${row.year}</td>
          <td>${row.age}</td>
          <td>${currencyFormatter.format(row.expenses)}</td>
          <td>${currencyFormatter.format(row.socialSecurity)}</td>
          <td>${currencyFormatter.format(row.investmentIncome)}</td>
          <td>${currencyFormatter.format(row.otherIncome)}</td>
          <td>${currencyFormatter.format(row.withdrawal)}</td>
          <td>${currencyFormatter.format(row.remainingSavings)}</td>
      `;
    tbody.appendChild(tr);
  });
}

function initializeMoneyInput(input) {
  input.value = formatMoney(input.value);
  setupMoneyInputListeners(input);
}

function setupMoneyInputListeners(input) {
  input.addEventListener("input", function () {
    this.value = formatMoney(this.value);
  });

  input.addEventListener("blur", function () {
    this.value = formatMoney(this.value);
  });
}

function formatMoney(value) {
  value = value.replace(/\D/g, "");
  if (value === "") return "";

  return parseInt(value, 10).toLocaleString("en-US");
}

function addCalculatorEventListeners() {
  document
    .getElementById("accumulationForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      calculateAccumulationPhase();
    });

  document
    .getElementById("distributionForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      calculateDistributionPhase();
    });

    document.getElementById('filing-status-input').addEventListener('change', function() {
      calculateAccumulationPhase()
  });

}

function createAccordionUIElements() {
  var acc = document.getElementsByClassName("accordion-header");
  var i;

  for (i = 0; i < acc.length; i++) {
      acc[i].addEventListener("click", function() {
          this.classList.toggle("active");
          var content = this.nextElementSibling;
          if (content.style.maxHeight) {
              content.style.maxHeight = null;
          } else {
              content.style.maxHeight = content.scrollHeight + "px";
          }
      });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  calculateAccumulationPhase(); // Calculate accumulation phase with default values

  const moneyInputs = document.querySelectorAll(
    "#annualIncome, #currentSavings, #monthlyContributions, #monthlyBudget, #otherIncome, #monthlySocialSecurity, #retirementSavings"
  );
  moneyInputs.forEach(initializeMoneyInput);

  addCalculatorEventListeners();
  createAccordionUIElements();
});
