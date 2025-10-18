# CampusLearn Email API Test Script
# Make sure your backend server is running on localhost:5001

Write-Host "🧪 Testing CampusLearn Email API..." -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "📧 Test 1: Checking email connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/email/test" -Method GET -Headers @{"Authorization"="Bearer YOUR_JWT_TOKEN"} -ErrorAction Stop
    Write-Host "✅ Email connection test:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Email connection test failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Test 2: Send Test Email
Write-Host "📧 Test 2: Sending test email..." -ForegroundColor Yellow
try {
    $body = @{
        to = "test@example.com"
        subject = "CampusLearn Test Email"
        message = "This is a test email from CampusLearn sent via Brevo!"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/email/send-test" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer YOUR_JWT_TOKEN"} -Body $body -ErrorAction Stop
    Write-Host "✅ Test email sent:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Test email failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Test 3: Send Welcome Email
Write-Host "📧 Test 3: Sending welcome email..." -ForegroundColor Yellow
try {
    $body = @{
        to = "test@example.com"
        name = "Test User"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/email/welcome" -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer YOUR_JWT_TOKEN"} -Body $body -ErrorAction Stop
    Write-Host "✅ Welcome email sent:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Welcome email failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

Write-Host "🎉 Email API testing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check your test email inbox" -ForegroundColor White
Write-Host "2. Verify emails are not in spam folder" -ForegroundColor White
Write-Host "3. Ensure DNS records are properly configured" -ForegroundColor White
Write-Host "4. Check Brevo dashboard for delivery status" -ForegroundColor White
