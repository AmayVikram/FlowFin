# FlowFin - DevBits Submission

## 1. Project Title
**FlowFin - Financial Flow Management System**

FlowFin is a Personal Finance Management (PFM) system that helps users take control of their finances. It provides tools for expense tracking, budgeting, goal setting, financial analysis, taxes, investment tracking, AI Assistant, and PDF generation tools for smart budgeting. 

The system offers features like spend analysis through visual charts, budget creation and monitoring, goal tracking, transaction history, and financial dashboards that give users an overview of their financial status.

---

## 2. Features Implemented
- Add, edit, and delete income and expense transactions
- Filter and Sort Transactions by month, date, amount, and categories
- Real-time financial summary dashboard
- Charts for visualizing trends in income and transactions
- Import/Export transactions as CSV
- Stock and investment portfolio to monitor real-time value of stocks and corresponding returns
- Setting financial goals
- Calculators and graphs for mutual fund investments and income taxes
- Income Tax Report PDF Generator
- Secure data storage and user authentication
- Bill and payments reminder system
- Custom PDF report generation using AI providing financial insights
- AI Financial Assistant Chatbot

---

## 3. Hosted Link
- [FlowFin - Live Demo](https://flowfin-2.onrender.com)
- [FlowFin demo Video](https://youtu.be/1aOfi2Q94xM)

---

## 4. Email Reminder Example
*(Add screenshots here if available)*  
- If a Bill is within due date we will send a reminder to user through mail
- ![Screenshot 2025-03-05 205029](https://github.com/user-attachments/assets/0e19bf4f-4e55-45cf-9404-909321cfe9f1)
- ![Screenshot 2025-03-05 205149](https://github.com/user-attachments/assets/6feae899-334b-4806-938a-6c740a65f60d)
- ![Screenshot 2025-03-05 205217](https://github.com/user-attachments/assets/93b7a437-82b2-4c0b-acb7-08ec4ce16c50)
- Current time for Sending email is 8:51 PM this can be changed by changing the cron schedule in /schedulers/emailReminders.js
---

## 5. Tech Stack
- Node.js
- Express.js
- MongoDB
- Passport.js
- EJS (Embedded JavaScript Templating)

---

## 6. Technologies Used
- Gemini API (for AI Financial Assistant and PDF Report generation)
- Yahoo Finance (for stock price tracking)
- Google OAuth 2.0 (for user authentication)
- Nodemailer (for sending emails)

---

## 7. Running Locally

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (running locally or a remote URI)

### Steps to Run

1. Clone the Repository
    ```bash
    git clone https://github.com/AmayVikram/FlowFin.git
    cd FlowFin
    ```

2. Install Dependencies
    ```bash
    npm install
    ```

3. Set Up Environment Variables
    Create a `.env` file in the project root and add the following:
    ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/auth_app
    SESSION_SECRET=your_super_secret_key_change_this

    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    EMAIL_SERVICE=gmail (or some other service)
    EMAIL_USER=your_email@example.com
    EMAIL_PASSWORD=your_app_password of the email service (For Gmail u can get an app password by enabling 2 step verification)

    APP_URL=http://localhost:3000

    GEMINI_API_KEY=your_gemini_api_key
    CALLBACK_URL=http://localhost:3000/auth/google/callback
    ```
    > ⚠️ **Do not share your `.env` file in public repositories.**


4. Start the Application
    ```bash
    node app.js
    ```
    Access the app at: [http://localhost:3000](http://localhost:3000)

---


