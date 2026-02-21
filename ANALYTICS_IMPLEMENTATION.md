# Vercel Web Analytics Implementation

This project has been configured with Vercel Web Analytics to track visitor behavior and page views.

## What Was Added

### 1. Comprehensive Documentation
- `VERCEL_WEB_ANALYTICS_GUIDE.md` - A complete guide covering all frameworks and implementation methods for Vercel Web Analytics

### 2. Analytics Implementation
Analytics tracking scripts have been added to the following HTML files:
- `index.html` - Main website page
- `admin.html` - Admin panel page

## How It Works

The following script has been added to the `<head>` section of each HTML file:

```html
<!-- Vercel Web Analytics -->
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

This implementation:
- Initializes the analytics queue before the main script loads
- Loads the Vercel analytics script asynchronously to not block page rendering
- Automatically tracks page views when users visit your site
- Works without requiring npm packages since this is a plain HTML site

## Next Steps

To start collecting analytics data:

1. **Enable Analytics in Vercel Dashboard**
   - Go to your project on Vercel
   - Navigate to the Analytics tab
   - Click "Enable" to activate Web Analytics

2. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

3. **Verify Implementation**
   - After deployment, visit your site
   - Open browser DevTools → Network tab
   - Look for a request to `/_vercel/insights/view`
   - If present, analytics is working correctly!

4. **View Your Data**
   - Return to the Vercel Dashboard
   - Select your project
   - Click the Analytics tab
   - After some visitor activity, you'll see analytics data

## For Framework-Based Projects

If you're using a JavaScript framework (Next.js, React, Vue, etc.), refer to `VERCEL_WEB_ANALYTICS_GUIDE.md` for framework-specific implementation using the `@vercel/analytics` package.

## Privacy Note

Vercel Web Analytics is privacy-friendly and GDPR compliant:
- No cookies are used
- No personal data is collected
- IP addresses are anonymized
- Complies with privacy regulations

## Additional Resources

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Custom Events](https://vercel.com/docs/analytics/custom-events)
- [Privacy Policy](https://vercel.com/docs/analytics/privacy-policy)
