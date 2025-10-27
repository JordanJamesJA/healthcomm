import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import type { Device, DeviceContextValue, DeviceStatus } from './AuthTypes';
import { vitalsSyncService } from '../services/vitalsSyncService';

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

// Helper function to map Bluetooth device types to our Device types
function mapBluetoothTypeToDeviceType(
  bluetoothType: 'heart_rate' | 'blood_pressure' | 'glucose' | 'temperature' | 'pulse_oximeter'
): Device['type'] {
  const mapping: Record<typeof bluetoothType, Device['type']> = {
    heart_rate: 'smartwatch',
    blood_pressure: 'blood_pressure_monitor',
    glucose: 'glucose_monitor',
    temperature: 'other',
    pulse_oximeter: 'pulse_oximeter',
  };
  return mapping[bluetoothType];
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDeviceState] = useState<Device | null>(null);

  // Initialize vitals sync service when user is available
  useEffect(() => {
    if (user?.uid) {
      vitalsSyncService.initialize({
        userId: user.uid,
        autoSyncInterval: 5, // Sync every 5 minutes
        googleFitClientId: import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID,
      }).catch(console.error);

      // Start auto-sync
      vitalsSyncService.startAutoSync(5);
    }

    return () => {
      vitalsSyncService.stopAutoSync();
    };
  }, [user?.uid]);

  // Real-time listener for user's connected devices
  useEffect(() => {
    if (!user?.uid) {
      setDevices([]);
      setActiveDeviceState(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const connectedDevices = (userData.connectedDevices || []) as Device[];
        setDevices(connectedDevices);

        // Set active device based on activeDeviceId or first device
        const activeDeviceId = userData.activeDeviceId;
        if (activeDeviceId) {
          const active = connectedDevices.find(d => d.id === activeDeviceId);
          setActiveDeviceState(active || connectedDevices[0] || null);
        } else if (connectedDevices.length > 0) {
          setActiveDeviceState(connectedDevices[0]);
        } else {
          setActiveDeviceState(null);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const setActiveDevice = async (device: Device | null) => {
    if (!user?.uid) return;

    setActiveDeviceState(device);

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      activeDeviceId: device?.id || null
    });
  };

  const addDevice = async (deviceData: Omit<Device, 'id' | 'addedAt'>) => {
    if (!user?.uid) return;

    const newDevice: Device = {
      ...deviceData,
      id: `${user.uid}_${Date.now()}`,
      addedAt: Timestamp.now(),
      lastSyncTime: Timestamp.now(),
      status: deviceData.status || 'online'
    };

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      connectedDevices: arrayUnion(newDevice)
    });

    // If this is the first device, set it as active
    if (devices.length === 0) {
      await updateDoc(userDocRef, {
        activeDeviceId: newDevice.id
      });
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!user?.uid) return;

    const deviceToRemove = devices.find(d => d.id === deviceId);
    if (!deviceToRemove) return;

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      connectedDevices: arrayRemove(deviceToRemove)
    });

    // If we're removing the active device, clear it or set to next available
    if (activeDevice?.id === deviceId) {
      const remainingDevices = devices.filter(d => d.id !== deviceId);
      const newActive = remainingDevices[0] || null;
      await updateDoc(userDocRef, {
        activeDeviceId: newActive?.id || null
      });
    }
  };

  const updateDeviceStatus = async (deviceId: string, status: DeviceStatus) => {
    if (!user?.uid) return;

    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) return;

    const updatedDevices = [...devices];
    updatedDevices[deviceIndex] = {
      ...updatedDevices[deviceIndex],
      status,
      lastSyncTime: Timestamp.now()
    };

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      connectedDevices: updatedDevices
    });
  };

  const refreshDevices = async () => {
    // This function can be called to manually refresh device states
    // In a real implementation, this would ping the devices or check their status
    if (!user?.uid) return;

    const updatedDevices = devices.map(device => ({
      ...device,
      lastSyncTime: Timestamp.now()
    }));

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      connectedDevices: updatedDevices
    });
  };

  const connectBluetoothDevice = async (
    deviceType: 'heart_rate' | 'blood_pressure' | 'glucose' | 'temperature' | 'pulse_oximeter'
  ) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      // Connect via vitals sync service
      const deviceInfo = await vitalsSyncService.connectBluetoothDevice(deviceType);

      // Map device type to our Device type
      const mappedType = mapBluetoothTypeToDeviceType(deviceType);

      // Add device to Firebase
      const newDevice: Device = {
        id: deviceInfo.id,
        name: deviceInfo.name,
        type: mappedType,
        status: 'online',
        manufacturer: 'Bluetooth Device',
        lastSyncTime: Timestamp.now(),
        addedAt: Timestamp.now(),
      };

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        connectedDevices: arrayUnion(newDevice),
      });

      // If this is the first device, set it as active
      if (devices.length === 0) {
        await updateDoc(userDocRef, {
          activeDeviceId: newDevice.id,
        });
      }

      return deviceInfo;
    } catch (error) {
      console.error('Error connecting Bluetooth device:', error);
      throw error;
    }
  };

  const connectGoogleFit = async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      const success = await vitalsSyncService.connectGoogleFit();

      if (success) {
        // Add Google Fit as a virtual device
        const googleFitDevice: Device = {
          id: 'google-fit',
          name: 'Google Fit',
          type: 'other',
          status: 'online',
          manufacturer: 'Google',
          lastSyncTime: Timestamp.now(),
          addedAt: Timestamp.now(),
        };

        const userDocRef = doc(db, 'users', user.uid);

        // Check if Google Fit device already exists
        const existingGoogleFit = devices.find(d => d.id === 'google-fit');
        if (!existingGoogleFit) {
          await updateDoc(userDocRef, {
            connectedDevices: arrayUnion(googleFitDevice),
          });

          // If this is the first device, set it as active
          if (devices.length === 0) {
            await updateDoc(userDocRef, {
              activeDeviceId: googleFitDevice.id,
            });
          }
        } else {
          // Update status to online
          await updateDeviceStatus('google-fit', 'online');
        }
      }

      return success;
    } catch (error) {
      console.error('Error connecting Google Fit:', error);
      throw error;
    }
  };

  const disconnectBluetoothDevice = async (deviceId: string) => {
    if (!user?.uid) return;

    try {
      await vitalsSyncService.disconnectBluetoothDevice(deviceId);
      await removeDevice(deviceId);
    } catch (error) {
      console.error('Error disconnecting Bluetooth device:', error);
      throw error;
    }
  };

  const disconnectGoogleFit = async () => {
    if (!user?.uid) return;

    try {
      await vitalsSyncService.disconnectGoogleFit();
      await updateDeviceStatus('google-fit', 'offline');
    } catch (error) {
      console.error('Error disconnecting Google Fit:', error);
      throw error;
    }
  };

  const connectAppleHealth = async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      const success = await vitalsSyncService.connectAppleHealth();

      if (success) {
        // Add Apple Health as a virtual device
        const appleHealthDevice: Device = {
          id: 'apple-health',
          name: 'Apple Health',
          type: 'other',
          status: 'online',
          manufacturer: 'Apple',
          lastSyncTime: Timestamp.now(),
          addedAt: Timestamp.now(),
        };

        const userDocRef = doc(db, 'users', user.uid);

        // Check if Apple Health device already exists
        const existingAppleHealth = devices.find(d => d.id === 'apple-health');
        if (!existingAppleHealth) {
          await updateDoc(userDocRef, {
            connectedDevices: arrayUnion(appleHealthDevice),
          });

          // If this is the first device, set it as active
          if (devices.length === 0) {
            await updateDoc(userDocRef, {
              activeDeviceId: appleHealthDevice.id,
            });
          }
        } else {
          // Update status to online
          await updateDeviceStatus('apple-health', 'online');
        }
      }

      return success;
    } catch (error) {
      console.error('Error connecting Apple Health:', error);
      throw error;
    }
  };

  const disconnectAppleHealth = async () => {
    if (!user?.uid) return;

    try {
      await vitalsSyncService.disconnectAppleHealth();
      await updateDeviceStatus('apple-health', 'offline');
    } catch (error) {
      console.error('Error disconnecting Apple Health:', error);
      throw error;
    }
  };

  const manualSync = async () => {
    if (!user?.uid) return;

    try {
      await updateDeviceStatus(activeDevice?.id || '', 'syncing');
      await vitalsSyncService.manualSync();
      await updateDeviceStatus(activeDevice?.id || '', 'online');
    } catch (error) {
      console.error('Error during manual sync:', error);
      await updateDeviceStatus(activeDevice?.id || '', 'error');
      throw error;
    }
  };

  const value: DeviceContextValue = {
    activeDevice,
    setActiveDevice,
    devices,
    addDevice,
    removeDevice,
    updateDeviceStatus,
    refreshDevices,
    connectBluetoothDevice,
    connectGoogleFit,
    disconnectBluetoothDevice,
    disconnectGoogleFit,
    connectAppleHealth,
    disconnectAppleHealth,
    manualSync,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
