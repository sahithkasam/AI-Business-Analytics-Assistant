"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Play, Download, Code2 } from "lucide-react";
import ChartRenderer from "@/components/charts/ChartRenderer";
import { queryApi, exportApi, downloadBlob } from "@/lib/api";
import type { QueryResult, ChartType } from "@/types";
import { formatNumber } from "@/lib/utils";

const PRESET_QUERIES = [
  { label: "Monthly Revenue", query: "Show me monthly revenue for the past 12 months" },
  { label: "Top Products", query: "Top 10 products by total revenue with units sold" },
  { label: "Customer Segments", query: "Count of customers by type and country" },
  { label: "Department Salary", query: "Average and total salary by department" },
  { label: "Payment Methods", query: "Revenue breakdown by payment method" },
  { label: "Order Status", query: "Order count by status for the current year" },
];

export default function AnalyticsPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [showSQL, setShowSQL] = useState(false);

  async function runQuery(q: string = query) {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await queryApi.ask(q);
      setResult(data);
      setChartType(data.chart_type);
    } catch {} finally { setLoading(false); }
  }

  async function handleExport(format: "csv" | "pdf") {
    if (!result?.id) return;
    try {
      const fn = format === "csv" ? exportApi.csv : exportApi.pdf;
      const { data } = await fn({ query_id: result.id, title: result.natural_query });
      downloadBlob(data, `analytics.${format}`);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {}
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics Explorer</h1>
        <p className="text-sm text-gray-500">Build custom analytics with natural language</p>
      </div>

      {/* Preset Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {PRESET_QUERIES.map(({ label, query: q }) => (
          <button
            key={label}
            onClick={() => { setQuery(q); runQuery(q); }}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-left"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="card p-4 space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) runQuery(); }}
          placeholder="Describe what you want to analyze... (Cmd+Enter to run)"
          rows={2}
          className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => runQuery()}
            disabled={!query.trim() || loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? "Running..." : "Run Query"}
          </button>

          {result?.status === "success" && (
            <>
              <button onClick={() => setShowSQL(!showSQL)} className="btn-secondary flex items-center gap-2 text-sm">
                <Code2 className="w-4 h-4" />SQL
              </button>
              <button onClick={() => handleExport("csv")} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />CSV
              </button>
              <button onClick={() => handleExport("pdf")} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* SQL Panel */}
      {showSQL && result?.generated_sql && (
        <div className="card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
            <span className="text-xs font-mono text-gray-400">Generated SQL</span>
            {result.corrected_sql && (
              <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">Auto-corrected</span>
            )}
          </div>
          <div className="sql-block text-xs rounded-none">
            <pre className="whitespace-pre-wrap">{result.corrected_sql || result.generated_sql}</pre>
          </div>
        </div>
      )}

      {/* Results */}
      {result?.status === "success" && (
        <div className="card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{result.natural_query}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatNumber(result.row_count)} rows · {result.execution_time_ms}ms
                {result.sql_explanation && ` · ${result.sql_explanation}`}
              </p>
            </div>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-gray-700 dark:text-gray-300"
            >
              {["line", "bar", "area", "pie", "scatter", "table"].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <ChartRenderer chartType={chartType} data={result.data} columns={result.columns} />

          {result.insights && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                AI Insights
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {result.insights}
              </p>
            </div>
          )}
        </div>
      )}

      {result?.status === "failed" && (
        <div className="card p-5 border-red-200 dark:border-red-900/50 animate-fade-in">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Query Failed</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{result.error}</p>
        </div>
      )}
    </div>
  );
}
