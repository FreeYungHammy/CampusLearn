# CampusLearn

A comprehensive learning management system.

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- Backend `.env` file with required environment variables

### Environment Setup

**⚠️ SECURITY NOTICE**: All sensitive credentials have been moved to environment variables for security.

1. Copy `env.example` to `backend/.env`
2. Fill in your actual values for all required variables

**Required Variables:**

- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (generate with `openssl rand -base64 64`)
- `BOTPRESS_CLIENT_ID` - Botpress client ID
- `BOTPRESS_BOT_ID` - Botpress bot ID
- `BOTPRESS_PAT` - Botpress personal access token
- `BOTPRESS_WEBHOOK_URL` - Botpress webhook URL

**Optional Variables:**

- Google Cloud Storage credentials
- CDN configuration
- Development URLs
- Test user credentials

See `env.example` for complete configuration options.

### Docker Deployment

1. **Start all services:**

   ```bash
   docker compose up -d
   ```

2. **Check service status:**

   ```bash
   docker compose ps
   ```

3. **View logs:**

   ```bash
   docker compose logs -f api
   ```

4. **Stop services:**
   ```bash
   docker compose down
   ```

### Services

- **API**: Backend server on port 5001
- **MongoDB**: Database on port 27017
- **Redis**: Cache on port 6379
- **Frontend**: Development server on port 5174

## Development

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

## Features

- 🔐 User authentication and authorization
- 💬 Real-time chat with Socket.IO
- 🎥 Video and File Upload
- 🤖 AI-powered chatbot with Botpress
- 📚 Course management
- 👥 Tutor-student matching
- 📊 Admin dashboard with system monitoring
- 🔄 Real-time notifications

## Tech Stack

**Backend:**

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Redis
- Socket.IO
- JWT Authentication

**Frontend:**

- React + TypeScript
- Vite
- Tailwind CSS
- Zustand (State Management)
- React Router

**Infrastructure:**

- Docker + Docker Compose
- Google Cloud Storage
- Botpress AI Platform
  and more! (coming soon)
