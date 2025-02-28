// utils/emailService.js
const nodemailer = require('nodemailer');

// Create a transporter using environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send bill reminder email
async function sendBillReminder(user, reminder, daysUntilDue) {
  try {
    // Determine urgency level
    let urgencyLevel = 'normal';
    let subjectPrefix = '';
    
    if (daysUntilDue === 0) {
      urgencyLevel = 'high';
      subjectPrefix = 'URGENT: ';
    } else if (daysUntilDue <= 2) {
      urgencyLevel = 'medium';
      subjectPrefix = 'Important: ';
    }
    
    // Create email content
    const mailOptions = {
      from: `"FlowFin" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `${subjectPrefix}Payment Reminder: ${reminder.title} due in ${daysUntilDue} days`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: ${urgencyLevel === 'high' ? '#d9534f' : (urgencyLevel === 'medium' ? '#f0ad4e' : '#5bc0de')};">Bill Payment Reminder</h2>
          <p>Hello ${user.fullName},</p>
          <p>This is a reminder that your bill <strong>${reminder.title}</strong> is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Bill Details:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
              <li><strong>Amount:</strong> ₹${reminder.amount.toFixed(2)}</li>
              <li><strong>Category:</strong> ${reminder.category}</li>
              <li><strong>Due Date:</strong> ${new Date(reminder.dueDate).toLocaleDateString()}</li>
              <li><strong>Notes:</strong> ${reminder.notes || 'None'}</li>
            </ul>
          </div>
          ${urgencyLevel === 'high' ? 
            `<p style="color: #d9534f;"><strong>⚠️ This bill is due today! Please make your payment as soon as possible to avoid late fees.</strong></p>` : 
            `<p>Please make sure to pay this bill on time to avoid any late fees or penalties.</p>`
          }
          <a href="${process.env.APP_URL}/reminders" style="display: inline-block; background-color: #0275d8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">View Your Bills</a>
          <p style="margin-top: 30px; font-size: 0.9em; color: #6c757d;">This is an automated reminder from FlowFin.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${user.email} for bill "${reminder.title}": ${info.response}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

module.exports = {
  sendBillReminder
};
