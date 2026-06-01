"use client";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bot, History, LayoutDashboard, LogOut, Star, Upload } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/chat", icon: Bot, label: "AI Chat" },
  { href: "/dashboard/history", icon: History, label: "Query History" },
  { href: "/dashboard/favorites", icon: Star, label: "Favorites" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/datasets", icon: Upload, label: "My Datasets" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen } = useUIStore();

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    clearAuth();
    router.replace("/auth/login");
  }

  if (!sidebarOpen) return null;

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-shrink-0 w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white leading-none">AI Analytics</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Business Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={cn(
              "sidebar-link w-full",
              pathname === href || (href !== "/dashboard" && pathname?.startsWith(href)) ? "active" : ""
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {(user?.full_name || user?.username || "U")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.full_name || user?.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
