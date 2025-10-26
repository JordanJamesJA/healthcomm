/**
 * Shared type definitions for health monitoring services
 */

export interface VitalsReading {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenLevel?: number;
  temperature?: number;
  glucose?: number;
  timestamp: Date;
  deviceId: string;
}

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  type: string;
  manufacturer?: string;
  batteryLevel?: number;
}

export interface DataPoint {
  value: number;
  timestamp: Date;
  dataType: string;
}

export interface HealthPlatformConfig {
  googleFitClientId?: string;
  appleHealthEnabled?: boolean;
  appleHealthAutoSync?: boolean;
}

export interface SyncConfig {
  userId: string;
  autoSyncInterval?: number; // minutes
  googleFitClientId?: string;
}

export interface SyncStatus {
  isBluetoothConnected: boolean;
  isGoogleFitConnected: boolean;
  isAppleHealthConnected: boolean;
  lastSyncTime?: Date;
  syncedDevices: string[];
}
