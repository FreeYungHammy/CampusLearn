# Metered.ca Video Calling Setup Guide

This comprehensive guide covers both Metered.ca dashboard configuration and backend setup for enabling video calling functionality in CampusLearn.

## Introduction

Metered.ca provides TURN/STUN servers for WebRTC video calls, enabling reliable peer-to-peer connections even when users are behind firewalls or NATs. This is essential for video calling functionality in production environments.

## Part A: Metered.ca Dashboard Configuration

### Step 1: Account Setup

1. **Sign up for Metered.ca**
   - Go to [https://dashboard.metered.ca/signup](https://dashboard.metered.ca/signup)
   - Create your free account
   - Verify your email address

2. **Login to Dashboard**
   - Navigate to [https://dashboard.metered.ca/login](https://dashboard.metered.ca/login)
   - Use your credentials to sign in

### Step 2: Create/Access Your App

1. **Navigate to Your App**
   - Your dashboard URL format: `https://dashboard.metered.ca/dashboard/app/{APP_ID}`
   - Example: `https://dashboard.metered.ca/dashboard/app/68edf87d945a6ad84f127f97`

2. **Understanding App ID vs App Name**
   - **App ID**: The long string in your dashboard URL (e.g., `68edf87d945a6ad84f127f97`)
   - **App Name/Subdomain**: The part before `.metered.live` in API calls (e.g., `campuslearn` from `campuslearn.metered.live`)

### Step 3: Locate Your Credentials

1. **Find Your App Subdomain/Name**
   - In your dashboard, look for your app's subdomain
   - This will be used in API calls like: `https://{APP_NAME}.metered.live/api/v1/turn/credential`
   - Example: If your subdomain is `campuslearn`, your API endpoint will be `https://campuslearn.metered.live/api/v1/turn/credential`

2. **Get Your Secret Key**
   - Navigate to **Settings** → **API Keys** or **Credentials** section
   - Copy your **Secret Key** (long alphanumeric string)
   - This key is used to authenticate TURN credential requests

3. **What Each Credential is Used For**
   - **App Name**: Used to construct the API endpoint URL
   - **Secret Key**: Used to authenticate requests to Metered.ca's API

### Step 4: Configure Allowed Origins (CORS)

1. **Add Your Domains**
   - Add your production frontend domain (e.g., `https://campuslearn.onrender.com`)
   - Add localhost for development testing (e.g., `http://localhost:5173`)
   - This prevents unauthorized domains from using your TURN servers

2. **Why CORS is Important**
   - Security measure to prevent abuse
   - Only whitelisted domains can request TURN credentials
   - Protects your bandwidth quota

### Step 5: Verify Free Tier Status

1. **Check Usage**
   - Monitor your bandwidth consumption
   - Free tier includes 50GB/month bandwidth
   - Check usage in dashboard to ensure you're within limits

2. **Understand Bandwidth Consumption**
   - Video calls consume significant bandwidth
   - Monitor usage to avoid unexpected charges
   - Consider upgrading if approaching limits

## Part B: Backend Configuration

### Step 6: Local Development Setup

1. **Create/Update Environment File**
   - Navigate to `backend/` directory
   - Create or update `.env` file with your static credentials:

   ```env
   METERED_TURN_USERNAME=your_username_here
   METERED_TURN_PASSWORD=your_password_here
   ```

2. **How to Find These Values**
   - Go to your Metered.ca dashboard → "TURN Credentials" section
   - Copy the Username and Password from your active credential
   - These credentials don't expire and work immediately

### Step 7: Production ECS Configuration

1. **Navigate to AWS ECS Console**
   - Go to AWS Console → ECS → Task Definitions
   - Find `CampusLearn-Backend` task definition

2. **Update Task Definition**
   - Click "Create new revision"
   - In the Environment Variables section, add:

   ```json
   {
     "name": "METERED_TURN_USERNAME",
     "value": "your_username_here"
   },
   {
     "name": "METERED_TURN_PASSWORD",
     "value": "your_password_here"
   }
   ```

3. **Deploy New Revision**
   - Click "Create" to create new revision
   - Go to Services → Update service
   - Select new task definition revision
   - Click "Update" to deploy

### Step 8: Verify Backend Configuration

1. **Check Code Implementation**
   - Verify `backend/src/realtime/iceConfig.ts` reads environment variables correctly
   - The code should use `process.env.METERED_APP_NAME` and `process.env.METERED_SECRET_KEY`

2. **Restart Backend Service**
   - After updating environment variables, restart the ECS service
   - This ensures new environment variables are loaded

3. **Check CloudWatch Logs**
   - Navigate to CloudWatch → Log Groups → `/ecs/CampusLearn-Backend`
   - Look for `[iceConfig]` log messages
   - Should see: `[iceConfig] Environment check: { hasApp: true, hasSecret: true, ... }`

4. **Confirm TURN Credential Requests**
   - Look for: `[iceConfig] Successfully obtained TURN credentials`
   - Should see: `[iceConfig] Returning ICE servers: { stunCount: ..., turnCount: ..., total: ... }`

## Part C: Testing & Verification

### Step 9: Test TURN Server Connectivity

1. **Inspect ICE Servers in Browser**
   - Open browser Developer Tools → Console
   - Look for `[iceConfig]` messages when starting a call
   - Verify TURN servers appear in peer connection configuration

2. **Verify ICE Candidate Types**
   - Look for ICE candidates with `type: "relay"`
   - This indicates TURN servers are working
   - `type: "srflx"` indicates STUN servers working
   - `type: "host"` indicates direct connections

### Step 10: End-to-End Call Test

1. **Test Between Different Networks**
   - Use two different devices/networks (e.g., mobile data + WiFi)
   - Start a video call from Messages page
   - Verify both users can see and hear each other

2. **Monitor Browser Console**
   - Check for WebRTC connection logs
   - Look for successful ICE candidate exchange
   - Verify connection state changes from "new" → "connecting" → "connected"

3. **Verify Connection Establishes Successfully**
   - Both users should see video streams
   - Audio should work in both directions
   - Connection quality indicators should show "excellent" or "good"

## Part D: Troubleshooting

### Common Issues

1. **"STUN-only mode" Warning**
   - **Cause**: Missing or incorrect Metered credentials
   - **Solution**: Verify `METERED_APP_NAME` and `METERED_SECRET_KEY` in ECS task definition
   - **Check**: CloudWatch logs for `[iceConfig] Metered credentials missing`

2. **"TURN credential request failed"**
   - **Cause**: Wrong secret key or app name
   - **Solution**: Double-check credentials from Metered dashboard
   - **Check**: HTTP status codes in CloudWatch logs

3. **ICE Connection Stuck at "new"**
   - **Cause**: TURN servers not configured or accessible
   - **Solution**: Verify TURN servers are returned by `/api/videos/ice-config` endpoint
   - **Check**: Browser console for ICE server configuration

4. **401/403 Errors**
   - **Cause**: CORS/domain restrictions or invalid credentials
   - **Solution**: Check allowed origins in Metered dashboard
   - **Check**: Verify frontend domain is whitelisted

### Debug Checklist

1. **Verify Environment Variables**
   - Check ECS task definition has correct environment variables
   - Verify variable names match exactly: `METERED_APP_NAME`, `METERED_SECRET_KEY`

2. **Check CloudWatch Logs**
   - Look for `[iceConfig]` messages during backend startup
   - Verify successful TURN credential requests
   - Check for any error messages

3. **Inspect Browser Network Tab**
   - Verify `/api/videos/ice-config` endpoint returns ICE servers
   - Check for failed HTTP requests
   - Look for WebSocket connection errors

4. **Test with Metered.ca Test Page**
   - Use Metered's test page to verify your credentials work
   - This helps isolate if issue is with credentials or implementation

### Network Troubleshooting

1. **Firewall Blocking UDP Ports**
   - **Issue**: Corporate firewalls blocking TURN server ports (80, 443)
   - **Solution**: Contact network administrator to whitelist Metered.ca domains

2. **Corporate Proxy Issues**
   - **Issue**: Corporate proxies interfering with WebRTC
   - **Solution**: Configure proxy settings or use direct connection

3. **VPN Interference**
   - **Issue**: VPNs can interfere with WebRTC connections
   - **Solution**: Test without VPN or configure VPN to allow WebRTC traffic

## Quick Reference

### Environment Variables
```env
METERED_TURN_USERNAME=your_username_here
METERED_TURN_PASSWORD=your_password_here
```

### Expected CloudWatch Log Messages
```
[iceConfig] Environment check: { hasStaticCreds: true, hasApiKey: false, ... }
[iceConfig] Using static TURN credentials
[iceConfig] Returning static ICE servers: { stunCount: 1, turnCount: 4, total: 5 }
```

### Browser Console Logs to Look For
```
[signal] Connected to video namespace
[webrtc] ICE connection state changed: connected
[webrtc] Local ICE candidate: { type: "relay", ... }
```

## Support

If you continue to experience issues:

1. Check Metered.ca documentation: [https://www.metered.ca/docs/](https://www.metered.ca/docs/)
2. Verify your account status and usage limits
3. Test with Metered's sample applications
4. Contact Metered.ca support if credentials appear correct but connections fail

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Author**: CampusLearn Development Team
