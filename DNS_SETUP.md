# DNS setup — `demo.oyrb.space`

The demo runs on Vercel at its own deployment URL. To make it reachable at
`demo.oyrb.space` you add a single CNAME record at GoDaddy (your registrar).

## Steps

1. Sign in to **GoDaddy → My Domains → oyrb.space → DNS**.

2. **Add a new record** with these exact values:

   | Field | Value |
   |---|---|
   | Type | `CNAME` |
   | Name | `demo` |
   | Value / Target | `cname.vercel-dns.com` |
   | TTL | `1 Hour` (or whatever the default is) |

   Save.

3. **Add the custom domain inside Vercel** (the demo project only):
   - Vercel → Projects → **oyrb-demo** (the separate project you created
     for the demo) → Settings → Domains → **Add** `demo.oyrb.space`.
   - Vercel will show "Valid configuration" within seconds if your CNAME is
     correct. If it still shows "Invalid configuration" after 5 minutes,
     see Troubleshooting.

4. **Wait for propagation.** GoDaddy usually publishes within 1–5 minutes.
   Worst case is an hour. Vercel's own TLS cert issues automatically once
   the CNAME resolves correctly — no manual cert steps.

## Verify it's live

Any one of these:

```bash
# Resolve the record
dig +short demo.oyrb.space
#   → should include a cname.vercel-dns.com entry + an IP

# Or:
nslookup demo.oyrb.space

# Or just visit the URL:
curl -I https://demo.oyrb.space
#   → HTTP/2 200 or 301 (a redirect to /api/demo/auto-login is expected)
```

When you load `https://demo.oyrb.space` in a browser you should land in
Jasmine Carter's dashboard — no signup, no login screen.

## Troubleshooting

**"Invalid configuration" in Vercel after 10+ minutes.**
- Double-check the CNAME record: `Name=demo`, `Value=cname.vercel-dns.com`
  (no trailing dot, no `https://`).
- Make sure you didn't add an A record by mistake — it's CNAME only.
- Clear your local DNS cache: `sudo dscacheutil -flushcache` on macOS.

**Browser shows the old site (oyrb.space) at `demo.oyrb.space`.**
- You probably added the domain to the wrong Vercel project. Remove it from
  the production project and add it to the demo project.

**Site loads but there's no banner / you see the regular login page.**
- `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true` aren't both set on the
  demo Vercel project. Add both, then redeploy — env var changes don't take
  effect until the next build.

**502 / 500 page on first load.**
- `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` / `DEMO_ADMIN_TOKEN` aren't set,
  or `scripts/demo-setup.js` hasn't been run yet. See `DEMO_DEPLOY.md`.

**Banner shows but dashboard says "Complete checkout first to create your site."**
- The seed hasn't run. Hit:
  ```
  curl -XPOST -H "Authorization: Bearer $DEMO_ADMIN_TOKEN" \
       https://demo.oyrb.space/api/admin/demo/reset
  ```
