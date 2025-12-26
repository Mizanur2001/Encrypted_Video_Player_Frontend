import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { publicIpv4 } from 'public-ip';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Verify = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState(Array(6).fill(""));
  const refs = useRef([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (i, e) => {
    const val = (e.target.value || "").slice(-1);
    if (!/^\d?$/.test(val)) return;
    const next = [...values];
    next[i] = val;
    setValues(next);
    setError("");
    if (val && refs.current[i + 1]) refs.current[i + 1].focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (values[i]) {
        const next = [...values];
        next[i] = "";
        setValues(next);
      } else if (refs.current[i - 1]) {
        refs.current[i - 1].focus();
      }
    } else if (e.key === "ArrowLeft" && refs.current[i - 1]) {
      refs.current[i - 1].focus();
    } else if (e.key === "ArrowRight" && refs.current[i + 1]) {
      refs.current[i + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text").trim();
    const digits = paste.replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const next = Array(6).fill("");
    digits.forEach((d, idx) => (next[idx] = d));
    setValues(next);
    const focusIdx = digits.length >= 6 ? 5 : digits.length;
    refs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = values.join("");
    if (code.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ip = await publicIpv4();
      console.log("Public IPv4 Address:", ip);
      try { localStorage.setItem("evp_ip", ip); } catch {}
      const email = localStorage.getItem("evp_email");
      axios.post(`${API_BASE_URL}/api/v1/auth/verify-otp`, { otp: code, ip, email }).then(async (response) => {
        if (response.data.code === 202) {
          return toast.error(response.data.error || "Verification failed. Try again.");
        }
        localStorage.setItem("evp_token", response?.data?.data?.token);
        localStorage.removeItem("evp_email");
        toast.success("Verification successful! Redirecting...");
        await new Promise((r) => setTimeout(r, 900));
        navigate("/");
        window.location.reload();
      }).catch((error) => {
        toast.error(error.response?.data?.message || "Failed to verify. Connect with system admin.");
      })
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0 || sending) return;
    setSending(true);
    try {
      axios.post(`${API_BASE_URL}/api/v1/auth/resend-otp`, { email: localStorage.getItem("evp_email") }).then(async (response) => {
        if (response.data.code === 202) {
          return toast.error(response.data.error || "Resend failed. Try again.");
        }
        toast.success("Verification code resent!");
      }).catch((error) => {
        toast.error(error.response?.data?.message || "Failed to resend. Connect with system admin.");
      });
      await new Promise((r) => setTimeout(r, 800));
      setCountdown(30);
    } catch {
      setError("Failed to resend. Try again later.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-700 px-4">
      <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">
        {/* decorative gradients visible on large screens */}
        <div className="hidden lg:block absolute -left-40 -top-36 w-96 h-96 bg-gradient-to-tr from-indigo-500 to-pink-500 opacity-20 rounded-full filter blur-3xl pointer-events-none"></div>
        <div className="hidden lg:block absolute -right-40 -bottom-36 w-96 h-96 bg-gradient-to-br from-emerald-400 to-sky-500 opacity-15 rounded-full filter blur-2xl pointer-events-none"></div>

        <div className="bg-white/95 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 sm:p-8 lg:p-12">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Verify your account</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">Enter the 6-digit code sent to your email</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8">
              {/* prevent wrapping from md up so inputs stay on one row on PC */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 flex-wrap md:flex-nowrap">
                {values.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    value={v}
                    inputMode="numeric"
                    pattern="\d*"
                    onChange={(e) => handleChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 text-center text-lg sm:text-xl font-medium rounded-lg border border-slate-200 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>

              {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-pink-500 text-white py-3 rounded-lg shadow hover:scale-[1.01] transform transition disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={resend}
                  disabled={countdown > 0 || sending}
                  className="text-indigo-600 font-medium hover:underline disabled:text-slate-300"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : sending ? "Sending..." : "Resend"}
                </button>
              </div>

              <div className="mt-6 text-center text-xs text-slate-400">
                <span>Or try another verification method</span>
              </div>
            </form>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;
