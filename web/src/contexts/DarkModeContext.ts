import { createContext } from "react";

export interface DarkModeContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const DarkModeContext = createContext<DarkModeContextValue | undefined>(
  undefined
);
