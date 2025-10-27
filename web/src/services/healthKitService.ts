/**
 * Apple HealthKit Service for iOS devices
 * This service provides access to health data from Apple Health app on iOS devices
 * Requires Capacitor and capacitor-health plugin
 *
 * NOTE: Current implementation uses capacitor-health plugin which has limited support
 * for medical vitals. Currently only supports heart rate from the required vitals.
 * Full support requires a custom plugin or different solution for:
 * - Blood Pressure (Systolic/Diastolic)
 * - Blood Glucose
 * - Body Temperature
 * - Oxygen Saturation
 * - Respiratory Rate
 */

import { Capacitor } from '@capacitor/core';
import { Health } from 'capacitor-health';
import type { VitalsReading, DataPoint } from './types';

// HealthKit data types that we need (note: not all are currently supported by capacitor-health)
// Kept for reference and future custom plugin implementation
// const HEALTH_KIT_TYPES = {
//   HEART_RATE: 'HKQuantityTypeIdentifierHeartRate',
//   BLOOD_PRESSURE_SYSTOLIC: 'HKQuantityTypeIdentifierBloodPressureSystolic',
//   BLOOD_PRESSURE_DIASTOLIC: 'HKQuantityTypeIdentifierBloodPressureDiastolic',
//   BLOOD_GLUCOSE: 'HKQuantityTypeIdentifierBloodGlucose',
//   BODY_TEMPERATURE: 'HKQuantityTypeIdentifierBodyTemperature',
//   OXYGEN_SATURATION: 'HKQuantityTypeIdentifierOxygenSaturation',
//   RESPIRATORY_RATE: 'HKQuantityTypeIdentifierRespiratoryRate',
// };

class HealthKitService {
  private isAuthorized = false;
  private onDataCallback?: (reading: VitalsReading) => void;
  private syncInterval?: NodeJS.Timeout;

  /**
   * Check if HealthKit is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're on a native iOS platform
      if (!Capacitor.isNativePlatform()) {
        console.log('Not a native platform');
        return false;
      }

      if (Capacitor.getPlatform() !== 'ios') {
        console.log('Not iOS platform, platform is:', Capacitor.getPlatform());
        return false;
      }

      // Use the Health plugin to check availability
      const result = await Health.isHealthAvailable();
      console.log('HealthKit availability check result:', result);
      return result.available;
    } catch (error) {
      console.error('Error checking HealthKit availability:', error);
      return false;
    }
  }

  /**
   * Request authorization to access HealthKit data
   */
  async requestAuthorization(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      throw new Error('HealthKit is not available on this device');
    }

    try {
      // Request permissions using capacitor-health API
      // Note: Currently only heart rate is fully supported by capacitor-health
      await Health.requestHealthPermissions({
        permissions: [
          'READ_HEART_RATE',
          // TODO: Add other permissions when custom plugin is available
          // 'READ_BLOOD_PRESSURE',
          // 'READ_BLOOD_GLUCOSE',
          // 'READ_BODY_TEMPERATURE',
          // 'READ_OXYGEN_SATURATION',
          // 'READ_RESPIRATORY_RATE',
        ],
      });

      this.isAuthorized = true;
      console.log('HealthKit authorization granted');
      return true;
    } catch (error) {
      console.error('Error requesting HealthKit authorization:', error);
      throw error;
    }
  }

  /**
   * Check if HealthKit is authorized
   */
  isHealthKitAuthorized(): boolean {
    return this.isAuthorized;
  }

  /**
   * Fetch heart rate data from HealthKit
   */
  async fetchHeartRate(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isAuthorized) {
      throw new Error('HealthKit not authorized');
    }

    try {
      // Query workouts with heart rate data
      const result = await Health.queryWorkouts({
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        includeHeartRate: true,
        includeRoute: false,
        includeSteps: false,
      });

      // Extract heart rate samples from workouts
      const heartRateData: DataPoint[] = [];
      result.workouts.forEach(workout => {
        if (workout.heartRate) {
          workout.heartRate.forEach(sample => {
            heartRateData.push({
              value: sample.bpm,
              timestamp: new Date(sample.timestamp),
              dataType: 'heartRate',
            });
          });
        }
      });

      return heartRateData;
    } catch (error) {
      console.error('Error fetching heart rate from HealthKit:', error);
      return [];
    }
  }

  /**
   * Fetch blood pressure data from HealthKit
   * TODO: Not yet implemented - requires custom plugin or different library
   */
  async fetchBloodPressure(_startTime: Date, _endTime: Date): Promise<DataPoint[]> {
    console.warn('Blood pressure fetching not yet implemented - requires custom HealthKit plugin');
    return [];
  }

  /**
   * Fetch blood glucose data from HealthKit
   * TODO: Not yet implemented - requires custom plugin or different library
   */
  async fetchBloodGlucose(_startTime: Date, _endTime: Date): Promise<DataPoint[]> {
    console.warn('Blood glucose fetching not yet implemented - requires custom HealthKit plugin');
    return [];
  }

  /**
   * Fetch body temperature data from HealthKit
   * TODO: Not yet implemented - requires custom plugin or different library
   */
  async fetchBodyTemperature(_startTime: Date, _endTime: Date): Promise<DataPoint[]> {
    console.warn('Body temperature fetching not yet implemented - requires custom HealthKit plugin');
    return [];
  }

  /**
   * Fetch oxygen saturation data from HealthKit
   * TODO: Not yet implemented - requires custom plugin or different library
   */
  async fetchOxygenSaturation(_startTime: Date, _endTime: Date): Promise<DataPoint[]> {
    console.warn('Oxygen saturation fetching not yet implemented - requires custom HealthKit plugin');
    return [];
  }

  /**
   * Fetch all vitals data for a time range
   */
  async fetchAllVitals(startTime: Date, endTime: Date): Promise<VitalsReading[]> {
    if (!this.isAuthorized) {
      throw new Error('HealthKit not authorized');
    }

    try {
      const [heartRate, bloodPressure, glucose, temperature, oxygen] = await Promise.all([
        this.fetchHeartRate(startTime, endTime),
        this.fetchBloodPressure(startTime, endTime),
        this.fetchBloodGlucose(startTime, endTime),
        this.fetchBodyTemperature(startTime, endTime),
        this.fetchOxygenSaturation(startTime, endTime),
      ]);

      // Combine all data points by timestamp
      const vitalsMap = new Map<number, VitalsReading>();

      // Process heart rate
      heartRate.forEach(point => {
        const timestamp = point.timestamp.getTime();
        if (!vitalsMap.has(timestamp)) {
          vitalsMap.set(timestamp, {
            timestamp: point.timestamp,
            deviceId: 'apple-health',
          });
        }
        vitalsMap.get(timestamp)!.heartRate = point.value;
      });

      // Process blood pressure
      bloodPressure.forEach(point => {
        const timestamp = point.timestamp.getTime();
        if (!vitalsMap.has(timestamp)) {
          vitalsMap.set(timestamp, {
            timestamp: point.timestamp,
            deviceId: 'apple-health',
          });
        }
        const reading = vitalsMap.get(timestamp)!;
        if (point.dataType === 'systolic') {
          reading.bloodPressureSystolic = point.value;
        } else if (point.dataType === 'diastolic') {
          reading.bloodPressureDiastolic = point.value;
        }
      });

      // Process glucose
      glucose.forEach(point => {
        const timestamp = point.timestamp.getTime();
        if (!vitalsMap.has(timestamp)) {
          vitalsMap.set(timestamp, {
            timestamp: point.timestamp,
            deviceId: 'apple-health',
          });
        }
        vitalsMap.get(timestamp)!.glucose = point.value;
      });

      // Process temperature
      temperature.forEach(point => {
        const timestamp = point.timestamp.getTime();
        if (!vitalsMap.has(timestamp)) {
          vitalsMap.set(timestamp, {
            timestamp: point.timestamp,
            deviceId: 'apple-health',
          });
        }
        vitalsMap.get(timestamp)!.temperature = point.value;
      });

      // Process oxygen
      oxygen.forEach(point => {
        const timestamp = point.timestamp.getTime();
        if (!vitalsMap.has(timestamp)) {
          vitalsMap.set(timestamp, {
            timestamp: point.timestamp,
            deviceId: 'apple-health',
          });
        }
        vitalsMap.get(timestamp)!.oxygenLevel = point.value;
      });

      return Array.from(vitalsMap.values()).sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );
    } catch (error) {
      console.error('Error fetching all vitals from HealthKit:', error);
      return [];
    }
  }


  /**
   * Start automatic sync of vitals data
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    this.syncRecentVitals();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncRecentVitals();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Sync recent vitals (last hour)
   */
  private async syncRecentVitals(): Promise<void> {
    if (!this.isAuthorized) {
      return;
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

    try {
      const vitals = await this.fetchAllVitals(startTime, endTime);

      // Emit each reading
      vitals.forEach(reading => {
        if (this.onDataCallback) {
          this.onDataCallback(reading);
        }
      });
    } catch (error) {
      console.error('Error syncing recent vitals from HealthKit:', error);
    }
  }

  /**
   * Set callback for vitals data
   */
  onData(callback: (reading: VitalsReading) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Disconnect from HealthKit
   */
  async disconnect(): Promise<void> {
    this.isAuthorized = false;
    this.stopAutoSync();
  }

  /**
   * Manual sync - fetch vitals for the last 24 hours
   */
  async manualSync(): Promise<VitalsReading[]> {
    if (!this.isAuthorized) {
      throw new Error('HealthKit not authorized');
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    return this.fetchAllVitals(startTime, endTime);
  }
}

// Export singleton instance
export const healthKitService = new HealthKitService();
