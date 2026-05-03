# MedBed OS — Full Stack System
### Smart Patient Transfer System with AI Risk Prediction & Real-Time Monitoring

---

## 📁 Project Structure

```
medbed-fullstack/
│
├── backend/                   # Node.js + Express API
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js  # signup, login, logout
│   │   ├── patientController.js
│   │   ├── transferController.js
│   │   └── alertController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + authorize(roles)
│   │   └── errorHandler.js    # Global error handler + AppError
│   ├── models/
│   │   ├── User.js            # Staff (Admin/Doctor/Nurse)
│   │   ├── Patient.js
│   │   ├── Vitals.js          # Time-series, TTL 30 days
│   │   ├── Transfer.js
│   │   └── index.js           # Approval, Alert, Hospital
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── transferRoutes.js
│   │   ├── alertRoutes.js
│   │   └── hospitalRoutes.js
│   ├── services/
│   │   └── aiService.js       # Calls Python AI with fallback
│   ├── sockets/
│   │   └── socketManager.js   # Socket.IO with JWT auth
│   ├── .env.example
│   ├── package.json
│   └── server.js              # Entry point
│
├── ai-service/                # Python FastAPI microservice
│   ├── train.py               # Generate data + train model
│   ├── model.py               # Inference + route suggestion
│   ├── api.py                 # FastAPI endpoints
│   └── requirements.txt
│
└── frontend/                  # Alongside your existing HTML
    ├── login.html             # NEW: Login page
    ├── signup.html            # NEW: Signup page
    ├── auth.js                # NEW: Injects into existing dashboard
    └── index.html             # Your existing MedBed OS dashboard
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB (local or Atlas)

---

### Step 1 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set your MONGO_URI and JWT_SECRET

# Start the backend
npm run dev       # development (nodemon, auto-restart)
# or
npm start         # production
```

Backend runs on: **http://localhost:5000**

---

### Step 2 — AI Service Setup

```bash
cd ai-service

# Create Python virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train the risk prediction model (creates risk_model.pkl)
python train.py

# Start the AI API server
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

AI service runs on: **http://localhost:8000**
API docs (auto): **http://localhost:8000/docs**

---

### Step 3 — Frontend Integration

Add **one line** to your existing `index.html` before `</body>`:

```html
<!-- Add Socket.IO client (optional — enables real-time) -->
<script src="http://localhost:5000/socket.io/socket.io.js"></script>

<!-- Auth guard + API wrapper — ADD THIS LINE -->
<script src="auth.js"></script>
```

Open `login.html` to start. After login you'll be redirected to `index.html`.

---

## 🔐 Authentication Flow

```
User visits index.html
    ↓
auth.js checks localStorage for 'medbed_token'
    ↓ no token
Redirect to login.html
    ↓
User submits credentials → POST /api/auth/login
    ↓ success
JWT stored in localStorage
Redirect back to index.html
    ↓
auth.js verifies token on load (GET /api/auth/me)
auth.js injects user name + logout button into topbar
```

---

## 🗄️ Database Collections

| Collection  | Description                                       |
|-------------|---------------------------------------------------|
| `users`     | Hospital staff with hashed passwords + roles      |
| `patients`  | Patient records with AI risk scores               |
| `vitals`    | Time-series readings (auto-expire after 30 days)  |
| `transfers` | Transfer lifecycle (pending → approved → done)    |
| `approvals` | Management approval decisions with audit trail    |
| `alerts`    | System + AI-generated alerts                      |
| `hospitals` | Hospital registry for inter-hospital transfers    |

---

## 🌐 API Reference

### Auth

| Method | Endpoint                  | Access    | Description            |
|--------|---------------------------|-----------|------------------------|
| POST   | `/api/auth/signup`        | Public    | Create account         |
| POST   | `/api/auth/login`         | Public    | Login, returns JWT     |
| GET    | `/api/auth/me`            | Protected | Get current user       |
| POST   | `/api/auth/logout`        | Protected | Logout                 |
| PATCH  | `/api/auth/update-password` | Protected | Change password      |

### Patients

| Method | Endpoint                       | Access          |
|--------|--------------------------------|-----------------|
| GET    | `/api/patients`                | All             |
| POST   | `/api/patients`                | Admin, Doctor   |
| GET    | `/api/patients/:id`            | All             |
| PATCH  | `/api/patients/:id`            | Admin, Doctor   |
| DELETE | `/api/patients/:id`            | Admin           |
| POST   | `/api/patients/:id/vitals`     | All             |
| GET    | `/api/patients/:id/vitals`     | All             |

### Transfers

| Method | Endpoint                         | Access          |
|--------|----------------------------------|-----------------|
| GET    | `/api/transfers`                 | All             |
| POST   | `/api/transfers`                 | All             |
| GET    | `/api/transfers/:id`             | All             |
| POST   | `/api/transfers/:id/approve`     | Admin, Doctor   |
| PATCH  | `/api/transfers/:id/progress`    | All             |

### Alerts

| Method | Endpoint                          | Access  |
|--------|-----------------------------------|---------|
| GET    | `/api/alerts`                     | All     |
| GET    | `/api/alerts/summary`             | All     |
| PATCH  | `/api/alerts/:id/acknowledge`     | All     |
| PATCH  | `/api/alerts/:id/dismiss`         | All     |

---

## 📡 Socket.IO Events

### Client → Server
| Event               | Payload                                          |
|---------------------|--------------------------------------------------|
| `subscribe:patient` | `patientId` string                               |
| `vitals:push`       | `{ patientId, heartRate, spo2, bpSystolic, … }` |
| `transfer:progress` | `{ transferId, progressPercent, status }`        |

### Server → Client
| Event               | Description                                      |
|---------------------|--------------------------------------------------|
| `vitals:update`     | New vitals reading with AI flags                 |
| `transfer:progress` | Transfer progress update                         |
| `transfer:created`  | New transfer request                             |
| `transfer:approval` | Approval decision broadcast                      |
| `alert:new`         | New critical alert                               |
| `alert:acknowledged`| Alert acknowledged by staff                      |

---

## 🔑 Example API Requests

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":       "Dr. Ramesh Kumar",
    "email":      "ramesh@hospital.com",
    "password":   "SecurePass@123",
    "role":       "doctor",
    "department": "Critical Care"
  }'
```
<img width="1680" height="958" alt="Screenshot 2026-05-03 at 2 58 11 PM" src="https://github.com/user-attachments/assets/5c651401-50cc-4b62-9c3e-62e3ace3fc53" />


### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "ramesh@hospital.com", "password": "SecurePass@123" }'
```
<img width="1680" height="957" alt="Screenshot 2026-05-03 at 2 57 37 PM" src="https://github.com/user-attachments/assets/2c87d700-52f1-4721-a796-555a82215ae0" />

### Record Vitals (triggers AI prediction)
```bash
curl -X POST http://localhost:5000/api/patients/PATIENT_ID/vitals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "heartRate":   108,
    "spo2":        93,
    "bpSystolic":  145,
    "bpDiastolic": 92
  }'
```
<img width="1680" height="962" alt="Screenshot 2026-05-03 at 2 59 36 PM" src="https://github.com/user-attachments/assets/9fe96eff-04d3-4eb3-a52a-3978de5ecdf0" />


### Approve a Transfer
```bash
curl -X POST http://localhost:5000/api/transfers/TRANSFER_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "decision": "approved", "remarks": "Vitals stable, proceed." }'
```
<img width="1680" height="954" alt="Screenshot 2026-05-03 at 2 59 50 PM" src="https://github.com/user-attachments/assets/a976da1d-2108-4833-8cf0-3492325e99f9" />
<img width="1680" height="954" alt="Screenshot 2026-05-03 at 3 00 21 PM" src="https://github.com/user-attachments/assets/765632b4-9fec-4299-b67e-2b4c84703ffc" />


### AI Predict (direct)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "heart_rate": 108, "spo2": 93,
    "bp_systolic": 145, "bp_diastolic": 92,
    "age": 67, "condition": "cardiac", "is_post_surgery": true
  }'
```

---

## 🔒 Role Permissions Summary

| Feature                  | Admin | Doctor | Nurse |
|--------------------------|:-----:|:------:|:-----:|
| View patients            | ✅    | ✅     | ✅    |
| Create / edit patient    | ✅    | ✅     | ❌    |
| Delete patient           | ✅    | ❌     | ❌    |
| Record vitals            | ✅    | ✅     | ✅    |
| Create transfer          | ✅    | ✅     | ✅    |
| Approve / reject transfer| ✅    | ✅     | ❌    |
| Update progress          | ✅    | ✅     | ✅    |
| Manage hospitals         | ✅    | ❌     | ❌    |
| Acknowledge alerts       | ✅    | ✅     | ✅    |

---

## 🤖 AI Service Details

The Python microservice uses a **Random Forest Classifier** trained on 5,000 synthetic patient records.

**Input features:**
- Heart Rate, SpO2, BP Systolic, BP Diastolic
- Age, Post-Surgery flag
- Medical Condition (cardiac, ICU, hydrocephalus, etc.)
- Derived: Pulse Pressure, Age Group

**Output:**
```json
{
  "risk":  "medium",
  "score": 0.73,
  "flags": { "hr_alert": true, "spo2_alert": false, "bp_alert": true },
  "raw_proba": { "high": 0.12, "low": 0.15, "medium": 0.73 }
}
```

> **If AI service is unavailable**, the Node backend automatically falls back to rule-based thresholds (HR > 100 → warn, SpO2 < 90 → critical).

---

## 🛠️ Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/medbed_os
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
CLIENT_ORIGIN=http://localhost:3000
```

---

## 📦 Tech Stack Summary

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | HTML + CSS + Vanilla JS (existing)  |
| Auth Pages  | login.html + signup.html            |
| Backend     | Node.js + Express                   |
| Database    | MongoDB + Mongoose                  |
| Real-time   | Socket.IO                           |
| Auth        | JWT (jsonwebtoken) + bcryptjs       |
| AI/ML       | Python + FastAPI + scikit-learn     |
| Validation  | express-validator                   |
| Security    | helmet, cors, bcrypt salt rounds=12 |
