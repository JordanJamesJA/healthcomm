interface VitalStatProps {
  label: string;
  value: string;
}

export default function VitalStat({ label, value }: VitalStatProps) {
  return (
    <div className="border rounded-xl p-4 text-center shadow-sm bg-gray-50">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-green-600">{value}</p>
    </div>
  );
}
