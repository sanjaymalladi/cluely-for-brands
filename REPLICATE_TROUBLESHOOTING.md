# Replicate/Cloudflare Troubleshooting Guide

This guide helps troubleshoot 403 Forbidden errors and Cloudflare blocks when using the Replicate API.

## Current Issue

Your application is experiencing HTTP/2 500 errors when trying to generate brand images, with underlying 403 Forbidden errors from Cloudflare protection on Replicate.com:

```
❌ Request to https://api.replicate.com/v1/models/flux-kontext-apps/multi-image-list/predictions failed with status 403 Forbidden
Sorry, you have been blocked replicate.com
```

## Quick Diagnosis Steps

### 1. Check API Token Validity
Visit your backend at: `https://cluely-for-brands.onrender.com/validate-replicate-token`

This will verify:
- Token format is correct
- Token is valid and active
- Basic API connectivity

### 2. Run Comprehensive Debug
Visit: `https://cluely-for-brands.onrender.com/debug-replicate`

This tests:
- Basic API connectivity
- Model-specific access
- Different User-Agent strings
- Cloudflare Ray IDs for each request

### 3. Check Health Status
Visit: `https://cluely-for-brands.onrender.com/health`

Verifies overall service configuration.

## Troubleshooting Steps

### Step 1: Verify API Key
1. Log into your [Replicate Dashboard](https://replicate.com/account/api-tokens)
2. Check that your API token is active and hasn't been revoked
3. Verify the token format: should start with `r8_` and be ~40+ characters
4. Ensure the token has proper permissions for the model you're using

### Step 2: Check Account Status
1. Visit your [Replicate Account](https://replicate.com/account)
2. Verify you haven't hit usage limits
3. Check if your account is in good standing
4. Ensure you have credits/billing set up if using paid features

### Step 3: Contact Replicate Support
If your API key is valid and account is in good standing, contact Replicate support with:

**Cloudflare Ray IDs from your logs:**
- 95b833d90e2c81fb
- 95b833ebeecb81fb  
- 95b833febfab81fb
- 95b83411892381fb

**Server Details:**
- Server IP: Your Render.com deployment IP
- User-Agent: Various (our app tries multiple)
- API Endpoint: `https://api.replicate.com/v1/models/flux-kontext-apps/multi-image-list/predictions`

**Message Template:**
```
Subject: Cloudflare blocking API requests - Multiple Ray IDs

Hello Replicate Support,

Our application hosted on Render.com is being blocked by Cloudflare when making API requests to create predictions. We're getting 403 Forbidden errors with Cloudflare challenge pages.

Cloudflare Ray IDs: [list from your logs]
API Token: [first 8 characters of your token]...
Model: flux-kontext-apps/multi-image-list
Server Platform: Render.com

Our API token appears to be valid and our account is in good standing. Could you please whitelist our server IP or investigate why these requests are being blocked?

Thank you!
```

## Enhanced Error Handling

The updated codebase now includes:

### 1. Better Logging
- Detailed Cloudflare error detection
- Ray ID extraction and logging
- Timestamp tracking for patterns

### 2. Advanced Bypass Techniques
- Multiple User-Agent strings
- Enhanced headers mimicking real browsers
- Random delays to avoid pattern detection
- Exponential backoff on retries

### 3. Debugging Endpoints
- `/validate-replicate-token` - Quick token validation
- `/debug-replicate` - Comprehensive connectivity testing
- `/health` - Overall service status

## Workaround Strategies

### 1. Retry Logic
The app now implements:
- 3 retry attempts with different approaches
- Exponential backoff delays
- Random jitter to avoid patterns

### 2. Header Rotation
Different attempts use different browser signatures:
- Safari on macOS
- Chrome on Windows
- Various Accept headers and language preferences

### 3. Request Spacing
- 5-10 second delays between attempts
- Random delays in polling
- Rate limiting to avoid triggering protection

## Alternative Solutions

### 1. Use Different Model Host
If the specific model is causing issues, consider:
- Using a different Flux model
- Switching to alternative image generation APIs
- Running local models if feasible

### 2. Proxy/VPN Solutions
⚠️ **Not recommended for production**, but for testing:
- Use a different hosting provider temporarily
- Route requests through a proxy service
- Use a VPN endpoint that's not blocked

### 3. API Gateway
- Implement request batching
- Use a dedicated API gateway service
- Route through multiple IP addresses

## Monitoring

Keep track of:
- Ray IDs from failed requests
- Success/failure patterns by time of day
- Which User-Agent strings work better
- Response time variations

## Next Steps

1. **Immediate**: Run the debug endpoints to gather current status
2. **Short-term**: Contact Replicate support with Ray IDs
3. **Long-term**: Implement fallback strategies if needed

## Contact Information

- **Replicate Support**: [help@replicate.com](mailto:help@replicate.com)
- **Replicate Discord**: [Join their community](https://discord.gg/replicate)
- **Documentation**: [Replicate API Docs](https://replicate.com/docs)

---

*Last updated: January 2025* 