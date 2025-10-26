import { useState, useRef, useEffect } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useDarkMode } from '../contexts/useDarkMode';

export default function DeviceSwitcher() {
  const { devices, activeDevice, setActiveDevice } = useDevice();
  const { darkMode } = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (devices.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'syncing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 ${
          darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
        } rounded-lg shadow-md transition-colors`}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor(activeDevice?.status || 'offline')}`}></div>
        <span className="font-medium">{activeDevice?.name || 'No Device'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-64 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg shadow-xl border ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } z-50`}
        >
          <div className={`px-4 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Select Device
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => {
                  setActiveDevice(device);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } transition-colors ${
                  activeDevice?.id === device.id
                    ? darkMode
                      ? 'bg-gray-700'
                      : 'bg-blue-50'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}></div>
                    <div>
                      <p className="font-medium">{device.name}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {device.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  {activeDevice?.id === device.id && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
