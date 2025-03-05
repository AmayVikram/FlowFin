# FlowFin - Hackathon Submission

## 1. Project Title
**FlowFin - Financial Flow Management System**
The website is a Personal Finance Management (PFM) system that helps users take control of their finances. It provides tools for expense tracking, budgeting, goal setting,financial analysis,Taxes,Investment,AI Assitant and pdf generation tools for smart budgeting. The system offers features like spend analysis through visual charts, budget creation and monitoring, goal tracking, transaction history, and financial dashboards that give users an overview of their financial status. 
---

## 2. Features Implemented
- User authentication and profile management
- Add, edit, and delete income and expense entries
- Real-time financial summary dashboard
- Visualization charts for income vs expenses
- Budget tracking and alerts
- Mobile responsive design
- Secure data storage and retrieval

---

## 3. Hosted Links
- **Frontend URL:** [Deployed Link Here](#)
- **Backend URL:** [API Documentation or Backend Link Here](#)

---

## 4. Screenshots (optional)
*(Add screenshots here if available)*
Example:  
![Dashboard Screenshot](https://via.placeholder.com/600x300.png?text=Dashboard+Screenshot)

---

## 5. Technologies Used
- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens)
- **Deployment:** Vercel (Frontend), Render (Backend)

---

## 6. API Endpoints (optional)
### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Transactions
- `GET /api/transactions` - Fetch all transactions
- `POST /api/transactions` - Add new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Profile
- `GET /api/profile` - Fetch user profile data

---

## 7. How to Run Locally
```bash
# Clone the repository
git clone https://github.com/yourusername/flowfin.git

# Navigate to project folder
cd flowfin

# Install dependencies
npm install

# Start development server
npm run dev
