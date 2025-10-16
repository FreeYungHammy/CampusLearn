# 🚀 Deploying CampusLearn to AWS ECS Fargate (Cape Town)

Write-Host "🚀 Deploying CampusLearn to AWS ECS Fargate (Cape Town)..." -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "❌ AWS CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Docker not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.docker.com/get-docker/" -ForegroundColor Yellow
    exit 1
}

# Set region to Cape Town
$env:AWS_DEFAULT_REGION = "af-south-1"

# Get AWS account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "📋 AWS Account ID: $ACCOUNT_ID" -ForegroundColor Yellow

Write-Host "🏗️ Building Docker image..." -ForegroundColor Blue
docker build -t campuslearn-backend .

Write-Host "🏷️ Tagging for ECR..." -ForegroundColor Blue
docker tag campuslearn-backend:latest "${ACCOUNT_ID}.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest"

Write-Host "🔐 Logging into ECR..." -ForegroundColor Blue
aws ecr get-login-password --region af-south-1 | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.af-south-1.amazonaws.com"

Write-Host "📤 Pushing to ECR..." -ForegroundColor Blue
docker push "${ACCOUNT_ID}.dkr.ecr.af-south-1.amazonaws.com/campuslearn-backend:latest"

Write-Host "📝 Updating task definition with account ID..." -ForegroundColor Blue
# Replace placeholder with actual account ID in task definition
$taskDefContent = Get-Content "deployment/aws/ecs/task-definition.json" -Raw
$taskDefContent = $taskDefContent -replace "YOUR_ACCOUNT_ID", $ACCOUNT_ID
$taskDefContent | Set-Content "deployment/aws/ecs/task-definition.json"

Write-Host "📝 Registering task definition..." -ForegroundColor Blue
aws ecs register-task-definition --cli-input-json file://deployment/aws/ecs/task-definition.json --region af-south-1

Write-Host "🚀 Creating ECS service..." -ForegroundColor Blue
aws ecs create-service --cli-input-json file://deployment/aws/ecs/service-definition.json --region af-south-1

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your WebRTC app is now running on AWS ECS Fargate in Cape Town!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Check status:" -ForegroundColor Cyan
Write-Host "aws ecs describe-services --cluster campuslearn-cluster --services campuslearn-backend-service" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Get ALB URL:" -ForegroundColor Cyan
Write-Host "aws cloudformation describe-stacks --stack-name campuslearn-alb --query 'Stacks[0].Outputs[?OutputKey==`ApplicationLoadBalancer`].OutputValue' --output text" -ForegroundColor White
