// routes/ai_chat.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
  };


// Initialize Gemini API
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Render the AI help page
router.get('/ai_help', ensureAuthenticated, (req, res) => {
  res.render('ai_help', { 
    title: 'AI Financial Assistant',
    user: req.user
  });
});

// Get all conversations for the current user
router.get('/api/conversations', ensureAuthenticated, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 });
    
    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create a new conversation
router.post('/api/conversations', ensureAuthenticated, async (req, res) => {
  try {
    const conversation = new Conversation({
      userId: req.user._id,
      title: req.body.title || 'New Conversation'
    });
    
    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get a specific conversation
router.get('/api/conversations/:id', ensureAuthenticated, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Update a conversation (title)
router.put('/api/conversations/:id', ensureAuthenticated, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete a conversation
router.delete('/api/conversations/:id', ensureAuthenticated, async (req, res) => {
  try {
    const result = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Add a message to a conversation
router.post('/api/conversations/:id/messages', ensureAuthenticated, async (req, res) => {
  try {
    const { sender, content } = req.body;
    
    if (!sender || !content) {
      return res.status(400).json({ error: 'Sender and content are required' });
    }
    
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    conversation.messages.push({ sender, content });
    await conversation.save();
    
    res.status(201).json({ message: 'Message added', conversation });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Process chat message with Gemini
router.post('/api/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Create context from previous messages (last 5)
    const context = conversation.messages
      .slice(-5)
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Prepare prompt for Gemini
    const prompt = `
      You are a helpful financial planning assistant for FlowFin. 
      Your name is FlowFin Assistant.
      
      Previous conversation:
      ${context}
      
      User's latest question: ${message}
      
      Provide a helpful, accurate, and concise response about financial planning.
      Focus on practical financial advice, budgeting, investing, saving, and financial literacy.
      Be conversational but professional.Keep the answers short not more than 5-7 lines , Do not elaborate unless asked to do so
      IMPORTANT FORMATTING INSTRUCTIONS:
  - Do NOT use asterisks (*) or underscores (_) for emphasis
  - Do NOT use markdown formatting
  - Use plain text only
  - If you want to emphasize something, use quotes or simply capitalize important words
    `;
    
    // Get response from Gemini
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    res.json({ response });
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ 
      error: 'Failed to process your message',
      response: "I'm sorry, I encountered an error while processing your request. Please try again."
    });
  }
});



module.exports = router;
