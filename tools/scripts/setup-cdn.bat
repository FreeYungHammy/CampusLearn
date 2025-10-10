@echo off
REM Google Cloud CDN Setup Script for CampusLearn (Windows)
REM This script helps set up Google Cloud CDN for video delivery

echo 🚀 Setting up Google Cloud CDN for CampusLearn...

REM Check if gcloud is installed
gcloud version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Google Cloud CLI is not installed. Please install it first:
    echo    https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Check if user is authenticated
gcloud auth list --filter=status:ACTIVE --format="value(account)" | findstr /r "." >nul
if %errorlevel% neq 0 (
    echo ❌ Not authenticated with Google Cloud. Please run:
    echo    gcloud auth login
    exit /b 1
)

REM Get project ID
for /f "tokens=*" %%i in ('gcloud config get-value project') do set PROJECT_ID=%%i
if "%PROJECT_ID%"=="" (
    echo ❌ No project ID set. Please run:
    echo    gcloud config set project YOUR_PROJECT_ID
    exit /b 1
)

echo 📋 Project ID: %PROJECT_ID%

REM Get bucket name from environment or use default
if "%GCS_BUCKET%"=="" (
    set BUCKET_NAME=tutor-student-videos
) else (
    set BUCKET_NAME=%GCS_BUCKET%
)
echo 📋 Bucket name: %BUCKET_NAME%

echo 🏗️  Creating backend bucket for CDN...
gcloud compute backend-buckets create campuslearn-video-backend --gcs-bucket-name=%BUCKET_NAME% --enable-cdn --project=%PROJECT_ID%
if %errorlevel% equ 0 (
    echo ✅ Backend bucket created successfully
) else (
    echo ⚠️  Backend bucket might already exist or creation failed
)

echo 🗺️  Creating URL map...
gcloud compute url-maps create campuslearn-video-map --default-backend-bucket=campuslearn-video-backend --project=%PROJECT_ID%
if %errorlevel% equ 0 (
    echo ✅ URL map created successfully
) else (
    echo ⚠️  URL map might already exist or creation failed
)

echo 🌐 Creating HTTP proxy...
gcloud compute target-http-proxies create campuslearn-video-proxy --url-map=campuslearn-video-map --project=%PROJECT_ID%
if %errorlevel% equ 0 (
    echo ✅ HTTP proxy created successfully
) else (
    echo ⚠️  HTTP proxy might already exist or creation failed
)

echo 🔗 Reserving static IP...
gcloud compute addresses create campuslearn-video-ip --global --project=%PROJECT_ID%
if %errorlevel% equ 0 (
    echo ✅ Static IP reserved successfully
) else (
    echo ⚠️  Static IP might already exist or reservation failed
)

REM Get the reserved IP
for /f "tokens=*" %%i in ('gcloud compute addresses describe campuslearn-video-ip --global --format="value(address)"') do set CDN_IP=%%i
echo 🌐 CDN IP Address: %CDN_IP%

echo 📡 Creating forwarding rule...
gcloud compute forwarding-rules create campuslearn-video-rule --global --target-http-proxy=campuslearn-video-proxy --address=campuslearn-video-ip --ports=80 --project=%PROJECT_ID%
if %errorlevel% equ 0 (
    echo ✅ Forwarding rule created successfully
) else (
    echo ⚠️  Forwarding rule might already exist or creation failed
)

echo ⚙️  Configuring CDN cache policy...
gcloud compute backend-buckets update campuslearn-video-backend --enable-cdn --cdn-cache-mode=CACHE_ALL_STATIC --cdn-default-ttl=86400 --cdn-max-ttl=604800 --project=%PROJECT_ID%
if %errorlevel% equ 0 (
    echo ✅ CDN cache policy configured successfully
) else (
    echo ⚠️  CDN cache policy configuration failed
)

echo.
echo 🎉 CDN setup completed!
echo.
echo 📋 Next steps:
echo 1. Add these environment variables to your .env file:
echo    CDN_ENABLED=true
echo    CDN_BASE_URL=http://%CDN_IP%
echo    CDN_CACHE_TTL=86400
echo    CDN_PROVIDER=google-cloud
echo.
echo 2. Wait 5-10 minutes for CDN propagation
echo.
echo 3. Test CDN functionality:
echo    curl -I http://%CDN_IP%/videos/your-video-file.mp4
echo.
echo 4. Monitor CDN performance in Google Cloud Console
echo.
echo 🌐 Your CDN URL will be: http://%CDN_IP%/videos/[video-file]
echo.
echo ⚠️  Note: For production, consider using HTTPS and a custom domain



