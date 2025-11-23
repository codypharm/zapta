# HubSpot OAuth 2.0 Setup Guide

## Prerequisites

You need to create a HubSpot app to get OAuth credentials:

### 1. Create HubSpot App

1. Go to [HubSpot Developer Apps](https://app.hubspot.com/developers/)
2. Click "Create app"
3. Fill in app details:
   - App name: "Zapta AI Agents"
   - Description: "AI agents for CRM automation"

### 2. Configure OAuth

1. Navigate to "Auth" tab in your app settings
2. Set **Redirect URL**: 
   ```
   http://localhost:3000/api/integrations/hubspot/callback
   ```
   (Update to your production URL when deploying)

3. Enable required **Scopes**:
   ```
   crm.objects.contacts.read
   crm.objects.contacts.write
   crm.objects.companies.read
   crm.objects.companies.write
   crm.objects.deals.read
   crm.objects.deals.write
   ```

4. Copy your credentials:
   - **Client ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Client Secret**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 3. Add Environment Variables

Add to your `.env.local`:

```bash
# HubSpot OAuth Configuration
HUBSPOT_CLIENT_ID=your_client_id_here
HUBSPOT_CLIENT_SECRET=your_client_secret_here
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/integrations/hubspot/callback
```

**For production**, update `HUBSPOT_REDIRECT_URI` to your live domain:
```bash
HUBSPOT_REDIRECT_URI=https://yourdomain.com/api/integrations/hubspot/callback
```

### 4. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## How It Works

### OAuth Flow

1. **User clicks "Connect HubSpot"**
   - Redirects to `/api/integrations/hubspot/auth`
   - Creates CSRF state token with tenant_id

2. **Authorization Screen**
   - User sees HubSpot OAuth consent screen
   - Asks permission for CRM access
   - User clicks "Allow"

3. **Callback**
   - HubSpot redirects to `/api/integrations/hubspot/callback`
   - Exchange authorization code for access + refresh tokens
   - Encrypt and store tokens in database
   - Redirect to integrations page

4. **Usage**
   - Agents can now create contacts, deals, companies
   - Tokens auto-refresh when expired

---

## Testing

### 1. Test OAuth Connection

1. Navigate to `http://localhost:3000/integrations`
2. Find "HubSpot" card
3. Click "+ Connect"
4. You'll be redirected to HubSpot
5. Sign in to your HubSpot account
6. Click "Allow" to grant permissions
7. You should be redirected back with "HubSpot Connected" toast

### 2. Test API Access

Click "Test" on the connected HubSpot card - should show success.

### 3. Test Contact Creation

Create an agent with a HubSpot action to test:

```json
{
  "action": "create_contact",
  "contact": {
    "properties": {
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    }
  }
}
```

Check your HubSpot dashboard to verify the contact was created.

---

## Available Actions

Your agents can use these HubSpot actions:

### Contacts
- `create_contact` - Create new contact
- `update_contact` - Update existing contact
- `get_contact` - Fetch contact by ID
- `search_contacts` - Search for contacts

### Companies
- `create_company` - Create new company
- `update_company` - Update existing company

### Deals
- `create_deal` - Create new deal
- `update_deal` - Update existing deal
- `get_deals` - List deals

---

## Troubleshooting

### "Missing environment variables"
- Ensure `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, and `HUBSPOT_REDIRECT_URI` are in `.env.local`
- Restart dev server after adding variables

### "Invalid redirect URI"
- Check that the redirect URI in your HubSpot app settings exactly matches `HUBSPOT_REDIRECT_URI`
- No trailing slashes!

### "Connection test failed"
- Token may be expired - try reconnecting
- Check HubSpot app scopes are enabled

### Rate Limits
HubSpot API limits:
- Free/Starter: 100 requests/10 seconds
- Professional: 150 requests/10 seconds
- Enterprise: 200 requests/10 seconds

---

## Security Notes

- ✅ Tokens are encrypted before storage
- ✅ Refresh tokens allow long-term access
- ✅ CSRF protection via state parameter
- ✅ Tokens auto-refresh when expired

Each tenant has their own HubSpot connection - data is never mixed between clients.
