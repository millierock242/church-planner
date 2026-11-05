"use client";

import { useState, useRef, useEffect } from "react";
import { loginAdmin } from "@/app/actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default function LoginPage({ searchParams }: PageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    searchParams.then((params) => {
      if (params?.error) setErrorMessage(params.error);
    });
  }, [searchParams]);

  const handlePasswordChange = () => {
    setShowPassword(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowPassword(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <span className="text-3xl">🔒</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Admin Portal Login</h1>
          <p className="text-xs text-gray-500 mt-1">Enter password to access scheduling and team management</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg text-center">
            {errorMessage}
          </div>
        )}

        <form action={loginAdmin} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Admin Password
              </label>
              {showPassword && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm animate-pulse">
                  Visible for 3s
                </span>
              )}
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                required 
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="rememberMe" 
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-xs text-gray-700 font-medium">Remember me for 30 days</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition cursor-pointer"
          >
            Authenticate Admin
          </button>
        </form>
      </div>
    </div>
  );
}