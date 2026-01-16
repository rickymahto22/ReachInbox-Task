# ReachInbox Full-Stack Email Job Scheduler

A production-grade email scheduler service and dashboard built for the ReachInbox hiring assignment.

## 📄 Project Overview

This project implements a robust email scheduling system that allows users to schedule emails for the future, ensuring they are delivered reliably using distributed queues (BullMQ + Redis). It withstands server restarts (Persistence) and handles concurrency and rate limiting gracefully.

---

## ✅ A. How to run backend

### Backend Setup

1.  **Navigate to server folder**
    ```bash
    cd server
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start PostgreSQL & Redis**
    Ensure you have Docker installed and run:
    ```bash
    # From the project root
    docker-compose up -d
    ```
    - **PostgreSQL**: running on port `5432`
    - **Redis**: running on port `6379`

4.  **Configure Environment**
    Create a `.env` file (see section C for details).

5.  **Run Prisma Migrations**
    Push the schema to your local database:
    ```bash
    npx prisma db push
    ```

6.  **Start backend server**
    ```bash
    npm run dev
    ```
    *Note: The BullMQ worker starts automatically alongside the Express server in this configuration.*

    **Tech Stack:**
    - **Language**: TypeScript
    - **Framework**: Express.js
    - **Database**: PostgreSQL (Prisma ORM)
    - **Queue**: BullMQ
    - **Cache**: Redis

---

## ✅ B. How to run frontend

### Frontend Setup

1.  **Navigate to client folder**
    ```bash
    cd client
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env.local` file (see section C below).

4.  **Start frontend**
    ```bash
    npm run dev
    ```

    **Frontend runs on:** [http://localhost:3001](http://localhost:3001)

    **Tech Stack:**
    - **Framework**: Next.js 15
    - **Styling**: Tailwind CSS
    - **Auth**: NextAuth (Google)

---

## ✅ C. How to set up Ethereal Email & env variables

### Email (Ethereal SMTP)
We use **Ethereal Email** for fake SMTP testing.
*   **Automatic Setup**: The system is currently configured to **automatically generate** a fresh Ethereal test account for each email sent if no static credentials are provided.
*   **Preview**: When an email is sent, the **Preview URL** is logged to the backend console. You can click it to view the "sent" email.

### Environment Variables

**Backend (`server/.env`)**
```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/reachinbox"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Google Auth
GOOGLE_CLIENT_ID="<your_google_id>"
GOOGLE_CLIENT_SECRET="<your_google_secret>"
JWT_SECRET="supersecret"

# Server Config
PORT=3000
CLIENT_URL="http://localhost:3001"

# Scheduler Config
WORKER_CONCURRENCY=5      # Number of concurrent jobs
MAX_EMAILS_PER_HOUR=200   # Global rate limit per user
```

**Frontend (`client/.env.local`)**
```env
GOOGLE_CLIENT_ID="<your_google_id>"
GOOGLE_CLIENT_SECRET="<your_google_secret>"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="<random_string>"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## ✅ D. Architecture overview (VERY IMPORTANT)

### 1️⃣ How scheduling works
1.  **Request**: User composes an email and selects "Send Later" (or uploads a CSV).
2.  **API**: The backend receives the request (`POST /api/schedule`).
3.  **Persistence**: The email metadata (Recipient, Body, Subject) is immediately stored in **PostgreSQL** with status `PENDING`.
4.  **Queue**: A job is added to the **BullMQ** queue with a `delay` parameter equal to the difference between the schedule time and now.
5.  **Execution**: When the time arrives, the **Worker** picks up the job and attempts to process it.

### 2️⃣ How persistence on restart is handled
System reliability is ensured through dual-layer persistence:
*   **Redis**: Holds the state of the active Queue. If the server crashes, all `delayed` and `waiting` jobs remain safely in Redis.
*   **PostgreSQL**: Acts as the source of truth for Email History.
*   **Recovery**: On server restart, the BullMQ worker automatically reconnects to Redis. It recognizes the existing jobs and resumes processing exactly where it left off. **No cron jobs** are used; the system relies entirely on the persistent Redis queue.

### 3️⃣ How rate limiting & concurrency are implemented
*   **Concurrency**: We configure the BullMQ Worker with `concurrency: 5` (configurable via env), allowing 5 emails to be processed in parallel.
*   **Hourly Rate Limiting (Token Bucket-ish)**:
    - Before sending, the worker checks a **Redis Counter** key: `rate-limit:{userId}:{date}:{hour}`.
    - If the count > `MAX_EMAILS_PER_HOUR`:
        - The job is **not failed**.
        - It is **rescheduled** (moved back to `delayed`) for the start of the next hour.
        - This ensures we never drop emails, only defer them.
*   **Throttling**: We implement a mandatory `MIN_DELAY` (e.g., 2 seconds) sleep inside the worker after each email to respect provider limits specifically.

---

## ✅ E. List of features implemented

### Backend
- [x] **Email Scheduling**: API to schedule emails for specific future times.
- [x] **Smart Throttling**: Enforces minimum delay between emails.
- [x] **Rate Limiting**: Hourly limits per user (Reschedules exceeded jobs).
- [x] **Queue System**: BullMQ + Redis for robust job management.
- [x] **Persistence**: Full survival of server restarts.
- [x] **Ethereal Integration**: Fake SMTP sending with console preview links.
- [x] **Concurrent Processing**: Configurable multi-threaded worker.

### Frontend
- [x] **Google Login**: Secure authentication using NextAuth.
- [x] **Dashboard**: Clean UI showing Scheduled vs. Sent tabs.
- [x] **Auto-Refresh**: Lists update automatically via polling/events.
- [x] **Compose Email**: Rich interface to write and schedule emails.
- [x] **File Attachments**: Support for attaching files to emails.
- [x] **CSV/List Upload**: Functionality to parse list of recipients.
