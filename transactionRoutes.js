const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const Transaction = require('./models/transaction');
const User = require('./models/User');

// Authentication middleware (copied from your app.js)
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view this resource');
  res.redirect('/login');
};

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Export transactions to CSV
router.get('/transactions/export', ensureAuthenticated, async (req, res) => {
  try {
    // Get user transactions using the authenticated user from session
    const userId = req.user.id;
    const transactions = await Transaction.find({ user: userId });
    
    // Define the CSV file path
    const timestamp = Date.now();
    const filePath = path.join(__dirname, 'public', 'downloads', `transactions_${userId}_${timestamp}.csv`);
    
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Set up CSV writer
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'date', title: 'Date' },
        { id: 'type', title: 'Type' },
        { id: 'category', title: 'Category' },
        { id: 'description', title: 'Description' },
        { id: 'amount', title: 'Amount' }
      ]
    });
    
    // Format data for CSV
    const records = transactions.map(t => {
      return {
        date: new Date(t.date).toLocaleString(),
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount.toFixed(2)
      };
    });
    
    // Write CSV file
    await csvWriter.writeRecords(records);
    
    // Send file to user
    res.download(filePath, `transactions_${timestamp}.csv`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      
      // Delete file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('Export error:', error);
    req.flash('error', 'Failed to export transactions');
    res.redirect('/transactions');
  }
});

// Provide a CSV template for import
router.get('/transactions/template', ensureAuthenticated, (req, res) => {
  const templatePath = path.join(__dirname, 'public', 'downloads', 'transaction_template.csv');
  res.download(templatePath, 'transaction_template.csv');
});

// Import transactions from CSV
router.post('/transactions/import', ensureAuthenticated, upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    req.flash('error', 'Please upload a CSV file');
    return res.redirect('/transactions');
  }
  
  const results = [];
  const errors = [];
  const userId = req.user.id;
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        // Process each row
        for (const row of results) {
          try {
            // Parse the data
            const transaction = {
              user: userId,
              date: new Date(row.Date),
              description: row.Description,
              category: row.Category,
              type: row.Type.toLowerCase(),
              amount: parseFloat(row.Amount.replace(/[^\d.-]/g, ''))
            };
            
            // Validate the transaction
            if (isNaN(transaction.amount) || !transaction.date || !transaction.type) {
              errors.push(`Invalid data in row: ${JSON.stringify(row)}`);
              continue;
            }
            
            // Save to database
            const newTransaction = new Transaction(transaction);
            await newTransaction.save();
            
            // Update user's financial summary (similar to your existing transaction add logic)
            const user = await User.findById(userId);
            
            // Update overall totals
            if (transaction.type === 'income') {
              user.financialSummary.totalIncome += transaction.amount;
            } else {
              user.financialSummary.totalExpense += transaction.amount;
            }
            
            user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
            
            // Update monthly summary
            const year = transaction.date.getFullYear();
            const month = transaction.date.getMonth();
            
            let monthlyRecord = user.financialSummary.monthly.find(
              record => record.year === year && record.month === month
            );
            
            if (!monthlyRecord) {
              monthlyRecord = {
                year,
                month,
                income: 0,
                expense: 0,
                balance: 0
              };
              user.financialSummary.monthly.push(monthlyRecord);
              monthlyRecord = user.financialSummary.monthly[user.financialSummary.monthly.length - 1];
            }
            
            if (transaction.type === 'income') {
              monthlyRecord.income += transaction.amount;
            } else {
              monthlyRecord.expense += transaction.amount;
            }
            
            monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;
            
            await user.save();
          } catch (rowError) {
            errors.push(`Error processing row: ${JSON.stringify(row)} - ${rowError.message}`);
          }
        }
        
        // Clean up the uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
        });
        
        // Report results
        if (errors.length > 0) {
          req.flash('warning', `Imported ${results.length - errors.length} transactions with ${errors.length} errors.`);
          console.error('Import errors:', errors);
        } else {
          req.flash('success', `Successfully imported ${results.length} transactions.`);
        }
        
        res.redirect('/transactions');
      } catch (error) {
        console.error('Import processing error:', error);
        req.flash('error', 'Failed to process the CSV file');
        res.redirect('/transactions');
      }
    });
});

function parseDate(dateString) {
    const [datePart, timePart] = dateString.split(', ');
    const [day, month, year] = datePart.split('/');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  }
  

module.exports = router;
