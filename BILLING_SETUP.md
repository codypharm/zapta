# Billing System Setup Guide

## Prerequisites

1. **Stripe Account**: Create a free account at https://stripe.com
2. **Test Mode**: Use Stripe's test mode during development

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

## Step 2: Create Stripe Products

Create 4 products in Stripe Dashboard > Products:

### Product 1: Starter
- Name: `Starter`
- Price: `$19/month`
- Billing Period: Monthly
- Copy the **Price ID** (starts with `price_`)

### Product 2: Pro
- Name: `Pro`
- Price: `$79/month`
- Billing Period: Monthly
- Copy the **Price ID**

### Product 3: Business
- Name: `Business` 
- Price: `$199/month`
- Billing Period: Monthly
- Copy the **Price ID**

### Product 4: Enterprise
- Name: `Enterprise`
- Price: `$499/month`
- Billing Period: Monthly
- Copy the **Price ID**

## Step 3: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE

# Stripe Price IDs
STRIPE_PRICE_ID_STARTER=price_YOUR_ID_HERE
STRIPE_PRICE_ID_PRO=price_YOUR_ID_HERE  
STRIPE_PRICE_ID_BUSINESS=price_YOUR_ID_HERE
STRIPE_PRICE_ID_ENTERPRISE=price_YOUR_ID_HERE

# Webhook Secret (Step 4)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

## Step 4: Set Up Webhooks (For Production)

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Step 5: Run Database Migration

Apply the billing tables migration in Supabase:

```sql
-- Run the SQL in: supabase/migrations/20250124_add_billing_tables.sql
```

Or using Supabase CLI:

```bash
supabase db reset
```

## Step 6: Restart Dev Server

```bash
npm run dev
```

## Step 7: Test the Integration

1. Visit `/pricing` - View all plans
2. Visit `/settings/billing` - View your subscription
3. Click "Upgrade Plan" - Test checkout flow
4. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

## Test Card Numbers

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0027 6000 3184`

## Troubleshooting

### Pages show 404
- Make sure dev server is running
- Check for TypeScript errors: `npx tsc --noEmit`

### "Neither apiKey nor config.authenticator provided"
- Add `STRIPE_SECRET_KEY` to `.env.local`
- Restart dev server

### Checkout fails
- Verify Price IDs are correct
- Check Stripe Dashboard > Events for errors

## Production Checklist

- [ ] Switch to live mode API keys
- [ ] Set up production webhook endpoint
- [ ] Configure Stripe Customer Portal settings
- [ ] Set up billing alerts
- [ ] Test subscription lifecycle (upgrade, downgrade, cancel)
- [ ] Set up usage-based billing tracking

## Support

For Stripe-related issues, check:
- Stripe Dashboard > Logs
- Stripe Dashboard > Events
- Browser console for errors
