// models/Reminder.js
const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  recurringType: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'none'
  },
  reminderDays: {
    type: Number,
    default: 3 // Remind 3 days before due date by default
  },
  notes: String,
  isPaid: {
    type: Boolean,
    default: false
  },
  lastPaidDate: Date,
  nextDueDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  emailSent: {
  type: Boolean,
  default: false
}
});

// Calculate if a reminder is due soon (within reminderDays)
ReminderSchema.virtual('isDueSoon').get(function() {
  if (this.isPaid) return false;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= this.reminderDays && diffDays >= 0;
});

// Calculate if a reminder is overdue
ReminderSchema.virtual('isOverdue').get(function() {
  if (this.isPaid) return false;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  
  return dueDate < today;
});

// Calculate days until due
ReminderSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Reminder', ReminderSchema);
