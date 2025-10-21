import { FaStethoscope } from "react-icons/fa";

interface AlertBoxProps {
  title: string;
  message: string;
  subtext?: string;
}

export default function AlertBox({ title, message, subtext }: AlertBoxProps) {
  return (
    <div className="border border-red-400 bg-red-50 text-red-700 rounded-lg p-4 mb-8">
      <h3 className="font-semibold flex items-center gap-2">
        <FaStethoscope /> {title}
      </h3>
      <p className="text-sm">{message}</p>
      {subtext && <p className="text-xs text-gray-600">{subtext}</p>}
    </div>
  );
}
