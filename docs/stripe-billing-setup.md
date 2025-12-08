# Stripe Billing Setup Guide

This guide walks you through setting up Stripe billing for Zapta. Follow these steps to enable subscription management, payments, and plan upgrades.

---

## Prerequisites

- A Stripe account (create one at [stripe.com](https://stripe.com))
- Access to your Zapta `.env.local` file
- Your production domain (for webhooks)

---

## Step 1: Create Stripe Account & Get API Keys

### 1.1 Create Account
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or log in
3. Complete account verification (for live payments)

### 1.2 Get API Keys
1. Go to **Developers → API Keys**
2. Copy both keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

> [!IMPORTANT]
> Use **test keys** (`pk_test_`, `sk_test_`) for development. Switch to **live keys** for production.

### 1.3 Add to Environment Variables

```bash
# .env.local
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
```

---

## Step 2: Create Products & Prices

### 2.1 Create Products
Go to **Products → Add Product** for each plan:

| Product Name | Description |
|-------------|-------------|
| **Zapta Starter** | For solo entrepreneurs |
| **Zapta Pro** | For growing businesses |
| **Zapta Business** | For mid-size companies |
| **Zapta Enterprise** | For large organizations |

### 2.2 Create Prices for Each Product

For each product, create a **recurring price**:

| Plan | Monthly Price | Billing Period |
|------|--------------|----------------|
| Starter | $19/month | Monthly |
| Pro | $79/month | Monthly |
| Business | $199/month | Monthly |
| Enterprise | $499/month | Monthly |

**How to create a price:**
1. Click on the product
2. Click **Add Price**
3. Enter the amount
4. Select **Recurring**
5. Set billing period to **Monthly**
6. Click **Add Price**

### 2.3 Get Price IDs

After creating prices, copy each **Price ID** (starts with `price_`):

1. Click on the product
2. Click on the price row
3. Copy the **Price ID** from the sidebar

### 2.4 Add Price IDs to Environment Variables

```bash
# .env.local
STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxxx
STRIPE_PRICE_ID_BUSINESS=price_xxxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxxx
```

---

## Step 3: Set Up Webhooks

Webhooks allow Stripe to notify your app about subscription changes.

### 3.1 Create Webhook Endpoint

1. Go to **Developers → Webhooks**
2. Click **Add Endpoint**
3. Enter your endpoint URL:
   - **Local testing**: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add Endpoint**

### 3.2 Get Webhook Secret

After creating the endpoint:
1. Click on the endpoint
2. Click **Reveal** under Signing Secret
3. Copy the secret (starts with `whsec_`)

### 3.3 Add Webhook Secret to Environment Variables

```bash
# .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxx
```

---

## Step 4: Configure Customer Portal

The Customer Portal lets users manage their subscriptions (upgrade, downgrade, cancel).

### 4.1 Enable Customer Portal

1. Go to **Settings → Billing → Customer Portal**
2. Click **Activate Portal**

### 4.2 Configure Portal Settings

Enable these options:

| Setting | Value |
|---------|-------|
| **Allow customers to switch plans** | ✅ Enabled |
| **Allow customers to cancel** | ✅ Enabled |
| **Proration behavior** | Always prorate |
| **Cancel at period end** | ✅ Enabled |
| **Allow customers to update payment methods** | ✅ Enabled |
| **Show invoice history** | ✅ Enabled |

### 4.3 Add Your Products

1. In the Portal settings, click **Products**
2. Add all your products (Starter, Pro, Business, Enterprise)
3. This allows customers to switch between plans

### 4.4 Customize Appearance (Optional)

1. Upload your logo
2. Set brand color
3. Add terms of service / privacy policy links

---

## Step 5: Complete Environment Variables

Your final `.env.local` should include:

```bash
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs (from Step 2)
STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxxx
STRIPE_PRICE_ID_BUSINESS=price_xxxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxxx

# Stripe Webhook Secret (from Step 3)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxx

# Your app URL (required for redirects)
NEXT_PUBLIC_URL=https://yourdomain.com
```

---

## Step 6: Test the Flow

### 6.1 Test Checkout
1. Log in to your app
2. Go to `/pricing` or `/settings/billing`
3. Click on a paid plan
4. Complete checkout with a **test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

### 6.2 Verify Webhook
Check your terminal/logs for:
```
[Stripe Webhook] checkout.session.completed
[Stripe Webhook] Subscription updated for tenant: xxx
```

### 6.3 Test Customer Portal
1. Go to `/settings/billing`
2. Click **Manage Subscription**
3. Verify you can:
   - Change plans
   - Update payment method
   - Cancel subscription

---

## Step 7: Go Live

When ready for production:

### 7.1 Switch to Live Keys
1. In Stripe Dashboard, click **Developers → API Keys**
2. Copy the **live** keys (not test keys)
3. Update `.env.local` (or production env vars)

### 7.2 Create Live Webhook
1. Create a new webhook endpoint with your production URL
2. Update `STRIPE_WEBHOOK_SECRET` with the live webhook secret

### 7.3 Create Live Products/Prices
1. Create the same products and prices in live mode
2. Update all `STRIPE_PRICE_ID_*` environment variables

> [!CAUTION]
> Never commit API keys to version control. Use environment variables.

---

## Testing Locally with ngrok

For local webhook testing:

```bash
# Install ngrok
brew install ngrok

# Authenticate (one-time, get token from ngrok.com)
ngrok config add-authtoken YOUR_AUTHTOKEN

# Start tunnel
ngrok http 3000
```

Copy the HTTPS URL and:
1. Update your Stripe webhook endpoint to use the ngrok URL
2. Update `NEXT_PUBLIC_URL` in `.env.local`

---

## Troubleshooting

### Webhook not receiving events
1. Check the webhook URL is correct
2. Verify the webhook secret matches
3. Check Stripe Dashboard → Webhooks → Logs for errors

### Subscription not updating in database
1. Check webhook logs in your terminal
2. Verify `tenant_id` is in the subscription metadata
3. Check Supabase for the subscription record

### Customer Portal not showing plans
1. Ensure products are added to the Portal settings
2. Verify the customer has a subscription first

---

## Quick Reference: Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_PUBLISHABLE_KEY` | Public key for frontend | `pk_test_xxx` |
| `STRIPE_SECRET_KEY` | Secret key for backend | `sk_test_xxx` |
| `STRIPE_PRICE_ID_STARTER` | Price ID for Starter plan | `price_xxx` |
| `STRIPE_PRICE_ID_PRO` | Price ID for Pro plan | `price_xxx` |
| `STRIPE_PRICE_ID_BUSINESS` | Price ID for Business plan | `price_xxx` |
| `STRIPE_PRICE_ID_ENTERPRISE` | Price ID for Enterprise plan | `price_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_xxx` |
| `NEXT_PUBLIC_URL` | Your app's base URL | `https://zapta.com` |

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/billing/actions.ts` | Server actions for checkout & portal |
| `lib/billing/plans.ts` | Plan limits & pricing config |
| `app/api/webhooks/stripe/route.ts` | Webhook handler |
| `components/billing/upgrade-button.tsx` | Upgrade button component |
| `components/billing/manage-subscription-button.tsx` | Portal button |
| `app/(dashboard)/settings/billing/page.tsx` | Billing settings page |
| `app/pricing/page.tsx` | Public pricing page |

---

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Webhook Events Reference](https://stripe.com/docs/api/events)
