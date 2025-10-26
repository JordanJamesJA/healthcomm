import { useState } from 'react';
import type { DeviceType, DeviceStatus } from '../contexts/AuthTypes';
import { useDevice } from '../hooks/useDevice';
import { useDarkMode } from '../contexts/useDarkMode';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDeviceModal({ isOpen, onClose }: AddDeviceModalProps) {
  const { addDevice } = useDevice();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      </div>
    </div>
  );
}
