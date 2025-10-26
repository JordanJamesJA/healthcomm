/**
 * Health Platform Service for integrating with Google Fit, Apple Health, etc.
 * This service provides a unified interface for accessing health data from various platforms
 */

import type { VitalsReading, HealthPlatformConfig, DataPoint } from './types';

// Google Fit API configuration
const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.blood_pressure.read',
  'https://www.googleapis.com/auth/fitness.blood_glucose.read',
  'https://www.googleapis.com/auth/fitness.body_temperature.read',
  'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
];

// Data source types for Google Fit
const DATA_TYPES = {
  HEART_RATE: 'com.google.heart_rate.bpm',
  BLOOD_PRESSURE: 'com.google.blood_pressure',
  BLOOD_GLUCOSE: 'com.google.blood_glucose',
  BODY_TEMPERATURE: 'com.google.body.temperature',
  OXYGEN_SATURATION: 'com.google.oxygen_saturation',
  HEART_RATE_VARIABILITY: 'com.google.heart_rate.variability',
};

class HealthPlatformService {
  private googleAuth: any = null;
  private isGoogleFitAuthorized = false;
  private onDataCallback?: (reading: VitalsReading) => void;
  private syncInterval?: NodeJS.Timeout;
  private config: HealthPlatformConfig = {};

  /**
   * Initialize the service with configuration
   */
  initialize(config: HealthPlatformConfig): void {
    this.config = config;
    this.loadGoogleAPI();
  }

  /**
   * Load Google API client
   */
  private loadGoogleAPI(): void {
    // Load Google API client library
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load('client:auth2', () => {
          console.log('Google API loaded');
        });
      }
    };
    document.head.appendChild(script);
  }

  /**
   * Authorize with Google Fit
   */
  async authorizeGoogleFit(): Promise<boolean> {
    if (!this.config.googleFitClientId) {
      throw new Error('Google Fit Client ID not configured');
    }

    try {
      if (!window.gapi) {
        throw new Error('Google API not loaded');
      }

      await window.gapi.client.init({
        clientId: this.config.googleFitClientId,
        scope: GOOGLE_FIT_SCOPES.join(' '),
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest'],
      });

      // Sign in
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }

      this.googleAuth = authInstance;
      this.isGoogleFitAuthorized = true;

      return true;
    } catch (error) {
      console.error('Error authorizing Google Fit:', error);
      throw error;
    }
  }

  /**
   * Check if Google Fit is authorized
   */
  isGoogleFitConnected(): boolean {
    return this.isGoogleFitAuthorized && this.googleAuth?.isSignedIn.get();
  }

  /**
   * Fetch heart rate data from Google Fit
   */
  async fetchHeartRate(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isGoogleFitConnected()) {
      throw new Error('Google Fit not authorized');
    }

    try {
      const response = await window.gapi.client.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: `derived:${DATA_TYPES.HEART_RATE}:com.google.android.gms:merge_heart_rate_bpm`,
        datasetId: `${startTime.getTime() * 1000000}-${endTime.getTime() * 1000000}`,
      });

      return this.parseDataPoints(response.result.point, 'heartRate');
    } catch (error) {
      console.error('Error fetching heart rate:', error);
      return [];
    }
  }

  /**
   * Fetch blood pressure data from Google Fit
   */
  async fetchBloodPressure(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isGoogleFitConnected()) {
      throw new Error('Google Fit not authorized');
    }

    try {
      const response = await window.gapi.client.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: `derived:${DATA_TYPES.BLOOD_PRESSURE}:com.google.android.gms:merged`,
        datasetId: `${startTime.getTime() * 1000000}-${endTime.getTime() * 1000000}`,
      });

      return this.parseBloodPressurePoints(response.result.point);
    } catch (error) {
      console.error('Error fetching blood pressure:', error);
      return [];
    }
  }

  /**
   * Fetch blood glucose data from Google Fit
   */
  async fetchBloodGlucose(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isGoogleFitConnected()) {
      throw new Error('Google Fit not authorized');
    }

    try {
      const response = await window.gapi.client.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: `derived:${DATA_TYPES.BLOOD_GLUCOSE}:com.google.android.gms:merged`,
        datasetId: `${startTime.getTime() * 1000000}-${endTime.getTime() * 1000000}`,
      });

      return this.parseDataPoints(response.result.point, 'glucose');
    } catch (error) {
      console.error('Error fetching blood glucose:', error);
      return [];
    }
  }

  /**
   * Fetch body temperature data from Google Fit
   */
  async fetchBodyTemperature(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isGoogleFitConnected()) {
      throw new Error('Google Fit not authorized');
    }

    try {
      const response = await window.gapi.client.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: `derived:${DATA_TYPES.BODY_TEMPERATURE}:com.google.android.gms:merged`,
        datasetId: `${startTime.getTime() * 1000000}-${endTime.getTime() * 1000000}`,
      });

      return this.parseDataPoints(response.result.point, 'temperature');
    } catch (error) {
      console.error('Error fetching body temperature:', error);
      return [];
    }
  }

  /**
   * Fetch oxygen saturation data from Google Fit
   */
  async fetchOxygenSaturation(startTime: Date, endTime: Date): Promise<DataPoint[]> {
    if (!this.isGoogleFitConnected()) {
      throw new Error('Google Fit not authorized');
    }

    try {
      const response = await window.gapi.client.fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: `derived:${DATA_TYPES.OXYGEN_SATURATION}:com.google.android.gms:merged`,
        datasetId: `${startTime.getTime() * 1000000}-${endTime.getTime() * 1000000}`,
      });

      return this.parseDataPoints(response.result.point, 'oxygenLevel');
    } catch (error) {
      console.error('Error fetching oxygen saturation:', error);
      return [];
    }
  }

  /**
   * Fetch all vitals data for a time range
   */
  async fetchAllVitals(startTime: Date, endTime: Date): Promise<VitalsReading[]> {
    if (!this.isGoogleFitConnected()) {
      throw new Error('Google Fit not authorized');
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
            deviceId: 'google-fit',
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
            deviceId: 'google-fit',
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
            deviceId: 'google-fit',
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
            deviceId: 'google-fit',
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
            deviceId: 'google-fit',
          });
        }
        vitalsMap.get(timestamp)!.oxygenLevel = point.value;
      });

      return Array.from(vitalsMap.values()).sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
      );
    } catch (error) {
      console.error('Error fetching all vitals:', error);
      return [];
    }
  }

  /**
   * Parse generic data points
   */
  private parseDataPoints(points: any[], dataType: string): DataPoint[] {
    if (!points || points.length === 0) {
      return [];
    }

    return points.map(point => ({
      value: point.value[0].fpVal || point.value[0].intVal,
      timestamp: new Date(parseInt(point.endTimeNanos) / 1000000),
      dataType,
    }));
  }

  /**
   * Parse blood pressure data points (has systolic and diastolic)
   */
  private parseBloodPressurePoints(points: any[]): DataPoint[] {
    if (!points || points.length === 0) {
      return [];
    }

    const dataPoints: DataPoint[] = [];
    points.forEach(point => {
      const timestamp = new Date(parseInt(point.endTimeNanos) / 1000000);

      // Systolic (first value)
      if (point.value[0]) {
        dataPoints.push({
          value: point.value[0].fpVal,
          timestamp,
          dataType: 'systolic',
        });
      }

      // Diastolic (second value)
      if (point.value[1]) {
        dataPoints.push({
          value: point.value[1].fpVal,
          timestamp,
          dataType: 'diastolic',
        });
      }
    });

    return dataPoints;
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
    if (!this.isGoogleFitConnected()) {
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
      console.error('Error syncing recent vitals:', error);
    }
  }

  /**
   * Set callback for vitals data
   */
  onData(callback: (reading: VitalsReading) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Disconnect from Google Fit
   */
  async disconnectGoogleFit(): Promise<void> {
    if (this.googleAuth) {
      await this.googleAuth.signOut();
      this.isGoogleFitAuthorized = false;
      this.stopAutoSync();
    }
  }
}

// Type declarations for Google API
declare global {
  interface Window {
    gapi: any;
  }
}

// Export singleton instance
export const healthPlatformService = new HealthPlatformService();
