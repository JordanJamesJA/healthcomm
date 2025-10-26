import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

interface ChartDataPoint {
  time: string;
  value?: number;
  diastolic?: number;
}

// Helper: Get hours from range string
const getRangeHours = (range: string): number => {
  const rangeHours: Record<string, number> = {
    "1h": 1,
    "6h": 6,
    "12h": 12,
    "24h": 24,
  };
  return rangeHours[range] || 6;
};

// Helper: Filter data by time range
const filterDataByTimeRange = (
  data: VitalData[],
  range: string
): VitalData[] => {
  if (!data || data.length === 0) return [];

  const now = new Date();
  const hours = getRangeHours(range);
  const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

  return data
    .filter((d) => d.timestamp && new Date(d.timestamp) >= cutoffTime)
    .sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
};

// Helper: Extract value based on data key
const extractValue = (
  item: VitalData,
  dataKey?: string
): number | undefined => {
  switch (dataKey) {
    case "heartRate":
      return item.heartRate;
    case "bloodPressure":
      return item.bloodPressureSystolic;
    case "oxygenLevel":
      return item.oxygenLevel;
    case "temperature":
      return item.temperature;
    case "glucose":
      return item.glucose;
    case "respiration":
      return item.respiration;
    default:
      return undefined;
  }
};

// Helper: Format timestamp for display
const formatTime = (timestamp?: Date): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper: Transform vital data to chart data
const transformToChartData = (
  data: VitalData[],
  dataKey?: string
): ChartDataPoint[] => {
  return data
    .map((item) => {
      const value = extractValue(item, dataKey);

      return {
        time: formatTime(item.timestamp),
        value: value,
        // Include diastolic for blood pressure charts
        ...(dataKey === "bloodPressure" && {
          diastolic: item.bloodPressureDiastolic,
        }),
      };
    })
    .filter((item) => item.value !== undefined);
};

// Helper: Get line color based on vital type
const getLineColor = (vital: string): string => {
  const colors: Record<string, string> = {
    "Heart Rate": "#ef4444",
    "Blood Pressure": "#3b82f6",
    "Oxygen Level": "#10b981",
    Temperature: "#f59e0b",
    Glucose: "#8b5cf6",
    Respiration: "#06b6d4",
  };
  return colors[vital] || "#10b981";
};

// Component: Empty state placeholder
const EmptyState = ({ vital, range }: { vital: string; range: string }) => (
  <div className="border dark:border-gray-700 rounded-xl p-4 shadow-sm bg-gray-50 dark:bg-gray-800 h-56 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 transition-colors duration-300">
    <p className="text-center">No data available for {vital}</p>
    <p className="text-xs mt-2">({range})</p>
  </div>
);

// Type for Tooltip props
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
}

// Component: Custom Tooltip
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-gray-800 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-600">
      <p className="text-sm font-medium">{payload[0].payload.time}</p>
      <p className="text-sm">
        Value: <span className="font-bold">{payload[0].value}</span>
      </p>
      {payload[0].payload.diastolic && (
        <p className="text-sm">
          Diastolic:{" "}
          <span className="font-bold">{payload[0].payload.diastolic}</span>
        </p>
      )}
    </div>
  );
};

// Main Component
export default function VitalChart({
  vital,
  range,
  data = [],
  dataKey,
}: VitalChartProps) {
  // Filter and transform data
  const filteredData = filterDataByTimeRange(data, range);
  const chartData = transformToChartData(filteredData, dataKey);

  // Show empty state if no data
  if (chartData.length === 0) {
    return <EmptyState vital={vital} range={range} />;
  }

  const lineColor = getLineColor(vital);

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
            style={{ fontSize: "12px" }}
            tick={{ fill: "#9ca3af" }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            tick={{ fill: "#9ca3af" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
