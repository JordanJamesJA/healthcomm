import { useState } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useDarkMode } from '../contexts/useDarkMode';

export default function DeviceOfflineAlert() {
  const { activeDevice, updateDeviceStatus } = useDevice();
  const { darkMode } = useDarkMode();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!activeDevice || activeDevice.status !== 'offline' || dismissed) {
    return null;
  }

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      // Simulate reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, this would attempt to ping the device
      // For now, we'll set it to 'syncing' and then 'online' after a delay
      await updateDeviceStatus(activeDevice.id, 'syncing');

      setTimeout(async () => {
        await updateDeviceStatus(activeDevice.id, 'online');
        setIsReconnecting(false);
      }, 2000);
    } catch (error) {
      console.error('Reconnection failed:', error);
      setIsReconnecting(false);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border-l-4 border-yellow-500 p-4 mb-6 rounded-md`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
            Device Offline
          </h3>
          <div className={`mt-2 text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
            <p>
              Your device "{activeDevice.name}" is currently offline. Vitals data may not be up to date.
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                darkMode
                  ? 'bg-yellow-800 hover:bg-yellow-700 text-yellow-100'
                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
              } transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isReconnecting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Reconnecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Reconnecting
                </>
              )}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                darkMode
                  ? 'text-yellow-300 hover:bg-yellow-900'
                  : 'text-yellow-600 hover:bg-yellow-100'
              } transition-colors`}
            >
              Dismiss
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setDismissed(true)}
            className={`inline-flex rounded-md p-1.5 ${
              darkMode
                ? 'text-yellow-400 hover:bg-yellow-800'
                : 'text-yellow-500 hover:bg-yellow-100'
            } transition-colors`}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
