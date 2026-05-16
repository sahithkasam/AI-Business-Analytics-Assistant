"use client";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Send, Bot, User, ChevronDown, ChevronRight, Code2,
  Download, Sparkles, RefreshCw, Loader2, AlertCircle,
  BarChart2, Table2, Clock, Zap
} from "lucide-react";
import ChartRenderer from "@/components/charts/ChartRenderer";
import { queryApi, exportApi, downloadBlob } from "@/lib/api";
import { cn, formatNumber, formatDate } from "@/lib/utils";
import type { QueryResult, ChartType } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  result?: QueryResult;
  timestamp: Date;
  loading?: boolean;
  statusMessage?: string;
}

const EXAMPLE_QUERIES = [
  "Show monthly revenue growth for this year",
  "Top 5 customers by lifetime value",
  "Compare product category sales",
  "Which department has the highest budget?",
  "Revenue breakdown by country",
  "Best selling products this month",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI Analytics Assistant. Ask me anything about your business data in plain English, and I'll generate SQL, execute it, and show you visualizations with insights.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSQL, setExpandedSQL] = useState<Record<number, boolean>>({});
  const [expandedInsights, setExpandedInsights] = useState<Record<number, boolean>>({});
  const [chartTypes, setChartTypes] = useState<Record<number, ChartType>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(question: string = input) {
    if (!question.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", content: question, timestamp: new Date() };
    const loadingMsg: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
      loading: true,
      statusMessage: "Thinking...",
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = document.cookie.match(/access_token=([^;]+)/)?.[1];

      // Use SSE streaming
      const resp = await fetch(`${BASE_URL}/api/v1/query/ask/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let resultData: QueryResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "status") {
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = { ...updated[lastIdx], statusMessage: event.message };
                return updated;
              });
            } else if (event.type === "result") {
              resultData = event.data;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          } catch {}
        }
      }

      const msgContent = resultData?.status === "success"
        ? `Found ${formatNumber(resultData.row_count)} rows in ${resultData.execution_time_ms}ms`
        : resultData?.error || "Query failed";

      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          role: "assistant",
          content: msgContent,
          result: resultData ?? undefined,
          timestamp: new Date(),
          loading: false,
        };
        return updated;
      });

    } catch (err: unknown) {
      // Fallback to non-streaming
      try {
        const { data } = await queryApi.ask(question);
        const result: QueryResult = data;

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            role: "assistant",
            content: result.status === "success"
              ? `Found ${formatNumber(result.row_count)} rows in ${result.execution_time_ms}ms`
              : result.error || "Query failed",
            result,
            timestamp: new Date(),
            loading: false,
          };
          return updated;
        });
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            role: "assistant",
            content: "Sorry, I encountered an error processing your query. Please try again.",
            timestamp: new Date(),
            loading: false,
          };
          return updated;
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(result: QueryResult, format: "csv" | "pdf") {
    if (!result.id) return;
    try {
      const fn = format === "csv" ? exportApi.csv : exportApi.pdf;
      const { data } = await fn({ query_id: result.id, title: result.natural_query });
      downloadBlob(data, `analytics.${format}`);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Analytics Chat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions in plain English</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3 animate-fade-in", msg.role === "user" && "flex-row-reverse")}>
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
              msg.role === "user"
                ? "bg-brand-600"
                : "bg-gray-800 dark:bg-gray-700 border border-gray-700"
            )}>
              {msg.role === "user"
                ? <User className="w-4 h-4 text-white" />
                : <Bot className="w-4 h-4 text-brand-400" />}
            </div>

            {/* Bubble */}
            <div className={cn("flex-1 max-w-[85%]", msg.role === "user" && "flex justify-end")}>
              {msg.loading ? (
                <div className="card px-4 py-3 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{msg.statusMessage}</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot" />
                    ))}
                  </div>
                </div>
              ) : msg.role === "user" ? (
                <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="card px-4 py-3">
                    {msg.result?.status === "failed" ? (
                      <div className="flex items-start gap-2 text-red-500">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{msg.result.error || msg.content}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{msg.content}</p>
                    )}

                    {msg.result && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{msg.result.execution_time_ms}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Table2 className="w-3 h-3" />{formatNumber(msg.result.row_count)} rows
                        </span>
                        {msg.result.retry_count > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <RefreshCw className="w-3 h-3" />Corrected ({msg.result.retry_count}x)
                          </span>
                        )}
                        {msg.result.status === "success" && (
                          <>
                            <button
                              onClick={() => handleExport(msg.result!, "csv")}
                              className="flex items-center gap-1 hover:text-brand-400 transition-colors"
                            >
                              <Download className="w-3 h-3" />CSV
                            </button>
                            <button
                              onClick={() => handleExport(msg.result!, "pdf")}
                              className="flex items-center gap-1 hover:text-brand-400 transition-colors"
                            >
                              <Download className="w-3 h-3" />PDF
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SQL Explanation */}
                  {msg.result?.sql_explanation && (
                    <div className="card px-4 py-3 border-l-2 border-brand-500">
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {msg.result.sql_explanation}
                      </p>
                    </div>
                  )}

                  {/* Generated SQL */}
                  {msg.result?.generated_sql && (
                    <div className="card overflow-hidden">
                      <button
                        onClick={() => setExpandedSQL((p) => ({ ...p, [idx]: !p[idx] }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Code2 className="w-3.5 h-3.5 text-brand-500" />
                          {msg.result.corrected_sql ? "Corrected SQL" : "Generated SQL"}
                          {msg.result.corrected_sql && (
                            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded">
                              Auto-fixed
                            </span>
                          )}
                        </span>
                        {expandedSQL[idx] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {expandedSQL[idx] && (
                        <div className="sql-block text-xs rounded-none border-t border-gray-800">
                          <pre className="whitespace-pre-wrap">
                            {msg.result.corrected_sql || msg.result.generated_sql}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chart */}
                  {msg.result?.data && msg.result.data.length > 0 && (
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-brand-500" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Visualization</span>
                        </div>
                        <select
                          value={chartTypes[idx] ?? msg.result.chart_type}
                          onChange={(e) => setChartTypes((p) => ({ ...p, [idx]: e.target.value as ChartType }))}
                          className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-gray-700 dark:text-gray-300"
                        >
                          {["line", "bar", "area", "pie", "scatter", "table"].map((t) => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <ChartRenderer
                        chartType={chartTypes[idx] ?? msg.result.chart_type}
                        data={msg.result.data}
                        columns={msg.result.columns}
                      />
                    </div>
                  )}

                  {/* AI Insights */}
                  {msg.result?.insights && (
                    <div className="card overflow-hidden">
                      <button
                        onClick={() => setExpandedInsights((p) => ({ ...p, [idx]: !p[idx] }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          AI Business Insights
                        </span>
                        {expandedInsights[idx] !== false
                          ? <ChevronDown className="w-3.5 h-3.5" />
                          : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {expandedInsights[idx] !== false && (
                        <div className="px-4 pb-4 pt-1">
                          <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                            {msg.result.insights}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className={cn(
                "text-xs text-gray-400 mt-1",
                msg.role === "user" && "text-right"
              )}>
                {formatDate(msg.timestamp.toISOString())}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Example queries */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Try these questions
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                className="text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                <Zap className="w-3 h-3 inline mr-1 text-brand-500" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="card p-2 flex items-center gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask anything about your data... (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={loading}
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-none px-2 py-1 min-h-[36px] max-h-[120px]"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!input.trim() || loading}
          className="btn-primary px-3 py-2 flex-shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
