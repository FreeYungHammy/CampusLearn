# Frontend Deployment to Render - Complete Roadmap

## 📋 Overview
This document provides a complete roadmap for deploying the CampusLearn frontend to Render, while keeping the backend on AWS ECS.

## 🏗️ Architecture
```
User → Render (Static Frontend) → AWS Backend (Dynamic API)
     ↓                         ↓
   Fast CDN               ECS + Load Balancer
```

## 🎯 Prerequisites
- ✅ GitHub repository with frontend code
- ✅ AWS backend running and accessible
- ✅ Render account (free tier available)
- ✅ Backend URL: `http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com`

## 📝 Step-by-Step Implementation

### Phase 1: Frontend Configuration
#### 1.1 Environment Variables Setup
Create/update `.env` file in frontend directory:
```bash
# Production API URL
VITE_API_URL=http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com

# Optional: Enable production optimizations
VITE_NODE_ENV=production
```

#### 1.2 Update API Service Configuration
Verify `frontend/src/services/api.ts` points to the correct backend:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

#### 1.3 Build Configuration Check
Ensure `frontend/vite.config.ts` is optimized for production:
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    port: 5173,
  },
});
```

### Phase 2: Render Setup
#### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Connect your GitHub repository

#### 2.2 Create New Web Service
1. **Dashboard** → **New** → **Web Service**
2. **Connect Repository**: Select your CampusLearn repository
3. **Configure Build Settings**:
   - **Name**: `campuslearn-frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview` (for static hosting)
   - **Publish Directory**: `dist`

#### 2.3 Environment Variables in Render
Add these environment variables in Render dashboard:
```
VITE_API_URL = http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com
VITE_NODE_ENV = production
```

#### 2.4 Advanced Settings
- **Instance Type**: Free tier (or upgrade for production)
- **Auto-Deploy**: Yes (deploys on every push to main)
- **Pull Request Previews**: Enable (optional)

### Phase 3: Deployment Configuration
#### 3.1 Build Optimization
Update `frontend/package.json` scripts if needed:
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview --port $PORT --host 0.0.0.0",
    "dev": "vite"
  }
}
```

#### 3.2 CORS Configuration
Ensure AWS backend allows requests from Render domain:
- Update `CORS_ORIGINS` in ECS task definition to include Render URL
- Example: `http://localhost:5173,http://localhost:8080,http://localhost:5001,https://campuslearn-frontend.onrender.com`

#### 3.3 Health Check Setup
Render will automatically check:
- **Health Check Path**: `/` (root of your app)
- **Expected Response**: 200 OK with your React app

### Phase 4: Testing & Validation
#### 4.1 Local Testing
```bash
# Test production build locally
cd frontend
npm run build
npm run preview

# Verify API calls work
# Check network tab in browser dev tools
```

#### 4.2 Render Deployment Testing
1. **Initial Deploy**: Push to main branch
2. **Check Build Logs**: Verify build succeeds
3. **Test Live Site**: Visit Render URL
4. **API Integration**: Test login, forum, etc.
5. **Performance**: Check loading times

### Phase 5: Production Optimization
#### 5.1 Custom Domain (Optional)
1. **Render Dashboard** → **Settings** → **Custom Domains**
2. **Add Domain**: `yourdomain.com`
3. **DNS Configuration**: Point to Render
4. **SSL Certificate**: Automatic with Render

#### 5.2 Performance Optimization
```typescript
// vite.config.ts optimizations
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
```

#### 5.3 Monitoring & Analytics
- **Render Metrics**: Built-in performance monitoring
- **Error Tracking**: Consider Sentry integration
- **Analytics**: Google Analytics or similar

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### Build Failures
```bash
# Check Node version compatibility
node --version  # Should be 18+ 

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### API Connection Issues
1. **CORS Errors**: Update backend CORS_ORIGINS
2. **Network Errors**: Check AWS security groups
3. **SSL Issues**: Ensure HTTPS for production

#### Performance Issues
1. **Large Bundle Size**: Implement code splitting
2. **Slow Loading**: Enable compression in Render
3. **Memory Issues**: Upgrade Render plan if needed

### Debug Commands
```bash
# Local production test
npm run build && npm run preview

# Check build output
ls -la dist/

# Verify environment variables
echo $VITE_API_URL
```

## 📊 Expected Performance

### Render Free Tier Limits
- **Build Time**: 90 minutes/month
- **Bandwidth**: 100GB/month
- **Sleep**: 15 minutes after inactivity
- **Custom Domains**: Supported

### Performance Metrics
- **Initial Load**: < 3 seconds
- **API Response**: < 500ms (AWS backend)
- **Cold Start**: ~10-15 seconds (after sleep)
- **Hot Start**: < 2 seconds

## 🚀 Go-Live Checklist

### Pre-Deployment
- [ ] Frontend builds successfully locally
- [ ] Environment variables configured
- [ ] API integration tested
- [ ] CORS configured on backend
- [ ] GitHub repository connected to Render

### Deployment
- [ ] Initial deployment successful
- [ ] All pages load correctly
- [ ] Authentication works
- [ ] Forum functionality works
- [ ] Video features work
- [ ] Mobile responsiveness verified

### Post-Deployment
- [ ] Performance monitoring setup
- [ ] Error tracking configured
- [ ] Analytics implemented
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Backup strategy in place

## 🔄 CI/CD Pipeline

### Automatic Deployments
```yaml
# .github/workflows/frontend-deploy.yml (optional)
name: Frontend Deploy
on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Build
        run: cd frontend && npm run build
      # Render handles the actual deployment
```

## 📈 Scaling Considerations

### When to Upgrade Render Plan
- **High Traffic**: > 100GB bandwidth/month
- **Performance**: Need faster cold starts
- **Reliability**: Can't afford 15min sleep periods
- **Support**: Need priority support

### Alternative Solutions
- **Vercel**: Similar to Render, excellent for React
- **Netlify**: Great for static sites
- **AWS S3 + CloudFront**: Full AWS integration
- **DigitalOcean App Platform**: Alternative to Render

## 🎉 Success Metrics

### Technical KPIs
- **Uptime**: > 99.5%
- **Load Time**: < 3 seconds
- **API Response**: < 500ms
- **Error Rate**: < 1%

### User Experience
- **Mobile Performance**: Lighthouse score > 90
- **Accessibility**: WCAG compliance
- **SEO**: Meta tags and structured data
- **Progressive Web App**: Service worker implementation

## 📞 Support & Maintenance

### Render Support
- **Documentation**: [render.com/docs](https://render.com/docs)
- **Community**: Discord server
- **Status Page**: [status.render.com](https://status.render.com)

### Monitoring Tools
- **Render Dashboard**: Built-in metrics
- **Google PageSpeed**: Performance monitoring
- **GTmetrix**: Detailed performance analysis
- **Sentry**: Error tracking and performance monitoring

---

## 🎯 Quick Start Commands

```bash
# 1. Configure environment
cd frontend
echo "VITE_API_URL=http://campuslearn-alb-322147549.af-south-1.elb.amazonaws.com" > .env.production

# 2. Test build locally
npm run build
npm run preview

# 3. Push to GitHub (triggers Render deployment)
git add .
git commit -m "Configure frontend for Render deployment"
git push origin main

# 4. Monitor deployment in Render dashboard
```

---

**Next Steps**: Follow Phase 1-2 to get started, then proceed through the remaining phases based on your needs.
