import React, { useState, useEffect } from "react";
import { User, Order } from "../types";
import { Truck, Phone, MapPin, Lock, CheckCircle, Clock, ClipboardList, RefreshCw, Smartphone } from "lucide-react";

interface DeliveryDashboardProps {
  currentUser: User;
  orders: Order[];
  onRefreshAll: () => void;
}

export default function DeliveryDashboard({ currentUser, orders, onRefreshAll }: DeliveryDashboardProps) {
  const [enteredOtps, setEnteredOtps] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Poll for new assignments every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onRefreshAll();
    }, 3500);
    return () => clearInterval(interval);
  }, [onRefreshAll]);

  // Filter orders where this rider is assigned
  // We match by phone or name
  const riderOrders = orders.filter(o => 
    o.deliveryPersonPhone?.replace(/\D/g, "") === currentUser.phone?.replace(/\D/g, "") ||
    o.deliveryPersonName?.toLowerCase().trim() === currentUser.name?.toLowerCase().trim()
  );

  // Divide into active and historical deliveries
  const activeOrders = riderOrders.filter(o => o.status === "Delivery Agent Assigned");
  const pastOrders = riderOrders.filter(o => o.status === "Delivered");

  const handleSubmitOtp = async (orderId: string) => {
    const otp = enteredOtps[orderId];
    if (!otp || otp.length !== 4) {
      setErrorMessage("Please enter a valid 4-digit code.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingMap(prev => ({ ...prev, [orderId]: true }));

    try {
      const response = await fetch(`/api/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Order #${orderId} has been successfully verified and delivered!`);
        setEnteredOtps(prev => ({ ...prev, [orderId]: "" }));
        onRefreshAll();
        setTimeout(() => setSuccessMessage(null), 6000);
      } else {
        setErrorMessage(data.message || "Invalid OTP code. Please secure the correct key from the customer.");
      }
    } catch (e) {
      setErrorMessage("Connection error verifying transit safety OTP.");
    } finally {
      setLoadingMap(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return (
    <div className="space-y-6" id="delivery-agent-dashboard">
      {/* Rider Header Profile */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 rounded-3xl text-white shadow-lg shadow-emerald-100/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner">
              🚚
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-emerald-100/90 font-mono">Courier Terminal</p>
              <h3 className="text-xl font-black font-sans tracking-tight">{currentUser.name}</h3>
              <p className="text-xs text-emerald-50/80 font-medium flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-emerald-300" /> {currentUser.phone || "No Registered Phone"}
              </p>
            </div>
          </div>
          
          <button
            onClick={onRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400/50 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
            id="rider-sync-btn"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
            <span>Force Sync Stream</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-extrabold shadow-sm animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-extrabold shadow-sm animate-fade-in flex items-center gap-2">
          ⚠️ <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Active Shipments on Left, Log on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Runs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-1">
            <h4 className="font-sans font-black text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wide">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Active Dispatch Assignments ({activeOrders.length})
            </h4>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" title="Listening for order allotments"></span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-orange-100 p-12 text-center" id="rider-empty-state">
              <div className="w-16 h-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 stroke-1 text-slate-400 animate-pulse" />
              </div>
              <h5 className="font-sans font-black text-slate-800 text-sm">Waiting for Assignments</h5>
              <p className="text-slate-450 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                You have no active shipments. When a Restaurant Manager assigns an order to <strong>{currentUser.name}</strong>, it will display here instantly with visual route directions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div 
                  key={order.id} 
                  id={`rider-order-card-${order.id}`}
                  className="bg-white rounded-3xl border border-emerald-100 shadow-md shadow-emerald-50/35 overflow-hidden transition-all duration-200 hover:border-emerald-200"
                >
                  {/* Top Bar inside Route */}
                  <div className="p-4 bg-emerald-50/40 border-b border-emerald-100/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[11px] bg-emerald-100 text-emerald-850 px-2 py-0.5 rounded-md">
                        ORDER ID: #{order.id}
                      </span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 border border-emerald-100 animate-pulse">
                        ● READY FOR COLLECTION
                      </span>
                    </div>
                    <span className="font-mono font-black text-sm text-[#0F172A]">
                      ₹{order.totalAmount.toFixed(0)}
                    </span>
                  </div>

                  {/* Customer Information Sheet */}
                  <div className="p-5 space-y-4 text-xs font-semibold">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Customer Details */}
                      <div className="space-y-2.5">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Recipient Details</p>
                        <div className="flex items-start gap-2.5 bg-orange-50/20 p-3 rounded-2xl border border-orange-100/30">
                          <Smartphone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-black text-slate-900 text-sm" id="cust-name-val">{order.userName}</p>
                            <p className="text-slate-500 font-bold mt-0.5">{order.userPhone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Drop Location */}
                      <div className="space-y-2.5">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Drop Location Address</p>
                        <div className="flex items-start gap-2.5 bg-sky-50/20 p-3 rounded-2xl border border-sky-100/30">
                          <MapPin className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[#0F172A] font-extrabold leading-relaxed">{order.deliveryAddress}</p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Operational comments */}
                    {order.instructions && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-[10px]">
                        <strong>Chef Notes to Rider:</strong> "{order.instructions}"
                      </div>
                    )}

                    {/* Delivery Verification Pin Form */}
                    <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-150 space-y-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-600 text-white font-bold rounded flex items-center justify-center text-xs shadow">
                          🔒
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">Awaiting Customer OTP Security Handshake</p>
                          <p className="text-[10px] text-slate-400 font-normal">Ask the client for the 4-digit code showing on their transaction ledger.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Type 4-Digit OTP"
                          value={enteredOtps[order.id] || ""}
                          onChange={(e) => setEnteredOtps({
                            ...enteredOtps,
                            [order.id]: e.target.value.replace(/\D/g, "")
                          })}
                          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-center tracking-widest text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-850 w-44 shadow-inner"
                        />
                        <button
                          type="button"
                          disabled={loadingMap[order.id]}
                          onClick={() => handleSubmitOtp(order.id)}
                          className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-200/50 disabled:opacity-50"
                        >
                          {loadingMap[order.id] ? (
                            <span>Verifying...</span>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Verify Delivery Complete</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Deliveries Ledger */}
        <div className="space-y-4">
          <h4 className="font-sans font-black text-slate-850 text-sm flex items-center gap-1.5 uppercase tracking-wide">
            <CheckCircle className="w-4 h-4 text-slate-500" />
            Historic Deliveries Log ({pastOrders.length})
          </h4>

          {pastOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-150 p-6 text-center text-xs text-slate-500 font-medium">
              You haven't logged any delivered assignments today yet. Complete a transit run to list history records.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {pastOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span className="font-mono">TICKET: #{order.id}</span>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] uppercase">
                      Delivered ✓
                    </span>
                  </div>
                  <div>
                    <h6 className="font-extrabold text-slate-850">{order.userName}</h6>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{order.deliveryAddress}</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 text-[9px] text-slate-400 font-mono">
                    Completed: {order.timestamp ? new Date(order.timestamp).toLocaleString() : new Date().toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
