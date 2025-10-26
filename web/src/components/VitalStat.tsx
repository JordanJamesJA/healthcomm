interface VitalStatProps {
  label: string;
  value: string;
}

export default function VitalStat({ label, value }: VitalStatProps) {
  return (
    <div className="border dark:border-gray-700 rounded-xl p-4 text-center shadow-sm bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
      <p className="text-gray-500 dark:text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
        {value}
      </p>
    </div>
  );
}
