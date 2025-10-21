interface VitalChartProps {
  vital: string;
  range: string;
}

export default function VitalChart({ vital, range }: VitalChartProps) {
  return (
    <div className="border rounded-xl p-4 shadow-sm bg-gray-50 h-56 flex items-center justify-center text-gray-400">
      <p>
        Graph: {vital} ({range})
      </p>
    </div>
  );
}
