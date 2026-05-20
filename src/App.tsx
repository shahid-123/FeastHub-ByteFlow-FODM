import { useState, useEffect } from "react";
import { User, Restaurant, Order } from "./types";
import AuthModal from "./components/AuthModal";
import RestaurantBrowser from "./components/RestaurantBrowser";
import RestaurantMenuDetail from "./components/RestaurantMenuDetail";
import CustomerOrdersTrack from "./components/CustomerOrdersTrack";
import ManagerDashboard from "./components/ManagerDashboard";
import DeliveryDashboard from "./components/DeliveryDashboard";
import { 
  Utensils, User as UserIcon, LayoutDashboard, ShoppingBag, 
  MapPin, LogOut, Info, RefreshCw, Layers 
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // View: "browser" | "menu" | "orders-list" | "manager" | "delivery"
  const [currentView, setCurrentView] = useState<"browser" | "menu" | "orders-list" | "manager" | "delivery">("browser");
  const [globalMessage, setGlobalMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Initial state restoration from localstorage if available
  useEffect(() => {
    const saved = localStorage.getItem("biteflow_user");
    if (saved) {
      try {
        const parsed: User = JSON.parse(saved);
        setCurrentUser(parsed);
        if (parsed.role === "manager" || parsed.role === "restaurant_manager") {
          setCurrentView("manager");
        } else if (parsed.role === "delivery") {
          setCurrentView("delivery");
        }
      } catch (e) {
        localStorage.removeItem("biteflow_user");
      }
    }
    // Fetch initial data
    refreshRestAndMenu();
  }, []);

  const refreshRestAndMenu = async () => {
    try {
      const restRes = await fetch("/api/restaurants");
      if (restRes.ok) {
        const restData = await restRes.json();
        setRestaurants(restData);
        // If a restaurant is selected, refresh its reference
        if (selectedRestaurant) {
          const freshSelect = restData.find((r: Restaurant) => r.id === selectedRestaurant.id);
          if (freshSelect) {
            setSelectedRestaurant(freshSelect);
          }
        }
      }
    } catch (e) {
      console.error("Failure updating restaurant models.");
    }
  };

  const refreshOrdersOnly = async () => {
    if (!currentUser) return;
    try {
      let queryParam = "";
      if (currentUser.role === "customer") {
        queryParam = `?userId=${currentUser.id}`;
      } else {
        queryParam = `?restaurantId=${currentUser.restaurantId || "rest-1"}`;
      }

      const res = await fetch(`/api/orders${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error("Error refreshing order indexes.");
    }
  };

  const refreshAllStates = async () => {
    await refreshRestAndMenu();
    await refreshOrdersOnly();
  };

  // Keep orders loaded whenever user logs in or role changes
  useEffect(() => {
    if (currentUser) {
      refreshOrdersOnly();
    } else {
      setOrders([]);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("biteflow_user", JSON.stringify(user));
    showToast(`Welcome back, ${user.name}! Successful entry.`, "success");

    if (user.role === "manager" || user.role === "restaurant_manager") {
      setCurrentView("manager");
    } else if (user.role === "delivery") {
      setCurrentView("delivery");
    } else {
      setCurrentView("browser");
      setSelectedRestaurant(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("biteflow_user");
    setCurrentUser(null);
    setSelectedRestaurant(null);
    setCurrentView("browser");
    showToast("Successfully logged out. Mode switched to visitor.", "info");
  };

  const showToast = (text: string, type: "success" | "info") => {
    setGlobalMessage({ text, type });
    setTimeout(() => {
      setGlobalMessage(null);
    }, 4500);
  };

  const handleSelectRestaurant = (rest: Restaurant) => {
    setSelectedRestaurant(rest);
    setCurrentView("menu");
  };

  const handlePlaceOrder = async (
    items: { id: string; quantity: number }[],
    address: string,
    instructions: string
  ): Promise<boolean> => {
    if (!currentUser || !selectedRestaurant) return false;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userPhone: currentUser.phone,
          restaurantId: selectedRestaurant.id,
          items,
          deliveryAddress: address,
          instructions
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("Your meal request has been received! Routing to Preparation Team.", "success");
        await refreshOrdersOnly();
        setCurrentView("orders-list");
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-orange-50/50 text-slate-800 pb-12 flex flex-col justify-between selection:bg-orange-500 selection:text-white" id="main-application-wrap">
      {/* Top Professional Navigation Bar with Vibrant Theme */}
      <header className="bg-white/95 backdrop-blur-md border-b border-orange-100 sticky top-0 z-50 shadow-sm" id="app-navigation-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo brand with FeastHub style */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => {
              if (currentUser?.role === "manager") {
                setCurrentView("manager");
              } else {
                setCurrentView("browser");
                setSelectedRestaurant(null);
              }
            }}
            id="brand-logo-trigger"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-orange-200">
              B
            </div>
            <div>
              <span className="text-xl font-extrabold text-orange-900 tracking-tight">FeastHub <span className="text-orange-500">BiteFlow</span></span>
              <span className="block text-[8px] font-black text-orange-600/70 font-mono tracking-wider -mt-0.5">VIBRANT STEWARD NET</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {currentUser?.role !== "manager" && (
              <>
                <button
                  onClick={() => {
                    setCurrentView("browser");
                    setSelectedRestaurant(null);
                  }}
                  id="nav-link-browse"
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${currentView === "browser" || currentView === "menu" ? "bg-orange-100 text-orange-700 shadow-xs" : "text-slate-500 hover:text-orange-600 hover:bg-orange-50"}`}
                >
                  Hotels & Cafes
                </button>

                {currentUser && (
                  <button
                    onClick={() => {
                      setCurrentView("orders-list");
                    }}
                    id="nav-link-my-orders"
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${currentView === "orders-list" ? "bg-orange-100 text-orange-700 shadow-xs" : "text-slate-500 hover:text-orange-600 hover:bg-orange-50"}`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    My Meals ({orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length})
                  </button>
                )}
              </>
            )}

            {currentUser?.role === "manager" && (
              <button
                onClick={() => setCurrentView("manager")}
                id="nav-link-manager-dash"
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-orange-400 to-red-500 text-white flex items-center gap-1.5 shadow-md shadow-orange-150"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Hotel Workstation
              </button>
            )}

            {currentUser?.role === "delivery" && (
              <button
                onClick={() => setCurrentView("delivery")}
                id="nav-link-rider-dash"
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center gap-1.5 shadow-md shadow-emerald-150"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Delivery Workstation
              </button>
            )}

            {/* Quick Refresh buttons */}
            <button 
              onClick={refreshAllStates} 
              className="p-2 rounded-xl text-orange-400 hover:text-orange-650 hover:bg-orange-50 transition whitespace-nowrap hidden sm:block border border-orange-50"
              title="Manual database refresh"
              id="btn-nav-sync"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </nav>

        </div>
      </header>

      {/* Toast Alert popup overlay formatted perfectly */}
      {globalMessage && (
        <div
          id="global-toast-alert"
          className="fixed bottom-6 right-6 z-50 bg-white text-slate-800 p-4 rounded-2xl border-2 border-orange-200 shadow-xl max-w-sm flex items-start gap-3 transition-transform duration-300 animate-slide-up"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-sm">
            ✓
          </div>
          <div>
            <p className="text-xs font-extrabold font-sans text-orange-950 tracking-wide">Fulfillment Alert Channel</p>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium leading-relaxed">{globalMessage.text}</p>
          </div>
        </div>
      )}

      {/* Main body viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left panel context block (Profile gateway & instructions) */}
          <div className="lg:col-span-1 space-y-6">
            <AuthModal
              onLoginSuccess={handleLoginSuccess}
              currentUser={currentUser}
              onLogout={handleLogout}
            />            {/* Simulated Live System Operations Instructions formatted for Vibrant Theme */}
            <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-md shadow-orange-100/40" id="operational-instructions-card">
              <h4 className="font-sans font-black text-orange-950 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="w-4 h-4 text-orange-500" />
                Easy Testing Guidelines
              </h4>
              <p className="text-[11px] text-slate-500 mt-2 font-medium leading-relaxed">
                Experience full multi-role loops instantly inside this single-page gourmet playground!
              </p>
              
              <ul className="space-y-3.5 text-[10px] text-slate-650 mt-4 leading-relaxed">
                <li className="relative pl-3.5">
                  <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  <strong className="text-orange-950 font-extrabold">1. Cart Checkout:</strong> Use <strong className="text-orange-900">Customer Portal</strong> to order pizzas or biryani to a custom address.
                </li>
                <li className="relative pl-3.5">
                  <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  <strong className="text-orange-950 font-extrabold">2. Station Accept:</strong> Use <strong className="text-orange-900">Hotel Manager</strong> (linking code <code className="bg-orange-50 text-orange-700 px-1 py-0.5 rounded font-bold font-mono">rest-1</code>) to accept the food request, then mark it <span className="bg-indigo-100/80 text-indigo-805 px-1 rounded font-bold">Ready</span>.
                </li>
                <li className="relative pl-3.5">
                  <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  <strong className="text-orange-950 font-extrabold">3. Allot Rider:</strong> Assign the delivery broker to <strong className="text-orange-900">Ramu Goud</strong>. This instantly locks the status to <span className="text-amber-805 bg-amber-50 px-1 rounded font-black">Agent Assigned</span> and issues the safe OTP code.
                </li>
                <li className="relative pl-3.5">
                  <span className="absolute left-0 top-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  <strong className="text-orange-950 font-extrabold">4. Secure Handshake:</strong> Log in as <strong className="text-emerald-805 font-bold">Delivery Partner</strong> to view the client's Name, Phone, and Address. Enter the customer's secure OTP to complete and close the order across all three portals simultaneously!
                </li>
              </ul>
            </div>
          </div>

          {/* Right viewport dynamic pathway rendering */}
          <div className="lg:col-span-3">
            {currentView === "browser" && (
              <RestaurantBrowser
                restaurants={restaurants}
                onSelectRestaurant={handleSelectRestaurant}
              />
            )}

            {currentView === "menu" && selectedRestaurant && (
              <RestaurantMenuDetail
                restaurant={selectedRestaurant}
                currentUser={currentUser}
                onBack={() => {
                  setCurrentView("browser");
                  setSelectedRestaurant(null);
                }}
                onPlaceOrder={handlePlaceOrder}
              />
            )}

            {currentView === "orders-list" && currentUser && (
              <CustomerOrdersTrack
                currentUser={currentUser}
                onRefreshOrders={refreshOrdersOnly}
                orders={orders}
              />
            )}

            {currentView === "manager" && currentUser && (
              <ManagerDashboard
                currentUser={currentUser}
                onRefreshAll={refreshAllStates}
                restaurants={restaurants}
                orders={orders}
              />
            )}

            {currentView === "delivery" && currentUser && (
              <DeliveryDashboard
                currentUser={currentUser}
                orders={orders}
                onRefreshAll={refreshAllStates}
              />
            )}
          </div>

        </div>
      </main>

      {/* Footer formatted for Vibrant theme */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-orange-950/60 pt-8 border-t border-orange-100 w-full mt-8">
        <p className="font-semibold">© 2026 FeastHub BiteFlow Digital Platforms. All rights reserved. Built on verified high-thermal containers.</p>
        <p className="mt-1 font-mono text-[9px] text-orange-900/40">Local system stamp: 2026-05-20T08:00:20Z | Network channel: ONLINE</p>
      </footer>
    </div>
  );
}
