document.addEventListener('DOMContentLoaded', function() {
    // Toggle between tax regimes
    const taxRegimeRadios = document.querySelectorAll('input[name="taxRegime"]');
    const oldRegimeDeductions = document.getElementById('oldRegimeDeductions');
    
    taxRegimeRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'old') {
          oldRegimeDeductions.style.display = 'block';
        } else {
          oldRegimeDeductions.style.display = 'none';
        }
      });
    });
    
    // Calculate tax button
    document.getElementById('calculateTaxBtn').addEventListener('click', calculateTax);
    
    let taxChart = null;
    
    // Calculate tax function
    function calculateTax() {
      const taxRegime = document.querySelector('input[name="taxRegime"]:checked').value;
      const ageGroup = document.getElementById('ageGroup').value;
      const salary = parseFloat(document.getElementById('salary').value) || 0;
      const otherIncome = parseFloat(document.getElementById('otherIncome').value) || 0;
      
      let grossIncome = salary + otherIncome;
      let deductions = 0;
      let taxableIncome = 0;
      
      // Calculate deductions for old regime
      if (taxRegime === 'old') {
        const standardDeduction = 50000; // Fixed for salaried
        const section80C = Math.min(parseFloat(document.getElementById('section80C').value) || 0, 150000);
        const section80D = parseFloat(document.getElementById('section80D').value) || 0;
        const housingLoan = parseFloat(document.getElementById('housingLoan').value) || 0;
        const otherDeductions = parseFloat(document.getElementById('otherDeductions').value) || 0;
        
        deductions = standardDeduction + section80C + section80D + housingLoan + otherDeductions;
        taxableIncome = Math.max(0, grossIncome - deductions);
        
        // Show deductions row
        document.getElementById('deductionsRow').style.display = '';
        document.getElementById('totalDeductions').textContent = '₹' + deductions.toLocaleString('en-IN');
      } else {
        // New regime has standard deduction of 50,000 from FY 2024-25
        deductions = 50000;
        taxableIncome = Math.max(0, grossIncome - deductions);
        
        // Hide deductions row for new regime
        document.getElementById('deductionsRow').style.display = 'none';
      }
      
      // Calculate tax based on regime and age group
      let tax = 0;
      let slabBreakdown = [];
      
      if (taxRegime === 'new') {
        // New Tax Regime (FY 2024-25)
        if (taxableIncome <= 300000) {
          tax = 0;
          slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
        } else if (taxableIncome <= 600000) {
          tax = (taxableIncome - 300000) * 0.05;
          slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
          slabBreakdown.push({ slab: '₹3,00,001 - ₹6,00,000', tax: tax, rate: '5%' });
        } else if (taxableIncome <= 900000) {
          tax = 15000 + (taxableIncome - 600000) * 0.1;
          slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
          slabBreakdown.push({ slab: '₹3,00,001 - ₹6,00,000', tax: 15000, rate: '5%' });
          slabBreakdown.push({ slab: '₹6,00,001 - ₹9,00,000', tax: (taxableIncome - 600000) * 0.1, rate: '10%' });
        } else if (taxableIncome <= 1200000) {
          tax = 45000 + (taxableIncome - 900000) * 0.15;
          slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
          slabBreakdown.push({ slab: '₹3,00,001 - ₹6,00,000', tax: 15000, rate: '5%' });
          slabBreakdown.push({ slab: '₹6,00,001 - ₹9,00,000', tax: 30000, rate: '10%' });
          slabBreakdown.push({ slab: '₹9,00,001 - ₹12,00,000', tax: (taxableIncome - 900000) * 0.15, rate: '15%' });
        } else if (taxableIncome <= 1500000) {
          tax = 90000 + (taxableIncome - 1200000) * 0.2;
          slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
          slabBreakdown.push({ slab: '₹3,00,001 - ₹6,00,000', tax: 15000, rate: '5%' });
          slabBreakdown.push({ slab: '₹6,00,001 - ₹9,00,000', tax: 30000, rate: '10%' });
          slabBreakdown.push({ slab: '₹9,00,001 - ₹12,00,000', tax: 45000, rate: '15%' });
          slabBreakdown.push({ slab: '₹12,00,001 - ₹15,00,000', tax: (taxableIncome - 1200000) * 0.2, rate: '20%' });
        } else {
          tax = 150000 + (taxableIncome - 1500000) * 0.3;
          slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
          slabBreakdown.push({ slab: '₹3,00,001 - ₹6,00,000', tax: 15000, rate: '5%' });
          slabBreakdown.push({ slab: '₹6,00,001 - ₹9,00,000', tax: 30000, rate: '10%' });
          slabBreakdown.push({ slab: '₹9,00,001 - ₹12,00,000', tax: 45000, rate: '15%' });
          slabBreakdown.push({ slab: '₹12,00,001 - ₹15,00,000', tax: 60000, rate: '20%' });
          slabBreakdown.push({ slab: 'Above ₹15,00,000', tax: (taxableIncome - 1500000) * 0.3, rate: '30%' });
        }
      } else {
        // Old Tax Regime (FY 2024-25)
        if (ageGroup === 'general') {
          // Below 60 years
          if (taxableIncome <= 250000) {
            tax = 0;
            slabBreakdown.push({ slab: '₹0 - ₹2,50,000', tax: 0, rate: '0%' });
          } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 250000) * 0.05;
            slabBreakdown.push({ slab: '₹0 - ₹2,50,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹2,50,001 - ₹5,00,000', tax: tax, rate: '5%' });
          } else if (taxableIncome <= 1000000) {
            tax = 12500 + (taxableIncome - 500000) * 0.2;
            slabBreakdown.push({ slab: '₹0 - ₹2,50,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹2,50,001 - ₹5,00,000', tax: 12500, rate: '5%' });
            slabBreakdown.push({ slab: '₹5,00,001 - ₹10,00,000', tax: (taxableIncome - 500000) * 0.2, rate: '20%' });
          } else {
            tax = 112500 + (taxableIncome - 1000000) * 0.3;
            slabBreakdown.push({ slab: '₹0 - ₹2,50,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹2,50,001 - ₹5,00,000', tax: 12500, rate: '5%' });
            slabBreakdown.push({ slab: '₹5,00,001 - ₹10,00,000', tax: 100000, rate: '20%' });
            slabBreakdown.push({ slab: 'Above ₹10,00,000', tax: (taxableIncome - 1000000) * 0.3, rate: '30%' });
          }
        } else if (ageGroup === 'senior') {
          // 60 to 80 years
          if (taxableIncome <= 300000) {
            tax = 0;
            slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
          } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 300000) * 0.05;
            slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹3,00,001 - ₹5,00,000', tax: tax, rate: '5%' });
          } else if (taxableIncome <= 1000000) {
            tax = 10000 + (taxableIncome - 500000) * 0.2;
            slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹3,00,001 - ₹5,00,000', tax: 10000, rate: '5%' });
            slabBreakdown.push({ slab: '₹5,00,001 - ₹10,00,000', tax: (taxableIncome - 500000) * 0.2, rate: '20%' });
          } else {
            tax = 110000 + (taxableIncome - 1000000) * 0.3;
            slabBreakdown.push({ slab: '₹0 - ₹3,00,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹3,00,001 - ₹5,00,000', tax: 10000, rate: '5%' });
            slabBreakdown.push({ slab: '₹5,00,001 - ₹10,00,000', tax: 100000, rate: '20%' });
            slabBreakdown.push({ slab: 'Above ₹10,00,000', tax: (taxableIncome - 1000000) * 0.3, rate: '30%' });
          }
        } else if (ageGroup === 'superSenior') {
          // Above 80 years
          if (taxableIncome <= 500000) {
            tax = 0;
            slabBreakdown.push({ slab: '₹0 - ₹5,00,000', tax: 0, rate: '0%' });
          } else if (taxableIncome <= 1000000) {
            tax = (taxableIncome - 500000) * 0.2;
            slabBreakdown.push({ slab: '₹0 - ₹5,00,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹5,00,001 - ₹10,00,000', tax: tax, rate: '20%' });
          } else {
            tax = 100000 + (taxableIncome - 1000000) * 0.3;
            slabBreakdown.push({ slab: '₹0 - ₹5,00,000', tax: 0, rate: '0%' });
            slabBreakdown.push({ slab: '₹5,00,001 - ₹10,00,000', tax: 100000, rate: '20%' });
            slabBreakdown.push({ slab: 'Above ₹10,00,000', tax: (taxableIncome - 1000000) * 0.3, rate: '30%' });
          }
        }
      }
      
      // Calculate cess
      const cess = tax * 0.04;
      const totalTax = tax + cess;
      const effectiveTaxRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;
      
      // Update results
      document.getElementById('grossIncome').textContent = '₹' + grossIncome.toLocaleString('en-IN');
      document.getElementById('taxableIncome').textContent = '₹' + taxableIncome.toLocaleString('en-IN');
      document.getElementById('incomeTax').textContent = '₹' + tax.toLocaleString('en-IN');
      document.getElementById('cess').textContent = '₹' + cess.toLocaleString('en-IN');
      document.getElementById('totalTax').textContent = '₹' + totalTax.toLocaleString('en-IN');
      document.getElementById('effectiveTaxRate').textContent = effectiveTaxRate.toFixed(2) + '%';
      
      // Show result section
      document.getElementById('resultSection').style.display = 'block';
      
      // Generate tax breakdown
      const breakdownHtml = generateTaxBreakdown(slabBreakdown);
      document.getElementById('taxSlabBreakdown').innerHTML = breakdownHtml;
      
      // Generate tax regime comparison
      generateRegimeComparison(grossIncome, taxRegime, ageGroup);
      
      // Create or update chart
      createTaxChart(grossIncome, deductions, totalTax);
    }
    
    // Generate tax breakdown HTML
    function generateTaxBreakdown(slabBreakdown) {
      let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
      html += '<thead><tr><th>Income Slab</th><th>Tax Rate</th><th>Tax Amount</th></tr></thead><tbody>';
      
      let totalTax = 0;
      slabBreakdown.forEach(slab => {
        totalTax += slab.tax;
        html += `<tr>
          <td>${slab.slab}</td>
          <td>${slab.rate}</td>
          <td>₹${slab.tax.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        </tr>`;
      });
      
      html += `<tr class="table-info">
        <td colspan="2"><strong>Total Income Tax</strong></td>
        <td><strong>₹${totalTax.toLocaleString('en-IN', {maximumFractionDigits: 0})}</strong></td>
      </tr>`;
      html += '</tbody></table></div>';
      
      return html;
    }
    
    // Generate tax regime comparison
    function generateRegimeComparison(grossIncome, currentRegime, ageGroup) {
      // Calculate tax for both regimes
      let newRegimeTax = calculateTaxForRegime('new', ageGroup, grossIncome);
      let oldRegimeTax = calculateTaxForRegime('old', ageGroup, grossIncome);
      
      // Determine which regime is better
      let betterRegime = newRegimeTax < oldRegimeTax ? 'New' : 'Old';
      let taxSaving = Math.abs(newRegimeTax - oldRegimeTax);
      
      let html = `<div class="d-flex justify-content-between">
        <div class="text-center">
          <h6>New Regime</h6>
          <h5>₹${newRegimeTax.toLocaleString('en-IN')}</h5>
        </div>
        <div class="text-center">
          <h6>Old Regime</h6>
          <h5>₹${oldRegimeTax.toLocaleString('en-IN')}</h5>
        </div>
      </div>`;
      
      html += `<div class="alert ${betterRegime === 'New' ? 'alert-success' : 'alert-warning'} mt-2">
        <strong>${betterRegime} Regime</strong> is better for you. You can save 
        <strong>₹${taxSaving.toLocaleString('en-IN')}</strong> by choosing the ${betterRegime} Regime.
      </div>`;
      
      document.getElementById('regimeComparison').innerHTML = html;
    }
    
    // Calculate tax for regime comparison
    function calculateTaxForRegime(regime, ageGroup, grossIncome) {
      let deductions = regime === 'new' ? 50000 : 200000; // Assuming average deductions for old regime
      let taxableIncome = Math.max(0, grossIncome - deductions);
      let tax = 0;
      
      if (regime === 'new') {
        // New Tax Regime (FY 2024-25)
        if (taxableIncome <= 300000) {
          tax = 0;
        } else if (taxableIncome <= 600000) {
          tax = (taxableIncome - 300000) * 0.05;
        } else if (taxableIncome <= 900000) {
          tax = 15000 + (taxableIncome - 600000) * 0.1;
        } else if (taxableIncome <= 1200000) {
          tax = 45000 + (taxableIncome - 900000) * 0.15;
        } else if (taxableIncome <= 1500000) {
          tax = 90000 + (taxableIncome - 1200000) * 0.2;
        } else {
          tax = 150000 + (taxableIncome - 1500000) * 0.3;
        } 
      } else {
        // Old Tax Regime (FY 2024-25)
        if (ageGroup === 'general') {
          // Below 60 years
          if (taxableIncome <= 250000) {
            tax = 0;
          } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 250000) * 0.05;
          } else if (taxableIncome <= 1000000) {
            tax = 12500 + (taxableIncome - 500000) * 0.2;
          } else {
            tax = 112500 + (taxableIncome - 1000000) * 0.3;
          }
        } else if (ageGroup === 'senior') {
          // 60 to 80 years
          if (taxableIncome <= 300000) {
            tax = 0;
          } else if (taxableIncome <= 500000) {
            tax = (taxableIncome - 300000) * 0.05;
          } else if (taxableIncome <= 1000000) {
            tax = 10000 + (taxableIncome - 500000) * 0.2;
          } else {
            tax = 110000 + (taxableIncome - 1000000) * 0.3;
          }
        } else if (ageGroup === 'superSenior') {
          // Above 80 years
          if (taxableIncome <= 500000) {
            tax = 0;
          } else if (taxableIncome <= 1000000) {
            tax = (taxableIncome - 500000) * 0.2;
          } else {
            tax = 100000 + (taxableIncome - 1000000) * 0.3;
          }
        }
      }
      
      // Add cess
      const totalTax = tax + (tax * 0.04);
      return Math.round(totalTax);
    }
    
    // Create tax chart
    function createTaxChart(grossIncome, deductions, totalTax) {
      const takeHomePay = grossIncome - totalTax;
      
      // Destroy existing chart if it exists
      if (taxChart) {
        taxChart.destroy();
      }
      
      const ctx = document.getElementById('taxChart').getContext('2d');
      taxChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Take Home Pay', 'Tax Payable'],
          datasets: [{
            data: [takeHomePay, totalTax],
            backgroundColor: ['#28a745', '#dc3545'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const percentage = ((value / grossIncome) * 100).toFixed(1);
                  return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  });