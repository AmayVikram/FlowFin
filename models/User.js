const mongoose = require('mongoose');


// User model
const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
    return !this.googleId; // Only required if no googleId exists
  }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  googleId: {
  type: String
},
// In models/User.js - Add these fields to your User schema
financialSummary: {
  totalIncome: {
    type: Number,
    default: 0
  },
  totalExpense: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  monthly: [{
    year: Number,
    month: Number, // 0-11 (JavaScript months)
    income: {
      type: Number,
      default: 0
    },
    expense: {
      type: Number,
      default: 0
    },
    balance: {
      type: Number,
      default: 0
    }
  }]
}


});

module.exports = mongoose.model('User', UserSchema);