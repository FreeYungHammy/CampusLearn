#!/bin/bash

# Google Cloud CDN Setup Script for CampusLearn
# This script helps set up Google Cloud CDN for video delivery

echo "🚀 Setting up Google Cloud CDN for CampusLearn..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with Google Cloud. Please run:"
    echo "   gcloud auth login"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project ID set. Please run:"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Project ID: $PROJECT_ID"

# Get bucket name from environment or prompt
BUCKET_NAME=${GCS_BUCKET:-"tutor-student-videos"}
echo "📋 Bucket name: $BUCKET_NAME"

# Create backend bucket for CDN
echo "🏗️  Creating backend bucket for CDN..."
gcloud compute backend-buckets create campuslearn-video-backend \
    --gcs-bucket-name=$BUCKET_NAME \
    --enable-cdn \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Backend bucket created successfully"
else
    echo "⚠️  Backend bucket might already exist or creation failed"
fi

# Create URL map
echo "🗺️  Creating URL map..."
gcloud compute url-maps create campuslearn-video-map \
    --default-backend-bucket=campuslearn-video-backend \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ URL map created successfully"
else
    echo "⚠️  URL map might already exist or creation failed"
fi

# Create HTTP proxy
echo "🌐 Creating HTTP proxy..."
gcloud compute target-http-proxies create campuslearn-video-proxy \
    --url-map=campuslearn-video-map \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ HTTP proxy created successfully"
else
    echo "⚠️  HTTP proxy might already exist or creation failed"
fi

# Reserve static IP
echo "🔗 Reserving static IP..."
gcloud compute addresses create campuslearn-video-ip \
    --global \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Static IP reserved successfully"
else
    echo "⚠️  Static IP might already exist or reservation failed"
fi

# Get the reserved IP
CDN_IP=$(gcloud compute addresses describe campuslearn-video-ip --global --format="value(address)")
echo "🌐 CDN IP Address: $CDN_IP"

# Create forwarding rule
echo "📡 Creating forwarding rule..."
gcloud compute forwarding-rules create campuslearn-video-rule \
    --global \
    --target-http-proxy=campuslearn-video-proxy \
    --address=campuslearn-video-ip \
    --ports=80 \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ Forwarding rule created successfully"
else
    echo "⚠️  Forwarding rule might already exist or creation failed"
fi

# Configure CDN cache policy
echo "⚙️  Configuring CDN cache policy..."
gcloud compute backend-buckets update campuslearn-video-backend \
    --enable-cdn \
    --cdn-cache-mode=CACHE_ALL_STATIC \
    --cdn-default-ttl=86400 \
    --cdn-max-ttl=604800 \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo "✅ CDN cache policy configured successfully"
else
    echo "⚠️  CDN cache policy configuration failed"
fi

echo ""
echo "🎉 CDN setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add these environment variables to your .env file:"
echo "   CDN_ENABLED=true"
echo "   CDN_BASE_URL=http://$CDN_IP"
echo "   CDN_CACHE_TTL=86400"
echo "   CDN_PROVIDER=google-cloud"
echo ""
echo "2. Wait 5-10 minutes for CDN propagation"
echo ""
echo "3. Test CDN functionality:"
echo "   curl -I http://$CDN_IP/videos/your-video-file.mp4"
echo ""
echo "4. Monitor CDN performance in Google Cloud Console"
echo ""
echo "🌐 Your CDN URL will be: http://$CDN_IP/videos/[video-file]"
echo ""
echo "⚠️  Note: For production, consider using HTTPS and a custom domain"



