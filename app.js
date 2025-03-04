// app.js
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/User');
const Goal = require('./models/Goal')
const transactionRoutes = require('./transactionRoutes');




// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));



// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth_app',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days in milliseconds
  }
}));

// Flash messages
app.use(flash());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require('./Googleauth');


// Passport Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      
      // If user not found
      if (!user) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      
      // If everything is correct, return the user
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Authentication middleware
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view this resource');
  res.redirect('/login');
};

app.use('/', transactionRoutes);
app.use('/', authRoutes);

// Routes
app.get('/', (req, res) => {
  res.render('login', { title: 'Login'});
});

// Login route
app.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login'});
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// Signup route
app.get('/signup', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('signup', { title: 'Sign Up'});
});

app.post('/signup', async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  
  // Simple validation
  let errors = [];
  
  if (!fullName || !email || !password || !confirmPassword) {
    errors.push('Please fill in all fields');
  }
  
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  if (password.length < 6) {
    errors.push('Password should be at least 6 characters');
  }
  
  if (errors.length > 0) {
    return res.render('signup', {
      title: 'Sign Up',
      error: errors[0],
      fullName,
      email
    });
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Email is already registered',
        fullName,
        email: ''
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword
    });
    
    // Save user to database
    await newUser.save();
    
    req.flash('success', 'You are now registered and can log in');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('signup', {
      title: 'Sign Up',
      error: 'An error occurred during registration',
      fullName,
      email
    });
  }
});

// Dashboard route (protected)
app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Get user with financial summary
    const user = await User.findById(req.user.id);
    
    // Get recent transactions (last 5)
    const recentTransactions = await Transaction.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(5);
    
    // Get current month's summary
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const currentMonthSummary = user.financialSummary.monthly.find(
      record => record.year === currentYear && record.month === currentMonth
    ) || { income: 0, expense: 0, balance: 0 };
    
    // Get month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthName = monthNames[currentMonth];

    const goals = await Goal.find({ user: req.user.id })
      .sort({ targetDate: 1 })
      .limit(3); 
    
      const reminders = await Reminder.find({ 
        user: req.user.id,
        isPaid: false
      }).sort({ dueDate: 1 });
      
      // Calculate upcoming and overdue reminders
      const today = new Date();
      const upcomingReminders = reminders.filter(reminder => {
        const dueDate = new Date(reminder.dueDate);
        return dueDate >= today;
      }).map(reminder => {
        const reminderObj = reminder.toObject();
        
        // Calculate if reminder is due soon
        const dueDate = new Date(reminder.dueDate);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        reminderObj.daysUntilDue = diffDays;
        reminderObj.isDueSoon = diffDays <= reminder.reminderDays;
        
        return reminderObj;
      });
      
      const overdueReminders = reminders.filter(reminder => {
        const dueDate = new Date(reminder.dueDate);
        return dueDate < today;
      }).map(reminder => {
        const reminderObj = reminder.toObject();
        
        // Calculate days overdue
        const dueDate = new Date(reminder.dueDate);
        const diffTime = today - dueDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        reminderObj.daysUntilDue = -diffDays; // Negative to show overdue
        
        return reminderObj;
      });
      
      // Calculate total upcoming and overdue amounts
      const totalUpcoming = upcomingReminders.reduce((sum, reminder) => sum + reminder.amount, 0);
      const totalOverdue = overdueReminders.reduce((sum, reminder) => sum + reminder.amount, 0);
      
      res.render('dashboard', {
        title: 'Dashboard',
        user: user,
        financialSummary: user.financialSummary,
        currentMonthSummary,
        currentMonthName,
        currentYear,
        recentTransactions,
        goals,
        upcomingReminders,
        overdueReminders,
        totalUpcoming,
        totalOverdue
      });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/login');
  }
});


// Logout route
app.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.flash('success', 'You are logged out');
    res.redirect('/login');
  });
});

const Transaction = require('./models/transaction');

// Transaction routes
app.get('/transactions/add', ensureAuthenticated, (req, res) => {
  res.render('add-transaction', { 
    title: 'Add Transaction'
  });
});

app.post('/transactions/add', ensureAuthenticated, async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    
    // Simple validation
    if (!type || !amount || !category || !description) {
      return res.render('add-transaction', {
        title: 'Add Transaction',
        error: 'Please fill in all fields'
      });
    }
    
    const parsedAmount = parseFloat(amount);
    const transactionDate = date ? new Date(date) : new Date();
    
    // Create new transaction
    const newTransaction = new Transaction({
      user: req.user.id,
      type,
      amount: parsedAmount,
      category,
      description,
      date: transactionDate
    });
    
    await newTransaction.save();
    
    // Get user
    const user = await User.findById(req.user.id);
    
    // Initialize financialSummary if it doesn't exist
    if (!user.financialSummary) {
      user.financialSummary = {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        monthly: []
      };
    }
    
    // Update overall totals
    if (type === 'income') {
      user.financialSummary.totalIncome += parsedAmount;
    } else {
      user.financialSummary.totalExpense += parsedAmount;
    }
    
    user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
    
    // Get year and month
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth();
    
    // Find or create monthly record
    let monthlyRecord = null;
    
    // Check if monthly array exists
    if (!Array.isArray(user.financialSummary.monthly)) {
      user.financialSummary.monthly = [];
      console.log("initializing")
    }
    
    // Look for existing record
    for (let i = 0; i < user.financialSummary.monthly.length; i++) {
      if (user.financialSummary.monthly[i].year === year && 
          user.financialSummary.monthly[i].month === month) {
        monthlyRecord = user.financialSummary.monthly[i];
        break;
      }
    }
    
    // Create new record if not found
    if (!monthlyRecord) {
      console.log("yes2")
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
    
    // Update monthly record
    if (type === 'income') {
      monthlyRecord.income += parsedAmount;
    } else {
      monthlyRecord.expense += parsedAmount;
    }
    
    monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;

    
    
    // Save user
    await user.save();
    
    req.flash('success', 'Transaction added successfully');
    res.redirect('/transactions');
  } catch (err) {
    console.error('Transaction add error:', err);
    res.render('add-transaction', {
      title: 'Add Transaction',
      error: 'Error adding transaction: ' + err.message
    });
  }
});




app.get('/transactions', ensureAuthenticated, async (req, res) => {
  try {
    const { type, category, sort } = req.query;
    
    // Build filter
    let filter = { user: req.user.id };
    if (type) filter.type = type;
    if (category) filter.category = category;
    
    // Build sort
    let sortOption = { date: -1 }; // Default sort by date descending
    
    if (sort) {
      switch(sort) {
        case 'date_asc':
          sortOption = { date: 1 };
          break;
        case 'date_desc':
          sortOption = { date: -1 };
          break;
        case 'amount_asc':
          sortOption = { amount: 1 };
          break;
        case 'amount_desc':
          sortOption = { amount: -1 };
          break;
      }
    }
    const user = await User.findById(req.user.id);
    // Get transactions
    const transactions = await Transaction.find(filter).sort(sortOption);
    
    // Calculate totals
    const totalIncome = user.financialSummary?.totalIncome || 0;
    const totalExpense = user.financialSummary?.totalExpense || 0;
    const balance = user.financialSummary?.balance || 0;
    
    // Get unique categories for filter dropdown
    const categories = await Transaction.distinct('category', { user: req.user.id });
    
    res.render('transactions', {
      title: 'Transactions',
      transactions,
      totalIncome,
      totalExpense,
      balance,
      categories,
      type: type || '',
      category: category || '',
      sort: sort || 'date_desc'
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching transactions');
    res.redirect('/dashboard');
  }
});


app.get('/transactions/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      req.flash('error', 'Transaction not found');
      return res.redirect('/transactions');
    }
    
    res.render('edit-transaction', {
      title: 'Edit Transaction',
      transaction
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching transaction');
    res.redirect('/transactions');
  }
});
//   Transactions 

app.post('/transactions/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    const amountNum = parseFloat(amount);
    
    // Find original transaction
    const originalTransaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!originalTransaction) {
      req.flash('error', 'Transaction not found');
      return res.redirect('/transactions');
    }
    
    // Get dates for monthly calculations
    const originalDate = new Date(originalTransaction.date);
    const originalYear = originalDate.getFullYear();
    const originalMonth = originalDate.getMonth();
    
    const newDate = date ? new Date(date) : originalDate;
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth();
    
    // Update user's financial summary
    const user = await User.findById(req.user.id);
    
    // Remove original transaction from totals
    if (originalTransaction.type === 'income') {
      user.financialSummary.totalIncome -= originalTransaction.amount;
    } else {
      user.financialSummary.totalExpense -= originalTransaction.amount;
    }
    
    // Remove original transaction from monthly summary
    let originalMonthRecord = user.financialSummary.monthly.find(
      record => record.year === originalYear && record.month === originalMonth
    );
    
    if (originalMonthRecord) {
      if (originalTransaction.type === 'income') {
        originalMonthRecord.income -= originalTransaction.amount;
      } else {
        originalMonthRecord.expense -= originalTransaction.amount;
      }
      originalMonthRecord.balance = originalMonthRecord.income - originalMonthRecord.expense;
    }
    
    // Update transaction
    originalTransaction.type = type;
    originalTransaction.amount = amountNum;
    originalTransaction.category = category;
    originalTransaction.description = description;
    originalTransaction.date = newDate;
    
    await originalTransaction.save();
    
    // Add the new transaction to totals
    if (type === 'income') {
      user.financialSummary.totalIncome += amountNum;
    } else {
      user.financialSummary.totalExpense += amountNum;
    }
    user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
    
    // Add to new monthly summary
    let newMonthRecord = user.financialSummary.monthly.find(
      record => record.year === newYear && record.month === newMonth
    );
    
    if (!newMonthRecord) {
      // Create new monthly record if it doesn't exist
      newMonthRecord = {
        year: newYear,
        month: newMonth,
        income: 0,
        expense: 0,
        balance: 0
      };
      user.financialSummary.monthly.push(newMonthRecord);
    }
    
    // Update the monthly record
    if (type === 'income') {
      newMonthRecord.income += amountNum;
    } else {
      newMonthRecord.expense += amountNum;
    }
    newMonthRecord.balance = newMonthRecord.income - newMonthRecord.expense;
    
    await user.save();
    
    req.flash('success', 'Transaction updated successfully');
    res.redirect('/transactions');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error updating transaction');
    res.redirect('/transactions');
  }
});

app.get('/transactions/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    // Find transaction
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!transaction) {
      req.flash('error', 'Transaction not found');
      return res.redirect('/transactions');
    }
    
    // Get date for monthly calculations
    const transactionDate = new Date(transaction.date);
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth();
    
    // Update user's financial summary
    const user = await User.findById(req.user.id);
    
    // Update total summary
    if (transaction.type === 'income') {
      user.financialSummary.totalIncome -= transaction.amount;
    } else {
      user.financialSummary.totalExpense -= transaction.amount;
    }
    user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
    
    // Update monthly summary
    let monthlyRecord = user.financialSummary.monthly.find(
      record => record.year === year && record.month === month
    );
    
    if (monthlyRecord) {
      if (transaction.type === 'income') {
        monthlyRecord.income -= transaction.amount;
      } else {
        monthlyRecord.expense -= transaction.amount;
      }
      monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;
    }
    
    await user.save();
    
    // Delete the transaction
    await Transaction.findByIdAndDelete(req.params.id);
    
    req.flash('success', 'Transaction deleted successfully');
    res.redirect('/transactions');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error deleting transaction');
    res.redirect('/transactions');
  }
});

app.get('/reports/monthly', ensureAuthenticated, async (req, res) => {
  try {
    // Get user with financial summary
    const user = await User.findById(req.user.id);
    
    // Get all transactions
    const transactions = await Transaction.find({ user: req.user.id });
    
    // Get month names
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Ensure monthly array exists
    const monthlySummaries = user.financialSummary && Array.isArray(user.financialSummary.monthly) 
      ? [...user.financialSummary.monthly] 
      : [];
    
    // Sort by date (newest first)
    monthlySummaries.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    // Format monthly data for display with default values
    const formattedMonthlySummaries = monthlySummaries.map(summary => ({
      year: summary.year || 0,
      month: summary.month || 0,
      income: summary.income || 0,
      expense: summary.expense || 0,
      balance: summary.balance || 0,
      monthName: monthNames[summary.month] || 'Unknown',
      displayName: `${monthNames[summary.month] || 'Unknown'} ${summary.year || 0}`
    }));
    
    // Calculate category totals
    const categoryTotals = {};
    const incomeByCategory = {};
    const expenseByCategory = {};
    
    // Calculate transaction totals by date for timeline
    const transactionsByDate = {};
    let cumulativeIncome = 0;
    let cumulativeExpense = 0;
    
    transactions.forEach(transaction => {
      const dateKey = new Date(transaction.date).toISOString().split('T')[0];
      
      // Overall category totals
      if (!categoryTotals[transaction.category]) {
        categoryTotals[transaction.category] = 0;
      }
      categoryTotals[transaction.category] += transaction.amount;
      
      // Split by transaction type
      if (transaction.type === 'income') {
        if (!incomeByCategory[transaction.category]) {
          incomeByCategory[transaction.category] = 0;
        }
        incomeByCategory[transaction.category] += transaction.amount;
        cumulativeIncome += transaction.amount;
      } else {
        if (!expenseByCategory[transaction.category]) {
          expenseByCategory[transaction.category] = 0;
        }
        expenseByCategory[transaction.category] += transaction.amount;
        cumulativeExpense += transaction.amount;
      }
      
      // Accumulate by date
      if (!transactionsByDate[dateKey]) {
        transactionsByDate[dateKey] = {
          income: 0,
          expense: 0
        };
      }
      
      if (transaction.type === 'income') {
        transactionsByDate[dateKey].income += transaction.amount;
      } else {
        transactionsByDate[dateKey].expense += transaction.amount;
      }
    });
    
    // Prepare timeline data
    const timelineDates = Object.keys(transactionsByDate).sort();
    const timelineData = {
      dates: timelineDates,
      incomeData: timelineDates.map(date => transactionsByDate[date].income),
      expenseData: timelineDates.map(date => transactionsByDate[date].expense)
    };
    
    // Prepare data for monthly trend chart (last 6 months or all if less)
    const last6Months = formattedMonthlySummaries.slice(0, Math.min(6, formattedMonthlySummaries.length)).reverse();
    const monthlyLabels = last6Months.map(m => m.displayName);
    const monthlyIncomeData = last6Months.map(m => m.income);
    const monthlyExpenseData = last6Months.map(m => m.expense);
    const monthlyBalanceData = last6Months.map(m => m.balance);
    
    // Prepare data for category pie charts
    const incomeCategoryLabels = Object.keys(incomeByCategory);
    const incomeCategoryData = Object.values(incomeByCategory);
    
    const expenseCategoryLabels = Object.keys(expenseByCategory);
    const expenseCategoryData = Object.values(expenseByCategory);
    
    // Calculate top spending categories
    const topExpenseCategories = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));
    
    // Calculate income vs expense ratio
    const incomeVsExpenseData = {
      labels: ['Income', 'Expenses'],
      data: [cumulativeIncome, cumulativeExpense]
    };
    
    // Get financial summary with defaults
    const financialSummary = {
      totalIncome: user.financialSummary?.totalIncome || 0,
      totalExpense: user.financialSummary?.totalExpense || 0,
      balance: user.financialSummary?.balance || 0
    };
    
    res.render('monthly-reports', {
      title: 'Monthly Financial Reports',
      user,
      financialSummary,
      monthlySummaries: formattedMonthlySummaries,
      monthlyLabels: JSON.stringify(monthlyLabels),
      monthlyIncomeData: JSON.stringify(monthlyIncomeData),
      monthlyExpenseData: JSON.stringify(monthlyExpenseData),
      monthlyBalanceData: JSON.stringify(monthlyBalanceData),
      incomeCategoryLabels: JSON.stringify(incomeCategoryLabels),
      incomeCategoryData: JSON.stringify(incomeCategoryData),
      expenseCategoryLabels: JSON.stringify(expenseCategoryLabels),
      expenseCategoryData: JSON.stringify(expenseCategoryData),
      timelineData: JSON.stringify(timelineData),
      incomeVsExpenseData: JSON.stringify(incomeVsExpenseData),
      topExpenseCategories
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error generating reports: ' + err.message);
    res.redirect('/dashboard');
  }
});


// Goal routes
app.get('/goals', ensureAuthenticated, async (req, res) => {
  try {
    const { status, category, sort } = req.query;
    
    // Build filter
    let filter = { user: req.user.id };
    
    if (status === 'active') {
      filter.isCompleted = false;
    } else if (status === 'completed') {
      filter.isCompleted = true;
    }
    
    if (category) {
      filter.category = category;
    }
    
    // Build sort
    let sortOption = { targetDate: 1 }; // Default sort by deadline (ascending)
    
    if (sort) {
      switch(sort) {
        case 'deadline_asc':
          sortOption = { targetDate: 1 };
          break;
        case 'deadline_desc':
          sortOption = { targetDate: -1 };
          break;
        case 'amount_asc':
          sortOption = { targetAmount: 1 };
          break;
        case 'amount_desc':
          sortOption = { targetAmount: -1 };
          break;
        case 'progress_asc':
          // We'll handle this after fetching
          sortOption = { targetDate: 1 };
          break;
        case 'progress_desc':
          // We'll handle this after fetching
          sortOption = { targetDate: 1 };
          break;
      }
    }
    
    // Fetch goals
    let goals = await Goal.find(filter).sort(sortOption);
    
    // Calculate virtual properties
    goals = goals.map(goal => {
      const goalObj = goal.toObject({ virtuals: true });
      
      // Calculate progress percentage
      goalObj.progressPercentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
      
      // Calculate if goal is on track
      const today = new Date();
      const totalDuration = goal.targetDate - goal.startDate;
      const elapsedDuration = today - goal.startDate;
      const expectedProgress = (elapsedDuration / totalDuration) * goal.targetAmount;
      goalObj.isOnTrack = goal.isCompleted || goal.currentAmount >= expectedProgress;
      
      // Calculate days remaining
      const diffTime = goal.targetDate - today;
      goalObj.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return goalObj;
    });
    
    // Handle special sort cases
    if (sort === 'progress_asc') {
      goals.sort((a, b) => a.progressPercentage - b.progressPercentage);
    } else if (sort === 'progress_desc') {
      goals.sort((a, b) => b.progressPercentage - a.progressPercentage);
    }
    
    res.render('goals', {
      title: 'Financial Goals',
      goals,
      status: status || '',
      category: category || '',
      sort: sort || 'deadline_asc'
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching goals');
    res.redirect('/dashboard');
  }
});


app.get('/goals/add', ensureAuthenticated, (req, res) => {
  res.render('add-goal', {
    title: 'Add New Goal'
  });
});

app.post('/goals/add', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, category, targetAmount, initialAmount, targetDate, priority } = req.body;
    const parsedInitialAmount = parseFloat(initialAmount || 0);
    
    const newGoal = new Goal({
      user: req.user.id,
      name,
      description,
      category,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parsedInitialAmount,
      targetDate: new Date(targetDate),
      priority
    });
    
    await newGoal.save();
    
    // If there's an initial amount, create a transaction and update financial summary
    if (parsedInitialAmount > 0) {
      // Create a transaction for the initial amount
      const transaction = new Transaction({
        user: req.user.id,
        type: 'expense',
        amount: parsedInitialAmount,
        category: 'Goal Contribution',
        description: `Initial contribution to ${name}`,
        date: new Date()
      });
      
      await transaction.save();
      
      // Link the transaction to the goal
      newGoal.linkedTransactions = [transaction._id];
      await newGoal.save();
      
      // Update user's financial summary
      const user = await User.findById(req.user.id);
      
      // Update overall totals
      user.financialSummary.totalExpense += parsedInitialAmount;
      user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
      
      // Update monthly record
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      
      // Find or create monthly record
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
      
      // Update monthly expense and balance
      monthlyRecord.expense += parsedInitialAmount;
      monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;
      
      await user.save();
    }
    
    req.flash('success', 'Goal created successfully');
    res.redirect('/goals');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error creating goal: ' + err.message);
    res.redirect('/goals/add');
  }
});

app.post('/goals/:id/contribute', ensureAuthenticated, async (req, res) => {
  try {
    const { amount, description, date } = req.body;
    const parsedAmount = parseFloat(amount);
    const contributionDate = date ? new Date(date) : new Date();
    
    // Find the goal
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      req.flash('error', 'Goal not found');
      return res.redirect('/goals');
    }
    
    // Create a transaction for this contribution
    const transaction = new Transaction({
      user: req.user.id,
      type: 'expense', // It's an expense because money is being allocated from available funds
      amount: parsedAmount,
      category: 'Goal Contribution',
      description: `Contribution to ${goal.name}: ${description || ''}`,
      date: contributionDate
    });
    
    await transaction.save();
    
    // Update goal amount and link transaction
    goal.currentAmount += parsedAmount;
    goal.linkedTransactions.push(transaction._id);
    
    // Check if goal is completed
    if (goal.currentAmount >= goal.targetAmount) {
      goal.isCompleted = true;
      req.flash('success', 'Congratulations! You have completed your goal!');
    }
    
    await goal.save();
    
    // Update user's financial summary
    const user = await User.findById(req.user.id);
    
    // Update overall totals
    user.financialSummary.totalExpense += parsedAmount;
    user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
    
    // Update monthly record
    const year = contributionDate.getFullYear();
    const month = contributionDate.getMonth();
    
    // Find or create monthly record
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
    
    // Update monthly expense and balance
    monthlyRecord.expense += parsedAmount;
    monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;
    
    await user.save();
    
    req.flash('success', 'Contribution added successfully');
    res.redirect(`/goals/${goal._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error adding contribution: ' + err.message);
    res.redirect(`/goals/${req.params.id}`);
  }
});

app.get('/goals/:id', ensureAuthenticated, async (req, res) => {
  try {
    // Find the goal and populate linked transactions
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('linkedTransactions');
    
    if (!goal) {
      req.flash('error', 'Goal not found');
      return res.redirect('/goals');
    }
    
    // Calculate goal metrics
    const today = new Date();
    const goalObj = goal.toObject();
    
    // Calculate progress percentage
    goalObj.progressPercentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    
    // Calculate if goal is on track
    const totalDuration = goal.targetDate - goal.startDate;
    const elapsedDuration = today - goal.startDate;
    const expectedProgress = (elapsedDuration / totalDuration) * goal.targetAmount;
    goalObj.isOnTrack = goal.isCompleted || goal.currentAmount >= expectedProgress;
    
    // Calculate days remaining
    const diffTime = goal.targetDate - today;
    goalObj.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    res.render('goal-detail', {
      title: goal.name,
      goal: goalObj
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching goal: ' + err.message);
    res.redirect('/goals');
  }
});

// Get the edit goal page
app.get('/goals/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('linkedTransactions');
    
    if (!goal) {
      req.flash('error', 'Goal not found');
      console.log("not found")
      return res.redirect('/goals');
    }
    
    res.render('edit-goal', {
      title: `Edit ${goal.name}`,
      goal
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching goal: ' + err.message);
    // res.redirect('/goals');
  }
});

// Process the edit goal form
app.post('/goals/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, category, targetAmount, currentAmount, targetDate, priority, isCompleted } = req.body;
    
    // Find the goal
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      req.flash('error', 'Goal not found');
      return res.redirect('/goals');
    }
    
    // Update goal fields
    goal.name = name;
    goal.description = description;
    goal.category = category;
    goal.targetAmount = parseFloat(targetAmount);
    goal.targetDate = new Date(targetDate);
    goal.priority = priority;
    goal.isCompleted = isCompleted === 'on';
    
    // Only update currentAmount if there are no linked transactions
    // This prevents inconsistencies with contribution history
    
    
    await goal.save();
    
    req.flash('success', 'Goal updated successfully');
    res.redirect(`/goals/${goal._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error updating goal: ' + err.message);
    res.redirect(`/goals/${req.params.id}/edit`);
  }
});

app.post('/goals/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    // Find the goal
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      req.flash('error', 'Goal not found');
      return res.redirect('/goals');
    }
    
    // If the goal has linked transactions, update their descriptions
    // but don't delete them
    if (goal.linkedTransactions && goal.linkedTransactions.length > 0) {
      for (const transactionId of goal.linkedTransactions) {
        const transaction = await Transaction.findById(transactionId);
        if (transaction) {
          transaction.description = `${transaction.description} (from deleted goal: ${goal.name})`;
          await transaction.save();
        }
      }
    }
    
    // Delete the goal
    await Goal.findByIdAndDelete(goal._id);
    
    req.flash('success', 'Goal deleted successfully. Associated transactions have been preserved.');
    res.redirect('/goals');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error deleting goal: ' + err.message);
    res.redirect('/goals');
  }
});


const Reminder = require('./models/Reminder');

// Get all reminders
app.get('/reminders', ensureAuthenticated, async (req, res) => {
  try {
    // Get reminders sorted by due date
    const reminders = await Reminder.find({ 
      user: req.user.id,
      isPaid: false
    }).sort({ dueDate: 1 });
    
    // Get paid reminders (limited to last 10)
    const paidReminders = await Reminder.find({
      user: req.user.id,
      isPaid: true
    }).sort({ lastPaidDate: -1 }).limit(10);
    
    // Calculate upcoming and overdue reminders
    const today = new Date();
    const upcomingReminders = reminders.filter(reminder => {
      const dueDate = new Date(reminder.dueDate);
      return dueDate >= today;
    });
    
    const overdueReminders = reminders.filter(reminder => {
      const dueDate = new Date(reminder.dueDate);
      return dueDate < today;
    });
    
    // Calculate total upcoming payments
    const totalUpcoming = upcomingReminders.reduce((sum, reminder) => sum + reminder.amount, 0);
    const totalOverdue = overdueReminders.reduce((sum, reminder) => sum + reminder.amount, 0);
    
    res.render('reminders', {
      title: 'Bill Reminders',
      reminders,
      paidReminders,
      upcomingReminders,
      overdueReminders,
      totalUpcoming,
      totalOverdue
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching reminders');
    res.redirect('/dashboard');
  }
});

// Add reminder form
app.get('/reminders/add', ensureAuthenticated, (req, res) => {
  res.render('add-reminder', {
    title: 'Add New Reminder'
  });
});

// Process add reminder form
app.post('/reminders/add', ensureAuthenticated, async (req, res) => {
  try {
    const { title, amount, category, dueDate, recurringType, reminderDays, notes } = req.body;
    
    const newReminder = new Reminder({
      user: req.user.id,
      title,
      amount: parseFloat(amount),
      category,
      dueDate: new Date(dueDate),
      recurringType: recurringType || 'none',
      reminderDays: parseInt(reminderDays) || 3,
      notes
    });
    
    // Set the next due date for recurring reminders
    if (recurringType !== 'none') {
      newReminder.nextDueDate = calculateNextDueDate(new Date(dueDate), recurringType);
    }
    
    await newReminder.save();
    
    req.flash('success', 'Reminder added successfully');
    res.redirect('/reminders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error adding reminder: ' + err.message);
    res.redirect('/reminders/add');
  }
});

// Mark reminder as paid
app.post('/reminders/:id/pay', ensureAuthenticated, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!reminder) {
      req.flash('error', 'Reminder not found');
      return res.redirect('/reminders');
    }
    
    // Create a transaction for this payment
    const transaction = new Transaction({
      user: req.user.id,
      type: 'expense',
      amount: reminder.amount,
      category: reminder.category,
      description: `Payment for: ${reminder.title}`,
      date: new Date()
    });
    
    await transaction.save();
    
    // Update user's financial summary
    const user = await User.findById(req.user.id);
    
    // Update overall totals
    user.financialSummary.totalExpense += reminder.amount;
    user.financialSummary.balance = user.financialSummary.totalIncome - user.financialSummary.totalExpense;
    
    // Update monthly record
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Find or create monthly record
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
    
    // Update monthly expense and balance
    monthlyRecord.expense += reminder.amount;
    monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;
    
    await user.save();
    
    // Handle recurring reminders
    if (reminder.recurringType !== 'none') {
      // Create a new reminder for the next due date
      const nextDueDate = calculateNextDueDate(new Date(reminder.dueDate), reminder.recurringType);
      
      const newReminder = new Reminder({
        user: req.user.id,
        title: reminder.title,
        amount: reminder.amount,
        category: reminder.category,
        dueDate: nextDueDate,
        recurringType: reminder.recurringType,
        reminderDays: reminder.reminderDays,
        notes: reminder.notes
      });
      
      if (reminder.recurringType !== 'none') {
        newReminder.nextDueDate = calculateNextDueDate(nextDueDate, reminder.recurringType);
      }
      
      await newReminder.save();
    }
    
    // Mark the current reminder as paid
    reminder.isPaid = true;
    reminder.lastPaidDate = new Date();
    await reminder.save();
    
    req.flash('success', 'Payment recorded successfully');
    res.redirect('/reminders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error recording payment: ' + err.message);
    res.redirect('/reminders');
  }
});

// Delete reminder
app.post('/reminders/:id/delete', ensureAuthenticated, async (req, res) => {
  try {
    await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    req.flash('success', 'Reminder deleted successfully');
    res.redirect('/reminders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error deleting reminder');
    res.redirect('/reminders');
  }
});

app.get('/reminders/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!reminder) {
      req.flash('error', 'Reminder not found');
      return res.redirect('/reminders');
    }
    
    res.render('edit-reminder', {
      title: `Edit ${reminder.title}`,
      reminder
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching reminder: ' + err.message);
    res.redirect('/reminders');
  }
});

// Process the edit reminder form
app.post('/reminders/:id/edit', ensureAuthenticated, async (req, res) => {
  try {
    const { title, amount, category, dueDate, recurringType, reminderDays, notes, isPaid } = req.body;
    
    // Find the reminder
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!reminder) {
      req.flash('error', 'Reminder not found');
      return res.redirect('/reminders');
    }
    
    // Update reminder fields
    reminder.title = title;
    reminder.amount = parseFloat(amount);
    reminder.category = category;
    reminder.dueDate = new Date(dueDate);
    reminder.recurringType = recurringType;
    reminder.reminderDays = parseInt(reminderDays);
    reminder.notes = notes;
    reminder.isPaid = isPaid === 'on';
    
    // If marked as paid now, set the last paid date
    if (reminder.isPaid && !reminder.lastPaidDate) {
      reminder.lastPaidDate = new Date();
    }
    
    await reminder.save();
    
    req.flash('success', 'Reminder updated successfully');
    res.redirect('/reminders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error updating reminder: ' + err.message);
    res.redirect(`/reminders/${req.params.id}/edit`);
  }
});

// Helper function to calculate next due date for recurring reminders
function calculateNextDueDate(currentDueDate, recurringType) {
  const nextDate = new Date(currentDueDate);
  
  switch (recurringType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
}






// Import the AI chat routes
const aiChatRoutes = require('./routes/ai_chat');
// Use the AI chat routes
app.use('/', aiChatRoutes);


const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PDFDocument = require('pdfkit');
// Adjust path as needed

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// PDF generation route
app.get('/download-transaction-pdf', ensureAuthenticated, async (req, res) => {
  try {
    // Get user's transaction data using the correct field name (user instead of userId)
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ date: -1 })
      .lean();
    
    if (transactions.length === 0) {
      return res.status(404).send('No transactions found to generate a report');
    }
     
    const user = await User.findById(req.user.id);
    
    
    // Create a temporary directory for PDFs if it doesn't exist
    const pdfDir = path.join(__dirname, 'temp-pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    // Create filename with timestamp to avoid collisions
    const filename = `transaction_history_${req.user._id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, filename);
    
    // Generate PDF content using Gemini
    const pdfContent = await generatePdfContent(transactions, req.user);
    
    // Write PDF content to file
    await generatePdf(pdfContent, filePath,user);
    
    // Send the file as a download
    res.download(filePath, 'transaction_history.pdf', (err) => {
      if (err) {
        console.error('Download error:', err);
        return res.status(500).send('Error downloading file');
      }
      
      // Delete the file after download
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      });
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).send('Error generating PDF');
  }
});

// Function to generate PDF content using Gemini
async function generatePdfContent(transactions, user) {
  // Calculate summary statistics
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netBalance = totalIncome - totalExpense;
  
  // Group transactions by category
  const categories = {};
  transactions.forEach(t => {
    if (!categories[t.category]) {
      categories[t.category] = {
        income: 0,
        expense: 0
      };
    }
    categories[t.category][t.type] += t.amount;
  });
  
  // Get top spending categories
  const topExpenseCategories = Object.entries(categories)
    .map(([category, data]) => ({
      category,
      amount: data.expense
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  
  // Get top income categories
  const topIncomeCategories = Object.entries(categories)
    .map(([category, data]) => ({
      category,
      amount: data.income
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  
  // Calculate monthly trends if possible
  const months = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()+1}`;
    
    if (!months[monthKey]) {
      months[monthKey] = {
        income: 0,
        expense: 0,
        month: date.toLocaleString('default', { month: 'long' }),
        year: date.getFullYear()
      };
    }
    
    months[monthKey][t.type] += t.amount;
  });
  
  // Create a prompt for Gemini to generate formatted PDF content with specific formatting instructions
  const prompt = `
    Generate a well-formatted financial report with the following sections. Follow the formatting instructions exactly.

    FINANCIAL DATA:
    Total Income: $${totalIncome.toFixed(2)}
    Total Expenses: $${totalExpense.toFixed(2)}
    Net Balance: $${netBalance.toFixed(2)}
    
    Top Expense Categories: ${topExpenseCategories.map(c => `${c.category} ($${c.amount.toFixed(2)})`).join(', ')}
    Top Income Categories: ${topIncomeCategories.map(c => `${c.category} ($${c.amount.toFixed(2)})`).join(', ')}
    
    CATEGORY BREAKDOWN DATA:
    ${Object.entries(categories).map(([category, data]) => 
      `${category}: Income: $${data.income.toFixed(2)}, Expenses: $${data.expense.toFixed(2)}, Net: $${(data.income - data.expense).toFixed(2)}`
    ).join('\n')}
    
    TRANSACTION DATA:
    ${transactions.map(t => 
      `Date: ${new Date(t.date).toLocaleDateString()}, Type: ${t.type}, Amount: $${t.amount.toFixed(2)}, Category: ${t.category}, Description: ${t.description || 'N/A'}`
    ).join('\n')}
    
    FORMATTING INSTRUCTIONS:
    1. Create an "EXECUTIVE SUMMARY" section with total income, expenses, and net balance in a clear, readable format.
    
    2. Create a "CATEGORY ANALYSIS" section that presents the category data in a table format with these columns: Category, Income, Expenses, Net Balance.
    
    3. Create a "FINANCIAL INSIGHTS" section that analyzes the spending habits and income patterns. Include:
       - Comments on the top spending categories
       - Comments on the top income sources
       - Suggestions for budget improvements based on the spending patterns
       - Savings potential based on expense categories
    
    4. Create a "TRANSACTION DETAILS" section that presents the transactions in a list format, with each transaction showing date, type, amount, category, and description.
    
    5. DO NOT use markdown formatting or special characters that wouldn't render well in a PDF.
    
    6. Use clear section headings and consistent formatting throughout.
    
    7. For the table in the CATEGORY ANALYSIS section, use consistent spacing to create a table-like format that will be readable in a PDF.
    
    8. Leave lines after each section
    
    9. Do not use * for bolding or markdowns anywhere`;
  
  // Get response from Gemini
  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  return response;
}

async function generatePdf(content, outputPath, user) {
  return new Promise((resolve, reject) => {
    try {
      // Create a simple PDF document
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4'
      });
      
      // Pipe output to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      // Add logo or header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('FlowFin', { align: 'center' });
      
      doc.fontSize(18)
         .font('Helvetica')
         .text('Financial Report', { align: 'center' });
      
      doc.moveDown(1);
      
      // Add user name and date directly in the PDF
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`User: ${user?.name || user?.fullName || 'User'}`, { align: 'left' });
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
      
      doc.moveDown(2);
      
      // Process content from Gemini - with improved section handling
      const sections = content.split(/\n\s*\n/);
      
      sections.forEach(section => {
        const trimmedSection = section.trim();
        if (trimmedSection.length === 0) return;
        
        // Check if it's a heading (all caps with or without colon)
        if (/^[A-Z][A-Z\s]+:?$/.test(trimmedSection)) {
          doc.fontSize(16)
             .font('Helvetica-Bold')
             .text(trimmedSection, {
               width: doc.page.width - 100
             });
          doc.moveDown(1);
        } 
        // Check if it might be a table row (contains multiple dollar signs)
        else if (trimmedSection.split('$').length > 3) {
          doc.fontSize(10)
             .font('Courier')
             .text(trimmedSection, {
               align: 'left',
               width: doc.page.width - 100,
               lineGap: 2
             });
          doc.moveDown(0.3);
        }
        // Regular content
        else {
          doc.fontSize(12)
             .font('Helvetica')
             .text(trimmedSection, {
               align: 'left',
               width: doc.page.width - 100,
               lineGap: 5
             });
          doc.moveDown(0.5);
        }
      });
      
      // Finalize the PDF
      doc.end();
      
      stream.on('finish', () => {
        resolve();
      });
      
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}




// POrtfolio routes 

const yahooFinance = require('yahoo-finance2').default;
const Portfolio = require('./models/Portfolio')


// Portfolio dashboard
app.get('/portfolio', ensureAuthenticated, async (req, res) => {
  try {
    // Get user's portfolio from database
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    
    // Initialize summary data
    let totalInvestment = 0;
    let totalCurrentValue = 0;
    let nseStocks = [];
    let bseStocks = [];
    
    // Fetch current data for all stocks in portfolio
    if (portfolio && portfolio.stocks.length > 0) {
      for (const stock of portfolio.stocks) {
        // Append .NS or .BO based on exchange
        const yahooSymbol = stock.exchange === 'NSE' ? `${stock.symbol}.NS` : `${stock.symbol}.BO`;
        
        try {
          const quote = await yahooFinance.quote(yahooSymbol);
          
          const stockData = {
            id: stock._id,
            symbol: stock.symbol,
            exchange: stock.exchange,
            shares: stock.shares,
            purchasePrice: stock.purchasePrice,
            purchaseDate: stock.purchaseDate,
            currentPrice: quote.regularMarketPrice,
            change: quote.regularMarketChangePercent,
            investmentValue: stock.shares * stock.purchasePrice,
            currentValue: stock.shares * quote.regularMarketPrice,
            gain: (stock.shares * quote.regularMarketPrice) - (stock.shares * stock.purchasePrice),
            gainPercentage: (((quote.regularMarketPrice - stock.purchasePrice) / stock.purchasePrice) * 100)
          };
          
          // Add to appropriate exchange array
          if (stock.exchange === 'NSE') {
            nseStocks.push(stockData);
          } else {
            bseStocks.push(stockData);
          }
          
          // Update totals
          totalInvestment += stockData.investmentValue;
          totalCurrentValue += stockData.currentValue;
        } catch (error) {
          console.error(`Error fetching data for ${yahooSymbol}:`, error);
          // Add with error status
          const stockData = {
            id: stock._id,
            symbol: stock.symbol,
            exchange: stock.exchange,
            shares: stock.shares,
            purchasePrice: stock.purchasePrice,
            purchaseDate: stock.purchaseDate,
            error: true,
            investmentValue: stock.shares * stock.purchasePrice
          };
          
          if (stock.exchange === 'NSE') {
            nseStocks.push(stockData);
          } else {
            bseStocks.push(stockData);
          }
          
          // Still count the investment
          totalInvestment += stockData.investmentValue;
        }
      }
    }
    
    // Calculate overall performance
    const totalGain = totalCurrentValue - totalInvestment;
    const totalGainPercentage = totalInvestment > 0 ? ((totalGain / totalInvestment) * 100) : 0;
    
    res.render('portfolio', {
      title: 'Investment Portfolio',
      portfolio,
      nseStocks,
      bseStocks,
      totalInvestment,
      totalCurrentValue,
      totalGain,
      totalGainPercentage,
      activeExchange: req.query.exchange || 'NSE' // Default to NSE
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading portfolio data');
    res.redirect('/dashboard');
  }
});


// Add stock to portfolio
app.post('/portfolio/add', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol, exchange, shares, purchasePrice, purchaseDate } = req.body;
    
    // Validate the stock symbol with appropriate suffix
    const yahooSymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
    
    try {
      const quote = await yahooFinance.quote(yahooSymbol);
      if (!quote) {
        req.flash('error', 'Invalid stock symbol');
        return res.redirect('/portfolio');
      }
    } catch (error) {
      req.flash('error', `Could not verify stock symbol: ${error.message}`);
      return res.redirect('/portfolio');
    }
    
    // Add to portfolio
    await Portfolio.findOneAndUpdate(
      { user: req.user.id },
      { 
        $push: { 
          stocks: {
            symbol: symbol.toUpperCase(),
            exchange,
            shares: parseFloat(shares),
            purchasePrice: parseFloat(purchasePrice),
            purchaseDate: new Date(purchaseDate)
          }
        }
      },
      { upsert: true, new: true }
    );
    
    req.flash('success', `Added ${shares} shares of ${symbol.toUpperCase()} (${exchange}) to your portfolio`);
    res.redirect('/portfolio?exchange=' + exchange);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error adding stock to portfolio');
    res.redirect('/portfolio');
  }
});

app.post('/portfolio/delete/:stockId', ensureAuthenticated, async (req, res) => {
  try {
    const { stockId } = req.params;
    const { exchange } = req.body;
    
    // Find the portfolio and remove the stock
    const result = await Portfolio.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { stocks: { _id: stockId } } },
      { new: true }
    );
    
    if (!result) {
      req.flash('error', 'Stock not found in portfolio');
      return res.redirect('/portfolio');
    }
    
    req.flash('success', 'Stock removed from portfolio');
    res.redirect('/portfolio?exchange=' + (exchange || 'NSE'));
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error removing stock from portfolio');
    res.redirect('/portfolio');
  }
});



// Stock details route
// Stock details route with exchange parameter
app.get('/stock/:symbol', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange = 'NSE' } = req.query;
    
    // Append exchange suffix
    const yahooSymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
    
    // Get stock quote
    const quote = await yahooFinance.quote(yahooSymbol);
    
    // Get historical data (1 year by default)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const historical = await yahooFinance.historical(yahooSymbol, {
      period1: oneYearAgo.toISOString().split('T')[0],
      period2: new Date().toISOString().split('T')[0],
      interval: '1d'
    });
    
    // Get additional modules for more data
    const modules = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ['financialData', 'summaryDetail', 'defaultKeyStatistics', 'recommendationTrend']
    });
    
    // Check if user owns this stock
    const portfolio = await Portfolio.findOne({ 
      user: req.user.id,
      'stocks.symbol': symbol.toUpperCase(),
      'stocks.exchange': exchange
    });
    
    const userOwnsStock = portfolio !== null;
    
    // If user owns the stock, get their holdings
    let holdings = null;
    if (userOwnsStock) {
      const stockData = portfolio.stocks.filter(
        s => s.symbol === symbol.toUpperCase() && s.exchange === exchange
      );
      
      // Calculate total holdings
      let totalShares = 0;
      let totalInvestment = 0;
      
      stockData.forEach(stock => {
        totalShares += stock.shares;
        totalInvestment += stock.shares * stock.purchasePrice;
      });
      
      const avgPurchasePrice = totalInvestment / totalShares;
      const currentValue = totalShares * quote.regularMarketPrice;
      const gain = currentValue - totalInvestment;
      const gainPercentage = (gain / totalInvestment) * 100;
      
      holdings = {
        totalShares,
        totalInvestment,
        avgPurchasePrice,
        currentValue,
        gain,
        gainPercentage
      };
    }
    
    res.render('stock-detail', {
      title: `${symbol.toUpperCase()} - Stock Details`,
      symbol: symbol.toUpperCase(),
      exchange,
      quote,
      historical,
      financialData: modules.financialData,
      summaryDetail: modules.summaryDetail,
      keyStats: modules.defaultKeyStatistics,
      recommendations: modules.recommendationTrend,
      userOwnsStock,
      holdings
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching stock data: ' + err.message);
    res.redirect('/portfolio');
  }
});

// Route for getting real-time data updates
app.get('/api/stock/:symbol/realtime', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange = 'NSE' } = req.query;
    
    // Append exchange suffix
    const yahooSymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
    
    // Get latest quote
    const quote = await yahooFinance.quote(yahooSymbol);
    
    res.json({
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      time: quote.regularMarketTime * 1000, // Convert to milliseconds
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Route for getting historical data with different time periods
app.get('/api/stock/:symbol/historical', ensureAuthenticated, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange = 'NSE', period = '1y' } = req.query;
    
    // Append exchange suffix
    const yahooSymbol = exchange === 'NSE' ? `${symbol}.NS` : `${symbol}.BO`;
    
    // Calculate start date based on period
    const endDate = new Date();
    let startDate = new Date();
    let interval = '1d';
    
    switch(period) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        interval = '5m';
        break;
      case '5d':
        startDate.setDate(startDate.getDate() - 5);
        interval = '15m';
        break;
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        interval = '1d';
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        interval = '1d';
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        interval = '1d';
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        interval = '1d';
        break;
      case '5y':
        startDate.setFullYear(startDate.getFullYear() - 5);
        interval = '1wk';
        break;
      case 'max':
        startDate = new Date('1970-01-01');
        interval = '1mo';
        break;
    }
    
    // Get historical data
    const historical = await yahooFinance.historical(yahooSymbol, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      interval: interval
    });
    
    res.json(historical);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});






// Import the scheduler
const { scheduleEmailReminders } = require('./schedulers/emailReminders');

// Start the scheduler when the app starts

  scheduleEmailReminders();



















// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
