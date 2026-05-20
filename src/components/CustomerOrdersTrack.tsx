import { useEffect, useState } from "react";
import { Order, User } from "../types";
import { Clock, CheckCircle2, RotateCw, ShoppingBag, MapPin, Phone, HelpCircle, Truck, Utensils, ClipboardCheck, Ban } from "lucide-react";

interface CustomerOrdersTrackProps {
  currentUser: User;
  onRefreshOrders: () => void;
  orders: Order[];
}

export default function CustomerOrdersTrack({ currentUser, onRefreshOrders, orders }: CustomerOrdersTrackProps) {
  const [pollingActive, setPollingActive] = useState(true);

  // Setup active polling every 3.5 seconds to query the user's order statuses instantly
  useEffect(() => {
    if (!pollingActive || !currentUser) return;
    
    // Initial fetch
    onRefreshOrders();

    const intervalId = setInterval(() => {
      onRefreshOrders();
    }, 3500);

    return () => clearInterval(intervalId);
  }, [pollingActive, currentUser]);

  // Split into ongoing and historically completed orders
  const { ongoing, completed } = orders.reduce(
    (acc, order) => {
      if (order.status === "Delivered" || order.status === "Cancelled") {
        acc.completed.push(order);
      } else {
        acc.ongoing.push(order);
      }
      return acc;
    },
    { ongoing: [] as Order[], completed: [] as Order[] }
  );

  const getStatusStepIndex = (status: Order["status"]) => {
    const sequence: Order["status"][] = ["Pending", "Accepted", "Ready", "Delivery Agent Assigned", "Delivered"];
    return sequence.indexOf(status);
  };

  const statusMilestones = [
    { label: "Pending", desc: "Awaiting Confirmation", icon: Clock },
    { label: "Accepted", desc: "Confirmed by Hotel", icon: ClipboardCheck },
    { label: "Ready", desc: "Food prepared & packed", icon: Utensils },
    { label: "Delivery Agent Assigned", desc: "Rider Assigned & OTP Generated", icon: Truck },
    { label: "Delivered", desc: "Arrived Safely", icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-8" id="customer-order-tracking-root">
      {/* Tracker Status Indicator bar with FeastHub style */}
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-orange-100 shadow-md shadow-orange-100/10">
        <div>
          <h2 className="font-sans font-black text-[#0F172A] text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500 animate-bounce" />
            Live Delivery Tracking
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Status updates reflect live automatically. Powered by instant polling link.
          </p>
        </div>

        <button
          onClick={() => onRefreshOrders()}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl cursor-pointer transition"
        >
          <RotateCw className="w-3.5 h-3.5 text-orange-600 animate-spin" />
          Sync State
        </button>
      </div>

      {/* ONGOING ACTIVE ORDERS */}
      <div className="space-y-6">
        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-2.5">
          <span>Active Packages</span>
          <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>
        </h3>

        {ongoing.length === 0 ? (
          <div className="bg-white rounded-3xl border border-orange-100 p-12 text-center shadow-md shadow-orange-100/10" id="no-active-orders">
            <Utensils className="w-12 h-12 stroke-1 text-orange-400 mx-auto mb-3" />
            <h4 className="text-sm font-black text-slate-900">No ongoing delivery items</h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              You do not have any active culinary packages currently preparing or on the way. Placed items appear instantly.
            </p>
          </div>
        ) : (
          ongoing.map((order) => {
            const currentStep = getStatusStepIndex(order.status);
            return (
              <div
                key={order.id}
                id={`customer-active-order-${order.id}`}
                className="bg-white rounded-3xl border border-orange-100/90 shadow-md shadow-orange-100/20 overflow-hidden"
              >
                {/* Header info */}
                <div className="bg-orange-50/45 border-b border-orange-100 p-4.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[10px] text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                        #{order.id}
                      </span>
                      <h4 className="font-black text-[#0F172A] text-sm font-sans">{order.restaurantName}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      Submitted at {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span className="text-xs text-slate-600 font-medium">
                      Total bill: <strong className="text-slate-950 font-black">₹{order.totalAmount.toFixed(0)}</strong>
                    </span>
                    <span className="px-2.5 py-1 text-xs rounded-lg font-black bg-orange-100 text-orange-700 animate-pulse">
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Progress Timeline Block */}
                <div className="p-6 border-b border-orange-50/55 bg-white">
                  <div className="relative py-4">
                    {/* Connecting line */}
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-1 bg-orange-100/40 rounded z-0"></div>
                    <div 
                      className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-gradient-to-r from-orange-400 to-green-500 rounded z-0 transition-all duration-500"
                      style={{ width: `${(currentStep / 4) * 100}%` }}
                    ></div>

                    {/* Nodes grid */}
                    <div className="grid grid-cols-5 relative z-10">
                      {statusMilestones.map((milestone, idx) => {
                        const Icon = milestone.icon;
                        const isCompleted = idx < currentStep;
                        const isActive = idx === currentStep;
                        const isFuture = idx > currentStep;

                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                              isCompleted 
                                ? "bg-green-500 border-green-500 text-white" 
                                : isActive 
                                  ? "bg-gradient-to-br from-orange-500 to-red-500 border-orange-500 text-white shadow-md animate-pulse" 
                                  : "bg-white border-orange-100 text-slate-300"
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[10px] sm:text-xs font-extrabold mt-2 text-center truncate w-full ${
                              isActive ? "text-orange-655 font-black" : isCompleted ? "text-green-600" : "text-slate-400"
                            }`}>
                              {milestone.label}
                            </span>
                            <span className="text-[8px] text-slate-400 font-medium text-center hidden md:block max-w-28 truncate">
                              {milestone.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Delivery Executive partner status and Handshake OTP Security box */}
                <div className="mx-6 mt-6 p-5 bg-[#FDFCF7] border border-orange-150 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-orange-100 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-orange-950 font-black uppercase tracking-widest">Delivery Handshake Partner</p>
                      {order.deliveryPersonName ? (
                        <div className="mt-0.5">
                          <p className="font-sans font-black text-slate-900 text-sm">{order.deliveryPersonName}</p>
                          <p className="text-slate-500 font-bold text-xs flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-orange-500" /> {order.deliveryPersonPhone}
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-450 text-xs mt-1 italic">
                          Awaiting assignment of delivery person by hotel team...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-orange-100/80 flex items-center justify-between gap-5 shrink-0 md:w-80">
                    <div className="text-left">
                      <p className="text-[10px] text-[#0F172A] font-black uppercase tracking-wider flex items-center gap-1">
                        🔑 Secured Handshake OTP
                      </p>
                      <p className="text-[9px] text-slate-450 font-semibold leading-tight mt-0.5">
                        Tell this OTP to the rider to confirm delivery completion
                      </p>
                    </div>
                    <div className="bg-orange-600 text-white font-mono font-black text-xl px-3.5 py-1.5 rounded-lg tracking-widest shadow-xs select-all">
                      {order.status === "Delivery Agent Assigned" || order.status === "Delivered" ? (order.deliveryOtp || "----") : "Awaiting"}
                    </div>
                  </div>
                </div>

                {/* Technical stats breakdown & details */}
                <div className="p-4.5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/20 text-xs text-slate-600 border-t border-orange-50">
                  <div className="space-y-2">
                    <p className="font-extrabold text-[#0F172A] uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-orange-500" /> Destination Address
                    </p>
                    <p className="text-slate-705 bg-white p-3 rounded-xl border border-orange-100/70 font-semibold leading-relaxed">
                      {order.deliveryAddress}
                    </p>
                    {order.instructions && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-100 font-medium leading-relaxed">
                        <span className="font-extrabold text-amber-955">Cooking Notes:</span> "{order.instructions}"
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="font-extrabold text-[#0F172A] uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-orange-500" /> Package Contents
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-orange-100/70 space-y-1.5 font-bold">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-[12px] text-slate-700 font-semibold">
                          <span>{item.name} <strong className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded ml-1">×{item.quantity}</strong></span>
                          <span className="font-extrabold text-slate-950">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* COMPLETED/PAST ORDERS HISTORY */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-orange-950 uppercase tracking-widest pl-1">
          Culinary Journey History
        </h3>

        {completed.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-450 border border-orange-150 bg-white rounded-3xl shadow-3xs">
            No completed or cancelled order records yet. Your historical receipts will stack here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {completed.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-3xl border border-orange-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs shadow-xs hover:shadow-md transition duration-200"
              >
                <div className="flex gap-3.5 items-start">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    order.status === "Delivered" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                  }`}>
                    {order.status === "Delivered" ? <CheckCircle2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-[#0F172A] text-sm font-sans">{order.restaurantName}</h4>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        order.status === "Delivered" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-slate-450 text-[10px] mt-1 font-medium">
                      Placed on {new Date(order.timestamp).toLocaleDateString()} at {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    {/* Tiny list display */}
                    <div className="text-[10px] text-slate-500 mt-2 font-medium bg-orange-50/30 px-2 py-1 rounded-md border border-orange-100/30 inline-block">
                      <strong className="text-orange-900 font-extrabold">List:</strong> {order.items.map(item => `${item.name} (x${item.quantity})`).join(", ")}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <p className="font-black text-[#0F172A] text-lg">₹{order.totalAmount.toFixed(0)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Paid via Bank Gateway</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
