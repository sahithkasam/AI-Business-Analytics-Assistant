"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { BarChart3, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form.email, form.password);
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success(`Welcome back, ${data.user.full_name || data.user.username}!`);
      router.replace("/dashboard");
    } catch {
      // Error already toasted by interceptor
    } finally {
      setLoading(false);
    }
  }

  const demoCredentials = [
    { role: "Admin", email: "admin@analytics.com" },
    { role: "Analyst", email: "analyst@analytics.com" },
    { role: "Viewer", email: "viewer@analytics.com" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-brand-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-600/30">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Analytics Assistant</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to explore your data</p>
        </div>

        {/* Form Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label text-gray-300">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input pl-9 bg-gray-800 border-gray-700 text-white placeholder-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="label text-gray-300">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input pl-9 pr-9 bg-gray-800 border-gray-700 text-white placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Demo Accounts (password: Admin@123)
          </p>
          <div className="space-y-2">
            {demoCredentials.map(({ role, email }) => (
              <button
                key={email}
                onClick={() => setForm({ email, password: "Admin@123" })}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-colors group"
              >
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded mr-2",
                  role === "Admin" && "bg-red-900/40 text-red-400",
                  role === "Analyst" && "bg-blue-900/40 text-blue-400",
                  role === "Viewer" && "bg-green-900/40 text-green-400",
                )}>
                  {role}
                </span>
                <span className="text-sm text-gray-400 group-hover:text-gray-300">{email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
