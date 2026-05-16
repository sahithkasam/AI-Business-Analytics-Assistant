"use client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn, formatCurrency, formatNumber, formatPct } from "@/lib/utils";
import type { KPICard as KPICardType } from "@/types";

interface Props {
  kpi: KPICardType;
  loading?: boolean;
}

export function KPICardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="skeleton h-8 w-32 rounded" />
      <div className="skeleton h-4 w-20 rounded" />
    </div>
  );
}

export default function KPICard({ kpi, loading }: Props) {
  if (loading) return <KPICardSkeleton />;

  const { label, value, change_pct, trend, prefix, suffix } = kpi;

  function formatValue(v: number | string) {
    if (typeof v === "string") return v;
    if (prefix === "$") return formatCurrency(v);
    if (suffix === "%") return `${v}%`;
    return formatNumber(v);
  }

  const trendColor = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-gray-500",
  }[trend ?? "neutral"];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow animate-fade-in">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
        {formatValue(value)}
      </p>
      {change_pct !== null && change_pct !== undefined && (
        <div className={cn("flex items-center gap-1 mt-2 text-sm font-medium", trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span>{formatPct(change_pct)} vs last month</span>
        </div>
      )}
    </div>
  );
}
