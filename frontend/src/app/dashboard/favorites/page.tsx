"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { historyApi } from "@/lib/api";
import type { QueryHistoryList } from "@/types";
import { formatDate } from "@/lib/utils";

export default function FavoritesPage() {
  const [data, setData] = useState<QueryHistoryList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyApi.list(1, 50, true)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Favorite Queries</h1>
        <p className="text-sm text-gray-500">{data?.total ?? 0} saved favorites</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="card p-12 text-center">
          <Star className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No favorites yet. Star a query in your history to save it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((item) => (
            <div key={item.id} className="card px-4 py-3">
              <div className="flex items-start gap-3">
                <Star className="w-4 h-4 text-amber-500 fill-current flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.natural_language_query}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{formatDate(item.created_at)}</span>
                    {item.row_count !== null && <span>{item.row_count.toLocaleString()} rows</span>}
                  </div>
                  {item.sql_explanation && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">{item.sql_explanation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
