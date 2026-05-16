"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Bot, TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import KPICard, { KPICardSkeleton } from "@/components/dashboard/KPICard";
import { dashboardApi } from "@/lib/api";
import type { DashboardKPIs, RevenueTrendPoint, CategoryBreakdown, TopCustomer } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const tooltipStyle = {
  backgroundColor: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#f9fafb",
  fontSize: "12px",
};

export default function DashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [customers, setCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [kpisRes, trendRes, catRes, custRes] = await Promise.all([
          dashboardApi.kpis(),
          dashboardApi.revenueTrend(),
          dashboardApi.categoryBreakdown(),
          dashboardApi.topCustomers(8),
        ]);
        setKpis(kpisRes.data);
        setTrend(trendRes.data);
        setCategories(catRes.data);
        setCustomers(custRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Business Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time analytics powered by AI
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/chat")}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Bot className="w-4 h-4" />
          Ask AI
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <KPICardSkeleton key={i} />)
          : kpis && Object.values(kpis).map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue Trend</h2>
              <p className="text-xs text-gray-500 mt-0.5">Monthly revenue over last 12 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-brand-500" />
          </div>
          {loading ? (
            <div className="skeleton h-56 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Pie */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Category Mix</h2>
              <p className="text-xs text-gray-500 mt-0.5">Revenue by product category</p>
            </div>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          {loading ? (
            <div className="skeleton h-48 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categories.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="revenue"
                  nameKey="category"
                  paddingAngle={3}
                >
                  {categories.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders bar */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">Order volume trend</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-56 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Customers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Top Customers</h2>
              <p className="text-xs text-gray-500 mt-0.5">By lifetime value</p>
            </div>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-52">
              {customers.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-5 text-xs font-bold text-gray-400 dark:text-gray-600 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
                      {c.name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.country}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(c.lifetime_value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
