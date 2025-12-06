# Daily Email Reminder Implementation Guide
## AWS SES + Cloudflare Workers for letters.wiki

**Last Updated:** October 2025
**Estimated Setup Time:** 2-3 hours
**Monthly Cost (at 150 subscribers):** $0.15-$0.45

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Letters.wiki Game Changes](#phase-1-letterswiki-game-changes)
4. [Phase 2: AWS SES Setup](#phase-2-aws-ses-setup)
5. [Phase 3: Cloudflare Workers Setup](#phase-3-cloudflare-workers-setup)
6. [Phase 4: Integration & Testing](#phase-4-integration--testing)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This implementation sends a daily email reminder to letters.wiki players at 7:00 AM Pacific Time with a simple message like:

> **Good morning!**
> Time to play today's puzzle!
> https://letters.wiki

### Architecture
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│  letters.wiki   │────> │ Cloudflare KV    │<────>│  Cloudflare │
│  (opt-in form)  │      │  (subscriber DB) │      │   Worker    │
└─────────────────┘      └──────────────────┘      └──────┬──────┘
                                                           │
                                                           │ SMTP
                                                           ▼
                                                    ┌─────────────┐
                                                    │   AWS SES   │
                                                    │ (email send)│
                                                    └─────────────┘
```

### Cost Breakdown
- **AWS SES:** $0.10 per 1,000 emails
- **Cloudflare Workers:** Free (100k requests/day limit)
- **Cloudflare KV:** Free (1 GB, 100k reads/day limit)

At 150 subscribers × 30 days = 4,500 emails/month:
- **Year 1:** $0.15/month (3k free + 1,500 paid)
- **Year 2+:** $0.45/month

---

## Prerequisites

### Required Accounts
- ✅ AWS account (you'll need credit card, but costs are minimal)
- ✅ Cloudflare account with letters.wiki domain
- ✅ Access to Cloudflare DNS settings for letters.wiki

### Required Tools
- Text editor for code
- Command line access (for Wrangler CLI - optional but recommended)

### Legal Requirements
- ✅ Privacy policy mentioning email collection
- ✅ Physical mailing address (can be PO box)
- ✅ Unsubscribe mechanism (we'll build this)

---

## Phase 1: Letters.wiki Game Changes

### 1.1: Add Email Opt-In Form

**File:** `index.html`

Add this after the game-over section (around line 100):

```html
<!-- Email Subscription Section -->
<div id="email-subscribe-section" style="display: none; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
    <h3 style="margin-top: 0;">📧 Get Daily Reminders</h3>
    <p style="font-size: 14px; color: #666;">Never miss a puzzle! We'll send you a quick reminder each morning.</p>
    <div id="subscribe-form">
        <input
            type="email"
            id="email-input"
            placeholder="your@email.com"
            style="padding: 10px; font-size: 16px; border: 1px solid #ddd; border-radius: 4px; width: 250px; max-width: 100%;"
        >
        <button
            id="subscribe-btn"
            class="btn btn-primary"
            style="margin-left: 10px;"
        >Subscribe</button>
    </div>
    <div id="subscribe-message" style="margin-top: 10px; font-size: 14px;"></div>
    <p style="font-size: 12px; color: #999; margin-top: 10px;">
        We respect your privacy. Unsubscribe anytime.
        <a href="#privacy" style="color: #666;">Privacy Policy</a>
    </p>
</div>
```

**Display Logic:** Show this section when the user completes their first game or after game completion.

**File:** `script.js`

Add subscription handling code:

```javascript
// Email subscription handling
document.getElementById('subscribe-btn')?.addEventListener('click', async () => {
    const emailInput = document.getElementById('email-input');
    const messageDiv = document.getElementById('subscribe-message');
    const email = emailInput.value.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        messageDiv.innerHTML = '<span style="color: red;">Please enter a valid email address</span>';
        return;
    }

    try {
        // Call Cloudflare Worker endpoint
        const response = await fetch('https://letters.wiki/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.innerHTML = '<span style="color: green;">✓ Subscribed! Check your email to confirm.</span>';
            emailInput.value = '';
            emailInput.disabled = true;
            document.getElementById('subscribe-btn').disabled = true;

            // Store subscription status locally
            localStorage.setItem('letters-subscribed', 'pending');
        } else {
            messageDiv.innerHTML = `<span style="color: red;">${data.error || 'Subscription failed. Please try again.'}</span>`;
        }
    } catch (error) {
        messageDiv.innerHTML = '<span style="color: red;">Network error. Please try again.</span>';
        console.error('Subscription error:', error);
    }
});

// Show subscribe section after first game completion
function showSubscribeSection() {
    const subscribeSection = document.getElementById('email-subscribe-section');
    const hasSubscribed = localStorage.getItem('letters-subscribed');

    // Only show if user hasn't subscribed
    if (!hasSubscribed && subscribeSection) {
        subscribeSection.style.display = 'block';
    }
}

// Call this in your game completion handler
// Add to existing game over logic:
// showSubscribeSection();
```

**Testing Checkpoint 1:**
- [ ] Load letters.wiki locally
- [ ] Complete a game
- [ ] Verify subscribe section appears
- [ ] Try entering invalid email (should show error)
- [ ] Try valid email (will fail until Worker is set up - that's expected)

### 1.2: Add Privacy Policy

**Create new file:** `privacy.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - WikiLetters</title>
    <link rel="stylesheet" href="./styles.css">
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>Privacy Policy</h1>

        <h2>Email Newsletter</h2>
        <p>When you subscribe to our daily reminder emails, we collect and store:</p>
        <ul>
            <li>Your email address</li>
            <li>Subscription date</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use your email address solely to send you daily game reminders. We do not:</p>
        <ul>
            <li>Sell or share your email with third parties</li>
            <li>Send promotional or marketing emails</li>
            <li>Track your email opens or clicks</li>
        </ul>

        <h2>Email Service Provider</h2>
        <p>Emails are sent via Amazon Web Services (AWS SES). Your email is stored in Cloudflare Workers KV storage and AWS SES. Both services comply with industry-standard security practices.</p>

        <h2>Unsubscribe</h2>
        <p>Every email contains an unsubscribe link. Clicking it immediately removes your email from our list.</p>

        <h2>Contact</h2>
        <p>Questions about this policy? Email: privacy@letters.wiki</p>

        <p style="margin-top: 40px; color: #999; font-size: 12px;">
            Your Physical Address Here (Required by CAN-SPAM Act)<br>
            Last updated: October 2025
        </p>

        <p><a href="/">← Back to WikiLetters</a></p>
    </div>
</body>
</html>
```

**Action Required:** Replace "Your Physical Address Here" with your actual mailing address or PO box.

**Testing Checkpoint 2:**
- [ ] Load https://letters.wiki/privacy.html locally
- [ ] Verify all links work
- [ ] Verify address is filled in

---

## Phase 2: AWS SES Setup

### 2.1: Create AWS Account (if needed)

1. Go to https://aws.amazon.com
2. Click **Create an AWS Account**
3. Follow prompts (requires credit card, but you won't be charged for small volumes)
4. Enable MFA (multi-factor authentication) for security

### 2.2: Access SES Console

**Navigation:**
1. Sign in to AWS Console: https://console.aws.amazon.com
2. In the top search bar, type `SES`
3. Click **Amazon Simple Email Service**
4. **IMPORTANT:** Select region **US West (Oregon)** from top-right dropdown (closest to Pacific Time)

### 2.3: Verify Domain Identity

**Step 1: Create Identity**
1. In SES Console left sidebar → Click **Identities**
2. Click **Create identity** (orange button, top right)
3. Select **Domain** radio button
4. In "Domain" field, enter: `letters.wiki`
5. Under "Advanced DKIM settings":
   - Keep **Easy DKIM** selected (default)
   - Keep **RSA_2048_BIT** selected (default)
6. Scroll down, click **Create identity**

**Step 2: Get DNS Records**

AWS will show you a verification page with DNS records. You need to add these to Cloudflare.

You'll see a table with ~3 CNAME records like:
```
Type: CNAME
Name: abc123._domainkey.letters.wiki
Value: abc123.dkim.amazonses.com
```

**Keep this tab open** - you'll need these values for Cloudflare.

### 2.4: Add DNS Records to Cloudflare

**Navigation:**
1. Open new tab → https://dash.cloudflare.com
2. Click on **letters.wiki** domain
3. In left sidebar → Click **DNS** → **Records**

**For EACH CNAME record from AWS:**
1. Click **Add record**
2. Type: Select **CNAME**
3. Name: Paste the subdomain part (e.g., `abc123._domainkey` - DO NOT include `.letters.wiki`)
4. Target: Paste the value (e.g., `abc123.dkim.amazonses.com`)
5. Proxy status: Click to disable (should be **DNS only**, gray cloud icon)
6. TTL: Leave as **Auto**
7. Click **Save**

Repeat for all 3 CNAME records.

**Testing Checkpoint 3:**
- [ ] All 3 CNAME records added to Cloudflare
- [ ] Each record shows "DNS only" (gray cloud)
- [ ] Back in AWS SES, refresh the identity page
- [ ] After 5-10 minutes, "Identity status" should change to **Verified** (green checkmark)
- [ ] If not verified after 30 minutes, see [Troubleshooting](#troubleshooting)

### 2.5: Request Production Access

**Why:** New SES accounts start in "sandbox mode" - you can only send to verified emails. Production access lets you send to anyone.

**Steps:**
1. In SES Console left sidebar → Click **Account dashboard**
2. Look for box that says "Your account is in the sandbox"
3. Click **Request production access** button
4. Fill out form:
   - **Mail type:** Transactional
   - **Website URL:** https://letters.wiki
   - **Use case description:** (example below)
   - **Compliance:** Check the box
   - **Additional contacts:** (optional)

**Example Use Case Description:**
```
We operate a free daily word puzzle game at letters.wiki. We're implementing
an opt-in daily reminder email service. Users explicitly subscribe via a form
on our website. Each email contains only a brief reminder with a link to
today's puzzle and an unsubscribe link. We expect to send approximately
150-1,500 emails per day to subscribers who have opted in. We have implemented
double opt-in confirmation and honor all unsubscribe requests immediately.
```

5. Click **Submit request**

**Timeline:** Usually approved within 24 hours. You'll receive an email.

**Testing Checkpoint 4:**
- [ ] Request submitted
- [ ] Check email for approval (within 24 hours)
- [ ] In SES Account Dashboard, verify status shows "Production" (not sandbox)

### 2.6: Create SMTP Credentials

**Why:** Your Cloudflare Worker needs username/password to send via SES.

**Steps:**
1. In SES Console left sidebar → Click **SMTP settings**
2. You'll see "SMTP endpoint": `email-smtp.us-west-2.amazonaws.com` (note this!)
3. Click **Create SMTP credentials** button (top right)
4. IAM User Name: Keep default or change to `letters-wiki-smtp`
5. Click **Create user**
6. **CRITICAL:** A page appears with credentials:
   - **SMTP Username:** (looks like `AKIAIOSFODNN7EXAMPLE`)
   - **SMTP Password:** (long random string)
   - **⚠️ SAVE THESE IMMEDIATELY** - you can't view the password again!
7. Click **Download credentials** (saves CSV file)
8. Store this CSV file securely - you'll need these for Cloudflare

**Testing Checkpoint 5:**
- [ ] SMTP credentials downloaded and saved
- [ ] SMTP Username starts with `AKIA...`
- [ ] SMTP Password is a long string (not same as AWS console password)

---

## Phase 3: Cloudflare Workers Setup

### 3.1: Create KV Namespace (Subscriber Database)

**Navigation:**
1. Go to https://dash.cloudflare.com
2. In left sidebar → Click **Workers & Pages**
3. In sub-menu → Click **KV**

**Create Namespace:**
1. Click **Create a namespace** button
2. Namespace Name: `letters-subscribers`
3. Click **Add**

You should see the namespace appear in the list with an ID like `1234567890abcdef`.

**Testing Checkpoint 6:**
- [ ] KV namespace `letters-subscribers` created
- [ ] Namespace appears in KV list

### 3.2: Create Worker for Email Sending

**Navigation:**
1. In Cloudflare Dashboard → **Workers & Pages**
2. Click **Create** button → Select **Create Worker**
3. Name: `letters-daily-email`
4. Click **Deploy** (we'll edit code next)

**Edit Worker Code:**
1. After deployment, click **Edit code** button
2. Replace ALL code with this:

```javascript
// letters-daily-email Worker
// Sends daily reminder emails via AWS SES

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  },

  // Scheduled trigger (runs daily at 7 AM Pacific)
  async scheduled(event, env, ctx) {
    try {
      await sendDailyEmails(env);
    } catch (error) {
      console.error('Error in scheduled send:', error);
      // Optionally send yourself an alert email here
    }
  }
};

async function sendDailyEmails(env) {
  // Get all subscribers from KV
  const list = await env.SUBSCRIBERS.list();
  const emails = await Promise.all(
    list.keys.map(async (key) => {
      const data = await env.SUBSCRIBERS.get(key.name, 'json');
      return data.email;
    })
  );

  console.log(`Sending to ${emails.length} subscribers`);

  // Send to each subscriber
  const promises = emails.map(email => sendEmail(email, env));
  const results = await Promise.allSettled(promises);

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Sent: ${succeeded} succeeded, ${failed} failed`);

  return { succeeded, failed };
}

async function sendEmail(toEmail, env) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });

  const unsubscribeUrl = `https://letters.wiki/api/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const emailBody = `From: WikiLetters <noreply@letters.wiki>
To: ${toEmail}
Subject: Time to play today's WikiLetters puzzle!
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset=UTF-8

Good morning!

Time to play today's puzzle!

https://letters.wiki

${date}

---
Unsubscribe: ${unsubscribeUrl}

--boundary123
Content-Type: text/html; charset=UTF-8

<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .cta { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Good morning! 🌅</div>
    <p>Time to play today's puzzle!</p>
    <a href="https://letters.wiki" class="cta">Play WikiLetters</a>
    <p style="color: #666; font-size: 14px;">${date}</p>
    <div class="footer">
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>

--boundary123--
`;

  // Send via AWS SES SMTP
  const response = await fetch('https://email-smtp.us-west-2.amazonaws.com:465', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(env.SMTP_USER + ':' + env.SMTP_PASS)}`,
      'Content-Type': 'text/plain',
    },
    body: emailBody
  });

  if (!response.ok) {
    throw new Error(`Email send failed: ${response.statusText}`);
  }

  return true;
}
```

**WAIT - Don't deploy yet!** We need to add environment variables and bindings first.

### 3.3: Add Environment Variables (Secrets)

**Add SMTP Credentials:**
1. In Worker edit screen, click **Settings** tab (top navigation)
2. Scroll down to **Environment Variables**
3. Click **Add variable**

**Variable 1:**
- Variable name: `SMTP_USER`
- Value: (Paste your SMTP Username from AWS - starts with AKIA...)
- Type: Select **Encrypt** (to hide it)
- Click **Save**

**Variable 2:**
- Variable name: `SMTP_PASS`
- Value: (Paste your SMTP Password from AWS)
- Type: Select **Encrypt**
- Click **Save**

### 3.4: Bind KV Namespace to Worker

**Steps:**
1. Still in Worker **Settings** tab
2. Scroll to **Bindings** section
3. Click **Add binding**
4. Binding type: Select **KV Namespace**
5. Variable name: `SUBSCRIBERS` (must match code above)
6. KV namespace: Select `letters-subscribers` from dropdown
7. Click **Save**

### 3.5: Add Cron Trigger (Daily Schedule)

**Steps:**
1. Still in Worker **Settings** tab
2. Scroll to **Triggers** section
3. Click **Add Cron Trigger**
4. Cron expression: `0 14 * * *`
   - This means: 14:00 UTC = 7:00 AM Pacific (during standard time)
   - **Note:** During PDT (daylight saving), use `0 15 * * *` for 7 AM Pacific
5. Click **Add trigger**

**Understanding Cron:**
- `0 14 * * *` = minute 0, hour 14 (2 PM UTC), every day
- UTC is 7-8 hours ahead of Pacific Time
- Test with different times while debugging

### 3.6: Create Subscription/Unsubscribe Endpoints

We need a second Worker to handle subscribe/unsubscribe requests from the website.

**Create Worker:**
1. Go to **Workers & Pages** → **Create** → **Create Worker**
2. Name: `letters-subscription-api`
3. Click **Deploy**
4. Click **Edit code**

**Replace code with:**

```javascript
// letters-subscription-api Worker
// Handles email subscriptions and unsubscribes

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://letters.wiki',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Subscribe endpoint
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      try {
        const { email } = await request.json();

        // Validate email
        if (!email || !isValidEmail(email)) {
          return new Response(
            JSON.stringify({ error: 'Invalid email address' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already subscribed
        const existing = await env.SUBSCRIBERS.get(email);
        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Email already subscribed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Store subscriber
        await env.SUBSCRIBERS.put(email, JSON.stringify({
          email,
          subscribedAt: new Date().toISOString(),
          confirmed: true // For now, no double opt-in
        }));

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Server error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Unsubscribe endpoint
    if (url.pathname === '/unsubscribe' && request.method === 'GET') {
      const email = url.searchParams.get('email');

      if (!email) {
        return new Response('Missing email parameter', { status: 400 });
      }

      await env.SUBSCRIBERS.delete(email);

      // Return simple HTML confirmation
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed - WikiLetters</title>
          <style>
            body { font-family: sans-serif; max-width: 600px; margin: 100px auto; text-align: center; }
          </style>
        </head>
        <body>
          <h1>✓ Unsubscribed</h1>
          <p>You've been removed from WikiLetters daily reminders.</p>
          <p><a href="https://letters.wiki">← Back to WikiLetters</a></p>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

**Bind KV to this Worker too:**
1. Go to **Settings** tab
2. Scroll to **Bindings**
3. Click **Add binding** → **KV Namespace**
4. Variable name: `SUBSCRIBERS`
5. KV namespace: `letters-subscribers`
6. Click **Save**

### 3.7: Set Up Custom Route

**Map API endpoints to subscription Worker:**

1. In Cloudflare Dashboard → Go to **letters.wiki** domain
2. Left sidebar → Click **Workers Routes**
3. Click **Add route**

**Route 1 (Subscribe):**
- Route: `letters.wiki/api/subscribe`
- Worker: `letters-subscription-api`
- Click **Save**

**Route 2 (Unsubscribe):**
- Route: `letters.wiki/api/unsubscribe`
- Worker: `letters-subscription-api`
- Click **Save**

**Testing Checkpoint 7:**
- [ ] Both Workers deployed
- [ ] KV namespace bound to both Workers
- [ ] SMTP credentials added to `letters-daily-email` Worker
- [ ] Cron trigger configured
- [ ] Routes configured for API endpoints

---

## Phase 4: Integration & Testing

### 4.1: Test Subscription Flow

**From Command Line (curl):**

```bash
curl -X POST https://letters.wiki/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@email.com"}'
```

**Expected response:**
```json
{"success":true}
```

**Verify in Cloudflare:**
1. Go to **Workers & Pages** → **KV**
2. Click `letters-subscribers` namespace
3. Click **View** button
4. You should see your test email listed

**Testing Checkpoint 8:**
- [ ] Subscription API returns success
- [ ] Email appears in KV namespace
- [ ] Duplicate subscription returns error

### 4.2: Test Unsubscribe Flow

**In Browser:**
1. Go to: `https://letters.wiki/api/unsubscribe?email=yourtest@email.com`
2. Should see "Unsubscribed" confirmation page
3. Check KV namespace - email should be gone

**Testing Checkpoint 9:**
- [ ] Unsubscribe page displays correctly
- [ ] Email removed from KV namespace

### 4.3: Test Email Sending (Manual Trigger)

We need to test email sending before waiting for the cron trigger.

**Important Note:** AWS SES SMTP via fetch() in Workers has limitations. You'll likely need to use **AWS SDK** or **nodemailer** instead. Here's an updated approach using AWS SES API:

**Update `letters-daily-email` Worker code:**

Replace the `sendEmail` function with this AWS SES API version:

```javascript
async function sendEmail(toEmail, env) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });

  const unsubscribeUrl = `https://letters.wiki/api/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .cta { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Good morning! 🌅</div>
    <p>Time to play today's puzzle!</p>
    <a href="https://letters.wiki" class="cta">Play WikiLetters</a>
    <p style="color: #666; font-size: 14px;">${date}</p>
    <div class="footer">
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;

  const textBody = `Good morning!

Time to play today's puzzle!

https://letters.wiki

${date}

---
Unsubscribe: ${unsubscribeUrl}`;

  // Use AWS SES API v2 (not SMTP)
  const params = {
    Destination: {
      ToAddresses: [toEmail]
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: htmlBody
        },
        Text: {
          Charset: 'UTF-8',
          Data: textBody
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Time to play today\'s WikiLetters puzzle!'
      }
    },
    Source: 'WikiLetters <noreply@letters.wiki>'
  };

  // AWS SES API endpoint
  const endpoint = 'https://email.us-west-2.amazonaws.com/v2/email/outbound-emails';

  // This requires AWS Signature V4 - complex!
  // EASIER APPROACH: Use a third-party library or Cloudflare Email Workers

  // For simplicity, we'll use a different approach...
  // See Alternative Approach below
}
```

**Alternative Approach (Recommended):**

Since AWS SES SMTP is complex from Workers, use **Resend** for initial testing, then migrate to SES later if needed:

1. Sign up at https://resend.com (free tier: 3k emails/month)
2. Get API key
3. Add to Worker environment variables: `RESEND_API_KEY`
4. Update sendEmail function:

```javascript
async function sendEmail(toEmail, env) {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });

  const unsubscribeUrl = `https://letters.wiki/api/unsubscribe?email=${encodeURIComponent(toEmail)}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WikiLetters <noreply@letters.wiki>',
      to: [toEmail],
      subject: 'Time to play today\'s WikiLetters puzzle!',
      html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .cta { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Good morning! 🌅</div>
    <p>Time to play today's puzzle!</p>
    <a href="https://letters.wiki" class="cta">Play WikiLetters</a>
    <p style="color: #666; font-size: 14px;">${date}</p>
    <div class="footer">
      <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`,
      text: `Good morning!\n\nTime to play today's puzzle!\n\nhttps://letters.wiki\n\n${date}\n\n---\nUnsubscribe: ${unsubscribeUrl}`
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email failed: ${error}`);
  }

  return true;
}
```

**Manual Test Trigger:**

Add a test endpoint to `letters-daily-email` Worker:

```javascript
// Add this to the fetch() handler
if (url.pathname === '/test-send' && url.searchParams.get('secret') === env.TEST_SECRET) {
  await sendDailyEmails(env);
  return new Response('Emails sent!');
}
```

Add environment variable:
- `TEST_SECRET` = `your-random-string-here`

**Test:**
Visit: `https://letters-daily-email.yourname.workers.dev/test-send?secret=your-random-string-here`

**Testing Checkpoint 10:**
- [ ] Test endpoint triggers email send
- [ ] Email arrives in inbox (check spam folder too!)
- [ ] Email formatting looks correct
- [ ] Unsubscribe link works
- [ ] Links go to correct URLs

### 4.4: Deploy to Production

**Update letters.wiki files:**

1. Commit changes to git:
```bash
cd /Users/daverutledge/wikigames/letters
git add index.html script.js privacy.html
git commit -m "Add email subscription feature"
```

2. Deploy to Unraid:
```bash
./letters_deploy.sh
```

**Verify live site:**
- [ ] Visit https://letters.wiki
- [ ] Complete a game
- [ ] Subscribe with real email
- [ ] Check email received confirmation
- [ ] Test unsubscribe

---

## Monitoring & Maintenance

### Daily Monitoring (First Week)

**Check Cloudflare Workers Logs:**
1. Dashboard → Workers & Pages → `letters-daily-email`
2. Click **Logs** tab (requires Tail Workers - real-time logs)
3. Look for errors or failed sends

**Check AWS SES Sending Statistics:**
1. AWS Console → SES → Account Dashboard
2. View "Sending Statistics" chart
3. Monitor:
   - Send rate
   - Bounce rate (should be < 5%)
   - Complaint rate (should be < 0.1%)

### Weekly Checks

- [ ] Review subscriber count in KV namespace
- [ ] Check AWS SES bounce/complaint rates
- [ ] Verify cron trigger is running (check Workers logs)

### Monthly Maintenance

- [ ] Review AWS bill (should be under $1)
- [ ] Clean up bounced emails from subscriber list
- [ ] Update email template if needed

### Handling Bounces

**If AWS SES shows bounces:**
1. Go to SES Console → Configuration Sets
2. Create SNS topic for bounce notifications
3. Update Worker to process bounce webhooks
4. Auto-remove bounced emails from KV

**Simplified approach:**
- Manually check SES bounce reports weekly
- Remove hard bounces from KV namespace

### Scaling Up

**When you reach 500+ subscribers:**
- Consider switching from Resend to AWS SES to save costs
- Implement proper AWS Signature V4 authentication
- Use Cloudflare Workers Durable Objects for better subscriber management
- Add double opt-in confirmation flow

---

## Troubleshooting

### Issue: Domain Not Verifying in AWS SES

**Symptoms:** After 30+ minutes, identity status still "Pending"

**Solutions:**
1. Check Cloudflare DNS records:
   - Ensure CNAME records copied exactly (no extra spaces)
   - Verify "DNS only" (gray cloud), not "Proxied" (orange cloud)
2. Use `dig` command to verify DNS propagation:
   ```bash
   dig abc123._domainkey.letters.wiki CNAME
   ```
   Should return AWS's domain in the answer
3. Try deleting and re-creating the identity in AWS SES

### Issue: Emails Going to Spam

**Symptoms:** Subscribers report emails in spam folder

**Solutions:**
1. Verify SPF record exists:
   ```bash
   dig letters.wiki TXT
   ```
   Should include: `v=spf1 include:amazonses.com ~all`

   **Add if missing:**
   - Cloudflare DNS → Add record
   - Type: TXT
   - Name: `@` (root domain)
   - Content: `v=spf1 include:amazonses.com ~all`

2. Check DMARC record:
   - Type: TXT
   - Name: `_dmarc`
   - Content: `v=DMARC1; p=none; rua=mailto:postmaster@letters.wiki`

3. Warm up sending:
   - Start with small batches (10-20/day)
   - Gradually increase over 2 weeks

### Issue: "Access Denied" from AWS SES

**Symptoms:** Worker logs show 403 errors

**Solutions:**
1. Verify SMTP credentials are correct (re-download CSV from AWS)
2. Check IAM user has `ses:SendEmail` permission
3. Ensure account is out of sandbox mode

### Issue: Worker Not Running on Schedule

**Symptoms:** No emails sent at scheduled time

**Solutions:**
1. Verify Cron Trigger is active:
   - Workers & Pages → letters-daily-email → Triggers tab
   - Should show cron expression
2. Check timezone calculation:
   - `0 14 * * *` = 7 AM PST (Nov-Mar)
   - `0 15 * * *` = 7 AM PDT (Mar-Nov)
3. View logs during scheduled time to see if trigger fired

### Issue: Subscribers Not Saving to KV

**Symptoms:** Subscription succeeds but email not in KV

**Solutions:**
1. Check KV binding name matches code (`SUBSCRIBERS`)
2. Verify KV namespace is bound to Worker in Settings → Bindings
3. Check Worker logs for errors during subscription

### Issue: Unsubscribe Link Doesn't Work

**Symptoms:** Clicking unsubscribe shows 404

**Solutions:**
1. Verify Worker route is configured:
   - letters.wiki → Workers Routes
   - Route `letters.wiki/api/unsubscribe` exists
2. Check URL encoding of email parameter
3. Test manually: `https://letters.wiki/api/unsubscribe?email=test@example.com`

### Issue: High AWS Costs

**Symptoms:** Bill is higher than expected

**Solutions:**
1. Check SES Sending Statistics for unexpected volume
2. Review KV namespace for duplicate entries
3. Ensure Worker isn't sending duplicates (check logs)
4. Verify subscriber count matches expected

---

## Appendix A: Email Template Customization

To change email content, edit the `sendEmail` function in `letters-daily-email` Worker.

**Example variations:**

**Shorter version:**
```html
<div class="container">
  <p>🌅 Good morning!</p>
  <a href="https://letters.wiki" class="cta">Play Today's Puzzle</a>
</div>
```

**Add streak tracking:**
```html
<p>You've played {streak} days in a row! Keep it going!</p>
```
(Requires tracking player stats - advanced feature)

**Add today's starting letters hint:**
```html
<p>Today's puzzle starts with: <strong>{firstLetters}</strong></p>
```
(Requires fetching game seed - advanced feature)

---

## Appendix B: Advanced Features to Add Later

### Double Opt-In Confirmation
- Send confirmation email with unique link
- Only activate subscription after click
- Reduces spam complaints
- **Implementation:** Add `confirmed: false` to KV, create `/confirm` endpoint

### Subscriber Management Dashboard
- Admin UI to view/manage subscribers
- Export subscriber list
- View stats (open rate, unsubscribe rate)
- **Implementation:** New Worker with password-protected UI

### Bounce Processing Automation
- Automatically remove bounced emails
- Track hard vs soft bounces
- Alert on high bounce rates
- **Implementation:** SNS topic → API Gateway → Worker webhook

### A/B Testing Email Times
- Test 7 AM vs 8 AM send times
- Track engagement by time
- **Implementation:** Split subscribers into groups, different cron triggers

### Personalization
- Include subscriber's name
- Show their best score
- Tailored hints based on performance
- **Implementation:** Store more data in KV, integrate with game stats

---

## Appendix C: Migration to Pure AWS SES (Cost Optimization)

Once you're comfortable with the system and want to move from Resend to pure AWS SES (to save on costs at scale), follow this guide.

### Prerequisites
- Working Resend implementation
- AWS SES domain verified and out of sandbox
- Comfortable with AWS IAM and API signatures

### Step 1: Create IAM User for API Access

1. AWS Console → IAM → Users
2. Create user: `letters-api-ses`
3. Attach policy: `AmazonSESFullAccess` (or create custom policy with just `ses:SendEmail`)
4. Create access key (save access key ID and secret)

### Step 2: Implement AWS Signature V4

AWS SES API requires request signing. Use this helper function in your Worker:

```javascript
async function signAwsRequest(method, url, body, accessKey, secretKey, region, service) {
  // AWS Signature V4 implementation
  // Full code available at: https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
  // Or use library: https://github.com/mhart/aws4fetch
}
```

**Easier approach:** Use `aws4fetch` library via npm:

```bash
npm install aws4fetch
```

Update Worker to use it:

```javascript
import { AwsClient } from 'aws4fetch';

const aws = new AwsClient({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: 'us-west-2',
  service: 'ses'
});

async function sendEmail(toEmail, env) {
  const emailData = {
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: 'Your subject' },
      Body: {
        Html: { Data: '<html>...' },
        Text: { Data: 'Plain text...' }
      }
    },
    Source: 'noreply@letters.wiki'
  };

  const response = await aws.fetch('https://email.us-west-2.amazonaws.com/v2/email/outbound-emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailData)
  });

  return response.ok;
}
```

### Step 3: Test and Compare Costs

- Run both Resend and AWS SES in parallel for a week
- Compare deliverability rates
- Verify cost savings
- Switch fully to AWS SES

**Expected savings at 1,500 subscribers:**
- Resend: $20/month
- AWS SES: $4.50/month
- **Savings:** $15.50/month ($186/year)

---

## Appendix D: Legal Compliance Checklist

### CAN-SPAM Act Requirements

- [ ] **Unsubscribe link** in every email
- [ ] **Physical address** in footer (can be PO box)
- [ ] **Accurate "From" header** (noreply@letters.wiki)
- [ ] **Clear subject line** (no deceptive subjects)
- [ ] **Honor unsubscribes within 10 business days** (we do it immediately)
- [ ] **Don't transfer unsubscribed emails** to other lists

### GDPR Requirements (if you have EU users)

- [ ] **Privacy policy** clearly explains data use
- [ ] **Consent** is freely given (checkbox, not pre-checked)
- [ ] **Right to access** - users can request their data
- [ ] **Right to deletion** - unsubscribe removes all data
- [ ] **Data minimization** - only collect email (no unnecessary data)

### Best Practices

- [ ] Double opt-in confirmation (reduces spam complaints)
- [ ] Clear privacy policy linked from opt-in form
- [ ] "Reply-to" address monitored (or note "do not reply")
- [ ] Keep subscriber list secure (Cloudflare KV is encrypted)
- [ ] Don't share subscriber list with third parties

---

## Appendix E: Cost Projection Tables

### Subscriber Growth Scenarios

| Subscribers | Emails/Month | AWS SES (Yr 1) | AWS SES (Yr 2+) | Resend | Mailgun |
|-------------|--------------|----------------|-----------------|--------|---------|
| 50          | 1,500        | $0.00          | $0.15           | $0.00  | $0.00   |
| 150         | 4,500        | $0.15          | $0.45           | $20.00 | $15.00  |
| 500         | 15,000       | $1.20          | $1.50           | $20.00 | $15.00  |
| 1,000       | 30,000       | $2.70          | $3.00           | $20.00 | $15.00  |
| 1,500       | 45,000       | $4.20          | $4.50           | $20.00 | $35.00  |
| 5,000       | 150,000      | $14.70         | $15.00          | $90.00 | $90.00  |
| 10,000      | 300,000      | $29.70         | $30.00          | $180.00| $180.00 |

**Conclusion:** AWS SES is cheapest at every scale, but gap widens significantly above 500 subscribers.

---

## Summary Checklist

Use this as your master checklist for implementation:

### Phase 1: Game Changes
- [ ] Add opt-in form to index.html
- [ ] Add subscription JavaScript to script.js
- [ ] Create privacy.html with legal info
- [ ] Add physical address to privacy policy
- [ ] Test form locally

### Phase 2: AWS SES Setup
- [ ] Create AWS account
- [ ] Navigate to SES (US West Oregon region)
- [ ] Create domain identity for letters.wiki
- [ ] Add 3 CNAME records to Cloudflare DNS
- [ ] Wait for domain verification (green checkmark)
- [ ] Request production access
- [ ] Wait for approval email (~24 hours)
- [ ] Create SMTP credentials
- [ ] Download and save credentials CSV

### Phase 3: Cloudflare Setup
- [ ] Create KV namespace: `letters-subscribers`
- [ ] Create Worker: `letters-daily-email`
- [ ] Add environment variables (SMTP_USER, SMTP_PASS or RESEND_API_KEY)
- [ ] Bind KV namespace to Worker
- [ ] Add Cron Trigger (0 14 * * *)
- [ ] Create Worker: `letters-subscription-api`
- [ ] Bind KV to subscription Worker
- [ ] Configure routes (/api/subscribe, /api/unsubscribe)

### Phase 4: Testing
- [ ] Test subscription API with curl
- [ ] Verify email appears in KV
- [ ] Test unsubscribe flow
- [ ] Send test email manually
- [ ] Check email arrives (inbox, not spam)
- [ ] Test all links in email
- [ ] Deploy to production
- [ ] Subscribe with real email on live site
- [ ] Wait for next day's cron trigger

### Ongoing
- [ ] Monitor AWS SES statistics weekly
- [ ] Check bounce/complaint rates
- [ ] Review costs monthly
- [ ] Update email template as needed

---

**Questions or issues?** Check [Troubleshooting](#troubleshooting) section or create an issue in the project repository.

**Estimated total time:** 2-3 hours for full implementation and testing.

**Good luck! 🚀**
