# Vercel Production Setup Guide

This guide walks you through setting up OstseeSichtung for production deployment on Vercel.

## 1. Environment Variables Setup

In your Vercel dashboard, add the following environment variables:

### Required Database Variables
```
DATABASE_URL=postgresql://username:password@hostname:port/database
NODE_ENV=production
STORAGE_PROVIDER=vercel-blob
```

### Storage Configuration
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here
```

### Application Settings
```
PUBLIC_SITE_URL=https://your-app.vercel.app
SESSION_SECRET=your-random-secret-key-here
LOG_LEVEL=info
```

## 2. Database Options

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Select your project
3. Go to Storage tab
4. Click "Create Database" → "Postgres"
5. Follow the setup wizard
6. Vercel will automatically add DATABASE_URL to your environment variables

### Option B: External PostgreSQL with PostGIS
Popular options include:
- **Neon** (neon.tech) - Free tier available, supports PostGIS
- **Supabase** (supabase.com) - PostgreSQL with PostGIS extensions
- **Railway** (railway.app) - Simple PostgreSQL hosting
- **DigitalOcean Managed PostgreSQL**

#### Required Extensions
Your database must support:
- PostGIS (for geographic data)
- UUID extensions

## 3. Database Schema Setup

After setting up your database, run the schema migration:

```bash
# Install dependencies locally
npm install

# Push schema to production database
npm run db:push
```

## 4. Vercel Blob Storage Setup

1. In Vercel dashboard, go to Storage tab
2. Create a new Blob store
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add it to your environment variables

## 5. Deploy Application

### Automatic Deployment
- Push to main branch triggers automatic deployment
- Monitor deployment in Vercel dashboard

### Manual Deployment
```bash
npx vercel --prod
```

## 6. Verify Deployment

1. Check deployment status in Vercel dashboard
2. Test the application URL
3. Verify database connection
4. Test file upload functionality

## 7. Security Considerations

- [ ] Verify CSP headers are working
- [ ] Test GDPR compliance features
- [ ] Ensure environment variables are secure
- [ ] Check that local storage is not exposed

## 8. Monitoring & Logging

Vercel provides built-in:
- Function logs
- Performance monitoring
- Error tracking

## 9. Custom Domain (Optional)

1. Go to Domains tab in Vercel dashboard
2. Add your custom domain
3. Configure DNS records as instructed

## Troubleshooting

### Common Issues:

**Build Errors:**
- Check environment variables are set
- Verify database connection string
- Review function logs in Vercel dashboard

**Database Connection:**
- Ensure DATABASE_URL includes PostGIS-enabled database
- Check firewall settings for external databases
- Verify SSL requirements

**File Upload Issues:**
- Confirm BLOB_READ_WRITE_TOKEN is set
- Check Vercel Blob storage limits
- Verify STORAGE_PROVIDER=vercel-blob

For more help, check the Vercel documentation or project issues on GitHub.