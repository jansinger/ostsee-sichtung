# Vercel Deployment Guide

## Prerequisites

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Set up PostgreSQL database (Vercel Postgres, Railway, Supabase, etc.)
4. Set up Vercel Blob storage for file uploads

## Environment Variables

Set the following environment variables in your Vercel project:

### Database
```bash
DATABASE_URL="postgresql://username:password@hostname:port/database"
```

### Storage (Vercel Blob)
```bash
STORAGE_PROVIDER="vercel-blob"
BLOB_READ_WRITE_TOKEN="your-blob-token-here"
```

### Optional
```bash
NODE_ENV="production"
LOG_LEVEL="info"
```

## Deployment Steps

### 1. Local Setup
```bash
# Clone and install dependencies
git clone your-repo
cd sichtungen-webapp
npm install

# Set up local environment
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
npm run db:push
```

### 2. Vercel Configuration

The project includes a `vercel.json` file with optimized settings:

- **Build**: Uses SvelteKit adapter-vercel
- **Functions**: Configured for file uploads (30s timeout) and file serving (60s)
- **Headers**: Security headers and caching policies
- **Redirects**: SEO-friendly URL handling
- **Crons**: Cleanup jobs for temporary files

### 3. Deploy

```bash
# Link to Vercel project (first time only)
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add STORAGE_PROVIDER
vercel env add BLOB_READ_WRITE_TOKEN

# Deploy
vercel --prod
```

## Storage Configuration

### Vercel Blob (Recommended for Vercel)

1. Enable Vercel Blob in your project dashboard
2. Generate a read/write token
3. Set `STORAGE_PROVIDER="vercel-blob"`
4. Set `BLOB_READ_WRITE_TOKEN="your-token"`

### Benefits:
- ✅ Seamless integration with Vercel
- ✅ Global CDN distribution
- ✅ Automatic scaling
- ✅ Built-in caching

### Local Development

For local development, the app automatically uses local file storage:
- Files stored in `./uploads/` directory
- Served via SvelteKit static file handling

## Performance Optimizations

### 1. Static Assets
- Self-hosted fonts (no Google Fonts dependency)
- Optimized TailwindCSS bundle
- Image optimization for species photos

### 2. Caching
- Static assets: 1 year cache
- Upload files: Immutable caching
- API responses: Appropriate cache headers

### 3. Bundle Size
- Tree-shaken dependencies
- Minimal JavaScript bundle
- CSS-in-JS avoided where possible

## Monitoring & Logging

The app uses structured logging with Pino:
- Production: JSON logs for better processing
- Development: Pretty-printed logs
- Configurable log levels via `LOG_LEVEL`

## Security Considerations

### Headers
- CSP configured for iframe embedding
- HSTS, XSS protection, MIME sniffing protection
- Frame ancestors allow specific domains

### File Uploads
- Type validation (images/videos only)
- Size limits (100MB max)
- Virus scanning (recommended to add)
- Secure filename sanitization

### Database
- Parameterized queries (SQL injection protection)
- Connection pooling
- SSL required in production

## Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   # Test database connection
   npm run db:studio
   ```

2. **Build Errors**
   ```bash
   # Clear build cache
   rm -rf .svelte-kit node_modules
   npm install
   npm run build
   ```

3. **Storage Issues**
   ```bash
   # Check environment variables
   vercel env ls
   ```

### Performance Monitoring

Monitor your deployment:
- Vercel Analytics dashboard
- Function execution times
- Database query performance
- Storage usage and costs

## Scaling Considerations

### Database
- Connection pooling (already configured)
- Read replicas for heavy read workloads
- Query optimization

### Storage
- Vercel Blob automatically scales
- Consider CDN for global distribution
- Image optimization pipeline

### Compute
- Function regions close to users
- Edge functions for static content
- Database region matching

## Cost Optimization

### Vercel
- Optimize function execution time
- Use edge functions where possible
- Monitor bandwidth usage

### Database
- Regular query optimization
- Proper indexing
- Archive old data

### Storage
- Cleanup unused files
- Image compression
- CDN usage optimization