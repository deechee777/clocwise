# Deployment Guide for Clocwise

## Quick Deploy Options

### 1. Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Or use the Vercel Dashboard:**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### 2. Netlify

1. Upload the `public/` folder to Netlify
2. Set up form handling if needed
3. Configure redirects in `public/_redirects` (optional)

### 3. Static Hosting (GitHub Pages, etc.)

Simply upload the contents of the `public/` folder to your static hosting provider.

## Environment Variables for Production

Make sure to set these in your hosting platform:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL from `SUPABASE_SETUP.md` in your Supabase SQL Editor
3. Get your project URL and anon key from Settings > API
4. Update your environment variables

## Custom Domain

- **Vercel**: Add domain in project settings
- **Netlify**: Configure custom domain in site settings
- **Others**: Follow your provider's documentation

## Monitoring

- **Supabase**: Built-in analytics and monitoring
- **Vercel**: Function logs and analytics
- **Netlify**: Site analytics available

## Security Notes

- Supabase anon keys are safe to expose in frontend
- Row Level Security (RLS) protects your data
- HTTPS is enforced by default on all platforms
- Consider setting up CORS policies if needed

## Troubleshooting

### Common Issues:
1. **404 on routes**: Configure redirects for SPA routing
2. **CORS errors**: Check Supabase CORS settings
3. **Auth not working**: Verify Supabase project URL and keys
4. **Database errors**: Ensure RLS policies are set up correctly

### Support:
- Check Supabase documentation
- Verify environment variables
- Test locally first with `npm run dev`