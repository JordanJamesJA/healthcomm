interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}

export default function InfoCard({ title, children }: InfoCardProps) {
  return (
    <div className="border dark:border-gray-700 rounded-2xl p-6 shadow-sm bg-white dark:bg-gray-800 transition-colors duration-300">
      <h3 className="text-lg font-semibold mb-3 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}
