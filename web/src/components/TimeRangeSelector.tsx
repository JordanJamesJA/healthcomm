import { FaRegClock } from "react-icons/fa";

interface TimeRangeSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function TimeRangeSelector({
  value,
  onChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <FaRegClock className="text-green-600" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded-lg px-3 py-1 text-sm"
      >
        <option value="1h">1 Hour</option>
        <option value="6h">6 Hours</option>
        <option value="12h">12 Hours</option>
        <option value="24h">24 Hours</option>
      </select>
    </div>
  );
}
