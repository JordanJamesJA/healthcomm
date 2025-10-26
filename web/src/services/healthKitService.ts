/**
 * Apple HealthKit Service for iOS devices
 * This service provides access to health data from Apple Health app on iOS devices
 * Requires Capacitor and @capacitor-community/health plugin
 */

import type { VitalsReading, DataPoint } from './types';

// HealthKit data types
const HEALTH_KIT_TYPES = {
  HEART_RATE: 'HKQuantityTypeIdentifierHeartRate',
  BLOOD_PRESSURE_SYSTOLIC: 'HKQuantityTypeIdentifierBloodPressureSystolic',
  BLOOD_PRESSURE_DIASTOLIC: 'HKQuantityTypeIdentifierBloodPressureDiastolic',
  BLOOD_GLUCOSE: 'HKQuantityTypeIdentifierBloodGlucose',
  BODY_TEMPERATURE: 'HKQuantityTypeIdentifierBodyTemperature',
  OXYGEN_SATURATION: 'HKQuantityTypeIdentifierOxygenSaturation',
  RESPIRATORY_RATE: 'HKQuantityTypeIdentifierRespiratoryRate',
};

// Type for HealthKit plugin
interface HealthKitPlugin {
  requestAuthorization(options: {
    read: string[];
    write?: string[];
  }): Promise<void>;

  isAvailable(): Promise<{ available: boolean }>;

  queryHKitSampleType(options: {
    sampleName: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<{ data: any[] }>;
}

// Declare Capacitor plugins
declare global {
  interface Window {
    Capacitor?: {
      Plugins: {
        Health?: HealthKitPlugin;
      };
      isNativePlatform(): boolean;
      getPlatform(): string;
    };
  }
}

class HealthKitService {
  private isAuthorized = false;
  private onDataCallback?: (reading: VitalsReading) => void;
  private syncInterval?: NodeJS.Timeout;
  private healthPlugin?: HealthKitPlugin;

  constructor() {
    this.initializePlugin();
  }

  /**
   * Initialize the HealthKit plugin
   */
  private initializePlugin(): void {
    if (window.Capacitor?.Plugins?.Health) {
      this.healthPlugin = window.Capacitor.Plugins.Health;
    }
  }

  /**
   * Check if HealthKit is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're on a native iOS platform
      if (!window.Capacitor?.isNativePlatform()) {
        return false;
      }

      if (window.Capacitor.getPlatform() !== 'ios') {
        return false;
      }

      if (!this.healthPlugin) {
        console.warn('HealthKit plugin not found');
        return false;
      }

      const result = await this.healthPlugin.isAvailable();
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
    if (!this.healthPlugin) {
      throw new Error('HealthKit plugin not available');
    }

    if (!(await this.isAvailable())) {
      throw new Error('HealthKit is not available on this device');
    }

    try {
      await this.healthPlugin.requestAuthorization({
        read: [
          HEALTH_KIT_TYPES.HEART_RATE,
          HEALTH_KIT_TYPES.BLOOD_PRESSURE_SYSTOLIC,
          HEALTH_KIT_TYPES.BLOOD_PRESSURE_DIASTOLIC,
          HEALTH_KIT_TYPES.BLOOD_GLUCOSE,
          HEALTH_KIT_TYPES.BODY_TEMPERATURE,
          HEALTH_KIT_TYPES.OXYGEN_SATURATION,
          HEALTH_KIT_TYPES.RESPIRATORY_RATE,
        ],
        write: [], // We only need read access
      });

      this.isAuthorized = true;
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
    if (!this.isAuthorized || !this.healthPlugin) {
      throw new Error('HealthKit not authorized');
    }

    try {
      const result = await this.healthPlugin.queryHKitSampleType({
        sampleName: HEALTH_KIT_TYPES.HEART_RATE,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 1000,
      });

      return this.parseHealthKitData(result.data, 'heartRate');
    } catch (error) {
      console.error('Error fetching heart rate from HealthKit:', error);
      return [];
    }
  }

  /**
   * Fetch blood pressure data from HealthKit
   */
  async fetchBloodPressure(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isAuthorized || !this.healthPlugin) {
      throw new Error('HealthKit not authorized');
    }

    try {
      const [systolicResult, diastolicResult] = await Promise.all([
        this.healthPlugin.queryHKitSampleType({
          sampleName: HEALTH_KIT_TYPES.BLOOD_PRESSURE_SYSTOLIC,
          startDate: startTime.toISOString(),
          endDate: endTime.toISOString(),
          limit: 1000,
        }),
        this.healthPlugin.queryHKitSampleType({
          sampleName: HEALTH_KIT_TYPES.BLOOD_PRESSURE_DIASTOLIC,
          startDate: startTime.toISOString(),
          endDate: endTime.toISOString(),
          limit: 1000,
        }),
      ]);

      const systolicData = this.parseHealthKitData(systolicResult.data, 'systolic');
      const diastolicData = this.parseHealthKitData(diastolicResult.data, 'diastolic');

      return [...systolicData, ...diastolicData];
    } catch (error) {
      console.error('Error fetching blood pressure from HealthKit:', error);
      return [];
    }
  }

  /**
   * Fetch blood glucose data from HealthKit
   */
  async fetchBloodGlucose(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isAuthorized || !this.healthPlugin) {
      throw new Error('HealthKit not authorized');
    }

    try {
      const result = await this.healthPlugin.queryHKitSampleType({
        sampleName: HEALTH_KIT_TYPES.BLOOD_GLUCOSE,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 1000,
      });

      return this.parseHealthKitData(result.data, 'glucose');
    } catch (error) {
      console.error('Error fetching blood glucose from HealthKit:', error);
      return [];
    }
  }

  /**
   * Fetch body temperature data from HealthKit
   */
  async fetchBodyTemperature(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isAuthorized || !this.healthPlugin) {
      throw new Error('HealthKit not authorized');
    }

    try {
      const result = await this.healthPlugin.queryHKitSampleType({
        sampleName: HEALTH_KIT_TYPES.BODY_TEMPERATURE,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 1000,
      });

      return this.parseHealthKitData(result.data, 'temperature');
    } catch (error) {
      console.error('Error fetching body temperature from HealthKit:', error);
      return [];
    }
  }

  /**
   * Fetch oxygen saturation data from HealthKit
   */
  async fetchOxygenSaturation(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isAuthorized || !this.healthPlugin) {
      throw new Error('HealthKit not authorized');
    }

    try {
      const result = await this.healthPlugin.queryHKitSampleType({
        sampleName: HEALTH_KIT_TYPES.OXYGEN_SATURATION,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        limit: 1000,
      });

      return this.parseHealthKitData(result.data, 'oxygenLevel');
    } catch (error) {
      console.error('Error fetching oxygen saturation from HealthKit:', error);
      return [];
    }
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
   * Parse HealthKit data points
   */
  private parseHealthKitData(data: any[], dataType: string): DataPoint[] {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map(sample => ({
      value: this.extractValue(sample, dataType),
      timestamp: new Date(sample.startDate || sample.endDate),
      dataType,
    }));
  }

  /**
   * Extract value from HealthKit sample based on data type
   */
  private extractValue(sample: any, dataType: string): number {
    // HealthKit returns different value formats depending on the data type
    if (sample.value !== undefined) {
      return parseFloat(sample.value);
    }

    if (sample.quantity !== undefined) {
      return parseFloat(sample.quantity);
    }

    // Handle unit conversion if needed
    switch (dataType) {
      case 'heartRate':
        return parseFloat(sample.value || sample.quantity || 0); // count/min
      case 'systolic':
      case 'diastolic':
        return parseFloat(sample.value || sample.quantity || 0); // mmHg
      case 'glucose':
        return parseFloat(sample.value || sample.quantity || 0); // mg/dL
      case 'temperature':
        // Convert from Fahrenheit to Celsius if needed
        const temp = parseFloat(sample.value || sample.quantity || 0);
        return sample.unit === 'degF' ? (temp - 32) * 5/9 : temp;
      case 'oxygenLevel':
        // Convert to percentage if needed
        const oxygen = parseFloat(sample.value || sample.quantity || 0);
        return oxygen > 1 ? oxygen : oxygen * 100;
      default:
        return parseFloat(sample.value || sample.quantity || 0);
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
