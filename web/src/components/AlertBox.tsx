import { FaStethoscope } from "react-icons/fa";

interface AlertBoxProps {
  title: string;
  message: string;
  subtext?: string;
}

export default function AlertBox({ title, message, subtext }: AlertBoxProps) {
  return (
    <div className="border border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-4 mb-8 transition-colors duration-300">
      <h3 className="font-semibold flex items-center gap-2">
        <FaStethoscope /> {title}
      </h3>
      <p className="text-sm">{message}</p>
      {subtext && (
        <p className="text-xs text-gray-600 dark:text-gray-400">{subtext}</p>
      )}
    </div>
  );
}
