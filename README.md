# Smart Disease Symptoms Checker — Node.js + MySQL Backend

## Project Structure

```
sdsc-backend/
├── server.js            ← Main Express server (entry point)
├── package.json
├── .env                 ← Your config (edit this!)
├── config/
│   ├── db.js            ← MySQL connection pool
│   └── init.sql         ← Run once to create database & tables
├── middleware/
│   └── auth.js          ← JWT authentication middleware
├── routes/
│   ├── auth.js          ← POST /api/auth/register, /login, /logout, GET /me
│   ├── slips.js         ← GET/POST/DELETE /api/slips
│   └── users.js         ← GET/PUT /api/users/profile, /password, /stats
└── public/
    └── index.html       ← Full frontend (served by Express)
```

---

## ⚡ Quick Setup (5 Steps)

### 1. Install MySQL
Make sure MySQL is running on your machine. Default port is 3306.

### 2. Create the Database
```bash
mysql -u root -p < config/init.sql
```
This creates the `sdsc_db` database and all required tables automatically.

### 3. Configure Environment
Edit `.env` and set your MySQL password:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=sdsc_db
PORT=3000
JWT_SECRET=change_this_to_a_random_string
SESSION_SECRET=another_random_string
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start the Server
```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

Open **http://localhost:3000** in your browser. That's it! 🎉

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| POST | `/api/auth/logout` | ❌ | Clear session cookie |
| GET | `/api/auth/me` | ✅ | Get current user profile |
| GET | `/api/slips` | ✅ | List all slips for user |
| GET | `/api/slips/:id` | ✅ | Get single slip |
| POST | `/api/slips` | ✅ | Save new medical slip |
| DELETE | `/api/slips/:id` | ✅ | Delete a slip |
| GET | `/api/users/profile` | ✅ | Get profile |
| PUT | `/api/users/profile` | ✅ | Update name/age/gender |
| PUT | `/api/users/password` | ✅ | Change password |
| GET | `/api/users/stats` | ✅ | Slip count + recent diagnoses |

**Authentication:** Send `Authorization: Bearer <token>` header (token received at login/register).

---

## MySQL Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INT UNSIGNED | Primary key, auto-increment |
| full_name | VARCHAR(120) | |
| age | TINYINT UNSIGNED | |
| gender | ENUM | Male / Female / Other |
| username | VARCHAR(60) | Unique |
| password | VARCHAR(255) | bcrypt hashed |
| created_at | DATETIME | |

### `medical_slips`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(40) | SLIP-XXXXX format |
| user_id | INT UNSIGNED | FK → users.id |
| disease_name | VARCHAR(120) | |
| confidence | TINYINT UNSIGNED | 0–99 |
| symptoms | JSON | Array of symptom strings |
| doctor_info | JSON | Doctor object |
| medicines | JSON | Array of medicine objects |
| routine | TEXT | |
| diet | TEXT | |
| created_at | DATETIME | |

### `analysis_logs`
Stores every analysis run for optional analytics/reporting.

---

## Troubleshooting

**MySQL connection failed**
- Check that MySQL is running: `sudo service mysql start` (Linux) or via MySQL Workbench
- Verify credentials in `.env`
- Make sure `sdsc_db` database exists (run `init.sql` again)

**Port 3000 in use**
- Change `PORT=3001` in `.env`

**"Token expired" after restart**
- This is normal — tokens last 7 days. Just log in again.
- Change `JWT_SECRET` in `.env` before going to production.

**Nodemon not found**
```bash
npm install -g nodemon
```

---

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL 8+ via `mysql2` (promise-based)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing
- **Frontend:** Vanilla JS + Fetch API (same-origin, no CORS needed)
