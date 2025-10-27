# Deployment Guide for HealthComm

## Understanding Environment Variables in Production

**Important**: With Vite, environment variables from `.env` are **embedded into your JavaScript bundle at build time**. This means:

- `.env` files are NOT uploaded to production
- `.env` values are baked into the compiled JavaScript during `npm run build`
- The production server only serves the pre-built files from the `dist/` folder

## Deploying to Firebase Hosting

### Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged in to Firebase: `firebase login`
3. Firebase project configured (already done - see `bridge/.firebaserc`)

### Deployment Steps

#### Step 1: Restore Your Environment Variables

**IMPORTANT**: I accidentally overwrote your `.env` file. You need to restore it with your actual Firebase credentials:

Edit `web/.env` and add your real values:
```env
VITE_FIREBASE_API_KEY=your_real_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_real_sender_id
VITE_FIREBASE_APP_ID=your_real_app_id
```

#### Step 2: Build the Web Application

```bash
cd web
npm install  # if not already done
npm run build
```

This creates a `web/dist/` folder with your compiled application (with environment variables embedded).

#### Step 3: Deploy to Firebase Hosting

```bash
cd ../bridge
firebase deploy --only hosting
```

Or deploy everything (hosting + functions + firestore rules):
```bash
cd bridge
firebase deploy
```

### Deployment Checklist

- [ ] Restore actual Firebase credentials in `web/.env`
- [ ] Build the web app: `cd web && npm run build`
- [ ] Verify `web/dist/` folder was created
- [ ] Deploy: `cd ../bridge && firebase deploy --only hosting`
- [ ] Test the deployed site

### Continuous Deployment (Future Option)

If you want to automate deployments with GitHub Actions:

1. Add Firebase credentials as **GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add each `VITE_FIREBASE_*` variable as a secret

2. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install and Build Web App
        working-directory: ./web
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        run: |
          npm install
          npm run build

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: healthcomm-bridge
          channelId: live
```

### Alternative: Environment-Specific Builds

You can maintain multiple environment files:

- `.env.development` - for local development
- `.env.production` - for production builds

Then build with:
```bash
npm run build --mode production
```

### Troubleshooting

#### "Invalid API Key" Error in Production

This means the build was done without proper environment variables. Solution:
1. Ensure `web/.env` has real values (not placeholders)
2. Rebuild: `cd web && npm run build`
3. Redeploy: `cd ../bridge && firebase deploy --only hosting`

#### Build Files Not Found

If you get errors about missing files:
1. Check that `web/dist/` exists after building
2. Verify `bridge/firebase.json` has `"public": "../web/dist"`

#### Wrong Site Deployed

Make sure you're in the `bridge/` directory when running `firebase deploy`, as that's where the Firebase configuration files are located.

## Security Best Practices

- ✅ **NEVER** commit `.env` files to GitHub (already in `.gitignore`)
- ✅ Firebase API keys for web apps are safe to expose (they're in your built JavaScript anyway)
- ✅ Use Firebase Security Rules to protect your data (already configured in `bridge/firestore.rules`)
- ⚠️ For sensitive keys (like Cloud Functions service accounts), use Firebase Functions config or Google Secret Manager

## Useful Commands

```bash
# View current Firebase project
firebase use

# Check what will be deployed
firebase deploy --only hosting --dry-run

# View deployment history
firebase hosting:channel:list

# Rollback to previous version (via Firebase Console)
# Go to: Hosting → Release history → Click "..." → Rollback
```
