# 🏗️ Setting up AWS ECS infrastructure for CampusLearn

Write-Host "🏗️ Setting up AWS ECS infrastructure for CampusLearn..." -ForegroundColor Green

# Set region to Cape Town
$env:AWS_DEFAULT_REGION = "af-south-1"

# Get AWS account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "📋 AWS Account ID: $ACCOUNT_ID" -ForegroundColor Yellow

Write-Host "🔧 Creating ECR repository..." -ForegroundColor Blue
aws ecr create-repository --repository-name campuslearn-backend --region af-south-1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Repository might already exist, continuing..." -ForegroundColor Yellow
}

Write-Host "🏗️ Creating VPC stack..." -ForegroundColor Blue
aws cloudformation create-stack `
    --stack-name campuslearn-vpc `
    --template-body file://deployment/aws/cloudformation/vpc.yaml `
    --region af-south-1 `
    --capabilities CAPABILITY_IAM

Write-Host "⏳ Waiting for VPC stack to complete..." -ForegroundColor Yellow
aws cloudformation wait stack-create-complete --stack-name campuslearn-vpc --region af-south-1

Write-Host "⚖️ Creating ALB stack..." -ForegroundColor Blue
$VPC_ID = aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`VPC`].OutputValue' --output text
$PUBLIC_SUBNET_1 = aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet1`].OutputValue' --output text
$PUBLIC_SUBNET_2 = aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet2`].OutputValue' --output text
$ALB_SG = aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`ALBSecurityGroup`].OutputValue' --output text
$ECS_SG = aws cloudformation describe-stacks --stack-name campuslearn-vpc --query 'Stacks[0].Outputs[?OutputKey==`ECSSecurityGroup`].OutputValue' --output text

aws cloudformation create-stack `
    --stack-name campuslearn-alb `
    --template-body file://deployment/aws/cloudformation/alb.yaml `
    --region af-south-1 `
    --parameters `
        ParameterKey=VPCId,ParameterValue=$VPC_ID `
        ParameterKey=PublicSubnet1,ParameterValue=$PUBLIC_SUBNET_1 `
        ParameterKey=PublicSubnet2,ParameterValue=$PUBLIC_SUBNET_2 `
        ParameterKey=ALBSecurityGroup,ParameterValue=$ALB_SG `
        ParameterKey=ECSSecurityGroup,ParameterValue=$ECS_SG `
    --capabilities CAPABILITY_IAM

Write-Host "⏳ Waiting for ALB stack to complete..." -ForegroundColor Yellow
aws cloudformation wait stack-create-complete --stack-name campuslearn-alb --region af-south-1

Write-Host "✅ Infrastructure setup complete!" -ForegroundColor Green
Write-Host "🌐 Your ECS infrastructure is ready for deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update deployment/aws/ecs/task-definition.json with your ACCOUNT_ID: $ACCOUNT_ID" -ForegroundColor White
Write-Host "2. Update deployment/aws/ecs/service-definition.json with subnet and security group IDs" -ForegroundColor White
Write-Host "3. Run: .\deployment\aws\scripts\deploy-app.ps1" -ForegroundColor White
