import React from "react";

interface MultiSelectFieldProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  label,
  options,
  selected,
  onChange,
}) => {
  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <label className="block text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleToggle(option)}
            className={`px-3 py-1 rounded-full border transition-colors duration-200 ${
              selected.includes(option)
                ? "bg-green-600 dark:bg-green-500 text-white border-green-600 dark:border-green-500"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MultiSelectField;
