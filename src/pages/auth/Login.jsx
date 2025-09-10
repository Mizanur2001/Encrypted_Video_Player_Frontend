import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from 'axios'
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (loading) return;
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setError("");
        setLoading(true);
        axios.post(`${API_BASE_URL}/api/v1/auth/login`, { email, password }).then((data) => {
            if (data?.data?.code === 202) {
                return toast.error(data?.data?.error || "Login failed. Please try again.", { duration: 4000 });
            }
            toast.success(data?.data?.data || "OTP sent successfully", { duration: 4000 });
            localStorage.setItem('evp_email', email);
            setTimeout(() => {
                navigate('/auth/verify');
            }, 4000);

        }).catch((err) => {
            toast.error(err.response?.data?.message || "Server error. Connect with system admin", { duration: 4000 });
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="min-h-screen overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-700 px-4">
            <div className="relative w-full max-w-2xl mx-auto">
                {/* decorative blurred shapes - show only on large screens to avoid responsive overflow */}
                <div className="hidden lg:block absolute -left-20 -top-24 w-72 h-72 bg-gradient-to-tr from-indigo-500 to-pink-500 opacity-30 rounded-full filter blur-3xl transform rotate-12 pointer-events-none will-change-transform"></div>
                <div className="hidden lg:block absolute -right-24 -bottom-24 w-80 h-80 bg-gradient-to-br from-emerald-400 to-sky-500 opacity-20 rounded-full filter blur-2xl transform -rotate-6 pointer-events-none will-change-transform"></div>

                <div className="relative bg-white/95 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">
                    {/* Left side - branding */}
                    <div className="hidden md:flex flex-col items-center justify-center p-10 bg-gradient-to-b from-white/40 to-white/10">
                        <div className="w-36 h-36 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M12 2v20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M5 7.5c2.5-3 11-3 14 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h3 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-500">Welcome Back</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 text-center px-6">Securely access your encrypted videos — fast and private.</p>
                    </div>

                    {/* Right side - form */}
                    <div className="p-8 md:p-10 text-left">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white md:hidden mb-1">Welcome Back</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 md:hidden">Sign in to your account</p>

                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 text-left">Email</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                        {/* simpler envelope icon */}
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                            <path d="M3 8.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M3 8.5l9 6 9-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        className="pl-10 pr-3 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white text-left"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 text-left">Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 11V8a5 5 0 0110 0v3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        className="pl-10 pr-28 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white text-left"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-500 px-2 py-1 rounded hover:bg-slate-100"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold rounded-lg shadow-md transform transition ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>

                            <div className="flex items-center gap-3">
                                <hr className="flex-1 border-slate-200" />
                                <span className="text-xs text-slate-400">or continue with</span>
                                <hr className="flex-1 border-slate-200" />
                            </div>

                            <div className="flex gap-3">
                                <button type="button" className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm flex items-center justify-center gap-2 text-sm" onClick={() => { toast.error("Google sign-in not allowed", { duration: 4000 }) }}>
                                    {/* cleaner Google "G" mark */}
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.6c-.2 1.1-1 2.6-2.6 3.4v2.8h4.2c2.5-2.3 3.8-5.8 3.8-9.9z" />
                                        <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.6-2.5l-4-2.6c-0.9 0.6-2 1-3 1-2.3 0-4.2-1.6-4.9-3.8H3.9v2.4C5.6 19.9 8.6 22 12 22z" />
                                        <path fill="#FBBC05" d="M7.1 14.1c-0.2-0.6-0.3-1.2-0.3-1.8s0.1-1.2 0.3-1.8V8.1H3.9C3.4 9.4 3 10.6 3 12s0.4 2.6 0.9 3.9l3.2-1.8z" />
                                        <path fill="#EA4335" d="M12 6.5c1.5 0 2.9 0.5 4 1.5l3-3C17 2.5 14.7 1.5 12 1.5 8.6 1.5 5.6 3.6 3.9 6.1l3.2 2.4C7.8 7.9 9.7 6.5 12 6.5z" />
                                    </svg>
                                    Google
                                </button>
                                <button type="button" className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg hover:opacity-95 text-sm flex items-center justify-center gap-2" onClick={() => { toast.error("GitHub sign-in not allowed", { duration: 4000 }) }}>
                                    {/* GitHub mark (Octocat) */}
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.38-3.88-1.38-.53-1.36-1.3-1.72-1.3-1.72-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.76.41-1.27.75-1.56-2.56-.29-5.26-1.28-5.26-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11.03 11.03 0 012.9-.39c.98.01 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.6.24 2.78.12 3.07.74.81 1.19 1.84 1.19 3.1 0 4.42-2.71 5.39-5.29 5.67.42.36.8 1.08.8 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.8.56A11.51 11.51 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
                                    </svg>
                                    GitHub
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
