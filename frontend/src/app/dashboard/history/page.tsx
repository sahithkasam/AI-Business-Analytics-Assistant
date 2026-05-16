"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock, Star, Trash2, Code2, ChevronDown, ChevronRight, RefreshCw, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { historyApi } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { QueryHistoryItem, QueryHistoryList } from "@/types";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "success") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  return <RefreshCw className="w-4 h-4 text-amber-500" />;
};

export default function HistoryPage() {
  const [data, setData] = useState<QueryHistoryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function fetchHistory(p: number = 1) {
    setLoading(true);
    try {
      const { data: res } = await historyApi.list(p, 20);
      setData(res);
      setPage(p);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { fetchHistory(); }, []);

  async function toggleFavorite(item: QueryHistoryItem) {
    try {
      const { data: res } = await historyApi.toggleFavorite(item.id);
      setData((prev) => prev ? {
        ...prev,
        items: prev.items.map((i) => i.id === item.id ? { ...i, is_favorite: res.is_favorite } : i),
      } : prev);
      toast.success(res.is_favorite ? "Added to favorites" : "Removed from favorites");
    } catch {}
  }

  async function deleteItem(id: string) {
    try {
      await historyApi.delete(id);
      setData((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== id), total: prev.total - 1 } : prev);
      toast.success("Deleted");
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Query History</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} queries total</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No query history yet. Try asking a question in the AI Chat!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((item) => (
            <div key={item.id} className="card overflow-hidden animate-fade-in">
              <div className="flex items-start gap-3 px-4 py-3">
                <StatusIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.natural_language_query}
                  </p>
                  {item.sql_explanation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {item.sql_explanation}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{formatDate(item.created_at)}</span>
                    {item.row_count !== null && <span>{item.row_count.toLocaleString()} rows</span>}
                    {item.execution_time_ms !== null && <span>{item.execution_time_ms}ms</span>}
                    {item.chart_type && (
                      <span className="capitalize bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        {item.chart_type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      item.is_favorite
                        ? "text-amber-500 hover:text-amber-600"
                        : "text-gray-400 hover:text-amber-500"
                    )}
                  >
                    <Star className={cn("w-4 h-4", item.is_favorite && "fill-current")} />
                  </button>

                  {item.generated_sql && (
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 transition-colors"
                    >
                      <Code2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded[item.id] && item.generated_sql && (
                <div className="sql-block text-xs border-t border-gray-800 rounded-none">
                  <pre className="whitespace-pre-wrap">{item.generated_sql}</pre>
                </div>
              )}

              {item.insights && expanded[item.id] && (
                <div className="px-4 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {item.insights}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > data.page_size && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchHistory(page - 1)}
            disabled={page === 1}
            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {Math.ceil(data.total / data.page_size)}
          </span>
          <button
            onClick={() => fetchHistory(page + 1)}
            disabled={page >= Math.ceil(data.total / data.page_size)}
            className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
