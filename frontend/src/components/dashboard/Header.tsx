"use client";
import { Menu, Moon, Sun } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export default function Header() {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    analyst: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    viewer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="flex items-center gap-3">
        {user?.role && (
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-full capitalize", roleColors[user.role])}>
            {user.role}
          </span>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-gray-400" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>
    </header>
  );
}
