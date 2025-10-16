# 🚀 CampusLearn AWS Deployment

This directory contains all deployment configurations for deploying CampusLearn to AWS Cape Town region.

## 📁 Directory Structure

```
deployment/
├── aws/
│   ├── ecs/                    # ECS task and service definitions
│   │   ├── task-definition.json
│   │   └── service-definition.json
│   ├── cloudformation/         # CloudFormation templates
│   │   ├── vpc.yaml           # VPC, subnets, security groups
│   │   └── alb.yaml           # Application Load Balancer
│   └── scripts/                # Deployment scripts
│       ├── setup-infrastructure.sh
│       └── deploy-app.sh
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed
- AWS account with access to Cape Town region (af-south-1)

### Step 1: Set up Infrastructure
```bash
chmod +x deployment/aws/scripts/setup-infrastructure.sh
./deployment/aws/scripts/setup-infrastructure.sh
```

### Step 2: Deploy Application
```bash
chmod +x deployment/aws/scripts/deploy-app.sh
./deployment/aws/scripts/deploy-app.sh
```

## 🏗️ What Gets Created

### Infrastructure (CloudFormation)
- **VPC** with public and private subnets
- **Application Load Balancer** for WebRTC traffic
- **Security Groups** for ALB and ECS
- **ECS Cluster** for container orchestration
- **IAM Roles** for ECS task execution

### Application (ECS Fargate)
- **Docker container** running your backend
- **Auto-scaling** based on CPU/memory
- **Health checks** for WebRTC services
- **Load balancing** for Socket.IO connections

## 🌐 Environment Variables

Update these in `deployment/aws/ecs/task-definition.json`:

```json
{
  "name": "MONGO_URL",
  "value": "mongodb+srv://username:password@cluster.mongodb.net/campuslearn"
},
{
  "name": "REDIS_URL", 
  "value": "redis://your-redis-url:6379"
},
{
  "name": "JWT_SECRET",
  "value": "your-super-secret-jwt-key"
},
{
  "name": "CORS_ORIGIN",
  "value": "https://your-frontend-domain.com"
}
```

## 📊 Monitoring

### Check ECS Service Status
```bash
aws ecs describe-services --cluster campuslearn-cluster --services campuslearn-backend-service
```

### Get ALB URL
```bash
aws cloudformation describe-stacks --stack-name campuslearn-alb --query 'Stacks[0].Outputs[?OutputKey==`ApplicationLoadBalancer`].OutputValue' --output text
```

### View Logs
```bash
aws logs tail /ecs/campuslearn-backend --follow
```

## 🔧 Customization

### Scaling
Update `desiredCount` in `service-definition.json` or configure auto-scaling in AWS Console.

### Environment
Update environment variables in `task-definition.json` for different environments.

### SSL/HTTPS
Uncomment HTTPS listener in `alb.yaml` and add SSL certificate ARN.

## 🧹 Cleanup

To remove all resources:
```bash
aws cloudformation delete-stack --stack-name campuslearn-alb
aws cloudformation delete-stack --stack-name campuslearn-vpc
aws ecr delete-repository --repository-name campuslearn-backend --force
```

## 🆘 Troubleshooting

### Common Issues
1. **Task fails to start**: Check environment variables and IAM roles
2. **Health check fails**: Verify `/health` endpoint returns 200
3. **ALB not accessible**: Check security groups allow traffic on port 80/443

### Debug Commands
```bash
# Check task logs
aws logs get-log-events --log-group-name /ecs/campuslearn-backend --log-stream-name <stream-name>

# Check service events
aws ecs describe-services --cluster campuslearn-cluster --services campuslearn-backend-service --query 'services[0].events'

# Check task definition
aws ecs describe-task-definition --task-definition campuslearn-backend
```
