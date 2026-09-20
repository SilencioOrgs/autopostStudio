# Security Policy and Operational Runbook

## 1. Supabase Key Rotation Runbook

If keys are exposed or compromised (e.g., historical commit of service_role key):

1. **Rotate Keys in Dashboard**:
   - Navigate to Supabase Dashboard > **Project Settings** > **API / JWT Keys**.
   - Roll the `service_role` (secret) key.
   - If rotating JWT secret, both `anon` and `service_role` keys will change and active user sessions will be terminated.
2. **Update Environment Configurations**:
   - Update `.env.local` on your local development machine.
   - Update Vercel Project Settings > **Environment Variables** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   - Trigger a redeployment on Vercel.
3. **Verify Secrets**:
   - Confirm `CRON_SECRET` has at least 32 characters (random bytes).
   - Confirm `ENCRYPTION_KEY` is a 32-byte base64-encoded string (44 characters ending in `=`). Note: changing `ENCRYPTION_KEY` invalidates existing encrypted credentials.
4. **Audit Project Logs**:
   - Inspect **Authentication > Users** in Supabase for unauthorized registrations.
   - Inspect **Database Logs** and **Storage Buckets** for unexpected access during the exposure window.
5. **Enable GitHub Protections**:
   - Repository Settings > **Code security and analysis** > Enable **Secret scanning** and **Push protection**.
   - Keep repository private if credentials or architecture details must remain protected.

---

## 2. Git History Scrubbing (Reference Only)

To remove sensitive historical commits from the Git tree:

> [!CAUTION]
> The following commands rewrite Git history and require force-pushing to remote branches. All collaborators must re-clone or rebase afterwards. **Key rotation is the mandatory security action; history rewriting is optional hygiene.**

```bash
# Using git-filter-repo (recommended tool)
pip install git-filter-repo

# Scrub .env.example from all commits
git filter-repo --path .env.example --invert-paths

# Force push scrubbed history (requires force-push permissions on origin)
git push origin --force --all
git push origin --force --tags
```

---

## 3. Secret Scanning & Pre-Commit Hook

### Running the Secret Scanner Manually
The project includes a secret scanner that inspects tracked files for JWT patterns, Google API keys, Meta access tokens, and private keys:

```bash
npm run check:secrets
```

### Setting up a Git Pre-Commit Hook
To prevent committing secrets locally, install the hook in `.git/hooks/pre-commit`:

```bash
#!/bin/sh
node scripts/check-secrets.mjs
```

Ensure it is executable (`chmod +x .git/hooks/pre-commit` on Unix-like environments).

---

## 4. Environment Validation

Validate your `.env.local` shape and completeness without printing secret values:

```bash
node scripts/check-env.mjs
```
