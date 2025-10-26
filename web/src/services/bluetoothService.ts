/**
 * Web Bluetooth Service for connecting to health devices
 * Supports standard Bluetooth GATT services for health monitoring devices
 */

// Standard Bluetooth GATT Service UUIDs
const SERVICES = {
  HEART_RATE: 0x180d,
  BLOOD_PRESSURE: 0x1810,
  GLUCOSE: 0x1808,
  HEALTH_THERMOMETER: 0x1809,
  PULSE_OXIMETER: 0x1822,
  BATTERY: 0x180f,
} as const;

// Standard Bluetooth GATT Characteristic UUIDs
const CHARACTERISTICS = {
  HEART_RATE_MEASUREMENT: 0x2a37,
  BLOOD_PRESSURE_MEASUREMENT: 0x2a35,
  GLUCOSE_MEASUREMENT: 0x2a18,
  TEMPERATURE_MEASUREMENT: 0x2a1c,
  PLX_CONTINUOUS_MEASUREMENT: 0x2a5f, // Pulse Oximeter
  PLX_SPOT_CHECK: 0x2a5e,
  BATTERY_LEVEL: 0x2a19,
} as const;

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  type: string;
  manufacturer?: string;
  batteryLevel?: number;
}

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

class BluetoothService {
  private connectedDevices: Map<string, BluetoothDevice> = new Map();
  private deviceCharacteristics: Map<string, BluetoothRemoteGATTCharacteristic[]> = new Map();
  private onDataCallback?: (reading: VitalsReading) => void;

  /**
   * Check if Web Bluetooth is supported
   */
  isSupported(): boolean {
    return 'bluetooth' in navigator;
  }

  /**
   * Request and connect to a Bluetooth device
   */
  async connectDevice(deviceType: 'heart_rate' | 'blood_pressure' | 'glucose' | 'temperature' | 'pulse_oximeter'): Promise<BluetoothDeviceInfo> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    try {
      // Determine which services to request based on device type
      const services = this.getServicesForDeviceType(deviceType);

      // Request device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services }],
        optionalServices: [SERVICES.BATTERY],
      });

      if (!device.gatt) {
        throw new Error('GATT not available on this device');
      }

      // Connect to GATT server
      const server = await device.gatt.connect();

      // Store device
      this.connectedDevices.set(device.id, device);

      // Set up disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        console.log(`Device ${device.name} disconnected`);
        this.connectedDevices.delete(device.id);
      });

      // Get device info
      const deviceInfo: BluetoothDeviceInfo = {
        id: device.id,
        name: device.name || 'Unknown Device',
        type: deviceType,
      };

      // Try to get battery level
      try {
        const batteryService = await server.getPrimaryService(SERVICES.BATTERY);
        const batteryChar = await batteryService.getCharacteristic(CHARACTERISTICS.BATTERY_LEVEL);
        const batteryValue = await batteryChar.readValue();
        deviceInfo.batteryLevel = batteryValue.getUint8(0);
      } catch (e) {
        console.log('Battery level not available');
      }

      // Subscribe to characteristics for real-time data
      await this.subscribeToCharacteristics(server, device.id, deviceType);

      return deviceInfo;
    } catch (error) {
      console.error('Error connecting to device:', error);
      throw error;
    }
  }

  /**
   * Get appropriate services for device type
   */
  private getServicesForDeviceType(deviceType: string): number[] {
    switch (deviceType) {
      case 'heart_rate':
        return [SERVICES.HEART_RATE];
      case 'blood_pressure':
        return [SERVICES.BLOOD_PRESSURE];
      case 'glucose':
        return [SERVICES.GLUCOSE];
      case 'temperature':
        return [SERVICES.HEALTH_THERMOMETER];
      case 'pulse_oximeter':
        return [SERVICES.PULSE_OXIMETER];
      default:
        return [SERVICES.HEART_RATE]; // Default to heart rate
    }
  }

  /**
   * Subscribe to device characteristics for real-time data
   */
  private async subscribeToCharacteristics(
    server: BluetoothRemoteGATTServer,
    deviceId: string,
    deviceType: string
  ): Promise<void> {
    try {
      switch (deviceType) {
        case 'heart_rate':
          await this.subscribeToHeartRate(server, deviceId);
          break;
        case 'blood_pressure':
          await this.subscribeToBloodPressure(server, deviceId);
          break;
        case 'glucose':
          await this.subscribeToGlucose(server, deviceId);
          break;
        case 'temperature':
          await this.subscribeToTemperature(server, deviceId);
          break;
        case 'pulse_oximeter':
          await this.subscribeToPulseOximeter(server, deviceId);
          break;
      }
    } catch (error) {
      console.error('Error subscribing to characteristics:', error);
      throw error;
    }
  }

  /**
   * Subscribe to heart rate measurements
   */
  private async subscribeToHeartRate(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(SERVICES.HEART_RATE);
    const characteristic = await service.getCharacteristic(CHARACTERISTICS.HEART_RATE_MEASUREMENT);

    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        const heartRate = value.getUint8(1);
        this.emitReading({
          heartRate,
          timestamp: new Date(),
          deviceId,
        });
      }
    });
  }

  /**
   * Subscribe to blood pressure measurements
   */
  private async subscribeToBloodPressure(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(SERVICES.BLOOD_PRESSURE);
    const characteristic = await service.getCharacteristic(CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT);

    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        // Blood pressure format: flags(1) + systolic(2) + diastolic(2) + MAP(2)
        const systolic = value.getUint16(1, true);
        const diastolic = value.getUint16(3, true);

        this.emitReading({
          bloodPressureSystolic: systolic,
          bloodPressureDiastolic: diastolic,
          timestamp: new Date(),
          deviceId,
        });
      }
    });
  }

  /**
   * Subscribe to glucose measurements
   */
  private async subscribeToGlucose(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(SERVICES.GLUCOSE);
    const characteristic = await service.getCharacteristic(CHARACTERISTICS.GLUCOSE_MEASUREMENT);

    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        // Glucose concentration is in mg/dL (or mmol/L depending on flags)
        const flags = value.getUint8(0);
        const glucose = value.getUint16(3, true);

        this.emitReading({
          glucose,
          timestamp: new Date(),
          deviceId,
        });
      }
    });
  }

  /**
   * Subscribe to temperature measurements
   */
  private async subscribeToTemperature(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(SERVICES.HEALTH_THERMOMETER);
    const characteristic = await service.getCharacteristic(CHARACTERISTICS.TEMPERATURE_MEASUREMENT);

    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      const value = target.value;
      if (value) {
        // Temperature measurement format: flags(1) + temperature(4 bytes, IEEE-11073 FLOAT)
        const temperatureValue = value.getFloat32(1, true);

        this.emitReading({
          temperature: temperatureValue,
          timestamp: new Date(),
          deviceId,
        });
      }
    });
  }

  /**
   * Subscribe to pulse oximeter measurements
   */
  private async subscribeToPulseOximeter(server: BluetoothRemoteGATTServer, deviceId: string): Promise<void> {
    const service = await server.getPrimaryService(SERVICES.PULSE_OXIMETER);

    // Try continuous measurement first, fall back to spot check
    try {
      const characteristic = await service.getCharacteristic(CHARACTERISTICS.PLX_CONTINUOUS_MEASUREMENT);
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          // Format: flags(1) + SpO2(2) + PR(2)
          const spo2 = value.getUint16(1, true);
          const pulseRate = value.getUint16(3, true);

          this.emitReading({
            oxygenLevel: spo2,
            heartRate: pulseRate,
            timestamp: new Date(),
            deviceId,
          });
        }
      });
    } catch {
      // Fall back to spot check
      const characteristic = await service.getCharacteristic(CHARACTERISTICS.PLX_SPOT_CHECK);
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          const spo2 = value.getUint16(1, true);
          const pulseRate = value.getUint16(3, true);

          this.emitReading({
            oxygenLevel: spo2,
            heartRate: pulseRate,
            timestamp: new Date(),
            deviceId,
          });
        }
      });
    }
  }

  /**
   * Emit vitals reading to callback
   */
  private emitReading(reading: VitalsReading): void {
    if (this.onDataCallback) {
      this.onDataCallback(reading);
    }
  }

  /**
   * Set callback for vitals data
   */
  onData(callback: (reading: VitalsReading) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Disconnect a device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (device && device.gatt) {
      device.gatt.disconnect();
      this.connectedDevices.delete(deviceId);
      this.deviceCharacteristics.delete(deviceId);
    }
  }

  /**
   * Get list of connected devices
   */
  getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  /**
   * Check if a device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    const device = this.connectedDevices.get(deviceId);
    return device?.gatt?.connected || false;
  }
}

// Export singleton instance
export const bluetoothService = new BluetoothService();
