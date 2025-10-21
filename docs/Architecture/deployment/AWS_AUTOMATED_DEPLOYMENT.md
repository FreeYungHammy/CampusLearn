# AWS Automated Deployment Setup - Complete Guide

## 🎯 Overview
This document outlines the complete automated deployment pipeline for CampusLearn backend on AWS. When you push to the main branch, the system automatically:

1. ✅ **Builds** new Docker image
2. ✅ **Pushes** to ECR repository  
3. ✅ **Creates** new ECS task definition with latest image
4. ✅ **Updates** ECS service with new task definition
5. ✅ **Deploys** and waits for deployment completion
6. ✅ **Verifies** deployment success

## 🏗️ Architecture

```
GitHub Push → CodePipeline → CodeBuild → ECR → ECS
     ↓              ↓           ↓        ↓      ↓
   Trigger      Orchestrates  Builds   Stores  Runs
   Pipeline     Process       Image    Image   App
```

## 📋 Prerequisites
- ✅ AWS account with appropriate permissions
- ✅ GitHub repository connected to CodePipeline
- ✅ ECR repository: `campuslearn-backend`
- ✅ ECS cluster: `strong-dolphin-qr0d3scampuslearn-cluster`
- ✅ ECS service: `CampusLearn-Backend-Service`
- ✅ Load balancer and target group configured

## 🔧 Current Configuration

### Pipeline Components
- **Pipeline Name**: `CampusLearn-Backend`
- **Source**: GitHub repository (main branch)
- **Build**: CodeBuild with updated buildspec.yml
- **Deploy**: Integrated ECS deployment within CodeBuild

### Environment Variables
```bash
AWS_REGION=af-south-1
ECR_REPOSITORY=campuslearn-backend
CONTAINER_NAME=campuslearn-backend
ECS_CLUSTER=strong-dolphin-qr0d3scampuslearn-cluster
ECS_SERVICE=CampusLearn-Backend-Service
TASK_DEFINITION_FAMILY=CampusLearn-Backend
```

## 🚀 Automated Deployment Process

### Phase 1: Source Trigger
1. **GitHub Push** to main branch
2. **CodePipeline** detects changes
3. **Downloads** source code to CodeBuild environment

### Phase 2: Build & Push
```bash
# CodeBuild automatically:
1. Logs into ECR
2. Builds Docker image with git commit hash tag
3. Pushes image to ECR repository
4. Creates imagedefinitions.json for ECS
```

### Phase 3: Task Definition Update
```bash
# CodeBuild automatically:
1. Gets current task definition (revision 7)
2. Updates image URI with new commit hash
3. Removes metadata fields
4. Registers new task definition (revision 8, 9, etc.)
```

### Phase 4: ECS Service Update
```bash
# CodeBuild automatically:
1. Updates ECS service with new task definition
2. Forces new deployment
3. Waits for deployment to stabilize
4. Verifies deployment success
```

## 📝 Buildspec.yml Breakdown

### Pre-Build Phase
```yaml
pre_build:
  commands:
    - echo Installing dependencies and logging in to ECR...
    - aws --version
    - ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    - ECR_URI=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY
    - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-7)
    - echo IMAGE_TAG=$IMAGE_TAG > image_tag.txt
    - echo ECR_URI=$ECR_URI > ecr_uri.txt
```

### Build Phase
```yaml
build:
  commands:
    - echo Building the Docker image $ECR_URI:$IMAGE_TAG
    - docker build -t $ECR_URI:$IMAGE_TAG .
```

### Post-Build Phase (The Magic)
```yaml
post_build:
  commands:
    - echo Pushing the Docker image...
    - docker push $ECR_URI:$IMAGE_TAG
    
    # Create ECS deployment artifacts
    - printf '[{"name":"%s","imageUri":"%s"}]' "$CONTAINER_NAME" "$ECR_URI:$IMAGE_TAG" > imagedefinitions.json
    
    # Get current task definition and update image
    - TASK_DEF_ARN=$(aws ecs describe-task-definition --task-definition $TASK_DEFINITION_FAMILY --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
    - aws ecs describe-task-definition --task-definition $TASK_DEFINITION_FAMILY --region $AWS_REGION --query 'taskDefinition' > current-task-def.json
    
    # Update image URI with new commit hash
    - sed -i "s|559935790394.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:[a-f0-9]*|$ECR_URI:$IMAGE_TAG|g" current-task-def.json
    
    # Clean up task definition for registration
    - jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' current-task-def.json > new-task-def.json
    
    # Register new task definition
    - NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://new-task-def.json --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text)
    
    # Update ECS service
    - aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --task-definition $NEW_TASK_DEF_ARN --region $AWS_REGION --force-new-deployment
    
    # Wait for deployment completion
    - aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION
    
    - echo Deployment completed successfully!
```

## 🔐 Required IAM Permissions

### CodeBuild Service Role Permissions
The `codebuild-CampusLearn-service-role` needs these policies:
- ✅ `CodeBuildBasePolicy-CampusLearn-af-south-1` (ECR access)
- ✅ `AmazonEC2ContainerRegistryPowerUser` (ECR push/pull)
- ✅ `AmazonECS_FullAccess` (ECS service updates)

### Pipeline Service Role Permissions
The `AWSCodePipelineServiceRole-af-south-1-CampusLearn-Backend` needs:
- ✅ `AmazonECS_FullAccess` (ECS deployments)

## 🎯 Deployment Flow Example

### When you push to main:
```
1. git push origin main
   ↓
2. CodePipeline triggers (within 1 minute)
   ↓
3. CodeBuild starts building (2-3 minutes)
   ↓
4. Docker image pushed to ECR (1-2 minutes)
   ↓
5. New task definition created (30 seconds)
   ↓
6. ECS service updated (2-3 minutes)
   ↓
7. New containers start and health checks pass (2-3 minutes)
   ↓
8. Old containers stopped (1-2 minutes)
   ↓
9. Deployment complete! ✅
```

**Total time: ~10-15 minutes**

## 📊 Monitoring & Verification

### Check Deployment Status
```bash
# Check pipeline status
aws codepipeline get-pipeline-state --name CampusLearn-Backend --region af-south-1

# Check ECS service status
aws ecs describe-services --cluster strong-dolphin-qr0d3scampuslearn-cluster --services CampusLearn-Backend-Service --region af-south-1

# Check running tasks
aws ecs list-tasks --cluster strong-dolphin-qr0d3scampuslearn-cluster --service-name CampusLearn-Backend-Service --region af-south-1

# Test application
curl http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com/
```

### CloudWatch Logs
- **CodeBuild Logs**: `/aws/codebuild/CampusLearn`
- **ECS Application Logs**: `/ecs/CampusLearn-Backend`

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 1. Pipeline Stuck in "InProgress"
```bash
# Force new pipeline execution
aws codepipeline start-pipeline-execution --name CampusLearn-Backend --region af-south-1
```

#### 2. ECS Deployment Fails
```bash
# Check service events
aws ecs describe-services --cluster strong-dolphin-qr0d3scampuslearn-cluster --services CampusLearn-Backend-Service --region af-south-1 --query 'services[0].events[0:5]'

# Check task logs
aws logs get-log-events --log-group-name /ecs/CampusLearn-Backend --log-stream-name [TASK-STREAM-NAME] --region af-south-1
```

#### 3. Health Check Failures
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:af-south-1:559935790394:targetgroup/campuslearn-tg/3863f024aad07096 --region af-south-1

# Check if curl is available in container
docker run --rm [IMAGE-URI] curl --version
```

#### 4. Permission Issues
```bash
# Check CodeBuild role permissions
aws iam list-attached-role-policies --role-name codebuild-CampusLearn-service-role --region af-south-1

# Add missing permissions
aws iam attach-role-policy --role-name codebuild-CampusLearn-service-role --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess --region af-south-1
```

## 🎉 Success Indicators

### ✅ Deployment Successful When:
- Pipeline status: "Succeeded"
- ECS service: "ACTIVE" with desired count
- Target health: "healthy"
- Application responds: `{"status":"ok","service":"campuslearn-api","version":"1.0.0"}`

### 📈 Performance Metrics
- **Build time**: 5-8 minutes
- **Deployment time**: 3-5 minutes
- **Zero-downtime**: Rolling deployment
- **Rollback capability**: Automatic on failure

## 🔄 Rollback Procedure

### Manual Rollback
```bash
# Get previous task definition
aws ecs describe-task-definition --task-definition CampusLearn-Backend:7 --region af-south-1

# Update service to previous version
aws ecs update-service --cluster strong-dolphin-qr0d3scampuslearn-cluster --service CampusLearn-Backend-Service --task-definition CampusLearn-Backend:7 --region af-south-1 --force-new-deployment
```

### Automatic Rollback
- ECS circuit breaker enabled
- Automatic rollback on health check failures
- Pipeline fails if deployment doesn't stabilize

## 🚀 Next Steps

### Immediate Actions
1. ✅ **Test the pipeline**: Push a small change to main
2. ✅ **Monitor deployment**: Watch CloudWatch logs
3. ✅ **Verify functionality**: Test all endpoints

### Future Enhancements
- **Blue/Green deployments** for zero-downtime
- **Canary deployments** for gradual rollouts
- **Notification integration** (Slack, email)
- **Performance monitoring** and alerting

---

## 🎯 Quick Commands

```bash
# Start new deployment
git add . && git commit -m "Trigger deployment" && git push origin main

# Check deployment status
aws codepipeline get-pipeline-state --name CampusLearn-Backend --region af-south-1

# Monitor ECS service
aws ecs describe-services --cluster strong-dolphin-qr0d3scampuslearn-cluster --services CampusLearn-Backend-Service --region af-south-1

# Test application
curl http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com/health
```

**Your automated deployment is now ready! 🎉**
