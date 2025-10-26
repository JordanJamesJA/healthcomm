// Replace the ENTIRE content of web/src/components/VitalChart.tsx with this:

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VitalData {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenLevel?: number;
  temperature?: number;
  glucose?: number;
  respiration?: number;
  timestamp?: Date;
}

interface VitalChartProps {
  vital: string;
  range: string;
  data?: VitalData[];
  dataKey?: string;
}

export default function VitalChart({ vital, range, data = [], dataKey }: VitalChartProps) {
  // Filter data based on range
  const filterDataByRange = () => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    const rangeHours: Record<string, number> = {
      "1h": 1,
      "6h": 6,
      "12h": 12,
      "24h": 24,
    };

    const hours = rangeHours[range] || 6;
    const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    return data
      .filter(d => d.timestamp && new Date(d.timestamp) >= cutoffTime)
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
  };

  const filteredData = filterDataByRange();

  // Format data for chart
  const chartData = filteredData.map((item) => {
    let value: number | undefined;
    
    switch (dataKey) {
      case "heartRate":
        value = item.heartRate;
        break;
      case "bloodPressure":
        value = item.bloodPressureSystolic;
        break;
      case "oxygenLevel":
        value = item.oxygenLevel;
        break;
      case "temperature":
        value = item.temperature;
        break;
      case "glucose":
        value = item.glucose;
        break;
      case "respiration":
        value = item.respiration;
        break;
    }

    return {
      time: item.timestamp 
        ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "",
      value: value,
      // For blood pressure, also include diastolic
      ...(dataKey === "bloodPressure" && { diastolic: item.bloodPressureDiastolic })
    };
  }).filter(item => item.value !== undefined);

  // If no data, show placeholder
  if (chartData.length === 0) {
    return (
      <div className="border dark:border-gray-700 rounded-xl p-4 shadow-sm bg-gray-50 dark:bg-gray-800 h-56 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 transition-colors duration-300">
        <p className="text-center">No data available for {vital}</p>
        <p className="text-xs mt-2">({range})</p>
      </div>
    );
  }

  // Get color based on vital type
  const getLineColor = () => {
    const colors: Record<string, string> = {
      "Heart Rate": "#ef4444",
      "Blood Pressure": "#3b82f6",
      "Oxygen Level": "#10b981",
      "Temperature": "#f59e0b",
      "Glucose": "#8b5cf6",
      "Respiration": "#06b6d4",
    };
    return colors[vital] || "#10b981";
  };

  return (
    <div className="border dark:border-gray-700 rounded-xl p-4 shadow-sm bg-white dark:bg-gray-800 transition-colors duration-300">
      <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        {vital} ({range})
      </h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af" 
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            stroke="#9ca3af" 
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9ca3af' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937',
              border: 'none',