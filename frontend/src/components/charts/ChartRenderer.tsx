"use client";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { ChartType, ColumnMeta } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

interface Props {
  chartType: ChartType;
  data: Record<string, unknown>[];
  columns: ColumnMeta[];
}

function inferAxes(columns: ColumnMeta[]) {
  const dateCol = columns.find((c) =>
    c.type === "datetime" || c.name.includes("month") || c.name.includes("date") || c.name.includes("year")
  );
  const stringCols = columns.filter(
    (c) => c.type === "string" && c !== dateCol
  );
  const numericCols = columns.filter((c) => c.type === "number" || c.type === "integer");

  const xKey = dateCol?.name ?? stringCols[0]?.name ?? columns[0]?.name ?? "label";
  const yKeys = numericCols.slice(0, 3).map((c) => c.name);

  return { xKey, yKeys };
}

const tooltipStyle = {
  backgroundColor: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#f9fafb",
  fontSize: "12px",
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="p-3">
      <p className="font-semibold text-gray-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {typeof p.value === "number" && p.value > 999 ? formatNumber(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function ChartRenderer({ chartType, data, columns }: Props) {
  if (!data?.length) return <EmptyChart />;

  const { xKey, yKeys } = inferAxes(columns);
  const yKey = yKeys[0] ?? columns[1]?.name ?? columns[0]?.name;

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 10, bottom: 5 },
  };

  const axisStyle = { fontSize: 11, fill: "#9ca3af" };

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} tickFormatter={formatNumber} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart {...commonProps}>
          <defs>
            {yKeys.map((key, i) => (
              <linearGradient key={key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} tickFormatter={formatNumber} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {yKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              fill={`url(#grad-${i})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} tickFormatter={formatNumber} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "pie") {
    const pieData = data.slice(0, 8).map((row) => ({
      name: String(row[xKey]),
      value: Number(row[yKey]) || 0,
    }));
    const total = pieData.reduce((s, d) => s + d.value, 0);

    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            label={({ name, percent }) =>
              percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
            }
            labelLine={false}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [formatNumber(v), "Value"]}
            contentStyle={tooltipStyle}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "scatter") {
    const xNumKey = columns.find((c) => c.type === "number" || c.type === "integer")?.name ?? xKey;
    const yNumKey = yKeys[0] ?? yKey;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey={xNumKey} tick={axisStyle} />
          <YAxis dataKey={yNumKey} tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Scatter data={data} fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Default: table
  return <DataTable data={data} columns={columns} />;
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
      No data to visualize
    </div>
  );
}

function DataTable({ data, columns }: { data: Record<string, unknown>[]; columns: ColumnMeta[] }) {
  const displayData = data.slice(0, 100);
  return (
    <div className="overflow-auto max-h-96 rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            {columns.map((col) => (
              <th
                key={col.name}
                className="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider whitespace-nowrap border-b border-gray-200 dark:border-gray-700"
              >
                {col.name.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.name}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono text-xs"
                >
                  {String(row[col.name] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Showing 100 of {data.length.toLocaleString()} rows
        </p>
      )}
    </div>
  );
}
