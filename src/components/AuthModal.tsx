import React, { useState } from "react";
import { User } from "../types";
import { LogIn, UserPlus, Shield, User as UserIcon, AlertCircle, Truck } from "lucide-react";

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function AuthModal({ onLoginSuccess, currentUser, onLogout }: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"customer" | "manager" | "restaurant_manager" | "delivery">("customer");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [managerCode, setManagerCode] = useState(""); // Can link to existing rest-1, rest-2, etc.
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail }),
      });
      const data = await response.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || "Failed to log in.");
      }
    } catch (err) {
      setError("Server connection issue. Please make sure the dev server is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!phone) {
      setError("Please provide a valid Mobile number.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!name) {
          setError("Please define your name.");
          setLoading(false);
          return;
        }
        if (role === "customer" && !address) {
          setError("Please define your delivery address.");
          setLoading(false);
          return;
        }
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            role,
            phone,
            address: role === "customer" ? address : undefined,
            managerCode: (role === "manager" || role === "restaurant_manager") ? managerCode : undefined
          }),
        });

        const data = await response.json();
        if (data.success) {
          onLoginSuccess(data.user);
        } else {
          setError(data.message || "Registration failed.");
        }
      } else {
        // Direct Login with Phone
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data = await response.json();
        if (data.success) {
          onLoginSuccess(data.user);
        } else {
          setError(data.message || "Could not find mobile number registry.");
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-md shadow-orange-100/40" id="auth-current-user-card">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-50">
          <h3 className="font-sans font-extrabold text-orange-950 text-base">Your Profile</h3>
          <span className={`px-2.5 py-1 text-[11px] rounded-full font-bold ${
            currentUser.role === "manager" 
              ? "bg-amber-100 text-amber-800 border border-amber-200" 
              : currentUser.role === "restaurant_manager"
              ? "bg-red-100 text-red-800 border border-red-200"
              : currentUser.role === "delivery"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : "bg-orange-100 text-orange-850 border border-orange-200"
          }`}>
            {currentUser.role === "manager" 
              ? "Hotel Manager" 
              : currentUser.role === "restaurant_manager"
              ? "Restaurant Manager"
              : currentUser.role === "delivery"
              ? "Delivery Partner"
              : "Customer"}
          </span>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-500 font-mono font-medium">{currentUser.phone}</p>
            </div>
          </div>
          {currentUser.phone && (
            <div className="text-xs text-slate-650 pl-11">
              <span className="text-slate-400 font-bold">Mobile Registered:</span> {currentUser.phone}
            </div>
          )}
          {currentUser.role === "customer" && currentUser.address && (
            <div className="text-xs text-slate-650 pl-11">
              <span className="text-slate-400 font-bold">Delivery Address:</span> {currentUser.address}
            </div>
          )}
          {(currentUser.role === "manager" || currentUser.role === "restaurant_manager") && currentUser.restaurantId && (
            <div className="text-xs text-slate-650 pl-11">
              <span className="text-slate-400 font-bold">Station ID:</span> <code className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">{currentUser.restaurantId}</code>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          id="btn-auth-logout"
          className="w-full text-center py-2.5 px-4 bg-orange-50 hover:bg-orange-100/90 text-orange-700 rounded-xl font-extrabold transition-all duration-250 text-xs"
        >
          Sign Out Account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-orange-100 shadow-lg shadow-orange-100/30 overflow-hidden" id="auth-login-card">
      {/* Brand Header with dynamic sunset gradient */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 p-6 text-white shadow-xs">
        <h3 className="text-xl font-black font-sans tracking-tight">Portal Gateway</h3>
        <p className="text-orange-50/90 text-xs mt-1.5 font-medium leading-relaxed">Sign in with a shortcut or register a custom identity to get gourmet packages delivered.</p>
      </div>

      <div className="p-6">
        {/* Quick Demo Access Bar */}
        <div className="mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 font-sans">Instant Demo Shortcuts</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleDemoLogin("customer@gmail.com")}
              id="btn-demo-cust"
              disabled={loading}
              className="flex justify-between items-center py-2 px-3 border border-orange-100/70 bg-orange-50/60 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs w-full"
            >
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Customer Portal</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Jane Doe (+91 98480 22338)</span>
            </button>
            <button
              onClick={() => handleDemoLogin("manager@gmail.com")}
              id="btn-demo-mngr"
              disabled={loading}
              className="flex justify-between items-center py-2 px-3 border border-amber-200/70 bg-amber-50/60 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs w-full"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Hotel Manager</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Vijay Kumar (+91 91111 22222)</span>
            </button>
            <button
              onClick={() => handleDemoLogin("rider@gmail.com")}
              id="btn-demo-rider"
              disabled={loading}
              className="flex justify-between items-center py-2 px-3 border border-emerald-200/70 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs w-full"
            >
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Delivery Partner</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Ramu Goud (+91 91000 55661)</span>
            </button>
          </div>
        </div>

        <div className="relative flex py-3 items-center">
          <div className="flex-grow border-t border-orange-100/60"></div>
          <span className="flex-shrink mx-3 text-[9px] font-black text-slate-400 font-sans tracking-widest uppercase">Or Identity Registry</span>
          <div className="flex-grow border-t border-orange-100/60"></div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isRegistering ? (
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest pl-1 mb-1 font-sans">Registered Mobile No</label>
              <input
                type="text"
                placeholder="e.g., +91 98480 22338 or 9848022338"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-orange-100 rounded-xl text-sm bg-orange-50/20 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-hidden transition font-black text-slate-900"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest pl-1 mb-1 font-sans">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g., Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-orange-100 rounded-xl text-sm bg-orange-50/20 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-hidden transition font-extrabold text-[#0F172A]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest pl-1 mb-1.5 font-sans">Identify Role</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className={`flex items-center justify-center p-2 border rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    role === "customer" 
                      ? "border-orange-500 bg-orange-50 text-orange-850 shadow-2xs" 
                      : "border-orange-100/60 text-slate-500 hover:bg-orange-50/20"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={role === "customer"}
                      onChange={() => setRole("customer")}
                      className="sr-only"
                    />
                    Customer Portal
                  </label>
                  
                  <label className={`flex items-center justify-center p-2 border rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    role === "restaurant_manager" 
                      ? "border-red-500 bg-red-50 text-red-900 shadow-2xs" 
                      : "border-orange-100/60 text-slate-500 hover:bg-orange-50/20"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="restaurant_manager"
                      checked={role === "restaurant_manager"}
                      onChange={() => setRole("restaurant_manager")}
                      className="sr-only"
                    />
                    Restaurant Manager
                  </label>

                  <label className={`flex items-center justify-center p-2 border rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    role === "manager" 
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-2xs" 
                      : "border-orange-100/60 text-slate-500 hover:bg-orange-50/20"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="manager"
                      checked={role === "manager"}
                      onChange={() => setRole("manager")}
                      className="sr-only"
                    />
                    Hotel Manager
                  </label>

                  <label className={`flex items-center justify-center p-2 border rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                    role === "delivery" 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs" 
                      : "border-orange-100/60 text-slate-500 hover:bg-orange-50/20"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="delivery"
                      checked={role === "delivery"}
                      onChange={() => setRole("delivery")}
                      className="sr-only"
                    />
                    Delivery Partner
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest pl-1 mb-1 font-sans">Mobile Phone No</label>
                <input
                  type="text"
                  placeholder="e.g., +91 98480 22338"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 border border-orange-100 rounded-xl text-sm bg-orange-50/20 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-hidden transition font-bold"
                  required
                />
              </div>

              {role === "customer" && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest pl-1 mb-1 font-sans">Delivery Address</label>
                  <input
                    type="text"
                    placeholder="e.g., Station Road, Shadnagar, Rangareddy, Telangana"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 border border-orange-100 rounded-xl text-sm bg-orange-50/20 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-hidden transition font-semibold"
                    required
                  />
                </div>
              )}

              {(role === "manager" || role === "restaurant_manager") && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest pl-1 mb-1 flex items-center gap-1 font-sans">
                    Manage Specific Hotel ID 
                    <span className="text-slate-400 font-normal normal-case font-sans">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., rest-1, rest-2"
                    value={managerCode}
                    onChange={(e) => setManagerCode(e.target.value)}
                    className="w-full p-3 border border-orange-100 rounded-xl font-mono text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-hidden transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 pl-1">To pilot "Hotel Shadnagar Grand", enter <code className="font-bold bg-orange-50 text-orange-700 px-1 rounded">rest-1</code></p>
                </div>
              )}

              {role === "delivery" && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 font-medium leading-relaxed">
                  🚚 <strong>Delivery Partner Registry:</strong> You will receive delivery routing cards dynamically from all registered restaurants and menus upon rider allotment.
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            id="btn-auth-submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-extrabold rounded-xl text-xs cursor-pointer hover:shadow-lg hover:shadow-orange-200 transition-all duration-300 shadow-md"
          >
            {loading ? (
              <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                Register New Profile
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Enter Platform
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            id="btn-auth-toggle-mode"
            className="text-xs text-orange-600 hover:text-orange-755 hover:underline font-bold"
          >
            {isRegistering ? "Already have an account? Sign In" : "New restaurant or customer? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}
