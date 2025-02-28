// models/Goal.js
const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    required: true,
    enum: ['Emergency Fund', 'Savings', 'Debt Repayment', 'Purchase', 'Investment', 'Education', 'Travel', 'Other']
  },
  targetAmount: {
    type: Number,
    required: true
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  linkedTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  notes: String,
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate progress percentage
GoalSchema.virtual('progressPercentage').get(function() {
  return Math.min(100, (this.currentAmount / this.targetAmount) * 100);
});

// Calculate if goal is on track
GoalSchema.virtual('isOnTrack').get(function() {
  if (this.isCompleted) return true;
  
  const today = new Date();
  const totalDuration = this.targetDate - this.startDate;
  const elapsedDuration = today - this.startDate;
  const expectedProgress = (elapsedDuration / totalDuration) * this.targetAmount;
  
  return this.currentAmount >= expectedProgress;
});

// Calculate days remaining
GoalSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const diffTime = this.targetDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Goal', GoalSchema);
