"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileSpreadsheet, Loader2, Trash2, Upload, BarChart2 } from "lucide-react";
import { datasetApi } from "@/lib/api";
import type { DatasetListItem } from "@/types";

export default function DatasetsPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    datasetApi.list()
      .then((r) => setDatasets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Only .xlsx, .xls, or .csv files are supported.");
      return;
    }
    setUploading(true);
    try {
      const { data } = await datasetApi.upload(file);
      toast.success(`"${data.name}" uploaded — ${data.row_count.toLocaleString()} rows`);
      setDatasets((prev) => [data, ...prev]);
      router.push(`/dashboard/datasets/${data.id}`);
    } catch {
      // error toast shown by api interceptor
    } finally {
      setUploading(false);
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  async function deleteDataset(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await datasetApi.delete(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      toast.success("Dataset deleted.");
    } catch {}
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Datasets</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload Excel or CSV files and auto-generate dashboards</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600 bg-white dark:bg-gray-900"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onInputChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing your file…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
              <Upload className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Drop your file here or <span className="text-brand-600 dark:text-brand-400">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">.xlsx · .xls · .csv · up to 10 MB · max 50,000 rows</p>
            </div>
          </div>
        )}
      </div>

      {/* Dataset cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No datasets yet. Upload your first file above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/datasets/${ds.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">{ds.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[140px]">{ds.original_filename}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDataset(ds.id, ds.name); }}
                  className="text-gray-300 hover:text-red-500 dark:text-gray-700 dark:hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  title="Delete dataset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                  <p className="text-base font-bold text-gray-900 dark:text-white">{ds.row_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">rows</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                  <p className="text-base font-bold text-gray-900 dark:text-white">{ds.column_count}</p>
                  <p className="text-xs text-gray-400">columns</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400">
                  {new Date(ds.created_at).toLocaleDateString()}
                </p>
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> View Dashboard
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
