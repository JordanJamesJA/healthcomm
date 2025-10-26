import { useState } from 'react';
import type { DeviceType, DeviceStatus } from '../contexts/AuthTypes';
import { useDevice } from '../hooks/useDevice';
import { useDarkMode } from '../contexts/useDarkMode';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDeviceModal({ isOpen, onClose }: AddDeviceModalProps) {
  const { addDevice, connectBluetoothDevice, connectGoogleFit, connectAppleHealth } = useDevice();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'manual' | 'bluetooth' | 'googlefit' | 'applehealth'>('bluetooth');

  const [formData, setFormData] = useState({
    name: '',
    type: 'smartwatch' as DeviceType,
    manufacturer: '',
    model: '',
    firmwareVersion: '',
    batteryLevel: 100
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Device name is required');
      }

      await addDevice({
        name: formData.name,
        type: formData.type,
        status: 'online' as DeviceStatus,
        manufacturer: formData.manufacturer || undefined,
        model: formData.model || undefined,
        firmwareVersion: formData.firmwareVersion || undefined,
        batteryLevel: formData.batteryLevel,
        lastSyncTime: new Date()
      });

      // Reset form and close modal
      setFormData({
        name: '',
        type: 'smartwatch',
        manufacturer: '',
        model: '',
        firmwareVersion: '',
        batteryLevel: 100
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'batteryLevel' ? parseInt(value) || 0 : value
    }));
  };

  const handleBluetoothConnect = async (deviceType: 'heart_rate' | 'blood_pressure' | 'glucose' | 'temperature' | 'pulse_oximeter') => {
    setLoading(true);
    setError(null);

    try {
      await connectBluetoothDevice(deviceType);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Bluetooth device');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFitConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await connectGoogleFit();
      if (success) {
        onClose();
      } else {
        setError('Failed to connect to Google Fit');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Fit');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleHealthConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const success = await connectAppleHealth();
      if (success) {
        onClose();
      } else {
        setError('Failed to connect to Apple Health');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Apple Health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-xl max-w-md w-full mx-4 p-6`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Add New Device</h2>
          <button
            onClick={onClose}
            className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full p-2 transition-colors`}
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Connection Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Connection Method</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setConnectionMode('bluetooth')}
              className={`p-3 rounded-md border-2 transition-all ${
                connectionMode === 'bluetooth'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              disabled={loading}
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
                </svg>
                <div className="text-xs font-medium">Bluetooth</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode('googlefit')}
              className={`p-3 rounded-md border-2 transition-all ${
                connectionMode === 'googlefit'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              disabled={loading}
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 13V6c0-1.103-.897-2-2-2h-3c0-1.103-.897-2-2-2s-2 .897-2 2H8c-1.103 0-2 .897-2 2v13c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-1h-2v1H8V6h3v2h2V6h3v7h2z"/>
                  <path d="m11 18 1-3h2l1 3h-4zm3.5-11.5a1.5 1.5 0 1 1-3.001-.001 1.5 1.5 0 0 1 3.001.001z"/>
                </svg>
                <div className="text-xs font-medium">Google Fit</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode('applehealth')}
              className={`p-3 rounded-md border-2 transition-all ${
                connectionMode === 'applehealth'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              disabled={loading}
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.57 3.51c-1.16-1.16-2.68-1.8-4.29-1.8-1.18 0-2.31.35-3.28 1.01C12.03 2.06 10.9 1.71 9.72 1.71c-1.61 0-3.13.64-4.29 1.8-2.37 2.37-2.37 6.22 0 8.59L12 18.67l6.57-6.57c2.37-2.37 2.37-6.22 0-8.59zM12 16.15l-5.46-5.46c-1.7-1.7-1.7-4.47 0-6.17.82-.82 1.92-1.28 3.08-1.28.94 0 1.84.28 2.6.81l.78.58.78-.58c.76-.53 1.66-.81 2.6-.81 1.16 0 2.26.46 3.08 1.28 1.7 1.7 1.7 4.47 0 6.17L12 16.15z"/>
                  <path d="M12 7v5h5"/>
                </svg>
                <div className="text-xs font-medium">Apple Health</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode('manual')}
              className={`p-3 rounded-md border-2 transition-all ${
                connectionMode === 'manual'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
              }`}
              disabled={loading}
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <div className="text-xs font-medium">Manual</div>
              </div>
            </button>
          </div>
        </div>

        {/* Bluetooth Connection UI */}
        {connectionMode === 'bluetooth' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the type of Bluetooth device you want to connect:
            </p>
            <button
              type="button"
              onClick={() => handleBluetoothConnect('heart_rate')}
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left disabled:opacity-50"
              disabled={loading}
            >
              <div className="font-medium">Heart Rate Monitor</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Smartwatch, fitness tracker, chest strap</div>
            </button>
            <button
              type="button"
              onClick={() => handleBluetoothConnect('blood_pressure')}
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left disabled:opacity-50"
              disabled={loading}
            >
              <div className="font-medium">Blood Pressure Monitor</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Arm cuff, wrist monitor</div>
            </button>
            <button
              type="button"
              onClick={() => handleBluetoothConnect('pulse_oximeter')}
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left disabled:opacity-50"
              disabled={loading}
            >
              <div className="font-medium">Pulse Oximeter</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Finger clip, wearable sensor</div>
            </button>
            <button
              type="button"
              onClick={() => handleBluetoothConnect('glucose')}
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left disabled:opacity-50"
              disabled={loading}
            >
              <div className="font-medium">Glucose Monitor</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Blood glucose meter, CGM</div>
            </button>
            <button
              type="button"
              onClick={() => handleBluetoothConnect('temperature')}
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all text-left disabled:opacity-50"
              disabled={loading}
            >
              <div className="font-medium">Thermometer</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Digital thermometer, ear thermometer</div>
            </button>
            {loading && (
              <div className="text-center text-sm text-blue-600 dark:text-blue-400 mt-4">
                Searching for devices...
              </div>
            )}
          </div>
        )}

        {/* Google Fit Connection UI */}
        {connectionMode === 'googlefit' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect to Google Fit to sync health data from your Android device and connected fitness trackers.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">What data will be synced?</h4>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Heart rate measurements</li>
                <li>• Blood pressure readings</li>
                <li>• Blood glucose levels</li>
                <li>• Body temperature</li>
                <li>• Oxygen saturation (SpO2)</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleGoogleFitConnect}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Google Fit'}
            </button>
          </div>
        )}

        {/* Apple Health Connection UI */}
        {connectionMode === 'applehealth' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect to Apple Health to sync health data from your iPhone, Apple Watch, and connected health devices.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-medium mb-2">What data will be synced?</h4>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Heart rate measurements</li>
                <li>• Blood pressure readings</li>
                <li>• Blood glucose levels</li>
                <li>• Body temperature</li>
                <li>• Oxygen saturation (SpO2)</li>
              </ul>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Apple Health integration requires iOS 13.0 or later and is only available on iPhone and iPad devices.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAppleHealthConnect}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Apple Health'}
            </button>
          </div>
        )}

        {/* Manual Entry Form */}
        {connectionMode === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Device Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Smartwatch"
              className={`w-full px-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Device Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={loading}
            >
              <option value="smartwatch">Smartwatch</option>
              <option value="fitness_tracker">Fitness Tracker</option>
              <option value="blood_pressure_monitor">Blood Pressure Monitor</option>
              <option value="glucose_monitor">Glucose Monitor</option>
              <option value="pulse_oximeter">Pulse Oximeter</option>
              <option value="ecg_monitor">ECG Monitor</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Manufacturer</label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="Apple"
                className={`w-full px-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Series 9"
                className={`w-full px-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Firmware Version</label>
            <input
              type="text"
              name="firmwareVersion"
              value={formData.firmwareVersion}
              onChange={handleChange}
              placeholder="10.2.1"
              className={`w-full px-3 py-2 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Battery Level: {formData.batteryLevel}%
            </label>
            <input
              type="range"
              name="batteryLevel"
              min="0"
              max="100"
              value={formData.batteryLevel}
              onChange={handleChange}
              className="w-full"
              disabled={loading}
            />
          </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md transition-colors`}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Device'}
              </button>
            </div>
          </form>
        )}

        {/* Cancel button for non-manual modes */}
        {connectionMode !== 'manual' && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md transition-colors`}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
