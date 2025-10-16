#!/bin/bash

echo "🚀 Deploying CampusLearn to AWS ECS Fargate (Cape Town)..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Set region to Cape Town
export AWS_DEFAULT_REGION=af-south-1

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

echo "🏗️ Building Docker image..."
docker build -t campuslearn-backend .

echo "🏷️ Tagging for ECR..."
docker tag campuslearn-backend:latest $ACCOUNT_ID.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region af-south-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.af-south-1.amazonaws.com

echo "📤 Pushing to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest

echo "📝 Updating task definition with account ID..."
# Replace placeholder with actual account ID
sed -i "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" deployment/aws/ecs/task-definition.json

echo "📝 Registering task definition..."
aws ecs register-task-definition --cli-input-json file://deployment/aws/ecs/task-definition.json --region af-south-1

echo "🚀 Creating ECS service..."
aws ecs create-service --cli-input-json file://deployment/aws/ecs/service-definition.json --region af-south-1

echo "✅ Deployment complete!"
echo "🌐 Your WebRTC app is now running on AWS ECS Fargate in Cape Town!"
echo ""
echo "📊 Check status:"
echo "aws ecs describe-services --cluster campuslearn-cluster --services campuslearn-backend-service"
echo ""
echo "🌐 Get ALB URL:"
echo "aws cloudformation describe-stacks --stack-name campuslearn-alb --query 'Stacks[0].Outputs[?OutputKey==`ApplicationLoadBalancer`].OutputValue' --output text"
