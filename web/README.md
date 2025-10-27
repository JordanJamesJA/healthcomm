# HealthComm Web Application

A React-based healthcare communication platform with Firebase integration for real-time patient monitoring and care team coordination.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase project (see setup below)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

The application requires Firebase environment variables to run. You need to:

1. **Create a Firebase project** (if you haven't already):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Enable Authentication, Firestore, Storage, and Functions

2. **Get your Firebase configuration**:
   - In Firebase Console, go to Project Settings → General
   - Scroll to "Your apps" section
   - Click the Web app icon or create a new web app
   - Copy the Firebase configuration values

3. **Set up environment variables**:
   - A `.env` file has been created for you from `.env.example`
   - Edit the `.env` file and replace the placeholder values with your actual Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_actual_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Google Fit Integration
VITE_GOOGLE_FIT_CLIENT_ID=your_google_fit_client_id.apps.googleusercontent.com

# Optional: Firebase Emulator (for local development)
VITE_USE_FIREBASE_EMULATOR=false
```

**IMPORTANT**: Never commit the `.env` file to version control. It's already in `.gitignore`.

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Firebase Setup

For detailed Firebase setup instructions including:
- Firestore security rules
- Cloud Functions deployment
- Database structure
- Offline persistence configuration

See the [FIREBASE_SETUP.md](../FIREBASE_SETUP.md) in the root directory.

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"

This error occurs when Firebase environment variables are not configured. Make sure you:

1. Have created a `.env` file in the `web` directory (done automatically)
2. Replaced all placeholder values with your actual Firebase configuration
3. Restarted the development server after updating `.env`

The application will now display a clear error message in the console if any Firebase environment variables are missing.

### Environment Variables Not Loading

If you've set the environment variables but they're still not loading:

1. Restart the development server (`npm run dev`)
2. Verify the `.env` file is in the `web` directory (not the root)
3. Check that variable names start with `VITE_` prefix
4. Ensure there are no quotes around the values in `.env`

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Firebase** - Backend services (Auth, Firestore, Functions, Storage)
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Data visualization

## Project Structure

```
web/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── services/       # Firebase and API services
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   └── App.tsx         # Main application component
├── public/             # Static assets
├── .env                # Environment variables (not in git)
├── .env.example        # Environment template
└── package.json        # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Development Notes

### Firebase Emulator (Optional)

For local development without using production Firebase:

1. Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env`
2. Run Firebase emulators (see FIREBASE_SETUP.md)

### Offline Support

The application includes Firebase offline persistence for Firestore, allowing the app to work offline and sync when connectivity is restored.

## Contributing

See the main project README for contribution guidelines.

## License

[Add your license information here]
