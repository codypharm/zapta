# Testing Guide - Zapta

## ✅ What's Built So Far

### Phase 1: Foundation ✅
- ✅ Next.js 15 with TypeScript
- ✅ HubSpot-inspired design system
- ✅ Supabase database with 8 tables
- ✅ Row-Level Security (multi-tenant)

### Phase 2: Authentication ✅
- ✅ Signup page with organization creation
- ✅ Login page
- ✅ Protected routes
- ✅ Session management

### Phase 3: Dashboard ✅
- ✅ Welcome dashboard
- ✅ Stats cards
- ✅ User profile display

---

## 🧪 How to Test

### 1. Start the Development Server

The server should already be running at:
```
http://localhost:3001
```

If not, run:
```bash
npm run dev
```

### 2. Test Signup Flow

1. **Go to Signup Page:**
   - Visit: http://localhost:3001/signup

2. **Fill in the Form:**
   - Full name: `Your Name`
   - Organization name: `Test Company`
   - Email: `test@example.com`
   - Password: `password123` (at least 8 characters)

3. **Click "Create account"**

4. **What Happens:**
   - ✅ User account created in Supabase Auth
   - ✅ Tenant (organization) created in `tenants` table
   - ✅ Profile created in `profiles` table (linked to tenant)
   - ✅ You're automatically logged in
   - ✅ Redirected to `/dashboard`

### 3. Verify in Supabase

Go to your Supabase dashboard and check:

**Table Editor > auth.users:**
- You should see your new user

**Table Editor > tenants:**
- You should see: `Test Company` (with slug `test-company`)

**Table Editor > profiles:**
- You should see your profile with `role = owner`

### 4. Test Dashboard

After signup, you should see:
- Welcome message with your first name
- Organization name displayed
- Stats cards (all showing 0 for now)
- "Create your first agent" card

### 5. Test Logout & Login

1. **Logout:**
   - Currently no logout button in UI (we'll add it next)
   - For now, clear browser cookies or use incognito

2. **Login:**
   - Visit: http://localhost:3001/login
   - Use the same email/password you created
   - Should redirect to `/dashboard`

### 6. Test Protected Routes

1. **Logout** (clear cookies)
2. **Try to visit:** http://localhost:3001/dashboard
3. **Result:** Should redirect to `/login`

---

## 🎨 Design Check

The pages should have:
- ✅ Clean white background
- ✅ **Orange buttons** (#FF7A59 - HubSpot primary color)
- ✅ Minimal design with generous whitespace
- ✅ Inter font
- ✅ Subtle shadows on cards
- ✅ No cluttered UI

---

## 🐛 Common Issues

### Issue: "Failed to create organization"

**Cause:** Tenant slug might not be unique
**Fix:** Use a different organization name

### Issue: "Failed to create user profile"

**Cause:** User already exists but profile creation failed
**Fix:**
1. Go to Supabase Auth > Users
2. Delete the user
3. Try signup again

### Issue: Redirects to login after signup

**Cause:** Session not being set properly
**Fix:** Check that `.env.local` has correct Supabase credentials

---

## 📊 What to Check in Database

After successful signup, you should have:

```
auth.users (Supabase Auth)
└── Your user with email

tenants
└── id: [uuid]
    name: "Test Company"
    slug: "test-company"
    plan: "free"

profiles
└── id: [your user id]
    tenant_id: [tenant id]
    email: "test@example.com"
    full_name: "Your Name"
    role: "owner"
```

---

## ✅ Current Pages

| Page | URL | Status | Description |
|------|-----|--------|-------------|
| **Home** | `/` | ✅ | Landing page |
| **Signup** | `/signup` | ✅ | Create account + org |
| **Login** | `/login` | ✅ | Sign in |
| **Dashboard** | `/dashboard` | ✅ | Protected, shows stats |

---

## 🚀 Next: What We'll Build

1. **Logout Button** - Add to dashboard header
2. **Navigation Sidebar** - With links to Agents, Conversations, Integrations
3. **Agent Builder** - Natural language interface
4. **Agent Templates** - Pre-built agent types

---

## 💡 Tips

- Use **Chrome DevTools** to inspect network requests
- Check **Console** for any JavaScript errors
- Use **Supabase Table Editor** to verify data
- Check **Supabase Auth > Users** to see all users

---

**Happy Testing!** 🎉

If everything works, you now have:
- ✅ User authentication
- ✅ Multi-tenant database
- ✅ Protected routes
- ✅ Beautiful HubSpot-inspired UI

Ready to build agents! 🤖
