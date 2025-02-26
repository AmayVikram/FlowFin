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
}

});

module.exports = mongoose.model('User', UserSchema);