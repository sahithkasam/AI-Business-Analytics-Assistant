"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Bot, Loader2, Play, Table2 } from "lucide-react";
import toast from "react-hot-toast";
import { datasetApi } from "@/lib/api";
import type { DatasetDetail, QueryResult } from "@/types";
import { formatNumber } from "@/lib/utils";
import ChartRenderer from "@/components/charts/ChartRenderer";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const TOOLTIP_STYLE = {
  backgroundColor: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#f9fafb",
  fontSize: "12px",
};

function AutoChart({ chart }: { chart: DatasetDetail["chart_data"][0] }) {
  const { type, x, y, title, data } = chart;

  if (!data || data.length === 0) return null;

  const serialized = data.map((row) => {
    const r: Record<string, unknown> = {};
    Object.entries(row).forEach(([k, v]) => {
      r[k] = typeof v === "object" ? String(v) : v;
    });
    return r;
  });

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        {type === "line" ? (
          <LineChart data={serialized} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={x} tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey={y} stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        ) : type === "bar" ? (
          <BarChart data={serialized} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={x} tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey={y} fill="#3b82f6" radius={[4, 4, 0, 0]} name={y} />
          </BarChart>
        ) : type === "pie" ? (
          <PieChart>
            <Pie
              data={serialized}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              dataKey="value"
              nameKey={x}
              paddingAngle={3}
            >
              {serialized.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        ) : type === "scatter" ? (
          <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={x} name={x} tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis dataKey={y} name={y} tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Scatter data={serialized} fill="#3b82f6" />
          </ScatterChart>
        ) : (
          <BarChart data={serialized} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={x} tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey={y} fill="#10b981" radius={[4, 4, 0, 0]} name={y} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function DatasetDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [aiResult, setAiResult] = useState<QueryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    datasetApi.get(id)
      .then((r) => setDataset(r.data))
      .catch(() => toast.error("Failed to load dataset."))
      .finally(() => setLoading(false));
  }, [id]);

  async function askAI() {
    if (!question.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const { data } = await datasetApi.query(id, question);
      setAiResult(data);
    } catch {
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!dataset) return null;

  const kpis = dataset.kpi_values || [];
  const charts = dataset.chart_data || [];
  const tableColumns = dataset.columns.filter((c) => c.name !== "id");
  const tableRows = dataset.sample_data;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/datasets")}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{dataset.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {dataset.original_filename} · {dataset.row_count.toLocaleString()} rows · {dataset.columns_meta.length} columns
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowTable((s) => !s)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Table2 className="w-4 h-4" />
          {showTable ? "Hide" : "View"} Data
        </button>
      </div>

      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className={`grid gap-4 ${kpis.length === 1 ? "grid-cols-1 max-w-xs" : kpis.length === 2 ? "grid-cols-2" : kpis.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
          {kpis.map((kpi, i) => (
            <div key={i} className="card p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {kpi.agg === "sum"
                  ? kpi.value >= 1_000_000
                    ? `${(kpi.value / 1_000_000).toFixed(1)}M`
                    : kpi.value >= 1_000
                    ? `${(kpi.value / 1_000).toFixed(1)}K`
                    : formatNumber(Math.round(kpi.value))
                  : kpi.value.toFixed(2)
                }
              </p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{kpi.agg} of {kpi.col.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Auto Charts */}
      {charts.length > 0 && (
        <div className={`grid gap-4 ${charts.length === 1 ? "grid-cols-1" : charts.length === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
          {charts.map((chart, i) => (
            <AutoChart key={i} chart={chart} />
          ))}
        </div>
      )}

      {/* Data Table */}
      {showTable && tableRows.length > 0 && (
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Data Preview <span className="text-gray-400 font-normal text-xs ml-1">({Math.min(tableRows.length, 200)} of {dataset.row_count.toLocaleString()} rows)</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                  {tableColumns.map((col) => (
                    <th key={col.name} className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {col.name.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(0, 200).map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    {tableColumns.map((col) => (
                      <td key={col.name} className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                        {String(row[col.name] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ask AI */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ask AI about this dataset</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI()}
            placeholder={`e.g. "Show totals by category" or "What are the top 10 rows?"`}
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
          <button
            onClick={askAI}
            disabled={!question.trim() || aiLoading}
            className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {aiLoading ? "Running…" : "Ask"}
          </button>
        </div>

        {aiResult?.status === "success" && (
          <div className="animate-fade-in space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500">
              {formatNumber(aiResult.row_count)} rows · {aiResult.execution_time_ms}ms
            </p>
            <ChartRenderer chartType={aiResult.chart_type} data={aiResult.data} columns={aiResult.columns} />
            {aiResult.insights && (
              <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">AI Insights</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{aiResult.insights}</p>
              </div>
            )}
          </div>
        )}

        {aiResult?.status === "failed" && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-red-500">{aiResult.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
