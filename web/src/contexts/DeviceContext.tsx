import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import type { Device, DeviceContextValue, DeviceStatus } from './AuthTypes';

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevice, setActiveDeviceState] = useState<Device | null>(null);

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

  const value: DeviceContextValue = {
    activeDevice,
    setActiveDevice,
    devices,
    addDevice,
    removeDevice,
    updateDeviceStatus,
    refreshDevices
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
