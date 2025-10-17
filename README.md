# CampusLearn - Full-Stack Educational Platform

A modern educational platform connecting students and tutors with real-time communication, forum discussions, and comprehensive learning management features.

## 🚀 Live Application

- **Frontend**: https://campuslearn.onrender.com
- **Backend API**: https://campuslearn-api.run.place
- **Health Check**: https://campuslearn-api.run.place/api/health
- **Status**: Production Ready

## 🏗️ Architecture

### **Frontend** (React + TypeScript)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios

### **Backend** (Node.js + TypeScript)
- **Runtime**: Node.js with Express
- **Database**: MongoDB Atlas with Mongoose
- **Cache**: Redis Cloud
- **Real-time**: Socket.IO
- **Authentication**: JWT with bcrypt
- **File Storage**: Google Cloud Storage
- **AI Integration**: Botpress for chatbot functionality

### **Infrastructure** (AWS + Render)
- **Container Orchestration**: Amazon ECS with Fargate
- **Load Balancing**: Application Load Balancer (ALB) with SSL
- **Container Registry**: Amazon ECR
- **CI/CD**: AWS CodePipeline with CodeBuild
- **Networking**: VPC with public/private subnets
- **Monitoring**: CloudWatch Logs
- **Frontend Hosting**: Render (Static Site)
- **Custom Domain**: campuslearn-api.run.place with SSL certificate
- **Security**: HTTPS enforcement, CSP headers, HSTS

## 🛠️ Development Setup

### **Prerequisites**
- Node.js 18+
- Docker & Docker Compose
- AWS CLI configured
- MongoDB Atlas account
- Redis Cloud account

### **Backend Development**
```bash
cd backend
npm install
npm run dev
```

### **Frontend Development**
```bash
cd frontend
npm install
npm run dev
```

### **Full Stack with Docker**
```bash
docker-compose up -d
```

## 🔧 Environment Variables

### **Backend (.env)**
```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=your-jwt-secret
GCS_BUCKET=your-bucket-name
BOTPRESS_CLIENT_ID=your-botpress-id
BOTPRESS_PAT=your-botpress-pat
```

### **Frontend (.env)**
```env
# Local Development
VITE_API_URL=http://localhost:5001
VITE_WS_URL=ws://localhost:5001

# Production (Render)
VITE_API_URL=https://campuslearn-api.run.place
VITE_WS_URL=wss://campuslearn-api.run.place
```

## 🚀 Deployment

### **Backend (AWS ECS)**
The backend is automatically deployed via CI/CD pipeline:

1. **Push to GitHub** → Triggers CodePipeline
2. **Build Stage** → Docker image built and pushed to ECR
3. **Deploy Stage** → ECS service updated with new image

**Manual Deployment:**
```bash
# Build and push Docker image
docker build -f Dockerfile -t campuslearn-backend .
docker tag campuslearn-backend:latest 559935790394.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest
docker push 559935790394.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest

# Update ECS service
aws ecs update-service --cluster strong-dolphin-qr0d3scampuslearn-cluster --service CampusLearn-Backend-Service --force-new-deployment --region af-south-1
```

### **Frontend (Render)**
The frontend is deployed to Render as a static site:

1. **Automatic Deployment**: Connected to GitHub repository
2. **Build Command**: `npm run build`
3. **Publish Directory**: `dist`
4. **Environment Variables**:
   - `VITE_API_URL=https://campuslearn-api.run.place`
   - `VITE_WS_URL=wss://campuslearn-api.run.place`

**Manual Deployment:**
```bash
cd frontend
npm run build
# Files are automatically deployed to Render
```

## 📊 Key Features

### **User Management**
- Student and tutor registration/login
- Profile management with avatars
- Role-based access control

### **Forum System**
- Thread-based discussions
- Topic categorization
- Voting system (upvotes/downvotes)
- Real-time updates via Socket.IO
- Redis caching for performance

### **Real-time Communication**
- Live chat between users
- Video calling with WebRTC
- Presence indicators
- Message history

### **Tutor Discovery**
- Advanced search and filtering
- Tutor profiles and ratings
- Booking system
- Application management

### **File Management**
- Secure file uploads to Google Cloud Storage
- Image processing with Sharp
- CDN integration for fast delivery

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Rate limiting
- Input validation and sanitization
- Secure file upload handling
- **HTTPS Enforcement**: All production traffic encrypted
- **SSL Certificate**: Custom domain with valid certificate
- **Mixed Content Protection**: CSP headers block insecure resources
- **HSTS Headers**: Strict Transport Security enabled

## 📈 Performance Optimizations

### **Caching Strategy**
- Redis caching for forum threads (30min TTL)
- User profile caching (30min TTL)
- Cache-aside pattern implementation
- Automatic cache invalidation on updates

### **Database Optimization**
- MongoDB Atlas with connection pooling
- Optimized aggregation queries
- Indexed fields for fast lookups
- Environment-specific connection settings

### **Frontend Performance**
- Vite for fast builds
- Code splitting
- Image optimization
- Lazy loading components

## 🧪 Testing

### **Backend Tests**
```bash
cd backend
npm test
npm run test:watch
```

### **Frontend Tests**
```bash
cd frontend
npm test
```

### **E2E Tests**
```bash
cd frontend
npm run cypress:open
```

## 📝 API Documentation

### **Health Endpoint**
```
GET /health
Response: {"ok": true}
```

### **Root Endpoint**
```
GET /
Response: {
  "status": "ok",
  "service": "campuslearn-api",
  "version": "1.0.0"
}
```

### **Authentication**
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### **Forum**
```
GET /api/forum/threads
POST /api/forum/threads
GET /api/forum/threads/:id
POST /api/forum/threads/:id/replies
```

## 🔧 Troubleshooting

### **Common Issues**

**Backend not starting:**
- Check environment variables
- Verify MongoDB connection
- Check Redis connectivity

**Pipeline failures:**
- Verify ECR permissions
- Check CodeBuild service role
- Ensure Docker image builds successfully

**ECS deployment issues:**
- Check task definition
- Verify security group rules
- Check CloudWatch logs

### **Logs and Monitoring**
- **ECS Logs**: CloudWatch Logs `/ecs/CampusLearn-Backend`
- **Build Logs**: CodeBuild project logs
- **Application Logs**: Winston logging to console and files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: Calvin Nijenhuis
- **Module**: SEN381 - Software Engineering
- **Institution**: University of Cape Town

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅