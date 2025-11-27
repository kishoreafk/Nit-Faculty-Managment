# NIT Faculty Management System

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.10.5-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://mysql.com/)

**Enterprise-level faculty lifecycle management platform with dynamic forms, leave management, timetable planning, document vault, and performance tracking.**

</div>

---

## 📋 Table of Contents

- [🏗️ Architecture Overview](#-architecture-overview)
  - [System Architecture](#system-architecture)
  - [Technology Stack](#technology-stack)
  - [Project Structure](#project-structure)
- [✨ Key Features](#-key-features)
  - [Feature Highlights by Role](#feature-highlights-by-role)
- [🎯 User Guides](#-user-guides)
  - [For Administrators](#for-administrators)
  - [For Faculty Members](#for-faculty-members)
  - [For Department Heads (HOD)](#for-department-heads-hod)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Development](#development)
- [🗄️ Database Schema](#️-database-schema)
  - [Core Tables](#core-tables)
  - [Stored Procedures & Triggers](#stored-procedures--triggers)
- [🔐 Security Implementation](#-security-implementation)
  - [Backend Architecture](#backend-architecture)
  - [Frontend Architecture](#frontend-architecture)
- [🧪 Testing](#-testing)

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 18      │    │   Express.js    │    │     MySQL 8     │
│   Frontend      │◄──►│   Backend API   │◄──►│   Database       │
│                 │    │                 │    │                 │
│ • TypeScript    │    │ • TypeScript    │    │ • Stored Procs  │
│ • TailwindCSS   │    │ • JWT Auth      │    │ • Triggers      │
│ • Vite          │    │ • Cron Jobs     │    │ • Views         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                             │
                       ┌─────┴─────┐
                       │ File      │
                       │ Storage   │
                       │ (Uploads) │
                       └───────────┘
```

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend** | React 18 + TypeScript | ^18.2.0 | User interface and interactions |
| **Build Tool** | Vite | ^5.0.8 | Development server and bundling |
| **Styling** | TailwindCSS | ^3.4.0 | Responsive design system |
| **Animation** | Framer Motion | ^10.16.16 | Smooth UI transitions |
| **Forms** | React Hook Form + Zod | ^7.49.2 + ^3.22.4 | Form validation and management |
| **Backend** | Node.js + Express + TypeScript | ^20.10.5 + ^4.18.2 | API server and business logic |
| **Database** | MySQL 8 | ^8.0 | Data persistence with advanced features |
| **Auth** | JWT + bcrypt | ^9.0.2 + ^5.1.1 | Secure authentication |
| **File Upload** | Multer | ^1.4.5 | Document management |
| **Scheduling** | node-cron | ^3.0.3 | Automated tasks |
| **Email** | nodemailer | ^6.9.7 | Notification system |

### Project Structure

```
NIT Faculty Management/
├── 📁 backend/                          # Backend application
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts             # MySQL connection configuration
│   │   │   └── index.ts
│   │   ├── controllers/                 # Request handlers
│   │   │   ├── adminController.ts       # Admin-specific logic
│   │   │   ├── authController.ts        # Authentication handling
│   │   │   ├── dashboardController.ts   # Dashboard data
│   │   │   ├── leaveController.ts       # Leave management
│   │   │   ├── formController.ts        # Dynamic forms
│   │   │   └── userController.ts        # User management
│   │   ├── middleware/
│   │   │   └── auth.ts                  # JWT authentication middleware
│   │   ├── routes/                      # API route definitions
│   │   │   ├── adminUserRoutes.ts       # Admin user management
│   │   │   ├── index.ts                 # Route aggregator
│   │   │   └── auth.ts                  # Authentication routes
│   │   ├── utils/                       # Utility functions
│   │   │   ├── cronJobs.ts              # Scheduled leave accrual
│   │   │   ├── timeFormat.ts            # Date/time utilities
│   │   │   └── initStorage.ts           # File system initialization
│   │   └── server.ts                    # Express server entry point
│   ├── uploads/                         # File storage directory
│   │   ├── timetables/
│   │   ├── vaultify/
│   │   └── products/
│   └── package.json
├── 📁 frontend/                         # React application
│   ├── public/
│   │   └── index.html                   # HTML template
│   ├── src/
│   │   ├── components/                  # Reusable UI components
│   │   │   ├── Layout.tsx              # Main layout wrapper
│   │   │   └── LeaveApplicationForm.tsx # Leave form component
│   │   ├── pages/                       # Page components
│   │   │   ├── AdminLeaveReview.tsx     # Admin leave approvals
│   │   │   ├── LeaveManagement.tsx      # Faculty leave interface
│   │   │   ├── Dashboard.tsx            # User dashboard
│   │   │   └── Login.tsx                # Authentication page
│   │   ├── hooks/                       # Custom React hooks
│   │   │   └── useAuth.ts               # Authentication hook
│   │   └── utils/                       # Frontend utilities
│   │       ├── api.ts                   # API client
│   │       └── dateFormat.ts            # Date formatting
│   └── package.json
├── 📁 database/
│   └── schema.sql                       # Complete database schema
└── 📁 documentation/                    # Additional guides
    ├── LEAVE_SYSTEM_GUIDE.md
    ├── ADMIN_REASON_USER_GUIDE.md
    └── TESTING_GUIDE.md
```

---

## ✨ Key Features

### ✅ Implemented Features

- 🔐 **Multi-role Authentication**: Secure JWT-based authentication with role-based access control (ADMIN, HOD, FACULTY)
- 📝 **Dynamic Leave System**: Comprehensive leave management with auto-accrual, balance tracking, and admin approval workflow
- 🏢 **Alternate Faculty Assignment**: Automated teaching staff replacement with confirmation workflow
- 📋 **Admin Reason Requirement**: Mandatory detailed reasoning for all admin decisions (approvals/rejections)
- 📄 **Dynamic Forms Engine**: JSON-based form definitions with conditional fields and auto-filling capabilities
- 📅 **Timetable Management**: Conflict-free schedule planning with visual interface
- 🗂️ **Vaultify Document Vault**: Secure file storage with organized categories and access tracking
- 📦 **Product Request System**: Resource requisition workflow with procurement tracking
- 📊 **Dashboard Analytics**: Role-specific dashboards with quick access modules
- 🔔 **Notification System**: Real-time updates and email notifications (configurable)
- 🌐 **Responsive Design**: Mobile-first responsive UI built with TailwindCSS

### 🔄 Core System Modules

#### 1. **Leave Management System**
- **Automatic Leave Accrual**: Monthly cron job updates balances based on faculty type
- **Comprehensive Application Form**: Dynamic fields based on faculty type (teaching/non-teaching)
- **Alternate Arrangements**: Faculty assignment system for teaching staff
- **Multi-level Approval Workflow**: HOD and Admin review with mandatory reasons
- **Real-time Balance Tracking**: Reserved amounts and availability checking
- **Advanced Validation**: Gender-specific leave types, probation restrictions, service period checks

#### 2. **Authentication & Authorization**
- **JWT Token Management**: Access and refresh token system with automatic renewal
- **Role-based Access**: Three-tier permission system (Faculty, HOD, Admin)
- **Secure Password Management**: bcrypt hashing with configurable rounds
- **Session Management**: Automatic logout and token invalidation

#### 3. **Dynamic Forms**
- **JSON Schema Definition**: Flexible form creation without code changes
- **Conditional Logic**: Fields show/hide based on responses
- **Auto-filling**: Pre-populate fields from user profiles
- **Version Control**: Form history and migration support

#### 4. **Timetable & Scheduling**
- **Conflict Detection**: Database triggers prevent scheduling overlaps
- **Visual Planning**: Interactive schedule building interface
- **Course Tracking**: Assignment monitoring and optimization

#### 5. **Document Management (Vaultify)**
- **Category Organization**: Structured file storage system
- **Access Auditing**: Complete log of file access and modifications
- **Secure Upload**: File type validation and path traversal protection

#### 6. **Product Procurement**
- **Request Workflow**: Multi-step approval process
- **Procurement Tracking**: Item acquisition status monitoring
- **Budget Integration**: Spending limit enforcement

### Feature Highlights by Role

| Feature | 👨‍🏫 Faculty Member | 👔 Department Head (HOD) | 👑 Administrator |
|---------|-------------------|--------------------------|------------------|
| **Dashboard Access** | ✓ Personal dashboard with quick actions | ✓ Department overview with pending items | ✓ System-wide analytics and management |
| **Leave Applications** | ✓ Apply, view status, arrange alternates | ✓ Review department applications | ✓ Approve all applications with reasons |
| **Product Requests** | ✓ Submit procurement requests | ✓ Review department requests | ✓ Approve all requests with reasons |
| **User Management** | ❌ Not accessible | ❌ Not accessible | ✓ Create/edit all user accounts |
| **Timetable Assignment** | ✓ View assigned schedules | ✓ Review department timetables | ✓ Manage all timetable assignments |
| **Document Vault** | ✓ Upload department documents | ✓ Manage department documents | ✓ Full system document management |
| **Leave Balance Management** | ✓ View personal balances | ✓ View all department balances | ✓ Edit all leave balances |
| **Audit Logs** | ❌ Not accessible | ✓ Department activity logs | ✓ Complete system audit trail |
| **System Configuration** | ❌ Not accessible | ❌ Not accessible | ✓ Modify system settings |

---

## 🎯 User Guides

### For Administrators

#### 🔐 System Access
- **Login**: Use default admin credentials (admin@university.edu / admin123)
- **Dashboard**: Overview of all pending approvals, system statistics, and quick actions
- **Navigation**: Sidebar with all administrative modules

#### 👥 User Management
1. Navigate to **"User Management"** from admin dashboard
2. **Create Faculty**: Fill comprehensive profile form including department, designation, faculty type
3. **Edit Users**: Modify user information, roles, and department assignments
4. **View Details**: Complete user profiles with activity history
5. **Reset Passwords**: Generate and securely communicate temporary passwords

#### 📋 Leave Review Process
1. **Access Leave Review**: Click "Leave Applications Review" from dashboard
2. **Review Details**: Examine faculty information, leave dates, reason, and alternate arrangements
3. **Check Validations**:
   - Sufficient leave balance available
   - No overlapping applications
   - Alternate faculty confirmations (for teaching staff)
   - Compliance with leave policies
4. **Provide Reason**: Mandatory detailed explanation (minimum 10 characters)
   - **Approval Examples**: "Approved - sufficient balance and alternates confirmed, aligns with academic calendar"
   - **Rejection Examples**: "Rejected - insufficient balance, department requires full staffing during exam period"
5. **Track Applications**: View all applications with status badges and history

#### 📦 Product Request Review
1. **Access Product Reviews**: Navigate to "Product Request Reviews"
2. **Evaluate Requests**: Review item details, justification, and budget impact
3. **Approval Process**: Provide detailed reasoning for decisions
4. **Procurement Tracking**: Monitor item acquisition status

#### 📊 System Monitoring
- **Dashboard Analytics**: User counts, pending requests, leave statistics
- **Audit Logs**: Complete activity history with timestamps
- **Leave Balance Management**: Manual balance adjustments when needed

### For Faculty Members

#### 🏠 Dashboard Overview
- **Welcome Interface**: Personalized greeting with department information
- **Quick Actions**: Direct access to frequently used features
- **Notifications**: Pending tasks and system announcements
- **Leave Summary**: Current balances across all leave types

#### 📝 Leave Application Process
1. **Access Leave Management**: Click "Leave Management" from navigation
2. **View Balances**: Check available leave days before applying
3. **Apply for Leave**:
   - **Basic Information**: Auto-filled from profile (name, ID, department)
   - **Leave Type Selection**: Choose from available types based on balance
   - **Date Range**: Start date ≥ today, end date ≥ start date
   - **Additional Details**: Reason, contact information, optional remarks
4. **Teaching Staff Requirements**:
   - **Add Adjustments**: Specify classes needing coverage
   - **Select Alternates**: Search and assign replacement faculty
   - **Monitor Confirmations**: Track acceptance/rejection status
5. **Submit Application**: Review and confirm submission

#### 🔄 Managing Leave Applications
- **View Applications**: Status tracking (Pending/Approved/Rejected)
- **Admin Feedback**: Review approval/rejection reasons when available
- **Edit Pending Applications**: Modify before admin review
- **Application History**: Complete leave activity record

#### 📋 Product Requests
1. **Submit Requests**: Fill item details and justification
2. **Track Status**: Monitor approval progress and status updates
3. **View Admin Decisions**: Access reasoning behind approvals/rejections

#### 📁 Document Management (Vaultify)
- **Upload Documents**: Add files to department categories
- **Organize Files**: Maintain document library with search and filters
- **Access History**: View file activity and modifications

#### 👤 Profile Management
- **View Information**: Complete faculty profile with contact details
- **Update Details**: Modify contact information and preferences
- **Change Password**: Secure password update process

### For Department Heads (HOD)

#### 📊 Department Overview
- **Team Dashboard**: View department faculty and activity
- **Pending Approvals**: Department-specific requests requiring attention
- **Department Statistics**: Leave usage, activity metrics

#### 🔍 Leave Review (Department Level)
1. **Access Department Leave Reviews**: Filter applications by department
2. **Review Department Applications**:
   - Faculty information and leave details
   - Impact on department operations
   - Alternate arrangement confirmations
3. **Provide Reasoning**: Detailed explanations for departmental decisions
4. **Escalation**: Forward complex cases to administrator review

#### 👥 Team Management
- **Faculty List**: Department roster with contact information
- **Leave Patterns**: Monitor leave usage across department
- **Timetable Coordination**: Department schedule management

#### 📈 Reporting Features
- **Department Analytics**: Leave trends, request patterns
- **Approval History**: Decision history and justifications
- **Activity Logs**: Department-specific audit trail

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **MySQL**: v8.0 or higher
- **Git**: For version control
- **IDE**: VS Code recommended with TypeScript support

### Installation

#### 1. **Clone Repository**
```bash
git clone <repository-url>
cd "NIT Faculty Management"
```

#### 2. **Environment Setup**
```bash
# Copy environment template (if not exists)
code .env                    # Create in root directory
```

**.env file content:**
```env
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=faculty_management

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

#### 3. **Database Setup**
```bash
# Start MySQL service
mysql -u root -p

# Create database and import schema
CREATE DATABASE faculty_management;
USE faculty_management;
SOURCE database/schema.sql;
EXIT;
```

#### 4. **Backend Installation**
```bash
cd backend
npm install

# Verify installation
node --version
npm --version
```

#### 5. **Frontend Installation**
```bash
cd ../frontend
npm install

# Verify installation
npm --version
```

### Development

#### **Option 1: Manual Development**
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

**Access the application:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Backend Health**: http://localhost:5000/health

#### **Option 2: Production Build**
```bash
# Build Backend
cd backend
npm run build    # Creates dist/ directory

# Build Frontend
cd frontend
npm run build    # Creates dist/ directory

# Start Production Backend
npm start        # Serves frontend from dist/
```

#### **Default Login Credentials**
- **Administrator**:
  - Email: `admin@university.edu`
  - Password: `admin123`
- **Faculty Example**:
  - Email: Create new faculty via admin panel
  - Password: Set during user creation

### Verification Steps

1. **Backend Health Check**:
```bash
curl http://localhost:5000/health
# Expected: {"status":"OK","timestamp":"2025-11-20T..."}
```

2. **Database Connection**:
   - Backend should show: "✅ Connected to database"
   - No connection errors in backend logs

3. **Frontend Access**:
   - Page loads without errors
   - Login form displays correctly

4. **Authentication Test**:
   - Login with admin credentials
   - Access admin dashboard

---
### Authentication Headers

All API requests (except login/register) require:
```
Authorization: Bearer <access_token>
```

Tokens are automatically managed by the frontend API client.

---

## 🔐 Security Implementation

### Authentication Architecture

1. **JWT Token System**:
   - Access tokens: 15-minute expiry
   - Refresh tokens: 30-day expiry
   - Automatic token renewal

2. **Password Security**:
   - bcrypt hashing with configurable rounds
   - Password complexity requirements
   - Secure password reset workflow

3. **Role-based Access Control**:
   - Database-level permission checks
   - Route-level middleware protection
   - UI component conditional rendering

### Data Protection

- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and validation
- **CSRF Protection**: JWT token validation
- **CORS Configuration**: Domain restriction
- **File Upload Security**: Type validation, size limits, path traversal protection

### Audit Trail

- **Complete Logging**: All admin actions tracked
- **Immutable Records**: Decision history cannot be altered
- **Timestamp Tracking**: Precise action timing
- **User Attribution**: Every change linked to user account

---

---

## 🧪 Testing

### Testing Strategy

1. **Unit Tests**: Component and utility function testing
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Full user workflow testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Test Coverage

- **API Endpoints**: Authentication, CRUD operations
- **Business Logic**: Leave calculations, validation rules
- **UI Components**: Form validation, state management
- **Database Operations**: Stored procedures, triggers

---

## 🚀 Deployment

### Development Deployment

```bash
# Backend deployment
cd backend
npm run build
npm start

# Frontend deployment
cd frontend
npm run build
npm run preview
```

### Production Deployment

#### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```


<div align="center">

**Built with ❤️ for educational excellence**


</div>
