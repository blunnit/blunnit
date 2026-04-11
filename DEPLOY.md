# BLUNNIT Deployment Guide
## From Code to Live Product

This guide walks you through deploying BLUNNIT step by step. No guesswork.

---

## Step 1: Set Up Your Accounts

You need four accounts. All free to start.

### GitHub (github.com)
- Sign up if you don't have one
- You'll push the BLUNNIT code here
- Vercel connects to GitHub to auto-deploy

### Vercel (vercel.com)
- Sign up with your GitHub account
- This hosts the app. Free tier is generous.
- Handles SSL, custom domains, serverless functions

### Supabase (supabase.com)
- Sign up and create a new project
- Name it "blunnit"
- Choose a strong database password and save it somewhere safe
- Pick the region closest to you (West US for San Diego)

### Anthropic (console.anthropic.com)
- Sign up and add a payment method
- You'll pay per API call (roughly $0.01-0.03 per reflection)
- Generate an API key

---

## Step 2: Set Up Supabase Database

1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Paste the entire contents of `lib/schema.sql` and click "Run"
4. This creates all your tables, security policies, and indexes

5. Go to "Authentication" > "Providers"
6. Make sure "Email" is enabled
7. Turn off "Confirm email" for now (easier for testing, turn it on later)

8. Go to "Project Settings" > "API"
9. Copy these values (you'll need them in Step 4):
   - Project URL
   - anon/public key
   - service_role key (keep this secret)

---

## Step 3: Set Up Stripe

1. Go to dashboard.stripe.com
2. Create a product called "BLUNNIT Full Access"
3. Add a price: $9.99/month recurring
4. Copy the Price ID (starts with price_)
5. Go to Developers > API Keys
6. Copy the Secret Key

(Stripe webhook setup comes after deployment)

---

## Step 4: Push Code to GitHub

1. Install Git if you don't have it
2. Open Terminal and navigate to the blunnit folder
3. Run these commands:

```bash
cd blunnit
git init
git add .
git commit -m "Initial BLUNNIT build"
```

4. Go to github.com and create a new repository called "blunnit"
5. Follow GitHub's instructions to push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/blunnit.git
git branch -M main
git push -u origin main
```

---

## Step 5: Deploy on Vercel

1. Go to vercel.com and click "Add New Project"
2. Import your "blunnit" GitHub repository
3. Vercel will auto-detect Next.js
4. Before deploying, add your environment variables:

Click "Environment Variables" and add each one:

```
NEXT_PUBLIC_SUPABASE_URL = (from Supabase Step 8)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (from Supabase Step 8)
SUPABASE_SERVICE_ROLE_KEY = (from Supabase Step 8)
ANTHROPIC_API_KEY = (from Anthropic)
STRIPE_SECRET_KEY = (from Stripe)
NEXT_PUBLIC_STRIPE_PRICE_ID = (from Stripe Step 4)
NEXT_PUBLIC_APP_URL = https://your-vercel-url.vercel.app
```

5. Click "Deploy"
6. Wait for the build to complete
7. Your app is live at the URL Vercel gives you

---

## Step 6: Connect Your Domain

1. In Vercel, go to your project > Settings > Domains
2. Add "blunnit.com" or "mirror.blunnit.com"
3. Vercel will give you DNS records to add
4. Go to your domain registrar and add those records
5. Wait for DNS propagation (can take up to 48 hours, usually minutes)
6. Update NEXT_PUBLIC_APP_URL in Vercel environment variables

---

## Step 7: Add Your Logo

1. Export your pointed heart logo as PNG
2. Save it as `public/logo.png` in the project
3. Also create icon-192.png and icon-512.png (square versions for PWA)
4. Push to GitHub, Vercel auto-redeploys

---

## Step 8: Set Up Stripe Webhooks (after deployment)

1. In Stripe Dashboard > Developers > Webhooks
2. Add endpoint: https://your-domain.com/api/stripe-webhook
3. Select events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
4. Copy the webhook signing secret
5. Add STRIPE_WEBHOOK_SECRET to Vercel environment variables

---

## Step 9: Test Everything

1. Visit your live URL
2. Confirm the disclaimer screen appears
3. Accept and verify the home screen loads
4. Write something and confirm the AI reflects
5. Try all three confrontation levels
6. Test the safety modal
7. Try the crisis response (mention self-harm, verify it responds appropriately)

---

## Monthly Costs at Launch

- Vercel: $0 (free tier)
- Supabase: $0 (free tier, up to 50K monthly active users)
- Anthropic API: ~$0.01-0.03 per reflection (usage-based)
- Stripe: 2.9% + $0.30 per transaction (only when you have paying users)
- Domain: ~$12/year

Total: essentially $0 until you have real usage.

---

## What to Do Next

1. Deploy and test
2. Share with 5-10 people you trust for feedback
3. Iterate on the AI's reflections based on real usage
4. Start creating TikTok content
5. Launch publicly when it feels right

---

## File Structure Reference

```
blunnit/
  app/
    api/
      reflect/
        route.ts          <- AI reflection endpoint
    globals.css           <- Styles
    layout.tsx            <- Root layout + metadata
    page.tsx              <- Main app (disclaimer, home, mirror)
  lib/
    constants.ts          <- Tiers, confrontation levels
    daily-prompts.ts      <- 100 prompts + date rotation
    schema.sql            <- Database schema (run in Supabase)
    supabase-browser.ts   <- Client-side Supabase
    supabase-server.ts    <- Server-side Supabase
    system-prompt.ts      <- The soul of the mirror
  public/
    manifest.json         <- PWA manifest
    logo.png              <- Your logo (add this)
    icon-192.png          <- PWA icon (add this)
    icon-512.png          <- PWA icon (add this)
  .env.example            <- Environment variable template
  next.config.js
  package.json
  tsconfig.json
```
