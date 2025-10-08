# CampusLearn

A comprehensive learning management system.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Backend `.env` file with required environment variables

### Environment Setup

Create `backend/.env` file with the following variables:
```env
# Database & Cache
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campuslearn
REDIS_URL=redis://username:password@redis-host:port

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key

# Botpress Integration (Optional)
BOTPRESS_CLIENT_ID=your-botpress-client-id
BOTPRESS_BOT_ID=your-botpress-bot-id
BOTPRESS_PAT=your-botpress-personal-access-token

# Google Cloud Storage (Optional)
GCS_BUCKET=your-gcs-bucket-name
GCLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

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
