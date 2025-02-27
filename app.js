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
app.use('/', authRoutes);

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
    
    res.render('dashboard', {
      title: 'Dashboard',
      user: user,
      financialSummary: user.financialSummary,
      currentMonthSummary,
      currentMonthName,
      currentYear,
      recentTransactions
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
      
    }
    
    // Update monthly record
    if (type === 'income') {
      monthlyRecord.income += parsedAmount;
    } else {
      monthlyRecord.expense += parsedAmount;
    }
    
    monthlyRecord.balance = monthlyRecord.income - monthlyRecord.expense;

    user.financialSummary.monthly.push(monthlyRecord);
    
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
    
    // Get transactions
    const transactions = await Transaction.find(filter).sort(sortOption);
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;
      }
    });
    
    const balance = totalIncome - totalExpense;
    
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






// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
