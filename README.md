# NIT Faculty Management System

A comprehensive web application for managing faculty operations, leave applications, course planning, and administrative tasks at National Institute of Technology.

## Features

- **Authentication & Authorization**: Secure login system with role-based access (Admin/Faculty)
- **Leave Management**: Apply, track, and manage leave applications with automated balance calculations
- **Course Planning**: Manage course schedules and timetables
- **Document Management**: Auto-fill PDF/DOCX forms for leave applications
- **Admin Dashboard**: Comprehensive admin panel for managing faculty, leave balances, and system configurations
- **Real-time Updates**: Dynamic leave balance tracking with monthly accrual system

## Screenshots

### Login Page
![Login Page](img/Login%20Page.png)

### Faculty Dashboard
![Faculty Dashboard](img/Faculty%20Dashboard.png)

### Admin Dashboard
![Admin Dashboard](img/Admin%20Dashboard.png)

## Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Framer Motion for animations
- Lucide React & Heroicons for icons

### Backend
- Node.js with Express
- MySQL database
- JWT authentication
- Bcrypt for password hashing
- Multer for file uploads
- PDF-lib & Puppeteer for document generation

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/kishoreafk/Nit-Faculty-Managment.git
cd Nit-Faculty-Managment
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Configure Database**
- Create a MySQL database
- Update `backend/.env` with your database credentials:
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=faculty_management
JWT_SECRET=your_jwt_secret
PORT=5000
```

4. **Run Database Migrations**
```bash
# Execute the SQL files in backend/migrations/ folder
mysql -u your_username -p faculty_management < backend/database.sql
```

5. **Frontend Setup**
```bash
cd ..
npm install
```

6. **Start the Application**

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
npm run dev
```

7. **Access the Application**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

## Project Structure

```
├── backend/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Authentication middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── migrations/      # Database migrations
├── src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── context/         # React context
│   └── api/             # API integration
└── img/                 # Screenshots
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
