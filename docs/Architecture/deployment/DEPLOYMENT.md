# CampusLearn Deployment Guide

## 🚀 Production Deployment Architecture

### **Infrastructure Overview**
```
Internet → ALB → ECS Fargate → Backend Container
                ↓
            Target Group (Health Checks)
                ↓
            VPC (Public/Private Subnets)
                ↓
            ECR (Docker Registry)
```

## 📋 Deployment Checklist

### **✅ Completed Infrastructure**
- [x] **VPC Setup**: Custom VPC with public/private subnets
- [x] **Security Groups**: ALB and ECS security groups configured
- [x] **Application Load Balancer**: Internet-facing ALB with health checks
- [x] **Target Group**: Backend service target group (port 5000)
- [x] **ECS Cluster**: Fargate cluster with container insights
- [x] **ECR Repository**: Docker image registry
- [x] **VPC Endpoints**: ECR, CloudWatch, and S3 endpoints
- [x] **IAM Roles**: ECS task execution and service roles
- [x] **CI/CD Pipeline**: CodePipeline with CodeBuild and ECS deploy

### **🔄 CI/CD Pipeline Flow**
```
GitHub Push → CodePipeline → CodeBuild → ECR → ECS Deploy
```

## 🛠️ Manual Deployment Commands

### **Build and Push Docker Image**
```bash
# Login to ECR
aws ecr get-login-password --region af-south-1 | docker login --username AWS --password-stdin 559935790394.dkr.ecr.af-south-1.amazonaws.com

# Build image
docker build -f Dockerfile -t campuslearn-backend .

# Tag image
docker tag campuslearn-backend:latest 559935790394.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest

# Push image
docker push 559935790394.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest
```

### **Update ECS Service**
```bash
# Force new deployment
aws ecs update-service \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --service CampusLearn-Backend-Service \
  --force-new-deployment \
  --region af-south-1
```

### **Check Service Status**
```bash
# Get service status
aws ecs describe-services \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --services CampusLearn-Backend-Service \
  --region af-south-1

# List running tasks
aws ecs list-tasks \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --service-name CampusLearn-Backend-Service \
  --region af-south-1
```

## 🌐 Endpoints and URLs

### **Production URLs**
- **Backend API**: http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com
- **Health Check**: http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com/health
- **API Base**: http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com/api

### **AWS Resources**
- **ECS Cluster**: `strong-dolphin-qr0d3scampuslearn-cluster`
- **ECS Service**: `CampusLearn-Backend-Service`
- **ALB**: `campuslearn-alb`
- **Target Group**: `campuslearn-tg`
- **ECR Repository**: `campuslearn-backend`

## 🔧 Environment Configuration

### **ECS Task Definition Environment Variables**
```json
{
  "NODE_ENV": "production",
  "PORT": "5000",
  "VERSION": "1.0.0",
  "MONGO_URI": "mongodb+srv://...",
  "REDIS_URL": "redis://...",
  "JWT_SECRET": "...",
  "GCS_BUCKET": "tutor-student-videos",
  "BOTPRESS_CLIENT_ID": "...",
  "BOTPRESS_PAT": "...",
  "CORS_ORIGINS": "http://localhost:5173,http://localhost:8080"
}
```

### **Required External Services**
- **MongoDB Atlas**: Production database
- **Redis Cloud**: Caching layer
- **Google Cloud Storage**: File storage
- **Botpress**: AI chatbot service

## 📊 Monitoring and Logging

### **CloudWatch Logs**
- **Log Group**: `/ecs/CampusLearn-Backend`
- **Log Stream**: `ecs/campuslearn-backend/{task-id}`

### **Health Checks**
- **Path**: `/health`
- **Port**: `5000`
- **Protocol**: `HTTP`
- **Timeout**: `5 seconds`
- **Interval**: `30 seconds`
- **Healthy Threshold**: `2`
- **Unhealthy Threshold**: `3`

### **Monitoring Commands**
```bash
# View recent logs
aws logs get-log-events \
  --log-group-name "/ecs/CampusLearn-Backend" \
  --log-stream-name "ecs/campuslearn-backend/latest" \
  --region af-south-1

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:af-south-1:559935790394:targetgroup/campuslearn-tg/3863f024aad07096 \
  --region af-south-1
```

## 🚨 Troubleshooting

### **Common Deployment Issues**

**1. Pipeline Build Failures**
- Check CodeBuild service role permissions
- Verify ECR access permissions
- Ensure buildspec.yml is correct

**2. ECS Task Failures**
- Check CloudWatch logs for application errors
- Verify environment variables are set correctly
- Check security group rules

**3. ALB Health Check Failures**
- Verify backend is listening on port 5000
- Check health check path `/health`
- Ensure security groups allow ALB → ECS traffic

**4. Container Image Issues**
- Verify Dockerfile builds locally
- Check ECR image exists and is accessible
- Ensure image has correct architecture (linux/amd64)

### **Debugging Commands**
```bash
# Check task definition
aws ecs describe-task-definition \
  --task-definition CampusLearn-Backend:latest \
  --region af-south-1

# Get task details
aws ecs describe-tasks \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --tasks {task-arn} \
  --region af-south-1

# Check service events
aws ecs describe-services \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --services CampusLearn-Backend-Service \
  --region af-south-1 \
  --query 'services[0].events'
```

## 🔄 Rollback Procedures

### **Rollback to Previous Version**
```bash
# List task definition revisions
aws ecs list-task-definitions \
  --family-prefix CampusLearn-Backend \
  --region af-south-1

# Update service to previous revision
aws ecs update-service \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --service CampusLearn-Backend-Service \
  --task-definition CampusLearn-Backend:2 \
  --region af-south-1
```

### **Emergency Stop**
```bash
# Scale service to 0
aws ecs update-service \
  --cluster strong-dolphin-qr0d3scampuslearn-cluster \
  --service CampusLearn-Backend-Service \
  --desired-count 0 \
  --region af-south-1
```

## 📈 Scaling and Performance

### **Auto Scaling (Future Enhancement)**
- Configure ECS Service Auto Scaling
- Set up CloudWatch alarms
- Define scaling policies based on CPU/memory

### **Performance Monitoring**
- Monitor ALB response times
- Track ECS task CPU/memory usage
- Set up CloudWatch dashboards

## 🔐 Security Considerations

### **Network Security**
- VPC with public/private subnets
- Security groups with minimal required access
- VPC endpoints for AWS services

### **Application Security**
- JWT authentication
- CORS configuration
- Rate limiting
- Input validation

### **Infrastructure Security**
- IAM roles with least privilege
- Encrypted EBS volumes
- CloudTrail logging enabled

---

**Last Updated**: October 2025  
**Environment**: Production  
**Status**: Live and Operational ✅
