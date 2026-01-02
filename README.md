# NIT Faculty Management System

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://mysql.com/)

**Faculty lifecycle management platform with dynamic forms, leave management, timetable planning, document vault, and dashboard analytics.**

</div>

---

## 📋 Table of Contents

- [🏗️ Architecture Overview](#-architecture-overview)
  - [System Architecture](#system-architecture)
  - [Technology Stack](#technology-stack)
  - [Project Structure](#project-structure)
- [📚 Detailed Project Overview](#-detailed-project-overview)
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
| **Backend** | Node.js + Express + TypeScript | 20.x + ^4.18.2 | API server and business logic |
| **Database** | MySQL 8 | ^8.0 | Data persistence with advanced features |
| **Auth** | JWT + bcrypt | ^9.0.2 + ^5.1.1 | Secure authentication |
| **File Upload** | Multer | ^1.4.5 | Document management |
| **Scheduling** | node-cron | ^3.0.3 | Automated tasks |
| **Email** | nodemailer | ^6.9.7 | Notification system |

### Project Structure

```
Faculty-Management-NIT/
├── backend/                              # Express + TypeScript API
│   ├── src/
│   │   ├── server.ts                     # App entry (mounts /api + /health)
│   │   ├── config/                       # Env + DB config
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── loadEnv.ts                # Loads repo-root .env
│   │   ├── controllers/                  # Route handlers (business logic)
│   │   │   ├── authController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── adminController.ts
│   │   │   ├── adminUserController.ts
│   │   │   ├── adminLogsController.ts
│   │   │   ├── leaveController.ts
│   │   │   ├── productController.ts
│   │   │   ├── timetableController.ts
│   │   │   ├── timetableFileController.ts
│   │   │   ├── vaultifyController.ts
│   │   │   └── formController.ts
│   │   ├── routes/
│   │   │   ├── index.ts                  # Defines /api routes
│   │   │   └── adminUserRoutes.ts        # /api/admin/* user mgmt
│   │   ├── middleware/
│   │   │   └── auth.ts                   # JWT auth + role checks
│   │   └── utils/
│   │       ├── cronJobs.ts               # Leave accrual + scheduled tasks
│   │       ├── initStorage.ts            # Ensures uploads dirs exist
│   │       ├── verifyTables.ts           # Boot-time DB sanity checks
│   │       ├── mailer.ts                 # Email helper (optional)
│   │       ├── pagination.ts
│   │       └── timeFormat.ts
│   ├── uploads/                          # On-disk storage (needs persistence)
│   │   ├── temp/
│   │   ├── timetables/
│   │   └── vaultify/
│   └── package.json
├── frontend/                             # React + Vite app
│   ├── src/
│   │   ├── pages/                        # Route-level screens
│   │   ├── components/                   # Shared UI components
│   │   ├── hooks/                        # Auth + shared hooks
│   │   └── utils/api.ts                  # Axios client (baseURL uses env)
│   └── package.json
├── database/
│   └── schema.sql                        # MySQL schema + procedures/triggers
├── package.json
└── vercel.json                            # Frontend-only deploy config
```

---

## 📚 Detailed Project Overview

This repository contains two applications: a React frontend and an Express backend.

### High-level request flow

1. **Frontend UI** (React pages under `frontend/src/pages/`) calls the API using `frontend/src/utils/api.ts`.
2. **API base URL selection**:
   - In development, the frontend uses Vite proxying so requests to `/api` are forwarded to the backend.
   - In production, set `VITE_API_BASE_URL` to your backend URL (including `/api`) so the frontend calls the correct origin.
3. **Backend routing** (Express) mounts all API routes under `/api` in `backend/src/server.ts` and exposes `GET /health`.
4. **Auth + authorization**:
   - Most routes require `Authorization: Bearer <access_token>`.
   - `backend/src/middleware/auth.ts` validates JWTs and enforces role checks (ADMIN / HOD / FACULTY / SUPER_ADMIN).
5. **Database rules**:
   - The MySQL schema in `database/schema.sql` contains stored procedures and triggers used for key validations (e.g., timetable conflicts, leave rules).
6. **Uploads**:
   - Multer writes incoming files to `backend/uploads/temp/`.
   - Controllers store/organize files into `backend/uploads/vaultify/` and `backend/uploads/timetables/`.
   - Production hosting must provide **persistent storage** for `backend/uploads/*`.

### Core modules (what lives where)

- **Authentication** (`/api/auth/*`): registration, login, profile, faculty type list.
- **Admin approvals + user management** (`/api/admin/*`): approve/reject faculty, CRUD users, force logout, bulk actions.
- **Leave management** (`/api/leave/*`): eligibility, apply, history, pending approvals (ADMIN/HOD), monthly/yearly accrual triggers.
- **Timetable** (`/api/timetable/*` + timetable files): create/view entries, upload timetable PDFs, assign timetable files to faculty.
- **Vaultify** (`/api/vaultify/*`): upload, list, preview/download, category listing, admin view.
- **Dynamic forms** (`/api/forms/*`): fetch a JSON form definition by category, submit payloads, view submissions.
- **Audit logs** (`/api/admin/logs`): ADMIN/SUPER_ADMIN-only access for tracking actions.

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
- 🔔 **Notification System**: Dashboard notification counts and optional email notifications (configurable)
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
- **JWT Token Management**: Access + refresh tokens (expiry configured via environment variables)
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
| **Audit Logs** | ❌ Not accessible | ❌ Not accessible | ✓ Complete system audit trail |
| **System Configuration** | ❌ Not accessible | ❌ Not accessible | ✓ Modify system settings |

---

## 🎯 User Guides

### For Administrators

#### 🔐 System Access
- **Login (dev seed only)**: `admin@university.edu / admin123`
- **Important**: This user is seeded by `database/schema.sql`. Change/remove it before any real deployment.
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
- **Request Visibility**: Monitor department leave/product requests and their statuses

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
cd <cloned-repo-folder>
```

#### 2. **Environment Setup**
```bash
# Create a .env file in the repository root (same level as backend/ and frontend/)
code .env
```

**.env file content:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=faculty_management
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (optional, but recommended for production)
# If NODE_ENV=production and you trigger actions that send mail (e.g. leave approval),
# you should set these.
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_or_smtp_password
EMAIL_FROM=your_email@gmail.com

# File Upload Configuration
MAX_UPLOAD_MB=25

# Frontend (Vite) configuration
# In dev, Vite proxies /api to VITE_API_PROXY_TARGET.
# In prod, set VITE_API_BASE_URL to your backend base URL (including /api)
# if frontend and backend are hosted on different origins.
VITE_DEV_SERVER_PORT=5173
VITE_API_PROXY_TARGET=http://localhost:5000
VITE_API_BASE_URL=
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

# Start Backend (production)
npm start        # Runs node dist/server.js

# Build Frontend
cd frontend
npm run build    # Creates dist/ directory

# Preview frontend locally (optional)
npm run preview
```

#### **Default Login Credentials**
- **Dev seed administrator (from `database/schema.sql`)**:
   - Email: `admin@university.edu`
   - Password: `admin123`
   - Do **not** use these credentials in production.
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

Tokens are stored and attached to requests by the frontend API client.

Note: the frontend stores tokens in `localStorage`, attaches the access token to requests, and on `401` clears tokens and redirects to `/login`. It does not perform automatic refresh-token renewal.

---

## 🔌 API Reference (Backend)

### Base URLs

- **API Base**: `/api`
- **Health Check**: `GET /health` (no auth)

### Auth model

- Most endpoints require `Authorization: Bearer <access_token>`.
- The backend also validates that the user is **approved**, **active**, and **not deleted**.
- Role checks are enforced for admin/HOD operations.

### Error format

Most errors return JSON like:

```json
{ "error": "message" }
```

### Endpoints

#### Authentication

- `POST /api/auth/register`
   - Body: `{ employee_id, name, email, password, faculty_type_id, department, designation, doj }`
   - Result: registration is created as `approved = FALSE` (admin must approve)
- `POST /api/auth/login`
   - Body: `{ email, password }`
   - Result: `{ accessToken, refreshToken, user: { id, name, email, role, department } }`
- `GET /api/auth/profile` (auth)
- `GET /api/auth/faculty-types`

#### Dashboard (auth)

- `GET /api/dashboard/summary`
- `GET /api/dashboard/notifications` (admin/super-admin only returns counts; others return `{ total: 0 }`)
- `GET /api/dashboard/notifications/list` (admin/super-admin)

#### Faculty approval + admin logs (ADMIN/SUPER_ADMIN)

- `GET /api/admin/pending-faculty`
- `PUT /api/admin/faculty/:id/approve` body: `{ role?: "FACULTY"|"HOD"|"ADMIN"|"SUPER_ADMIN" }`
- `PUT /api/admin/faculty/:id/reject` body: `{ reason?: string }`
- `GET /api/admin/faculty`
- `GET /api/admin/logs` (supports query params like `adminId`, `action_type`, `resource_type`, `from`, `to`, `page`, `pageSize`)
- `GET /api/admin/logs/:id`

#### Leave management

- `GET /api/leave/balance` (auth)
- `GET /api/leave/eligibility` (auth)
- `GET /api/leave/history` (auth)
- `POST /api/leave/apply` (auth)
   - Body (core fields):
      ```json
      {
         "leave_type_id": 1,
         "start_date": "2026-01-10",
         "end_date": "2026-01-12",
         "total_days": 3,
         "reason": "Medical",
         "leave_category": "FULL_DAY",
         "is_during_exam": false,
         "contact_during_leave": "9999999999",
         "remarks": "optional",
         "attachments": [],
         "adjustments": []
      }
      ```
   - Notes: core validation is implemented in MySQL stored procedures (e.g. overlapping leave, balance, probation/service/gender rules).
- `GET /api/leave/applications` (auth)
- `GET /api/leave/:id` (auth)
- `DELETE /api/leave/:id` (auth)
- `GET /api/leave/pending` (ADMIN/HOD/SUPER_ADMIN)
- `PUT /api/leave/:id/status` (ADMIN/HOD/SUPER_ADMIN)
   - Body: `{ status: "APPROVED"|"REJECTED", reason: string }` (reason is required)
- `GET /api/leave/alternate-faculty` (auth)
- `GET /api/leave/adjustments/my` (auth)
- `PUT /api/leave/adjustments/:id/confirm` (auth)

Leave accrual (ADMIN/SUPER_ADMIN):

- `POST /api/admin/leave/accrual/monthly`
- `POST /api/admin/leave/accrual/yearly`
- `POST /api/admin/leave/carry-forward`
- `GET /api/admin/leave/balance/:facultyId`
- `PUT /api/admin/leave/balance`

#### Product requests

- `POST /api/product-requests` (auth) body: `{ item_name, quantity, reason }`
- `GET /api/product-requests/my` (auth)
- `GET /api/product-requests/:id` (auth)
- `DELETE /api/product-requests/:id` (auth; only `PENDING` owned requests)

Admin review:

- `GET /api/admin/product-requests` (ADMIN/SUPER_ADMIN; optional `?status=`)
- `PUT /api/admin/product-requests/:id/review` (ADMIN/SUPER_ADMIN) body: `{ action: "APPROVED"|"REJECTED", reason: string }`

#### Timetable

- `POST /api/timetable` (auth) body: `{ course_id, faculty_id, day_of_week, start_time, end_time, room_no, mode }`
- `GET /api/timetable/my` (auth)
- `PUT /api/timetable/:id` (ADMIN/SUPER_ADMIN)
- `DELETE /api/timetable/:id` (ADMIN/SUPER_ADMIN)

#### Dynamic forms

- `GET /api/forms/:category` (auth)
- `POST /api/forms/submit` (auth) body: `{ form_id, category, payload }`
- `GET /api/forms/submissions` (auth)

#### Admin user management (mounted under `/api/admin/...`)

- `GET /api/admin/users` (ADMIN/SUPER_ADMIN; supports `query`, `status`, `role`, `department`, `page`, `pageSize`)
- `GET /api/admin/users/:id`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `PUT /api/admin/users/:id/credentials`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/restore`
- `POST /api/admin/users/:id/promote`
- `POST /api/admin/users/:id/force-logout`
- `POST /api/admin/users/bulk-delete`
- `DELETE /api/admin/users/:id/permanent` (SUPER_ADMIN)
- `POST /api/admin/users/bulk-permanent-delete` (SUPER_ADMIN)

Pending shortcuts:

- `GET /api/admin/pending/leave`
- `GET /api/admin/pending/product`
- `PUT /api/admin/leave/:id/review`
- `PUT /api/admin/product/:id/review`

Approval shortcuts:

- `POST /api/admin/users/:id/approve`
- `POST /api/admin/users/:id/reject`
- `POST /api/admin/users/bulk-approve`

#### Vaultify (document vault)

- `POST /api/vaultify/upload` (auth, multipart/form-data)
   - Form fields: `file` (single), plus `title`, `description?`, `category_id?`, `visibility?` (`PRIVATE|PUBLIC|DEPARTMENT`)
- `GET /api/vaultify/my` (auth; supports `query`, `category`, `visibility`, `page`, `pageSize`)
- `GET /api/vaultify/files/:id/download` (auth)
- `GET /api/vaultify/files/:id/preview` (auth; only PDF/images)
- `DELETE /api/vaultify/files/:id` (auth; owner or admin)
- `GET /api/vaultify/categories` (auth)
- `GET /api/admin/vaultify/files` (ADMIN/SUPER_ADMIN)

#### Timetable files

- `POST /api/timetables/upload` (auth, multipart/form-data)
- `GET /api/timetables/my` (auth; supports `year`, `semester`, `page`, `pageSize`)
- `GET /api/timetables/:id/download` (auth)
- `GET /api/timetables/:id/preview` (auth; only PDF/images)
- `DELETE /api/timetables/:id` (auth)
- `GET /api/timetables/assigned/me` (auth)

Admin assignment:

- `GET /api/admin/timetables` (ADMIN/SUPER_ADMIN)
- `POST /api/admin/timetables/assign` body: `{ facultyId, fileId }`
- `POST /api/admin/timetables/unassign` body: `{ facultyId }`

---

## 🔐 Security Implementation

### Authentication Architecture

1. **JWT Token System**:
   - Token expiries are configurable via `JWT_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN`
   - Defaults (if not set): access token `1h`, refresh token `7d`
   - The frontend currently does **not** auto-refresh tokens; on `401` it clears tokens and redirects to `/login`

2. **Password Security**:
   - bcrypt hashing with configurable rounds
   - (Optional) add password policy + reset flow if needed

3. **Role-based Access Control**:
   - Database-level permission checks
   - Route-level middleware protection
   - UI component conditional rendering

### Data Protection

- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and validation
- **CSRF**: Not applicable in the same way as cookie-based auth (the API uses `Authorization: Bearer ...`).
- **CORS**: dependency is present, but CORS is not enabled by default in server middleware. Enable/configure it if you serve frontend + backend from different origins.
- **File Upload Security**: Type validation, size limits, path traversal protection

### Audit Trail

- **Complete Logging**: All admin actions tracked
- **Immutable Records**: Decision history cannot be altered
- **Timestamp Tracking**: Precise action timing
- **User Attribution**: Every change linked to user account

---

## 🧪 Testing

### Testing Strategy

1. **Unit Tests**: Component and utility function testing
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Full user workflow testing

### Running Tests

```bash
# No test runner is currently wired in package.json.
# Recommended smoke checks:
cd backend && npm run build
cd ../frontend && npm run build
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

### Recommended Production Topology

This repo contains **two apps**:

- **Backend (Express + MySQL)**: runs as a long-lived Node process and needs a MySQL database.
- **Frontend (Vite + React)**: static build artifacts hosted on a CDN (e.g. Vercel).

Because the backend writes uploaded files to disk (under `backend/uploads/...`), it needs **persistent storage**. Pure serverless platforms with ephemeral filesystems are not a good fit unless you replace storage with S3/GCS (not implemented here).

### Deploy Backend (Node host)

1. Provision a MySQL 8 database and import `database/schema.sql`.
2. Deploy the backend from `backend/`:
   - Build: `npm ci` then `npm run build`
   - Start: `npm start`
3. Configure environment variables (see `.env` example above). At minimum you need DB + JWT variables.
4. Ensure a persistent directory is available for uploads:
   - `backend/uploads/temp`
   - `backend/uploads/vaultify`
   - `backend/uploads/timetables`

### Deploy Frontend (Vercel)

The included `vercel.json` deploys only the frontend build output and rewrites all routes to `index.html` for SPA routing.

1. Set the Vercel build settings:
   - Build command: `cd frontend && npm ci && npm run build`
   - Output directory: `frontend/dist`
2. Set `VITE_API_BASE_URL`:
   - If backend is hosted at `https://api.example.com` and the API base path is `/api`, set:
     - `VITE_API_BASE_URL=https://api.example.com/api`
   - This is important because the SPA rewrite would otherwise swallow same-origin `/api/*` requests.
3. (Optional) If you want the frontend to call `/api` on the same domain, add a Vercel rewrite/proxy rule to forward `/api/*` to your backend.

---

### Notes

- The backend mounts all routes under `/api` and also exposes `GET /health`.
- In dev, Vite proxies `/api` to `VITE_API_PROXY_TARGET`.
- If you host frontend and backend on different origins without a proxy, you may need to enable CORS in the backend.


<div align="center">

**Built with ❤️ for educational excellence**


</div>
