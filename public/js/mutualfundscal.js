
    
    document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const investmentTypeRadios = document.querySelectorAll('input[name="investmentType"]');
  const lumpsumFields = document.getElementById('lumpsumFields');
  const sipFields = document.getElementById('sipFields');
  const calculateBtn = document.getElementById('calculateBtn');
  const resultSection = document.getElementById('resultSection');
  
  let investmentChart = null;
  
  // Toggle between Lumpsum and SIP fields
  investmentTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'lumpsum') {
        lumpsumFields.style.display = 'block';
        sipFields.style.display = 'none';
      } else {
        lumpsumFields.style.display = 'none';
        sipFields.style.display = 'block';
      }
    });
  });
  
  // Calculate button click handler
  calculateBtn.addEventListener('click', function() {
    const investmentType = document.querySelector('input[name="investmentType"]:checked').value;
    const duration = parseFloat(document.getElementById('duration').value);
    const returnRate = parseFloat(document.getElementById('returnRate').value);
    
    let totalInvestment = 0;
    let totalValue = 0;
    let yearlyData = [];
    
    if (investmentType === 'lumpsum') {
      const amount = parseFloat(document.getElementById('lumpsumAmount').value);
      totalInvestment = amount;
      totalValue = calculateLumpsumReturns(amount, returnRate, duration);
      yearlyData = generateLumpsumYearlyData(amount, returnRate, duration);
    } else {
      const monthlyAmount = parseFloat(document.getElementById('sipAmount').value);
      totalInvestment = monthlyAmount * 12 * duration;
      totalValue = calculateSIPReturns(monthlyAmount, returnRate, duration);
      yearlyData = generateSIPYearlyData(monthlyAmount, returnRate, duration);
    }
    
    const estimatedReturns = totalValue - totalInvestment;
    
    // Update result section
    document.getElementById('totalInvestment').textContent = '₹' + totalInvestment.toLocaleString('en-IN');
    document.getElementById('estimatedReturns').textContent = '₹' + estimatedReturns.toLocaleString('en-IN');
    document.getElementById('totalValue').textContent = '₹' + totalValue.toLocaleString('en-IN');
    
    // Show result section
    resultSection.style.display = 'block';
    
    // Create or update chart
    createOrUpdateChart(yearlyData);
  });
  
  // Calculate Lumpsum returns
  function calculateLumpsumReturns(principal, rate, years) {
    return principal * Math.pow(1 + rate/100, years);
  }
  
  // Calculate SIP returns
  function calculateSIPReturns(monthlyAmount, annualRate, years) {
    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;
    return monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  }
  
  // Generate yearly data for Lumpsum investment
  function generateLumpsumYearlyData(principal, rate, years) {
    const yearlyData = [];
    let currentValue = principal;
    
    for (let year = 0; year <= years; year++) {
      if (year === 0) {
        yearlyData.push({
          year: year,
          investment: principal,
          returns: 0,
          totalValue: principal
        });
      } else {
        currentValue = principal * Math.pow(1 + rate/100, year);
        yearlyData.push({
          year: year,
          investment: principal,
          returns: currentValue - principal,
          totalValue: currentValue
        });
      }
    }
    
    return yearlyData;
  }
  
  // Generate yearly data for SIP investment
  function generateSIPYearlyData(monthlyAmount, annualRate, years) {
    const yearlyData = [];
    const monthlyRate = annualRate / 12 / 100;
    
    for (let year = 0; year <= years; year++) {
      const months = year * 12;
      const investment = monthlyAmount * months;
      
      if (year === 0) {
        yearlyData.push({
          year: year,
          investment: 0,
          returns: 0,
          totalValue: 0
        });
      } else {
        const totalValue = monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
        yearlyData.push({
          year: year,
          investment: investment,
          returns: totalValue - investment,
          totalValue: totalValue
        });
      }
    }
    
    return yearlyData;
  }
  
  // Create or update chart
  function createOrUpdateChart(yearlyData) {
    const ctx = document.getElementById('investmentChart').getContext('2d');
    
    const years = yearlyData.map(data => 'Year ' + data.year);
    const investments = yearlyData.map(data => data.investment);
    const returns = yearlyData.map(data => data.returns);
    
    if (investmentChart) {
      investmentChart.destroy();
    }
    
    investmentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Investment',
            data: investments,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Returns',
            data: returns,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString('en-IN');
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ₹' + context.parsed.y.toLocaleString('en-IN');
              }
            }
          }
        }
      }
    });
  }
});

