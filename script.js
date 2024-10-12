var projectedMonthlyExpensesAtRetirement;

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

function calculateAccumulationPhase() {
  const inputs = getAccumulationInputValues();
  const accumulationData = [];
  let currentValues = {
    savings: inputs.currentSavings,
    income: inputs.annualIncome,
    contributions: inputs.monthlyContributions * 12,
    currentYear: new Date().getFullYear(),
  };

  for (let age = inputs.currentAge; age <= inputs.retirementAge; age++) {
    const yearData = calculateAccumulationYearlyData(
      age,
      inputs,
      currentValues
    );
    accumulationData.push(yearData);

    currentValues = {
      savings: yearData.endAmount,
      income: yearData.income,
      contributions: yearData.contributions,
      currentYear: yearData.year + 1,
    };
  }

  // calculate the estimaged living expenses when the person retires
  const yearsUntilRetirement = inputs.retirementAge - inputs.currentAge;

  projectedMonthlyExpensesAtRetirement =
    inputs.currentMonthlyExpenses *
    Math.pow(1 + inputs.inflationRate, yearsUntilRetirement);
  document.getElementById(
    "monthlyExpensesAtRetirement"
  ).innerHTML = `${currencyFormatter.format(
    projectedMonthlyExpensesAtRetirement
  )} monthly expenses at retirement `;
  document.getElementById("monthlyExpensesAtRetirement").value =
    projectedMonthlyExpensesAtRetirement;

  updateAccumulationChart(accumulationData);
  updateAccumulationTable(accumulationData);
  document.getElementById("retirementSavings").value = Math.round(
    accumulationData[accumulationData.length - 1].endAmount
  ).toLocaleString("en-US");
}

function calculateDistributionPhase() {
  const inputs = getDistributionInputValues();
  const distributionData = [];

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
      console.log(`Retirement savings depleted at age ${age}`);
      break;
    }
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
    monthlySocialSecurity: parseFloat(
      document.getElementById("monthlySocialSecurity").value.replace(/,/g, "")
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

function calculateAccumulationYearlyData(age, inputs, currentValues) {
  const { preReturnRate, inflationRate, incomeIncrease } = inputs;
  const { savings, income, contributions, currentYear } = currentValues;

  const startAmount = savings;
  const investmentIncome = savings * preReturnRate;
  const newSavings = savings + contributions + investmentIncome;
  const newIncome = income * (1 + incomeIncrease);
  const newContributions = contributions * (1 + incomeIncrease);

  return {
    year: currentYear,
    age: age,
    income: newIncome,
    contributions: newContributions,
    investmentIncome: investmentIncome,
    startAmount: startAmount,
    endAmount: newSavings,
  };
}

function calculateDistributionYearlyData(age, inputs, currentValues) {
  const { monthlySocialSecurity, otherIncome, postReturnRate, inflationRate } =
    inputs;
  const { savings, currentYear } = currentValues;

  const annualExpenses =
    projectedMonthlyExpensesAtRetirement *
    12 *
    Math.pow(1 + inflationRate, age - inputs.retirementAge);
  const annualSocialSecurity =
    monthlySocialSecurity *
    12 *
    Math.pow(1 + inflationRate, age - inputs.retirementAge);
  const annualOtherIncome =
    otherIncome * 12 * Math.pow(1 + inflationRate, age - inputs.retirementAge);

  const investmentIncome = savings * postReturnRate;
  const withdrawal = Math.max(
    0,
    annualExpenses - annualSocialSecurity - annualOtherIncome
  );
  const remainingSavings = savings + investmentIncome - withdrawal;

  return {
    year: currentYear,
    age: age,
    expenses: annualExpenses,
    socialSecurity: annualSocialSecurity,
    otherIncome: annualOtherIncome,
    withdrawal: withdrawal,
    remainingSavings: remainingSavings,
  };
}

function updateAccumulationChart(data) {
  const ctx = document.getElementById("accumulationChart").getContext("2d");

  const labels = data.map((d) => d.age);
  const savings = data.map((d) => d.endAmount / 1000); // Convert to thousands

  if (window.accumulationChart instanceof Chart) {
    window.accumulationChart.destroy();
  }

  window.accumulationChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Retirement Savings",
          data: savings,
          borderColor: "green",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: "Age",
          },
        },
        y: {
          title: {
            display: true,
            text: "Amount (thousands)",
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

  window.distributionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Remaining Savings",
          data: savings,
          borderColor: "blue",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: "Age",
          },
        },
        y: {
          title: {
            display: true,
            text: "Amount (thousands)",
          },
          beginAtZero: true,
        },
      },
    },
  });
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function updateAccumulationTable(data) {
  const tbody = document.querySelector("#accumulationTable tbody");
  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${row.year}</td>
          <td>${row.age}</td>
          <td>${currencyFormatter.format(row.income)}</td>
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

  // Trigger distribution phase calculation when switching to the distribution tab
  document
    .querySelector(".tab[onclick=\"openTab(event, 'distribution')\"]")
    .addEventListener("click", function () {
      calculateDistributionPhase();
    });
}

document.addEventListener("DOMContentLoaded", function () {
  calculateAccumulationPhase(); // Calculate accumulation phase with default values

  const moneyInputs = document.querySelectorAll(
    "#annualIncome, #currentSavings, #monthlyContributions, #monthlyBudget, #otherIncome, #monthlySocialSecurity, #retirementSavings"
  );
  moneyInputs.forEach(initializeMoneyInput);

  addCalculatorEventListeners();
});
