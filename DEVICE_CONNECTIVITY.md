# Device Connectivity Guide

This guide explains how to connect real health monitoring devices to HealthComm and sync vitals data in real-time.

## Overview

HealthComm now supports connecting to real health devices through four methods:

1. **Bluetooth LE Devices** - Direct connection to Bluetooth health monitors
2. **Google Fit** - Sync data from Android devices and connected fitness trackers
3. **Apple Health** - Sync data from iPhone, Apple Watch, and connected health devices (iOS only)
4. **Manual Entry** - Add devices manually for testing or unsupported devices

## Features

- Real-time vitals monitoring from connected devices
- Automatic data synchronization every 5 minutes
- Support for multiple device types:
  - Heart Rate Monitors
  - Blood Pressure Monitors
  - Pulse Oximeters (SpO2)
  - Glucose Monitors
  - Thermometers
- Automatic anomaly detection and alert generation
- Dynamic chart updates based on time range selection (1h, 6h, 12h, 24h)
- Support for multiple simultaneous devices

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `web/` directory based on `.env.example`:

```bash
cd web
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# Firebase Configuration (already configured if app is running)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Fit API Configuration (required for Google Fit integration)
VITE_GOOGLE_FIT_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 2. Google Fit Setup (Optional)

To enable Google Fit integration:

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Fit API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Fitness API"
   - Click "Enable"

#### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: HealthComm Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**: (leave empty for implicit flow)
5. Copy the Client ID and add to `.env` as `VITE_GOOGLE_FIT_CLIENT_ID`

#### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Fill in required information:
   - App name: HealthComm
   - User support email: your email
   - Developer contact: your email
3. Add scopes:
   - `https://www.googleapis.com/auth/fitness.heart_rate.read`
   - `https://www.googleapis.com/auth/fitness.blood_pressure.read`
   - `https://www.googleapis.com/auth/fitness.blood_glucose.read`
   - `https://www.googleapis.com/auth/fitness.body_temperature.read`
   - `https://www.googleapis.com/auth/fitness.oxygen_saturation.read`

### 3. Browser Requirements

#### For Bluetooth Connectivity:
- Chrome, Edge, or Opera browser (Web Bluetooth API support required)
- HTTPS connection (required for Bluetooth API)
- Bluetooth enabled on the device

#### For Google Fit:
- Any modern browser
- Google account with Fit data

#### For Apple Health:
- iOS 13.0 or later
- iPhone or iPad device (not supported in web browsers or simulator)
- Native iOS app built with Capacitor
- HealthKit capability enabled

## Using Device Connectivity

### Connecting a Bluetooth Device

1. Navigate to the Patient Dashboard
2. Click "Add Device" or go to Device Management
3. Select **Bluetooth** connection method
4. Choose your device type:
   - Heart Rate Monitor
   - Blood Pressure Monitor
   - Pulse Oximeter
   - Glucose Monitor
   - Thermometer
5. Click the device type - browser will prompt to select device
6. Choose your device from the list
7. Device will connect and start streaming data automatically

**Supported Bluetooth Devices:**

The app supports standard Bluetooth GATT health device profiles:
- Heart Rate Service (0x180D)
- Blood Pressure Service (0x1810)
- Glucose Service (0x1808)
- Health Thermometer Service (0x1809)
- Pulse Oximeter Service (0x1822)

Most modern health devices that advertise these services will work, including:
- Fitbit, Garmin, Polar heart rate monitors
- Omron, Withings blood pressure monitors
- Nonin, Masimo pulse oximeters
- Accu-Chek, OneTouch glucose monitors
- Braun, Kinsa thermometers

### Connecting Google Fit

1. Navigate to the Patient Dashboard
2. Click "Add Device" or go to Device Management
3. Select **Google Fit** connection method
4. Review the data permissions
5. Click "Connect Google Fit"
6. Sign in with your Google account
7. Grant permissions to access Fitness data
8. Data will sync automatically every 5 minutes

**What data is synced:**
- Last 24 hours of vitals data on initial connection
- Continuous sync every 5 minutes for new data
- Heart rate, blood pressure, glucose, temperature, SpO2

### Connecting Apple Health (iOS)

**Prerequisites:**
- iOS 13.0 or later
- iPhone or iPad device
- Capacitor configured (see IOS_HEALTHKIT_SETUP.md)
- HealthKit capability enabled in Xcode

**Setup Steps:**

1. Follow the complete setup guide in `IOS_HEALTHKIT_SETUP.md`
2. Build and deploy the app to your iOS device
3. Navigate to the Patient Dashboard
4. Click "Add Device" or go to Device Management
5. Select **Apple Health** connection method
6. Review the data permissions
7. Click "Connect Apple Health"
8. Grant permissions to access Health data types
9. Data will sync automatically every 5 minutes

**What data is synced:**
- Last 24 hours of vitals data on initial connection
- Continuous auto-sync every 5 minutes for new data
- Heart rate, blood pressure, glucose, temperature, SpO2
- Data from iPhone Health app, Apple Watch, and connected devices

**Important Notes:**
- Apple Health integration only works on physical iOS devices (not simulator)
- Requires proper HealthKit capability and privacy strings in Info.plist
- Data syncs from the iOS Health app, which aggregates data from multiple sources
- Users must have granted HealthComm access to specific health data types

For detailed iOS setup instructions, see [IOS_HEALTHKIT_SETUP.md](./IOS_HEALTHKIT_SETUP.md)

### Manual Device Entry

For devices that don't support Bluetooth or Google Fit:

1. Click "Add Device"
2. Select **Manual** connection method
3. Fill in device details:
   - Device name
   - Device type
   - Manufacturer
   - Model
   - Firmware version
   - Battery level
4. Click "Add Device"

Note: Manual devices won't automatically sync data. Use this for testing or documentation purposes.

## Data Synchronization

### Automatic Sync

Once connected, devices automatically sync data:

- **Bluetooth devices**: Real-time as measurements occur
- **Google Fit**: Every 5 minutes
- **Apple Health**: Every 5 minutes
- All data is stored in Firebase with timestamps
- Charts update automatically with new data

### Manual Sync

To force a sync:

1. Go to Device Management
2. Click the refresh icon on any device
3. Or use the "Sync Now" button in the vitals section

### Sync Status

Device status indicators:
- **Green (Online)**: Device connected and syncing
- **Blue (Syncing)**: Currently fetching data
- **Gray (Offline)**: Device disconnected
- **Red (Error)**: Connection error

## Vitals Monitoring

### Real-time Display

The Patient Dashboard shows:
- Current vitals (latest reading)
- Historical trends (charts)
- Time range selector (1h, 6h, 12h, 24h)

### Supported Vitals

- **Heart Rate** (bpm)
- **Blood Pressure** (mmHg) - Systolic/Diastolic
- **Oxygen Saturation** (%)
- **Body Temperature** (°C)
- **Blood Glucose** (mg/dL)
- **Respiration Rate** (bpm) - if device supports

### Anomaly Detection

The system automatically detects abnormal vitals:

**Heart Rate:**
- High: > 100 bpm (alert if > 120 bpm)
- Low: < 60 bpm (alert if < 50 bpm)

**Blood Pressure:**
- High: > 140/90 mmHg (alert if > 160 mmHg)
- Low: < 90/60 mmHg

**Oxygen Saturation:**
- Low: < 95% (alert if < 90%)

**Temperature:**
- High: > 37.5°C (alert if > 38.5°C)
- Low: < 36°C

**Glucose:**
- High: > 180 mg/dL (alert if > 250 mg/dL)
- Low: < 70 mg/dL (alert if < 54 mg/dL)

Alerts are automatically created and visible to:
- The patient
- Assigned medical professionals
- Assigned caretakers

## Troubleshooting

### Bluetooth Connection Issues

**Device not appearing:**
- Ensure device is in pairing mode
- Check device is not already connected to another app
- Verify device has sufficient battery
- Make sure Bluetooth is enabled on your computer

**Connection drops:**
- Move closer to the device
- Check for interference from other Bluetooth devices
- Ensure device battery isn't low
- Try reconnecting the device

**Browser shows "Bluetooth not supported":**
- Use Chrome, Edge, or Opera browser
- Ensure you're using HTTPS (required for Bluetooth API)
- Update your browser to the latest version

### Google Fit Issues

**Authorization fails:**
- Verify OAuth credentials are correct
- Check that Fitness API is enabled in Google Cloud Console
- Ensure authorized origins match your domain
- Try clearing browser cache and cookies

**No data syncing:**
- Verify you have health data in Google Fit app
- Check that all required scopes are authorized
- Try disconnecting and reconnecting
- Check browser console for error messages

**Missing vitals:**
- Google Fit may not have all vitals types
- Ensure source apps (like Samsung Health) are syncing to Fit
- Some vitals may only be available on certain devices

### General Issues

**Data not updating:**
- Check device status (should be green/online)
- Try manual sync using refresh button
- Verify internet connection
- Check Firebase connection

**Charts not showing data:**
- Ensure time range includes your data
- Try different time ranges (1h, 6h, 12h, 24h)
- Check that vitals were actually recorded
- Refresh the page

## Technical Architecture

### Services

**bluetoothService.ts**
- Manages Web Bluetooth connections
- Parses GATT characteristics
- Emits real-time vitals readings

**healthPlatformService.ts**
- Google Fit API integration
- Fetches historical data
- Manages OAuth flow

**vitalsSyncService.ts**
- Coordinates all data sources
- Saves to Firebase
- Performs anomaly detection
- Manages sync intervals

### Data Flow

```
Device → Bluetooth/Google Fit → vitalsSyncService
                                        ↓
                                  Firebase Firestore
                                        ↓
                              Real-time Listeners
                                        ↓
                              Patient Dashboard
                                        ↓
                                 Charts Update
```

### Firebase Structure

```
users/{userId}
  - connectedDevices: Device[]
  - activeDeviceId: string
  - lastVitals: VitalData
  - status: "stable" | "warning" | "critical"

patients/{patientId}/vitals/{vitalId}
  - heartRate: number
  - bloodPressureSystolic: number
  - bloodPressureDiastolic: number
  - oxygenLevel: number
  - temperature: number
  - glucose: number
  - timestamp: Firestore Timestamp
  - deviceId: string

patients/{patientId}/alerts/{alertId}
  - title: string
  - message: string
  - severity: "low" | "medium" | "high"
  - timestamp: Firestore Timestamp
```

## Privacy & Security

### Data Handling

- All vitals data is encrypted in transit (HTTPS)
- Firebase handles data encryption at rest
- OAuth tokens are never stored
- Bluetooth connections are local (peer-to-peer)

### Permissions

The app requests:
- **Bluetooth**: To connect to health devices
- **Google Fit**: Read-only access to health data

The app never:
- Writes data to Google Fit
- Shares data with third parties
- Stores OAuth credentials

### HIPAA Compliance

For production use:
- Enable Firebase HIPAA-compliant mode
- Use Business Associate Agreement (BAA)
- Implement audit logging
- Add user consent forms
- Enable data encryption

## Development

### Testing with Mock Devices

For development without real devices:

1. Use Chrome DevTools Device Simulator
2. Mock Bluetooth devices using [Web Bluetooth Test API](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/test-api.md)
3. Use Google Fit API Explorer to add test data

### Adding New Device Types

To support additional device types:

1. Add GATT service UUID to `bluetoothService.ts`
2. Implement characteristic parser
3. Update `DeviceType` in `AuthTypes.ts`
4. Add UI option in `AddDeviceModal.tsx`
5. Update anomaly detection thresholds in `vitalsSyncService.ts`

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Ensure all environment variables are set
- Verify device compatibility

## Future Enhancements

Planned features:
- Samsung Health integration
- Fitbit API integration
- Continuous glucose monitoring (CGM) support
- ECG data visualization
- Sleep tracking
- Activity monitoring
- Medication reminders synced with vitals
- Background health data sync (iOS)
- Health trends and predictions using ML
