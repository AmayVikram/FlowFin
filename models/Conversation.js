// models/Conversation.js
const mongoose = require('mongoose');

// Message Schema (Sub-document)
const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,  // Using String type for userId
    required: true
  },
  _id: {
    type: String,
    default: () => 'conv_' + Math.random().toString(36).substring(2, 15)
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
