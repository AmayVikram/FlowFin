// auth.js
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();
const dotenv = require('dotenv');
const User = require('./models/User'); // Adjust path as needed
dotenv.config();



// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      // Check if user already exists in our database
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      } else {
        // Create new user if doesn't exist
        const newUser = new User({
          googleId: profile.id,
          fullName: profile.displayName,
          email: profile.emails[0].value,
          // You might want to set a default password or handle this differently
        });
        
        await newUser.save();
        return done(null, newUser);
      }
    } catch (err) {
      return done(err, null);
    }
  }
));

// Serialize user for session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Route to start Google authentication
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback route
router.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureFlash: true
  }),
  function(req, res) {
    // Successful authentication
    req.flash('success', 'Successfully logged in with Google!');
    res.redirect('/dashboard');
  }
);

module.exports = router;
