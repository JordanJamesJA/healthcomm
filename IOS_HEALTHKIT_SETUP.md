# iOS HealthKit Setup Guide

This document provides instructions for setting up Apple HealthKit integration in the HealthComm iOS app.

## Prerequisites

- Xcode 14.0 or later
- iOS 13.0 or later target
- Apple Developer account with HealthKit capability enabled
- Capacitor installed (`npm install @capacitor/core @capacitor/cli`)

## 1. Install Capacitor and iOS Platform

```bash
cd web
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios
npx cap init
npx cap add ios
```

## 2. Install HealthKit Plugin

Install the `capacitor-health` plugin which supports both iOS HealthKit and Android Health Connect:

```bash
npm install capacitor-health
npx cap sync
```

**Note:** The current `capacitor-health` plugin has limited support for medical vitals. It currently supports:
- Heart rate data (via workout queries)
- Steps, calories, distance
- Workout data

For full support of blood pressure, glucose, temperature, oxygen saturation, and respiratory rate, you may need to:
- Create a custom Capacitor plugin
- Use a different library
- Contribute to the capacitor-health plugin to add these data types

## 3. Configure Info.plist

Open your iOS project in Xcode:

```bash
npx cap open ios
```

Add the following keys to your `Info.plist` file (in `ios/App/App/Info.plist`):

```xml
<key>NSHealthShareUsageDescription</key>
<string>HealthComm needs access to your health data to monitor and track your vital signs for healthcare providers.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>HealthComm would like to update your health data (if needed for future features).</string>

<!-- Optional: If you plan to use HealthKit background delivery -->
<key>UIBackgroundModes</key>
<array>
    <string>processing</string>
    <string>fetch</string>
</array>
```

### Privacy Strings

Customize these strings to match your app's specific use case:

- **NSHealthShareUsageDescription**: Explains why you need to read health data
- **NSHealthUpdateUsageDescription**: Explains why you need to write health data (if applicable)

## 4. Enable HealthKit Capability

1. Open your project in Xcode
2. Select your app target (HealthComm)
3. Go to the "Signing & Capabilities" tab
4. Click "+ Capability"
5. Search for and add "HealthKit"
6. Check "Clinical Health Records" if needed

## 5. Configure HealthKit Entitlements

The HealthKit capability should automatically create an entitlements file. Verify it contains:

```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.access</key>
<array>
    <string>health-records</string>
</array>
```

## 6. Configure App Identifier

1. Log in to Apple Developer Portal (https://developer.apple.com)
2. Go to "Certificates, Identifiers & Profiles"
3. Select "Identifiers" and find your app ID (`com.healthcomm.app`)
4. Enable "HealthKit" capability
5. Save changes

## 7. Configure Provisioning Profile

Create or update your provisioning profile to include HealthKit:

1. In Apple Developer Portal, go to "Profiles"
2. Create a new profile or edit existing one
3. Ensure it includes the HealthKit capability
4. Download and install the profile in Xcode

## 8. Build and Test

```bash
# Sync changes to iOS project
npx cap sync

# Build the app
npx cap run ios
```

## Health Data Types

The app requests access to the following HealthKit data types:

| Data Type | HealthKit Identifier |
|-----------|---------------------|
| Heart Rate | `HKQuantityTypeIdentifierHeartRate` |
| Blood Pressure (Systolic) | `HKQuantityTypeIdentifierBloodPressureSystolic` |
| Blood Pressure (Diastolic) | `HKQuantityTypeIdentifierBloodPressureDiastolic` |
| Blood Glucose | `HKQuantityTypeIdentifierBloodGlucose` |
| Body Temperature | `HKQuantityTypeIdentifierBodyTemperature` |
| Oxygen Saturation | `HKQuantityTypeIdentifierOxygenSaturation` |
| Respiratory Rate | `HKQuantityTypeIdentifierRespiratoryRate` |

## Testing HealthKit Integration

### Using iOS Simulator

The iOS Simulator does not fully support HealthKit. To test:

1. Use a physical iOS device
2. Open the Health app on your device
3. Add sample data manually or use a connected device
4. Test the HealthComm app connection

### Adding Test Data

1. Open Health app on iPhone
2. Go to "Browse" → select a category (e.g., "Heart")
3. Tap "Heart Rate" → "Add Data"
4. Enter test values with timestamps
5. Test syncing in HealthComm app

### Debugging

Enable logging in `healthKitService.ts`:

```typescript
console.log('HealthKit authorization requested');
console.log('HealthKit data fetched:', data);
```

Check Xcode console for native iOS logs.

## Common Issues

### 1. "HealthKit is not available on this device"

**Solution**: Ensure you're testing on a physical iOS device, not a simulator.

### 2. Authorization Popup Doesn't Appear

**Solution**:
- Check Info.plist contains the required privacy strings
- Verify HealthKit capability is enabled in Xcode
- Reset HealthKit permissions: Settings → Privacy → Health → HealthComm → Reset

### 3. No Data Syncing

**Solution**:
- Verify Health app contains data for the requested types
- Check date range in query (default is last 24 hours)
- Ensure authorization was granted for specific data types

### 4. Build Errors

**Solution**:
- Run `npx cap sync` after any configuration changes
- Clean build folder in Xcode (Shift + Cmd + K)
- Verify provisioning profile includes HealthKit

## Production Deployment

Before deploying to App Store:

1. **App Store Connect**:
   - Enable HealthKit capability for your app
   - Provide clear privacy policy explaining health data usage

2. **App Review**:
   - Apple reviews HealthKit usage carefully
   - Ensure your privacy strings are clear and accurate
   - Be prepared to explain how health data is used and protected

3. **Privacy Policy**:
   - Must explain what health data is collected
   - How data is used, stored, and shared
   - User rights regarding their health data

## Security & Privacy

### HIPAA Compliance

- All health data must be encrypted in transit (HTTPS)
- Store sensitive data securely (Firebase with encryption)
- Implement proper access controls
- Maintain audit logs
- Sign a Business Associate Agreement (BAA) with Firebase

### Best Practices

1. **Minimize Data Collection**: Only request access to health data types you actually use
2. **Transparent Communication**: Clearly explain to users why each data type is needed
3. **Secure Storage**: Never store HealthKit data locally without encryption
4. **User Control**: Allow users to disconnect and delete their data
5. **Regular Audits**: Periodically review data access and usage

## Additional Resources

- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [capacitor-health Plugin](https://www.npmjs.com/package/capacitor-health)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html)

## Support

For issues specific to:
- **HealthKit API**: Consult Apple Developer Forums
- **Capacitor**: Check Capacitor GitHub issues
- **HealthComm App**: Create an issue in the project repository
