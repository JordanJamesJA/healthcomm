/**
 * Vitals Sync Service
 * Coordinates data collection from various sources (Bluetooth devices, health platforms)
 * and syncs to Firebase for real-time monitoring
 */

import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { bluetoothService, VitalsReading } from './bluetoothService';
import { healthPlatformService } from './healthPlatformService';

export interface SyncConfig {
  userId: string;
  autoSyncInterval?: number; // minutes
  googleFitClientId?: string;
}

export interface SyncStatus {
  isBluetoothConnected: boolean;
  isGoogleFitConnected: boolean;
  lastSyncTime?: Date;
  syncedDevices: string[];
}

class VitalsSyncService {
  private config?: SyncConfig;
  private syncInterval?: NodeJS.Timeout;
  private isInitialized = false;
  private lastSyncTime?: Date;

  /**
   * Initialize the sync service
   */
  async initialize(config: SyncConfig): Promise<void> {
    this.config = config;

    // Initialize health platform service
    if (config.googleFitClientId) {
      healthPlatformService.initialize({
        googleFitClientId: config.googleFitClientId,
      });
    }

    // Set up data callbacks
    this.setupDataCallbacks();

    this.isInitialized = true;
    console.log('Vitals sync service initialized');
  }

  /**
   * Set up callbacks for receiving data from various sources
   */
  private setupDataCallbacks(): void {
    // Bluetooth device data
    bluetoothService.onData((reading) => {
      this.saveVitalsReading(reading);
    });

    // Health platform data
    healthPlatformService.onData((reading) => {
      this.saveVitalsReading(reading);
    });
  }

  /**
   * Connect to a Bluetooth device
   */
  async connectBluetoothDevice(
    deviceType: 'heart_rate' | 'blood_pressure' | 'glucose' | 'temperature' | 'pulse_oximeter'
  ): Promise<{ id: string; name: string; type: string }> {
    if (!bluetoothService.isSupported()) {
      throw new Error('Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }

    try {
      const deviceInfo = await bluetoothService.connectDevice(deviceType);

      // Update device status in Firebase
      await this.updateDeviceStatus(deviceInfo.id, 'online');

      console.log(`Connected to Bluetooth device: ${deviceInfo.name}`);

      return {
        id: deviceInfo.id,
        name: deviceInfo.name,
        type: deviceInfo.type,
      };
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      throw error;
    }
  }

  /**
   * Connect to Google Fit
   */
  async connectGoogleFit(): Promise<boolean> {
    try {
      const success = await healthPlatformService.authorizeGoogleFit();

      if (success) {
        // Start auto-sync for Google Fit data
        healthPlatformService.startAutoSync(this.config?.autoSyncInterval || 5);

        // Do initial sync of recent data
        await this.syncGoogleFitData();

        console.log('Connected to Google Fit');
      }

      return success;
    } catch (error) {
      console.error('Error connecting to Google Fit:', error);
      throw error;
    }
  }

  /**
   * Sync recent data from Google Fit
   */
  private async syncGoogleFitData(): Promise<void> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    try {
      const vitals = await healthPlatformService.fetchAllVitals(startTime, endTime);

      // Save all vitals to Firebase
      for (const reading of vitals) {
        await this.saveVitalsReading(reading);
      }

      this.lastSyncTime = new Date();
      console.log(`Synced ${vitals.length} vitals from Google Fit`);
    } catch (error) {
      console.error('Error syncing Google Fit data:', error);
    }
  }

  /**
   * Save a vitals reading to Firebase
   */
  private async saveVitalsReading(reading: VitalsReading): Promise<void> {
    if (!this.config?.userId) {
      console.error('User ID not set, cannot save vitals');
      return;
    }

    try {
      // Save to vitals subcollection
      const vitalsRef = collection(db, `patients/${this.config.userId}/vitals`);

      const vitalData: any = {
        timestamp: Timestamp.fromDate(reading.timestamp),
        deviceId: reading.deviceId,
      };

      // Only include non-undefined values
      if (reading.heartRate !== undefined) vitalData.heartRate = reading.heartRate;
      if (reading.bloodPressureSystolic !== undefined)
        vitalData.bloodPressureSystolic = reading.bloodPressureSystolic;
      if (reading.bloodPressureDiastolic !== undefined)
        vitalData.bloodPressureDiastolic = reading.bloodPressureDiastolic;
      if (reading.oxygenLevel !== undefined) vitalData.oxygenLevel = reading.oxygenLevel;
      if (reading.temperature !== undefined) vitalData.temperature = reading.temperature;
      if (reading.glucose !== undefined) vitalData.glucose = reading.glucose;

      await addDoc(vitalsRef, vitalData);

      // Update user's last vitals
      const userRef = doc(db, 'users', this.config.userId);
      await updateDoc(userRef, {
        lastVitals: vitalData,
      });

      console.log('Vitals saved to Firebase:', vitalData);

      // Check for anomalies and create alerts if needed
      await this.checkForAnomalies(reading);
    } catch (error) {
      console.error('Error saving vitals to Firebase:', error);
      throw error;
    }
  }

  /**
   * Check vitals for anomalies and create alerts
   */
  private async checkForAnomalies(reading: VitalsReading): Promise<void> {
    if (!this.config?.userId) return;

    const alerts: { title: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];

    // Heart rate checks
    if (reading.heartRate) {
      if (reading.heartRate > 100) {
        alerts.push({
          title: 'High Heart Rate',
          message: `Heart rate is ${reading.heartRate} bpm (elevated)`,
          severity: reading.heartRate > 120 ? 'high' : 'medium',
        });
      } else if (reading.heartRate < 60) {
        alerts.push({
          title: 'Low Heart Rate',
          message: `Heart rate is ${reading.heartRate} bpm (below normal)`,
          severity: reading.heartRate < 50 ? 'high' : 'medium',
        });
      }
    }

    // Blood pressure checks
    if (reading.bloodPressureSystolic && reading.bloodPressureDiastolic) {
      if (reading.bloodPressureSystolic > 140 || reading.bloodPressureDiastolic > 90) {
        alerts.push({
          title: 'High Blood Pressure',
          message: `BP is ${reading.bloodPressureSystolic}/${reading.bloodPressureDiastolic} mmHg (elevated)`,
          severity: reading.bloodPressureSystolic > 160 ? 'high' : 'medium',
        });
      } else if (reading.bloodPressureSystolic < 90 || reading.bloodPressureDiastolic < 60) {
        alerts.push({
          title: 'Low Blood Pressure',
          message: `BP is ${reading.bloodPressureSystolic}/${reading.bloodPressureDiastolic} mmHg (low)`,
          severity: 'medium',
        });
      }
    }

    // Oxygen level checks
    if (reading.oxygenLevel) {
      if (reading.oxygenLevel < 95) {
        alerts.push({
          title: 'Low Oxygen Saturation',
          message: `Oxygen level is ${reading.oxygenLevel}% (below normal)`,
          severity: reading.oxygenLevel < 90 ? 'high' : 'medium',
        });
      }
    }

    // Temperature checks
    if (reading.temperature) {
      if (reading.temperature > 37.5) {
        alerts.push({
          title: 'Elevated Temperature',
          message: `Temperature is ${reading.temperature}°C (elevated)`,
          severity: reading.temperature > 38.5 ? 'high' : 'medium',
        });
      } else if (reading.temperature < 36) {
        alerts.push({
          title: 'Low Temperature',
          message: `Temperature is ${reading.temperature}°C (below normal)`,
          severity: 'medium',
        });
      }
    }

    // Glucose checks
    if (reading.glucose) {
      if (reading.glucose > 180) {
        alerts.push({
          title: 'High Blood Glucose',
          message: `Glucose is ${reading.glucose} mg/dL (elevated)`,
          severity: reading.glucose > 250 ? 'high' : 'medium',
        });
      } else if (reading.glucose < 70) {
        alerts.push({
          title: 'Low Blood Glucose',
          message: `Glucose is ${reading.glucose} mg/dL (low)`,
          severity: reading.glucose < 54 ? 'high' : 'medium',
        });
      }
    }

    // Save alerts to Firebase
    if (alerts.length > 0) {
      const alertsRef = collection(db, `patients/${this.config.userId}/alerts`);

      for (const alert of alerts) {
        await addDoc(alertsRef, {
          ...alert,
          timestamp: Timestamp.now(),
          patientId: this.config.userId,
        });
      }

      // Update user status based on highest severity
      const highestSeverity = alerts.some(a => a.severity === 'high')
        ? 'critical'
        : alerts.some(a => a.severity === 'medium')
        ? 'warning'
        : 'stable';

      const userRef = doc(db, 'users', this.config.userId);
      await updateDoc(userRef, {
        status: highestSeverity,
      });

      console.log(`Created ${alerts.length} alert(s)`);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isBluetoothConnected: bluetoothService.getConnectedDevices().length > 0,
      isGoogleFitConnected: healthPlatformService.isGoogleFitConnected(),
      lastSyncTime: this.lastSyncTime,
      syncedDevices: bluetoothService.getConnectedDevices(),
    };
  }

  /**
   * Update device status in Firebase
   */
  private async updateDeviceStatus(
    deviceId: string,
    status: 'online' | 'offline' | 'syncing' | 'error'
  ): Promise<void> {
    if (!this.config?.userId) return;

    try {
      const userRef = doc(db, 'users', this.config.userId);

      // This will be handled by the DeviceContext, but we can also update here
      console.log(`Device ${deviceId} status: ${status}`);
    } catch (error) {
      console.error('Error updating device status:', error);
    }
  }

  /**
   * Disconnect from a Bluetooth device
   */
  async disconnectBluetoothDevice(deviceId: string): Promise<void> {
    await bluetoothService.disconnectDevice(deviceId);
    await this.updateDeviceStatus(deviceId, 'offline');
  }

  /**
   * Disconnect from Google Fit
   */
  async disconnectGoogleFit(): Promise<void> {
    await healthPlatformService.disconnectGoogleFit();
  }

  /**
   * Start automatic periodic sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      // Sync Google Fit data if connected
      if (healthPlatformService.isGoogleFitConnected()) {
        await this.syncGoogleFitData();
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Auto-sync started (interval: ${intervalMinutes} minutes)`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
      console.log('Auto-sync stopped');
    }
  }

  /**
   * Manually trigger a sync
   */
  async manualSync(): Promise<void> {
    if (healthPlatformService.isGoogleFitConnected()) {
      await this.syncGoogleFitData();
    }
  }
}

// Export singleton instance
export const vitalsSyncService = new VitalsSyncService();
