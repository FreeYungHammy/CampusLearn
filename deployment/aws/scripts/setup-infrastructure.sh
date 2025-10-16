#!/bin/bash

echo "🏗️ Setting up AWS ECS infrastructure for CampusLearn..."

# Set region to Cape Town
export AWS_DEFAULT_REGION=af-south-1

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

echo "🔧 Creating ECR repository..."
aws ecr create-repository --repository-name campuslearn-backend --region af-south-1 || echo "Repository already exists"

echo "🏗️ Creating VPC stack..."
aws cloudformation create-stack \
    --stack-name campuslearn-vpc \
    --template-body file://deployment/aws/cloudformation/vpc.yaml \
    --region af-south-1 \
    --capabilities CAPABILITY_IAM

echo "⏳ Waiting for VPC stack to complete..."
aws cloudformation wait stack-create-complete --stack-name campuslearn-vpc --region af-south-1

echo "⚖️ Creating ALB stack..."
aws cloudformation create-stack \
    --stack-name campuslearn-alb \
    --template-body file://deployment/aws/cloudformation/alb.yaml \
    --region af-south-1 \
    --parameters \
        ParameterKey=VPCId,ParameterValue=$(aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`VPC`].OutputValue' --output text) \
        ParameterKey=PublicSubnet1,ParameterValue=$(aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet1`].OutputValue' --output text) \
        ParameterKey=PublicSubnet2,ParameterValue=$(aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet2`].OutputValue' --output text) \
        ParameterKey=ALBSecurityGroup,ParameterValue=$(aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`ALBSecurityGroup`].OutputValue' --output text) \
        ParameterKey=ECSSecurityGroup,ParameterValue=$(aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`ECSSecurityGroup`].OutputValue' --output text) \
    --capabilities CAPABILITY_IAM

echo "⏳ Waiting for ALB stack to complete..."
aws cloudformation wait stack-create-complete --stack-name campuslearn-alb --region af-south-1

echo "✅ Infrastructure setup complete!"
echo "🌐 Your ECS infrastructure is ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Update deployment/aws/ecs/task-definition.json with your ACCOUNT_ID: $ACCOUNT_ID"
echo "2. Update deployment/aws/ecs/service-definition.json with subnet and security group IDs"
echo "3. Run: ./deployment/aws/scripts/deploy-app.sh"
