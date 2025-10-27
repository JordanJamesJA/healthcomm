import { useState } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useDarkMode } from '../contexts/useDarkMode';
import AddDeviceModal from './AddDeviceModal';

export default function DeviceManagement() {
  const { devices, activeDevice, setActiveDevice, removeDevice, refreshDevices } = useDevice();
  const { darkMode } = useDarkMode();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRemoveDevice = async (deviceId: string) => {
    await removeDevice(deviceId);
    setDeviceToRemove(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDevices();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'syncing': return 'bg-blue-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'smartwatch':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'fitness_tracker':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'blood_pressure_monitor':
      case 'glucose_monitor':
      case 'pulse_oximeter':
      case 'ecg_monitor':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-md p-6`}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Device Management</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className={`px-2 sm:px-4 py-2 text-xs sm:text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap`}
            disabled={isRefreshing}
            aria-label="Refresh devices"
          >
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap"
            aria-label="Add new device"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden xs:inline">Add Device</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-lg mb-2">No devices connected</p>
          <p className="text-sm">Add your first device to start tracking vitals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 ${
                activeDevice?.id === device.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`${darkMode ? 'bg-gray-600' : 'bg-white'} p-3 rounded-lg`}>
                    {getDeviceIcon(device.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{device.name}</h3>
                      {activeDevice?.id === device.id && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}></div>
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} capitalize`}>
                        {device.status}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {device.manufacturer && (
                        <div>
                          <span className="font-medium">Manufacturer:</span> {device.manufacturer}
                        </div>
                      )}
                      {device.model && (
                        <div>
                          <span className="font-medium">Model:</span> {device.model}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Type:</span> {device.type.replace('_', ' ')}
                      </div>
                      {device.batteryLevel !== undefined && (
                        <div>
                          <span className="font-medium">Battery:</span> {device.batteryLevel}%
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="font-medium">Last Sync:</span>{' '}
                        {device.lastSyncTime instanceof Date
                          ? device.lastSyncTime.toLocaleString()
                          : new Date(device.lastSyncTime.seconds * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {activeDevice?.id !== device.id && (
                    <button
                      onClick={() => setActiveDevice(device)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => setDeviceToRemove(device.id)}
                    className={`px-3 py-1 ${darkMode ? 'bg-red-900 hover:bg-red-800' : 'bg-red-100 hover:bg-red-200 text-red-700'} text-sm rounded-md transition-colors`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddDeviceModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {deviceToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-md w-full mx-4 p-6`}>
            <h3 className="text-xl font-bold mb-4">Confirm Removal</h3>
            <p className="mb-6">
              Are you sure you want to remove this device? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeviceToRemove(null)}
                className={`flex-1 px-4 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveDevice(deviceToRemove)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Remove Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
