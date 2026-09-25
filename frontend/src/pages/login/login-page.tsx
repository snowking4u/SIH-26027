import React, { useState } from "react";
import { useAuth, OFFICIAL_CREDENTIALS } from "@/context/auth-context";

export function LoginPage() {
  const { verifyAndLogin } = useAuth();
  const [selectedRole, setSelectedRole] = useState("CONTROLLER");
  const [username, setUsername] = useState("CONTROLLER");
  const [password, setPassword] = useState("CONTROLLER@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleKey = e.target.value;
    setSelectedRole(roleKey);
    setUsername(roleKey);
    const demo = OFFICIAL_CREDENTIALS[roleKey];
    if (demo) {
      setPassword(demo.pass);
    }
    setError(null);
  };

  const handleSelectDemo = (roleKey: string) => {
    setSelectedRole(roleKey);
    setUsername(roleKey);
    const demo = OFFICIAL_CREDENTIALS[roleKey];
    if (demo) {
      setPassword(demo.pass);
    }
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    // Simulate authentic network latency for cryptographic handshake
    setTimeout(async () => {
      const result = await verifyAndLogin(username, password, selectedRole);
      setIsVerifying(false);
      if (!result.success && result.error) {
        setError(result.error);
      }
    }, 450);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0A1628] text-[#0F172A] font-sans selection:bg-[#2563EB] selection:text-white">
      {/* Left Brand Panel */}
      <aside className="flex-[1.15] relative flex flex-col justify-between p-8 md:p-12 text-white min-h-[400px] md:min-h-screen bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10, 22, 40, 0.94) 0%, rgba(11, 29, 54, 0.88) 45%, rgba(18, 37, 63, 0.82) 100%), url('https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1920&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(30,64,175,0.25)_0%,transparent_55%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-8 md:mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/30">
              RF
            </div>
            <div className="flex flex-col">
              <strong className="font-serif text-2xl tracking-tight text-white leading-tight">RailFlow</strong>
              <span className="text-3xs uppercase tracking-wider text-slate-300 opacity-80">CodeRithm · SIH 26027</span>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight mb-4 tracking-tight text-white">
              Smart Block Planning &amp; Traffic Interlocking System
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed opacity-90">
              Unified Section Controller, TDMS, TMS &amp; SMMS dashboards for safe, optimised maintenance block management across Indian Railways corridors.
            </p>

            <div className="flex flex-wrap gap-2.5 mt-7">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full text-xs font-medium text-white">
                <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
                CRIS SCADA Bridge Online
              </span>
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full text-xs font-medium text-white">
                <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
                SIL-4 Interlocking Ready
              </span>
              <span className="inline-flex items-center bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full text-xs font-medium text-white">
                Ministry of Railways
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 mt-auto text-xs text-slate-300 opacity-80 flex flex-col gap-1 border-t border-white/10">
          <strong className="opacity-100 font-semibold text-white">Indian Railways · Smart Block Planning Initiative</strong>
          <span>Secure NIC / CRIS authenticated access · Telemetry Nominal 99.98%</span>
        </div>
      </aside>

      {/* Right Login Panel */}
      <main className="flex-[0.85] flex items-center justify-center p-6 sm:p-10 bg-[#F1F5F9] min-h-screen">
        <div className="w-full max-w-[380px]">
          {/* Government Identity */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E2E8F0]">
            <div className="w-10 h-10 bg-[#0B1D36] rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0">
              IR
            </div>
            <div className="flex flex-col">
              <strong className="text-sm font-semibold text-[#0B1D36]">Ministry of Railways</strong>
              <span className="text-2xs text-[#64748B]">Government of India · CRIS / NIC</span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 sm:p-7 shadow-sm">
            <h1 className="font-serif text-xl font-bold text-[#0B1D36] mb-1 tracking-tight">
              Sign in to RailFlow
            </h1>
            <p className="text-xs text-[#64748B] mb-5 leading-relaxed">
              Use your department credentials to verify authority and access your dashboard.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-700 text-xs rounded-md leading-relaxed flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Department / Role <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={handleRoleChange}
                  disabled={isVerifying}
                  required
                  className="w-full h-10 px-3 border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] bg-white hover:border-[#94A3B8] focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-900/10 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <option value="CONTROLLER">CONTROLLER — Section Controller (Ops)</option>
                  <option value="TDMS">TDMS — Track Defect Management System</option>
                  <option value="TMS">TMS — Track Management System</option>
                  <option value="SMMS">SMMS — Signal &amp; Telecom Maintenance</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Official User ID <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isVerifying}
                  placeholder="Enter department user ID"
                  autoComplete="username"
                  required
                  className="w-full h-10 px-3 border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] bg-white placeholder:text-[#94A3B8] hover:border-[#94A3B8] focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-900/10 focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Access Security Token / Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isVerifying}
                    placeholder="Enter security password"
                    autoComplete="current-password"
                    required
                    className="w-full h-10 pl-3 pr-10 border border-[#CBD5E1] rounded-md text-sm text-[#0F172A] bg-white placeholder:text-[#94A3B8] hover:border-[#94A3B8] focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-900/10 focus:outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#1E40AF] hover:bg-blue-50 rounded"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.414.586a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs my-3 text-[#475569]">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#1E40AF] focus:ring-0"
                  />
                  Remember session
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact Divisional Railway Administrator (DRM Control) for credential reset.'); }} className="text-[#1E40AF] hover:underline font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-11 bg-[#1E3A8A] hover:bg-[#1E40AF] active:bg-[#1E3A8A] text-white font-semibold text-sm rounded-md shadow-sm transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying CRIS Authority...</span>
                  </>
                ) : (
                  <span>Verify Authority &amp; Sign In</span>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-3xs text-[#64748B]">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" className="text-[#059669]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secured by NIC &amp; CRIS interlock (Session TTL: 8h)
            </div>
          </div>

          {/* Demo Credentials Section */}
          <details className="mt-5 pt-4 border-t border-dashed border-[#E2E8F0] group" open>
            <summary className="text-2xs font-semibold text-[#475569] cursor-pointer flex items-center gap-1.5 select-none hover:text-[#1E40AF]">
              <span>Demo credentials (SIH 26027)</span>
            </summary>
            <div className="mt-3 grid gap-1.5 font-mono text-3xs">
              <div
                onClick={() => handleSelectDemo("CONTROLLER")}
                className="flex justify-between items-center bg-[#F8FAFC] hover:bg-blue-50/60 border border-[#E2E8F0] rounded px-2.5 py-1.5 text-[#334155] cursor-pointer transition-colors"
              >
                <span className="font-bold text-[#1E3A8A]">CONTROLLER</span>
                <span className="text-[#64748B]">CONTROLLER@123</span>
              </div>
              <div
                onClick={() => handleSelectDemo("TDMS")}
                className="flex justify-between items-center bg-[#F8FAFC] hover:bg-blue-50/60 border border-[#E2E8F0] rounded px-2.5 py-1.5 text-[#334155] cursor-pointer transition-colors"
              >
                <span className="font-bold text-emerald-700">TDMS</span>
                <span className="text-[#64748B]">TDMS@123</span>
              </div>
              <div
                onClick={() => handleSelectDemo("TMS")}
                className="flex justify-between items-center bg-[#F8FAFC] hover:bg-blue-50/60 border border-[#E2E8F0] rounded px-2.5 py-1.5 text-[#334155] cursor-pointer transition-colors"
              >
                <span className="font-bold text-purple-700">TMS</span>
                <span className="text-[#64748B]">TMS@123</span>
              </div>
              <div
                onClick={() => handleSelectDemo("SMMS")}
                className="flex justify-between items-center bg-[#F8FAFC] hover:bg-blue-50/60 border border-[#E2E8F0] rounded px-2.5 py-1.5 text-[#334155] cursor-pointer transition-colors"
              >
                <span className="font-bold text-amber-700">SMMS</span>
                <span className="text-[#64748B]">SMMS@123</span>
              </div>
            </div>
          </details>

          <div className="mt-5 text-center text-3xs text-[#94A3B8] leading-relaxed">
            Ministry of Railways · SIH 26027 · CodeRithm<br />
            <a href="#help" onClick={(e) => { e.preventDefault(); alert('RailFlow Helpdesk: Support line active 24x7.'); }} className="text-[#1E40AF] hover:underline">Helpdesk</a> · Unauthorised access is prohibited
          </div>
        </div>
      </main>
    </div>
  );
}
