import type { ReactNode } from "react";

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText?: string; // optional fallback
  children?: ReactNode; // <-- added support for custom children
}

export default function RoleCard({
  icon,
  title,
  description,
  buttonText,
  children,
}: RoleCardProps) {
  return (
    <div className="border rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition">
      <div className="text-green-600 text-2xl mb-2 flex justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>

      {/* Render children if provided, else fallback to buttonText */}
      {children ||
        (buttonText && (
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
            {buttonText}
          </button>
        ))}
    </div>
  );
}
