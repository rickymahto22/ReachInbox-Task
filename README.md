# ReachInbox Email Scheduler & Dashboard

A production-grade email scheduler service and dashboard built as part of the ReachInbox hiring assignment.

## Features

### Backend
- **Tech Stack**: TypeScript, Express.js, PostgreSQL (Prisma), BullMQ, Redis.
- **Scheduling**: Uses BullMQ delayed jobs for precise scheduling (No cron jobs).
- **Concurrency**: Configurable worker concurrency (`WORKER_CONCURRENCY`) to handle multiple jobs in parallel safe.
- **Rate Limiting**: Implements a "Token Bucket" style rate limiter using Redis counters. Enforces `MAX_EMAILS_PER_HOUR` per sender. excessive jobs are rescheduled for the next hour window.
- **Throttling**: Enforces a minimum delay between emails (`minDelay` param or default 2s) to mimic provider throttling.
- **Persistence**: 
  - Jobs are stored in PostgreSQL (`EmailJob` table) for long-term record.
  - Queue state is persisted in Redis, ensuring jobs survive server restarts and are not lost.
- **SMTP**: Uses Ethereal Email for fake SMTP sending.

### Frontend
- **Tech Stack**: Next.js 15+, Tailwind CSS, TypeScript.
- **Auth**: Google OAuth (NextAuth.js).
- **Dashboard**:
  - **Schedule New Email**: Compose email, attach files, set scheduling options (Delay, Hourly Limit).
  - **Scheduled Tab**: View pending emails with auto-refresh (Polling + Events).
  - **Sent Tab**: View history of sent emails.
- **CSV Upload**: Parse CSV files to bulk schedule emails (Implemented via frontend iteration).

## Prerequisites

- Node.js (v18+)
- Docker (for Redis and PostgreSQL)
- npm

## Setup & Run

### 1. Infrastructure (Docker)
Ensure Docker is running, then start Redis and Postgres:
```bash
docker-compose up -d
```
*Note: A `docker-compose.yml` is provided in the root.*

### 2. Backend
Navigate to `server` directory:
```bash
cd server
npm install
```

**Environment Variables**:
Create `.env` in `server/` (or use provided defaults):
```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/reachinbox"
REDIS_HOST="localhost"
REDIS_PORT="6379"
GOOGLE_CLIENT_ID="<your_google_id>"
GOOGLE_CLIENT_SECRET="<your_google_secret>"
JWT_SECRET="supersecret"
PORT=3000
CLIENT_URL="http://localhost:3001"
WORKER_CONCURRENCY=5
MAX_EMAILS_PER_HOUR=200
```

**Database Migration**:
```bash
npx prisma generate
npx prisma db push
```

**Run Server**:
```bash
npm run dev
```
Server will run on `http://localhost:3000`.

### 3. Frontend
Navigate to `client` directory:
```bash
cd client
npm install
```

**Run Client**:
```bash
npm run dev
```
Client will run on `http://localhost:3001`.

## Architecture Overview

1.  **Scheduling**: When a user schedules an email, the API (`POST /api/schedule`) saves the job to Postgres (`PENDING`) and adds it to the BullMQ `email-queue` with a `delay` property calculated from the target time.
2.  **Processing**: The worker (`worker.ts`) picks up jobs when their delay expires.
3.  **Rate Limiting**: Before sending, the worker checks a Redis key (`rate-limit:userId:date:hour`). If the count exceeds the limit, the job is put back into the queue with a delay set to the start of the next hour.
4.  **Sending**: If allowed, `nodemailer` sends the email via Ethereal. The status in Postgres is updated to `COMPLETED`.
5.  **Restart Survival**: Redis holds the queue state. If the server crashes, pending/delayed jobs remain in Redis. On restart, the BullMQ worker reconnects and resumes processing exactly where it left off.
