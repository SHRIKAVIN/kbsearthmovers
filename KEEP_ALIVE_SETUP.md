# 🔄 Keep-Alive Setup Guide

This guide explains how to set up the free cron job solution to keep your Supabase database active.

## 📋 Overview

Since Vercel's cron jobs require a paid plan, we're using **GitHub Actions** (completely free) to periodically ping your Supabase database and prevent it from pausing after 15 days of inactivity.

## 🚀 Setup Instructions

### Step 1: Deploy Your API Endpoint

Make sure your Vercel deployment includes the `/api/keep-alive` endpoint. The endpoint is already created at `api/keep-alive.ts`.

### Step 2: Configure GitHub Actions

1. **Go to your GitHub repository**
   - Navigate to: `https://github.com/SHRIKAVIN/kbsearthmovers`

2. **Add Repository Secret (Optional but Recommended)**
   - Go to: **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `VERCEL_DEPLOYMENT_URL`
   - Value: Your Vercel deployment URL (e.g., `https://kbsearthmovers.vercel.app`)
   - Click **Add secret**

   > **Note:** If you don't set this secret, the workflow will use the default URL from the workflow file. Make sure to update it if your URL is different.

### Step 3: Verify the Workflow

1. **Check the workflow file**
   - The workflow is located at: `.github/workflows/keep-alive.yml`
   - It's configured to run every 6 hours automatically

2. **Test manually (Optional)**
   - Go to: **Actions** tab in your GitHub repository
   - Select **Keep Supabase Database Active** workflow
   - Click **Run workflow** → **Run workflow** button
   - This will trigger the workflow immediately to test it

### Step 4: Monitor the Workflow

- Go to the **Actions** tab in your GitHub repository
- You'll see workflow runs with timestamps
- Each successful run means your database was pinged successfully

## ⚙️ Configuration

### Schedule

The workflow runs every 6 hours (4 times per day):
- 00:00 UTC
- 06:00 UTC
- 12:00 UTC
- 18:00 UTC

This is more than sufficient to prevent Supabase from pausing (which happens after 15 days of inactivity).

### Customizing the Schedule

To change the schedule, edit `.github/workflows/keep-alive.yml` and modify the cron expression:

```yaml
- cron: '0 */6 * * *'  # Every 6 hours
- cron: '0 0 * * *'    # Once daily at midnight UTC
- cron: '0 */12 * * *'  # Every 12 hours
```

Cron format: `minute hour day month day-of-week`

## 🧪 Testing

### Test the API Endpoint Manually

Visit your keep-alive endpoint in a browser:
```
https://your-app.vercel.app/api/keep-alive
```

You should see a JSON response like:
```json
{
  "success": true,
  "message": "Database keep-alive successful",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": "Connection verified"
}
```

### Test the GitHub Action

1. Go to **Actions** tab
2. Click **Keep Supabase Database Active**
3. Click **Run workflow** → **Run workflow**
4. Wait for it to complete and check the logs

## 🔍 Troubleshooting

### Issue: Workflow fails with 404 or connection error

**Solution:**
- Verify your Vercel deployment URL is correct
- Make sure the `/api/keep-alive` endpoint is deployed
- Check that environment variables are set in Vercel

### Issue: Workflow runs but database still pauses

**Solution:**
- Verify the API endpoint is actually querying the database
- Check Vercel function logs for errors
- Ensure Supabase credentials are correct in Vercel environment variables

### Issue: Can't find the workflow

**Solution:**
- Make sure `.github/workflows/keep-alive.yml` is committed and pushed
- Check that GitHub Actions is enabled for your repository

## 📊 Monitoring

- **GitHub Actions Logs**: Check the Actions tab for execution history
- **Vercel Logs**: Check your Vercel dashboard for API function logs
- **Supabase Dashboard**: Monitor database activity

## 💡 Alternative Free Solutions

If GitHub Actions doesn't work for you, here are other free alternatives:

1. **cron-job.org** (Free tier available)
   - Sign up at https://cron-job.org
   - Create a new cron job
   - Set URL: `https://your-app.vercel.app/api/keep-alive`
   - Set schedule: Every 6 hours

2. **UptimeRobot** (Free tier: 50 monitors)
   - Sign up at https://uptimerobot.com
   - Add a new monitor
   - Set URL: `https://your-app.vercel.app/api/keep-alive`
   - Set interval: 5 minutes (free tier minimum)

3. **EasyCron** (Free tier available)
   - Sign up at https://www.easycron.com
   - Create a cron job
   - Set your endpoint URL and schedule

## ✅ Success Indicators

You'll know it's working when:
- ✅ GitHub Actions shows successful workflow runs
- ✅ The API endpoint returns `200 OK` status
- ✅ Your Supabase database stays active (doesn't pause)

---

**Need help?** Check the workflow logs in the GitHub Actions tab for detailed error messages.
