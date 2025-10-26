# Firebase Integration Guide for HealthComm

This document provides comprehensive documentation for the Firebase integration in the HealthComm application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Firebase Services Used](#firebase-services-used)
3. [Firestore Database Structure](#firestore-database-structure)
4. [Security Rules](#security-rules)
5. [Cloud Functions](#cloud-functions)
6. [Frontend Integration](#frontend-integration)
7. [Setup Instructions](#setup-instructions)
8. [Development Workflow](#development-workflow)
9. [Deployment](#deployment)
10. [Testing](#testing)

---

## Architecture Overview

HealthComm uses Firebase as its primary backend-as-a-service (BaaS) platform, providing:

- **Authentication**: User signup/login with email/password
- **Firestore**: NoSQL database for user profiles, vitals, alerts, and more
- **Cloud Functions**: Serverless backend logic for notifications, data validation, and scheduled tasks
- **Cloud Storage**: (Ready for) User-generated content (profile photos, medical documents)
- **Offline Persistence**: Local caching for offline functionality

### Data Flow

```
User Device → Firebase Auth → Firestore Database
                              ↓
                        Cloud Functions
                              ↓
                    Notifications / Emails / Scheduled Tasks
```

---

## Firebase Services Used

### 1. Firebase Authentication

**Purpose**: User registration and authentication

**Features Implemented**:
- Email/password authentication
- Email verification on signup
- Password reset functionality
- Role-based user profiles (Patient, Caretaker, Medical Professional)

**Files**:
- `/web/src/pages/Login.tsx` - Login with password reset
- `/web/src/pages/auth/Signup.tsx` - Registration with email verification
- `/web/src/contexts/AuthContext.tsx` - Auth state management

### 2. Cloud Firestore

**Purpose**: Real-time NoSQL database

**Features Implemented**:
- User profiles
- Patient vitals data
- Health alerts
- Device management
- Invitations
- Audit logs
- Notifications
- Medical notes

**Persistence**: Offline persistence enabled via `enableIndexedDbPersistence()`

**Files**:
- `/web/src/services/firebase.ts` - Firebase initialization
- `/bridge/firestore.rules` - Security rules
- `/bridge/firestore.indexes.json` - Composite indexes

### 3. Cloud Functions

**Purpose**: Serverless backend logic

**Functions Deployed**:
- `onUserCreated` - Initialize user profile
- `onVitalsCreated` - Update patient metadata
- `onAlertCreated` - Send notifications
- `sendInvitation` - Caretaker/doctor invitations
- `respondToInvitation` - Accept/decline invitations
- `exportVitalsData` - Export patient data
- `verifyMedicalCredentials` - Verify medical licenses
- `cleanupExpiredInvitations` - Scheduled cleanup (daily)
- `cleanupOldNotifications` - Scheduled cleanup (weekly)
- `generateDailyHealthReports` - Daily health summaries

**Files**:
- `/bridge/functions/src/index.ts` - All Cloud Functions

### 4. Cloud Storage

**Status**: Configured but not yet implemented

**Planned Usage**:
- User profile photos
- Medical reports (PDFs)
- ECG/vitals visualizations
- Prescription scans

---

## Firestore Database Structure

### Collections

#### 1. `/users/{userId}`

**Purpose**: User profiles for all roles

**Schema**:
```typescript
{
  uid: string;
  email: string;
  role: "patient" | "caretaker" | "medical";
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  emailVerified: boolean;
  createdAt: Timestamp;

  // Patient-specific
  bloodType?: string;
  knownAllergies?: string;
  chronicConditions?: string[];
  emergencyContact?: string;
  assignedCaretakerId?: string;
  assignedDoctorId?: string;
  connectedDevices?: Device[];
  activeDeviceId?: string;
  status?: "stable" | "warning" | "critical";
  lastVitals?: VitalData;

  // Caretaker-specific
  relationshipToPatient?: string;
  experienceYears?: number;
  certified?: boolean;

  // Medical-specific
  specialization?: string;
  yearsInPractice?: number;
  hospitalAffiliation?: string;
  licenseId?: string;
}
```

**Access Control**:
- Users can read/write their own document
- Caretakers can read assigned patients
- Medical professionals can read assigned patients

---

#### 2. `/patients/{patientId}/vitals/{vitalId}`

**Purpose**: Time-series vitals readings

**Schema**:
```typescript
{
  heartRate?: number;              // bpm
  bloodPressureSystolic?: number;  // mmHg
  bloodPressureDiastolic?: number; // mmHg
  oxygenLevel?: number;            // %
  temperature?: number;            // °C
  glucose?: number;                // mg/dL
  respiration?: number;            // bpm
  timestamp: Timestamp;
  deviceId: string;
}
```

**Access Control**:
- Patient can read/write their own vitals
- Assigned caretaker/doctor can read (view-only)

---

#### 3. `/patients/{patientId}/alerts/{alertId}`

**Purpose**: Health anomaly alerts

**Schema**:
```typescript
{
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: Timestamp;
  patientId?: string;
  patientName?: string;
}
```

**Triggers**:
- Automatically created by `/web/src/services/vitalsSyncService.ts` when vitals exceed thresholds
- Cloud Function `onAlertCreated` sends notifications to patient, caretaker, and doctor

**Access Control**:
- Patient can read/write their own alerts
- Assigned caretaker/doctor can read
- Medical professional can delete alerts

---

#### 4. `/invitations/{invitationId}`

**Purpose**: Caretaker/doctor assignment requests

**Schema**:
```typescript
{
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  type: "caretaker" | "doctor";
  status: "pending" | "accepted" | "declined";
  message?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // 7 days from creation
  respondedAt?: Timestamp;
  respondedBy?: string;
}
```

**Cloud Functions**:
- `sendInvitation` - Creates invitation
- `respondToInvitation` - Accepts/declines and updates user relationships

**Access Control**:
- Sender and recipient can read
- Only recipient can accept/decline
- Sender can delete

---

#### 5. `/notifications/{notificationId}`

**Purpose**: In-app notifications

**Schema**:
```typescript
{
  userId: string;
  type: "alert" | "invitation" | "system" | "reminder";
  severity?: "low" | "medium" | "high";
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  alertId?: string;
  invitationId?: string;
  createdAt: Timestamp;
  read: boolean;
  sent: boolean;
}
```

**Triggers**:
- Created by Cloud Function `onAlertCreated`
- Frontend hook: `/web/src/hooks/useNotifications.ts`

---

#### 6. `/auditLogs/{logId}`

**Purpose**: Compliance and security audit trail

**Schema**:
```typescript
{
  action: string;
  userId: string;
  timestamp: Timestamp;
  details: Record<string, unknown>;
  userAgent?: string;
}
```

**Usage**:
- Service: `/web/src/services/auditLogService.ts`
- Logs critical user actions (login, data export, invitation accepted, etc.)

**Access Control**:
- Users can only read their own logs
- No updates or deletes allowed

---

#### 7. `/medicalNotes/{noteId}`

**Purpose**: Doctor's notes on patients

**Schema**:
```typescript
{
  patientId: string;
  doctorId: string;
  note: string;
  createdAt: Timestamp;
}
```

**Access Control**:
- Only medical professionals can create
- Patient, assigned caretaker, and note author can read
- Only note author can update/delete

---

#### 8. `/dailyReports/{reportId}`

**Purpose**: Automated daily health summaries

**Schema**:
```typescript
{
  patientId: string;
  patientName: string;
  date: Timestamp;
  vitalsCount: number;
  alertsCount: number;
  highSeverityAlerts: number;
  status: "stable" | "warning" | "critical";
  createdAt: Timestamp;
}
```

**Triggers**:
- Generated by Cloud Function `generateDailyHealthReports` (daily at 6 AM)

---

## Security Rules

**File**: `/bridge/firestore.rules`

### Key Features

1. **Authentication Required**: All reads/writes require authentication
2. **Role-Based Access Control**:
   - Patients access their own data
   - Caretakers access assigned patients
   - Medical professionals access assigned patients
3. **Data Validation**:
   - Required fields enforced
   - Type checking (numbers, strings, timestamps)
   - Enum validation (e.g., role must be "patient" | "caretaker" | "medical")
4. **Immutability**: Critical fields (uid, email, role) cannot be modified
5. **Field-Level Security**: Different rules for different subcollections

### Important Rules

**User Creation**:
```javascript
allow create: if isOwner(userId) && isValidUserCreate();
```

**Vitals Access**:
```javascript
allow read: if hasPatientAccess(patientId);
allow create: if isOwner(patientId) && isValidVitalsReading();
```

**Invitations**:
```javascript
allow read: if recipientEmail == request.auth.token.email || senderId == request.auth.uid;
allow update: if recipientEmail == request.auth.token.email; // Accept/decline
```

---

## Cloud Functions

**File**: `/bridge/functions/src/index.ts`

### Firestore Triggers

#### `onUserCreated`
- **Trigger**: New document in `/users/{userId}`
- **Actions**:
  - Create audit log
  - Initialize patient metadata (if patient)
  - Queue welcome email

#### `onUserUpdated`
- **Trigger**: Document update in `/users/{userId}`
- **Actions**:
  - Validate no critical fields changed
  - Create audit log

#### `onVitalsCreated`
- **Trigger**: New document in `/patients/{patientId}/vitals/{vitalId}`
- **Actions**:
  - Increment patient vitals count
  - Update last vitals timestamp
  - Create audit log

#### `onAlertCreated`
- **Trigger**: New document in `/patients/{patientId}/alerts/{alertId}`
- **Actions**:
  - Update patient status (stable/warning/critical)
  - Create notifications for patient, caretaker, and doctor
  - Increment alert count
  - Create audit log

### Callable Functions

#### `sendInvitation`
- **Purpose**: Send caretaker/doctor invitation
- **Request**:
  ```typescript
  {
    recipientEmail: string;
    type: "caretaker" | "doctor";
    message?: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    invitationId: string;
  }
  ```

#### `respondToInvitation`
- **Purpose**: Accept or decline invitation
- **Request**:
  ```typescript
  {
    invitationId: string;
    action: "accept" | "decline";
  }
  ```
- **Actions**:
  - Update invitation status
  - If accepted, update user relationships (assignedCaretakerId/assignedDoctorId)

#### `exportVitalsData`
- **Purpose**: Export patient vitals as JSON/CSV
- **Request**:
  ```typescript
  {
    patientId: string;
    startDate?: string;
    endDate?: string;
    format?: "json" | "csv";
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    data: VitalsReading[];
    count: number;
    patientName: string;
  }
  ```
- **Access Control**: Verifies user has access to patient data

#### `verifyMedicalCredentials`
- **Purpose**: Submit medical license for verification
- **Request**:
  ```typescript
  {
    licenseId: string;
    specialization?: string;
  }
  ```
- **Note**: Placeholder for external verification service integration

### Scheduled Functions

#### `cleanupExpiredInvitations`
- **Schedule**: Daily at midnight
- **Action**: Delete pending invitations older than 7 days

#### `cleanupOldNotifications`
- **Schedule**: Weekly on Sunday at 2 AM
- **Action**: Delete read notifications older than 30 days

#### `generateDailyHealthReports`
- **Schedule**: Daily at 6 AM
- **Action**: Generate health summary for each patient

---

## Frontend Integration

### Services

#### `/web/src/services/firebase.ts`
- Firebase initialization
- Firestore, Auth, Functions, Storage exports
- Offline persistence enabled
- Emulator support (dev mode)

#### `/web/src/services/auditLogService.ts`
- Audit logging utility
- Predefined action constants
- Helper functions for common audit events

### Hooks

#### `/web/src/hooks/useAuth.ts`
- Auth state management
- User profile from Firestore

#### `/web/src/hooks/useNotifications.ts`
- Real-time notifications
- Mark as read functionality
- Filter by type/severity

#### `/web/src/hooks/useCloudFunctions.ts`
- `useSendInvitation`
- `useRespondToInvitation`
- `useExportVitalsData`
- `useVerifyMedicalCredentials`
- `useCallFunction` (generic)

#### `/web/src/hooks/usePatientAlerts.ts`
- Real-time alert listener
- Alert management

---

## Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enter project name: `healthcomm-bridge` (or your preferred name)
   - Enable Google Analytics (optional)

2. **Enable Services**:
   - **Authentication**:
     - Go to Authentication → Sign-in method
     - Enable "Email/Password"
   - **Firestore**:
     - Go to Firestore Database → Create database
     - Start in **production mode** (we have custom rules)
     - Choose location: `nam5` (US Central) or nearest
   - **Functions**:
     - Go to Functions → Get started
     - Upgrade to Blaze plan (required for Cloud Functions)
   - **Storage**:
     - Go to Storage → Get started

3. **Get Configuration**:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy config values

4. **Set Environment Variables**:
   - Create `/web/.env`:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_GOOGLE_FIT_CLIENT_ID=your_google_fit_client_id
     VITE_USE_FIREBASE_EMULATOR=false
     ```

### 2. Deploy Firestore Rules & Indexes

```bash
cd bridge
firebase login
firebase use --add  # Select your Firebase project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 3. Deploy Cloud Functions

```bash
cd bridge/functions
npm install
npm run build
firebase deploy --only functions
```

### 4. Install Frontend Dependencies

```bash
cd web
npm install
```

### 5. Run Development Server

```bash
cd web
npm run dev
```

---

## Development Workflow

### Local Development with Emulators

1. **Install Firebase Tools**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Start Emulators**:
   ```bash
   cd bridge
   firebase emulators:start
   ```

3. **Update .env**:
   ```env
   VITE_USE_FIREBASE_EMULATOR=true
   ```

4. **Start Frontend**:
   ```bash
   cd web
   npm run dev
   ```

### Testing Cloud Functions Locally

```bash
cd bridge/functions
npm run serve
```

### Viewing Firestore Data

- **Production**: Firebase Console → Firestore Database
- **Emulator**: `http://localhost:4000/firestore`

---

## Deployment

### Deploy All Services

```bash
cd bridge
firebase deploy
```

### Deploy Specific Services

```bash
# Rules only
firebase deploy --only firestore:rules

# Indexes only
firebase deploy --only firestore:indexes

# Functions only
firebase deploy --only functions

# Hosting only
firebase deploy --only hosting
```

### Deploy Specific Function

```bash
firebase deploy --only functions:sendInvitation
```

---

## Testing

### Unit Tests for Cloud Functions

```bash
cd bridge/functions
npm test
```

### Frontend E2E Tests

```bash
cd web
npm run test:e2e
```

### Manual Testing Checklist

- [ ] User signup with email verification
- [ ] Login with valid/invalid credentials
- [ ] Password reset flow
- [ ] Device connection and vitals sync
- [ ] Alert generation on anomalous vitals
- [ ] Invitation send/accept/decline
- [ ] Data export
- [ ] Notification delivery
- [ ] Offline functionality (disconnect network, test CRUD)
- [ ] Multi-role access (patient, caretaker, medical)

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.gitignore`
2. **Rotate API keys** - Regularly update in Firebase Console
3. **Monitor usage** - Set up billing alerts
4. **Review security rules** - Use Firestore Rules Simulator
5. **Enable App Check** - Protect against abuse (not yet implemented)
6. **Audit logs** - Regularly review for suspicious activity

---

## Monitoring & Analytics

### Firebase Console Dashboards

- **Authentication**: User growth, sign-in methods
- **Firestore**: Read/write operations, storage usage
- **Functions**: Execution count, errors, duration
- **Performance**: Web vitals, network requests (requires Performance Monitoring SDK)

### Error Reporting

- Cloud Functions automatically log errors to Firebase Console
- Frontend errors should be logged via `auditLogService.logError()`

---

## Troubleshooting

### Common Issues

#### "Permission denied" errors
- **Cause**: Security rules blocking access
- **Solution**: Check `/bridge/firestore.rules` and test with Rules Simulator

#### Cloud Function timeout
- **Cause**: Function exceeds 60s limit
- **Solution**: Increase timeout in `setGlobalOptions()` or optimize function

#### Offline persistence not working
- **Cause**: Multiple tabs open
- **Solution**: Close extra tabs or use separate browsers

#### Missing indexes
- **Cause**: Complex query without composite index
- **Solution**: Add index to `/bridge/firestore.indexes.json` and deploy

---

## Future Enhancements

- [ ] Firebase Cloud Messaging (FCM) for push notifications
- [ ] Firebase Storage for file uploads
- [ ] Firebase Performance Monitoring
- [ ] Firebase Crashlytics (for mobile)
- [ ] Custom claims for granular role permissions
- [ ] Firebase App Check for security
- [ ] Firestore data export/import scripts
- [ ] Automated backups to Cloud Storage

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Reference](https://firebase.google.com/docs/firestore/security/rules-reference)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

## Support

For questions or issues, please:
1. Check this documentation
2. Review Firebase Console logs
3. Check Cloud Function logs: `firebase functions:log`
4. Review audit logs in Firestore

---

**Last Updated**: 2025-10-26
