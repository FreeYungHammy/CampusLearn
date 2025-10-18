# Simple Email Test Script for CampusLearn
Write-Host "🧪 Testing CampusLearn Email API..." -ForegroundColor Green
Write-Host ""

# Test 1: Health Check (without authentication)
Write-Host "📧 Test 1: Checking server health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Server is running:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Server health check failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Test 2: Check email service (this will require authentication)
Write-Host "📧 Test 2: Testing email service..." -ForegroundColor Yellow
Write-Host "Note: This requires a valid JWT token. You'll need to login first." -ForegroundColor Cyan
Write-Host ""

# Instructions for getting a JWT token
Write-Host "🔑 To get a JWT token, you can:" -ForegroundColor Cyan
Write-Host "1. Login through your frontend at http://localhost:5173" -ForegroundColor White
Write-Host "2. Check the browser's developer tools > Application > Local Storage" -ForegroundColor White
Write-Host "3. Look for a 'token' key" -ForegroundColor White
Write-Host ""

# Test 3: Direct SMTP test (if you have credentials)
Write-Host "📧 Test 3: Direct SMTP test..." -ForegroundColor Yellow
Write-Host "You can also test the email service directly by running:" -ForegroundColor Cyan
Write-Host "node test-brevo-email.js" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Email API testing setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Add DNS records to your domain" -ForegroundColor White
Write-Host "2. Update your .env file with Brevo credentials" -ForegroundColor White
Write-Host "3. Get a JWT token by logging in" -ForegroundColor White
Write-Host "4. Test email sending with the token" -ForegroundColor White
