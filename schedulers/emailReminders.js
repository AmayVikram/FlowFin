// schedulers/emailReminders.js
const cron = require('node-cron');
const User = require('../models/User');
const Reminder = require('../models/Reminder');
const { sendBillReminder } = require('../utils/emailservice');

// Function to schedule daily email checks
function scheduleEmailReminders() {
  // Run every day at 8:00 AM
  cron.schedule('51 20 * * *', async () => {
    console.log('Running email reminder check...');
    
    try {
      // Get all unpaid reminders
      const reminders = await Reminder.find({
        isPaid: false,
        emailSent: false
      });
      
      console.log(`Found ${reminders.length} unpaid reminders to check`);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Process each reminder
      for (const reminder of reminders) {
        const user = await User.findById(reminder.user);
        
        if (!user || !user.email) {
          console.log(`Skipping reminder ${reminder._id}: User not found or no email`);
          continue;
        }
        
        const dueDate = new Date(reminder.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // Calculate days until due
        const diffTime = dueDate - today;
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Check if we should send an email based on reminderDays
        if (daysUntilDue === 0 || daysUntilDue <= reminder.reminderDays) {
          console.log(`Sending reminder for bill "${reminder.title}" due in ${daysUntilDue} days to ${user.email}`);
          
          const emailSent = await sendBillReminder(user, reminder, daysUntilDue);
          
          if (emailSent) {
            // If this is the final reminder (on due date), mark as emailSent
            if (daysUntilDue === 0) {
              reminder.emailSent = true;
              await reminder.save();
              console.log(`Marked reminder ${reminder._id} as emailSent`);
            }
          }
        }
      }
      
      console.log('Email reminder check completed');
    } catch (error) {
      console.error('Error in email reminder scheduler:', error);
    }
  });
  
  console.log('Email reminder scheduler started');
}

module.exports = { scheduleEmailReminders };
