import React, { useState, useEffect, useMemo } from "react";
import { Restaurant, MenuItem, Order, User } from "../types";
import { 
  BarChart3, Plus, Edit2, Trash2, Check, ArrowRight, Ban, X, Play, Truck, Phone, Clock,
  Settings, ToggleLeft, ToggleRight, AlertCircle, ShoppingBag, IndianRupee, ListOrdered, CheckCircle, RefreshCcw, Sparkles 
} from "lucide-react";

// Client-side image resizer using HTML5 Canvas to optimize any upload instantly to the perfect size
const resizeImage = (file: File, maxWidth = 400, maxHeight = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface ManagerDashboardProps {
  currentUser: User;
  onRefreshAll: () => Promise<void>;
  restaurants: Restaurant[];
  orders: Order[];
}

export default function ManagerDashboard({ currentUser, onRefreshAll, restaurants, orders }: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "settings">("orders");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  // Form states for adding/editing menu items
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("Mains");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuImageUrl, setMenuImageUrl] = useState("");
  const [menuAvailable, setMenuAvailable] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // State for delivery rider details per order
  const [assignRiders, setAssignRiders] = useState<Record<string, { name: string; phone: string }>>({});
  // State for verifying customer OTP per order
  const [enteredOtps, setEnteredOtps] = useState<Record<string, string>>({});

  const READY_RIDERS = [
    { name: "Ramu Goud", phone: "+91 91000 55661" },
    { name: "Somesh Rao", phone: "+91 92000 88772" },
    { name: "Shiva Reddy", phone: "+91 93000 99883" }
  ];

  // Assign delivery rider
  const handleAssignDelivery = async (orderId: string, name: string, phone: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/assign-delivery`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPersonName: name, deliveryPersonPhone: phone }),
      });
      const data = await response.json();
      if (data.success) {
        onRefreshAll();
      } else {
        alert(data.message || "Failed to assign delivery partner.");
      }
    } catch (e) {
      console.error("Connection error assigning delivery partner.");
    }
  };

  // Verify Customer OTP and complete delivery
  const handleVerifyOtp = async (orderId: string, otp: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await response.json();
      if (data.success) {
        onRefreshAll();
        return true;
      } else {
        alert(data.message || "Incorrect OTP. Verification failed.");
        return false;
      }
    } catch (e) {
      console.error("Connection error verifying delivery OTP.");
      return false;
    }
  };

  const handleGenerateAIDescription = async () => {
    if (!menuName.trim()) return;
    setAiLoading(true);
    setMenuError(null);
    try {
      const response = await fetch("/api/gemini/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishName: menuName,
          category: menuCategory
        })
      });
      const data = await response.json();
      if (data.success) {
        setMenuDescription(data.description);
      } else {
        setMenuError(data.message || "Failed to generate dynamic culinary description.");
      }
    } catch (err) {
      console.error(err);
      setMenuError("Connection failure generating AI description.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleBulkLoadPresets = async () => {
    if (!restaurant) return;
    setBulkLoading(true);
    setBulkSuccessMessage(null);
    setMenuError(null);
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}/menu/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.success) {
        if (data.count === 0) {
          setBulkSuccessMessage("All premium default cuisines are already loaded and active in your catalog!");
        } else {
          setBulkSuccessMessage(`Hooray! Loaded ${data.count} gourmet specialty cuisines (Starters, Mains, Pizzas, Cakes, Pastas, Sides & Beverages) complete with pictures and descriptions. Adjust any pricing now by clicking Edit!`);
        }
        onRefreshAll();
        setTimeout(() => setBulkSuccessMessage(null), 10000);
      } else {
        setMenuError(data.message || "Failed to load restaurant presets.");
      }
    } catch (err) {
      console.error(err);
      setMenuError("Connection issue loading default culinary presets.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Form states for editing restaurant profile
  const [hotelName, setHotelName] = useState("");
  const [hotelCuisine, setHotelCuisine] = useState("");
  const [hotelDesc, setHotelDesc] = useState("");
  const [hotelTime, setHotelTime] = useState("");
  const [hotelFee, setHotelFee] = useState("");
  const [hotelImage, setHotelImage] = useState("");
  const [hotelMessage, setHotelMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Locate the specific restaurant managed by this manager
  const matchedRestaurantId = currentUser.restaurantId || "rest-1";

  // Active polling to fetch incoming orders and menus every 4 seconds
  useEffect(() => {
    onRefreshAll();
    const intervalId = setInterval(() => {
      onRefreshAll();
    }, 4000);
    return () => clearInterval(intervalId);
  }, []);

  // Update localized restaurant object whenever main restaurants lists change
  useEffect(() => {
    const match = restaurants.find((r) => r.id === matchedRestaurantId);
    if (match) {
      setRestaurant(match);
      // Pre-fill profile configuration forms
      setHotelName(match.name);
      setHotelCuisine(match.cuisine);
      setHotelDesc(match.description);
      setHotelTime(match.deliveryTime);
      setHotelFee(match.deliveryFee.toString());
      setHotelImage(match.imageUrl);
    }
  }, [restaurants, matchedRestaurantId]);

  // Filter orders intended for this manager's restaurant
  const matchedOrders = useMemo(() => {
    return orders.filter((o) => o.restaurantId === matchedRestaurantId);
  }, [orders, matchedRestaurantId]);

  // Calculate dynamic business metrics / financial analytics
  const metrics = useMemo(() => {
    let salesTotal = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let preparingCount = 0;

    matchedOrders.forEach((o) => {
      if (o.status !== "Cancelled" && o.status !== "Pending") {
        salesTotal += o.totalAmount;
      }
      if (o.status === "Pending") pendingCount++;
      if (o.status === "Delivered") completedCount++;
      if (o.status === "Ready" || o.status === "Accepted" || o.status === "Delivery Agent Assigned") preparingCount++;
    });

    return {
      salesTotal,
      pendingCount,
      completedCount,
      preparingCount,
      totalCount: matchedOrders.length,
    };
  }, [matchedOrders]);

  // Handle Order Status shifting
  const handleUpdateStatus = async (orderId: string, nextStatus: Order["status"]) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (data.success) {
        onRefreshAll();
      } else {
        alert(data.message || "Failed to update order step.");
      }
    } catch (e) {
      console.error("Connection error updating order step.");
    }
  };

  // Switch availability of items
  const handleToggleAvailability = async (item: MenuItem) => {
    if (!restaurant) return;
    try {
      await fetch(`/api/restaurants/${restaurant.id}/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      onRefreshAll();
    } catch (err) {
      console.error("Availability state edit issue.");
    }
  };

  // Save restaurant profile settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    setHotelMessage(null);
    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hotelName,
          cuisine: hotelCuisine,
          description: hotelDesc,
          deliveryTime: hotelTime,
          deliveryFee: parseFloat(hotelFee) || 0,
          imageUrl: hotelImage,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setHotelMessage("Restaurant portal configuration saved successfully!");
        onRefreshAll();
      } else {
        setHotelMessage("Save failed: " + data.message);
      }
    } catch (err) {
      setHotelMessage("Network failure. Could not contact API router.");
    } finally {
      setLoading(false);
    }
  };

  // Edit / Add Menu items save trigger
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setMenuError(null);

    if (!menuName || !menuPrice) {
      setMenuError("Dishes must feature a name and valid pricing.");
      return;
    }

    const payload = {
      name: menuName,
      category: menuCategory,
      price: parseFloat(menuPrice) || 0,
      description: menuDescription,
      imageUrl: menuImageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
      isAvailable: menuAvailable,
    };

    setLoading(true);
    try {
      let response;
      if (selectedMenuItem) {
        // Edit existing
        response = await fetch(`/api/restaurants/${restaurant.id}/menu/${selectedMenuItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        response = await fetch(`/api/restaurants/${restaurant.id}/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (data.success) {
        // Reset and refresh
        setIsEditingMenu(false);
        setSelectedMenuItem(null);
        setMenuName("");
        setMenuPrice("");
        setMenuDescription("");
        setMenuImageUrl("");
        setMenuCategory("Mains");
        setMenuAvailable(true);
        onRefreshAll();
      } else {
        setMenuError(data.message || "Failed validation step.");
      }
    } catch (err) {
      setMenuError("Connection failure adding item registry.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Open form populated
  const openEditMenuItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setMenuName(item.name);
    setMenuPrice(item.price.toString());
    setMenuCategory(item.category);
    setMenuDescription(item.description);
    setMenuImageUrl(item.imageUrl);
    setMenuAvailable(item.isAvailable);
    setIsEditingMenu(true);
    setMenuError(null);
  };

  const openAddMenuItem = () => {
    setSelectedMenuItem(null);
    setMenuName("");
    setMenuPrice("");
    setMenuCategory("Mains");
    setMenuDescription("");
    setMenuImageUrl("");
    setMenuAvailable(true);
    setIsEditingMenu(true);
    setMenuError(null);
  };

  // Delete item handler
  const handleDeleteMenuItem = async (itemId: string) => {
    if (!restaurant) return;
    if (!confirm("Are you certain you wish to remove this delicacy from your catalog?")) return;

    try {
      const response = await fetch(`/api/restaurants/${restaurant.id}/menu/${itemId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        onRefreshAll();
      }
    } catch (err) {
      console.error("Delete database item exception.");
    }
  };

  const handleRecreateKitchen = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: matchedRestaurantId,
          name: "Dimond Bawarchi Restorant",
          cuisine: "Hyderabadi Dum Biryani & Mughlai",
          deliveryTime: "20-30 min",
          deliveryFee: 30,
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
          description: "Freshly restored digital kitchen managed in real time with our cloud system."
        })
      });
      const data = await response.json();
      if (data.success) {
        await onRefreshAll();
      }
    } catch (err) {
      console.error("Failed to restore kitchen:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkDefaultHotel = () => {
    const updatedUser = { ...currentUser, restaurantId: "rest-1" };
    localStorage.setItem("biteflow_user", JSON.stringify(updatedUser));
    window.location.reload();
  };

  if (!restaurant) {
    return (
      <div className="bg-white p-12 text-center rounded-[32px] border border-orange-100 shadow-lg max-w-xl mx-auto my-8" id="manager-no-restaurant">
        <AlertCircle className="w-14 h-14 text-orange-500 mx-auto mb-5 animate-pulse" />
        <h3 className="font-sans font-black text-slate-900 text-xl tracking-tight">Initializing Associated Portal Records...</h3>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          It looks like your custom session or database index was reset because of a cloud server reboot.
        </p>

        <div className="mt-8 p-5 bg-orange-50/45 rounded-2xl border border-orange-100 text-left space-y-3.5">
          <p className="text-xs font-bold text-orange-950 uppercase tracking-wide">Quick Recovery Channels:</p>
          
          <div className="space-y-3">
            <button 
              onClick={handleRecreateKitchen}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all text-left shadow-sm cursor-pointer"
            >
              <span>Option A: Re-create Dimond Bawarchi Restorant</span>
              <span className="bg-white/20 px-2 py-0.5 rounded font-mono font-normal">Create New</span>
            </button>

            <button 
              onClick={handleLinkDefaultHotel}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-orange-50 text-slate-800 rounded-xl text-xs font-extrabold border border-orange-100 transition-all text-left shadow-2xs cursor-pointer"
            >
              <span>Option B: Bind to "Dimond Bawarchi Restorant" (Demo)</span>
              <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-mono font-normal">Link Default</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center px-2">
          <span className="text-[10px] text-slate-400 font-medium">Station ID: <code className="font-mono bg-slate-50 px-1 rounded">{matchedRestaurantId}</code></span>
          <button 
            onClick={() => onRefreshAll()} 
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Manual Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id={`manager-dashboard-${restaurant.id}`}>
      {/* Dashboard Brand Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-orange-955 text-white rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md border border-orange-200/20">
        <div>
          <span className="text-[10px] font-black uppercase bg-orange-500 text-white px-2.5 py-1 rounded-lg tracking-widest font-sans shadow-xs">
            Hotel Manager Operations Console
          </span>
          <h1 className="text-2xl md:text-3.5xl font-black font-sans tracking-tight mt-3">{restaurant.name}</h1>
          <p className="text-orange-100/70 text-xs mt-1.5 font-medium">
            Digitized culinary station: <span className="text-orange-400 font-extrabold">{restaurant.cuisine}</span> | Active orders tracked in real time.
          </p>
        </div>

        {/* Action tabs packaged beautifully in transparent layout frame */}
        <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 shrink-0 border border-white/10">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === "orders" ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-150" : "text-orange-105 hover:text-white"}`}
          >
            Live Orders ({metrics.pendingCount + metrics.preparingCount})
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === "menu" ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-150" : "text-orange-105 hover:text-white"}`}
          >
            Manage Menu ({restaurant.menu.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === "settings" ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-150" : "text-orange-105 hover:text-white"}`}
          >
            Portal Profile
          </button>
        </div>
      </div>

      {/* Real-time Business Analytics Cards configured for Vibrant Palette */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-orange-100 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F172A]/70">Gross Income</span>
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl md:text-3xl font-black text-slate-900 mt-2">₹{metrics.salesTotal.toFixed(0)}</p>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg mt-1 inline-block">★ Live Revenues</span>
        </div>

        <div className="bg-white rounded-3xl border border-orange-100 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F172A]/70">New Pending</span>
            <ListOrdered className="w-4 h-4 text-orange-500 animate-bounce" />
          </div>
          <p className={`text-xl md:text-3xl font-black mt-2 ${metrics.pendingCount > 0 ? "text-orange-600 animate-pulse" : "text-slate-900"}`}>
            {metrics.pendingCount}
          </p>
          <span className="text-[10px] text-orange-950 font-semibold bg-orange-150/40 px-2 py-0.5 rounded-lg mt-1 inline-block">Awaiting validation</span>
        </div>

        <div className="bg-white rounded-3xl border border-orange-100 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F172A]/70">In Kitchen</span>
            <Play className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-xl md:text-3xl font-black text-slate-900 mt-2">{metrics.preparingCount}</p>
          <span className="text-[10px] text-slate-500 font-medium mt-1.5 block">Active chefs & delivery</span>
        </div>

        <div className="bg-white rounded-3xl border border-orange-100 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F172A]/70">Delivered</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl md:text-3xl font-black text-slate-900 mt-2">{metrics.completedCount}</p>
          <span className="text-[10px] text-[#0F172A]/60 font-medium mt-1.5 block">Completed client packages</span>
        </div>
      </div>

      {/* --- TAB VIEW 1: INCOMING/ONGOING ORDERS MANAGEMENT --- */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <span>Dynamic Order Fulfillment Feed</span>
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            </h3>
            
            <button
              onClick={() => onRefreshAll()}
              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-slate-950 transition"
            >
              <RefreshCcw className="w-3 h-3" /> Soft Reload
            </button>
          </div>

          {matchedOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-150 p-12 text-center" id="manager-empty-orders">
              <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
              <h4 className="font-sans font-bold text-gray-900">No Orders Registered</h4>
              <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                No orders have been placed for your restaurant yet. When clients checkout from your menu, they will register here dynamically with chime alerts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {matchedOrders.map((order) => {
                const getActionButton = () => {
                  switch (order.status) {
                    case "Pending":
                      return {
                        label: "Accept Order",
                        color: "bg-emerald-600 hover:bg-emerald-700 text-white",
                        icon: Check,
                        next: "Accepted" as Order["status"],
                        disabled: false
                      };
                    case "Accepted":
                      return {
                        label: "Mark Food Ready",
                        color: "bg-indigo-600 hover:bg-indigo-700 text-white",
                        icon: Play,
                        next: "Ready" as Order["status"],
                        disabled: false
                      };
                    case "Ready":
                      return {
                        label: "Assign Rider Below",
                        color: "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed",
                        icon: Truck,
                        next: "Ready" as Order["status"],
                        disabled: true
                      };
                    case "Delivery Agent Assigned":
                      return {
                        label: "Awaiting Delivery OTP",
                        color: "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed",
                        icon: Clock,
                        next: "Delivery Agent Assigned" as Order["status"],
                        disabled: true
                      };
                    default:
                      return null;
                  }
                };                const action = getActionButton();

                return (
                  <div
                    key={order.id}
                    id={`manager-order-card-${order.id}`}
                    className={`bg-white rounded-3xl border overflow-hidden transition duration-200 ${
                      order.status === "Pending" ? "border-orange-400 shadow-md ring-2 ring-orange-100 shadow-orange-100/30" : "border-orange-100/75"
                    }`}
                  >
                    {/* Upper row */}
                    <div className="p-4.5 border-b border-orange-100/50 bg-orange-50/25 flex flex-col md:flex-row justify-between md:items-center gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs bg-orange-100 text-orange-850 px-2 py-0.5 rounded-md">
                            #{order.id}
                          </span>
                          <span className="font-black text-[#0F172A] text-sm">{order.userName}</span>
                          <span className="text-slate-450 font-bold">| {order.userPhone}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                          Placed {new Date(order.timestamp).toLocaleTimeString()} ({new Date(order.timestamp).toLocaleDateString()})
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 self-start md:self-auto">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          order.status === "Pending" ? "bg-orange-100 text-orange-700 border-orange-200 animate-pulse" :
                          order.status === "Accepted" ? "bg-cyan-50 text-cyan-700 border-cyan-100" :
                          order.status === "Ready" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                          order.status === "Delivery Agent Assigned" ? "bg-amber-50 text-amber-900 border-amber-200 animate-pulse" :
                          order.status === "Delivered" ? "bg-green-50 text-green-700 border-green-100" :
                          "bg-red-50 text-red-700 border-red-150"
                        }`}>
                          ● {order.status}
                        </span>
                        
                        <span className="text-sm font-black text-slate-950 ml-1">
                          Total: ₹{order.totalAmount.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Items & details */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white text-xs">
                      {/* Left: Items list */}
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Dishes Customizing Order</p>
                        <div className="bg-orange-50/15 rounded-2xl p-4.5 space-y-2 border border-orange-50/40">
                          {order.items.map((it) => (
                            <div key={it.id} className="flex justify-between items-center text-xs text-slate-805 font-extrabold">
                              <span>{it.name} <strong className="text-orange-600 font-black bg-orange-50 px-1.5 py-0.5 rounded ml-1">×{it.quantity}</strong></span>
                              <span className="text-slate-950 font-black">₹{(it.price * it.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Courier & addresses info */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Fulfillment Destination</p>
                          <p className="bg-orange-50/40 p-3 rounded-2xl border border-orange-100/40 text-[#0F172A] text-[11px] font-semibold leading-relaxed">
                            {order.deliveryAddress}
                          </p>
                        </div>
                        {order.instructions && (
                          <div>
                            <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Chef Comments</p>
                            <p className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-amber-900 text-[10px] font-medium leading-relaxed italic">
                              "{order.instructions}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery & Security Handshake Status Panel */}
                    <div className="mx-5 mb-5 p-4.5 bg-[#FDFCF7] border border-orange-150 rounded-2xl space-y-3.5 text-xs text-slate-702">
                      <div className="flex items-center justify-between border-b border-orange-100/60 pb-2.5 flex-wrap gap-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#0F172A]/70 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-orange-600 animate-pulse" />
                          Delivery Logistics & Secured OTP Handshake
                        </span>
                        {order.deliveryPersonName ? (
                          <span className="text-[9px] font-black uppercase text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-lg shrink-0">
                            Rider Bound
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg shrink-0 animate-pulse">
                            Awaiting Dispatch
                          </span>
                        )}
                      </div>

                      {/* Case A: No Rider Assigned Yet (Render assignment prompt & presets) */}
                      {!order.deliveryPersonName ? (
                        <div className="space-y-3">
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Assign one of our default pilots or enter custom courier details below:
                          </p>
                          
                          {/* Ready-to-go quick rider buttons */}
                          <div className="flex flex-wrap gap-2">
                            {READY_RIDERS.map((rider, key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleAssignDelivery(order.id, rider.name, rider.phone)}
                                className="px-3 py-2 bg-white border border-orange-150 hover:bg-orange-50 text-slate-800 text-[10px] font-bold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-3xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                {rider.name} ({rider.phone})
                              </button>
                            ))}
                          </div>

                          {/* Custom entries */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                            <input
                              type="text"
                              value={assignRiders[order.id]?.name || ""}
                              placeholder="Runner Full Name"
                              onChange={(e) => setAssignRiders({
                                ...assignRiders,
                                [order.id]: {
                                  name: e.target.value,
                                  phone: assignRiders[order.id]?.phone || ""
                                }
                              })}
                              className="px-3 py-2 bg-white border border-orange-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 shadow-3xs"
                            />
                            <input
                              type="text"
                              value={assignRiders[order.id]?.phone || ""}
                              placeholder="Runner Phone / Number"
                              onChange={(e) => setAssignRiders({
                                ...assignRiders,
                                [order.id]: {
                                  name: assignRiders[order.id]?.name || "",
                                  phone: e.target.value
                                }
                              })}
                              className="px-3 py-2 bg-white border border-orange-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 shadow-3xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = assignRiders[order.id];
                                if (!input?.name || !input?.phone) {
                                  alert("Please fill out both the driver name and phone number.");
                                  return;
                                }
                                handleAssignDelivery(order.id, input.name, input.phone);
                              }}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-sm shadow-orange-150/45"
                            >
                              Dispatch Manually
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Case B: Rider is assigned */
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-3 rounded-xl border border-orange-100/50 gap-2">
                            <div className="text-xs">
                              <p className="font-extrabold text-[#0F172A]" id="assigned-rider-display">
                                Assigned Rider: <span className="font-sans font-black text-orange-600">{order.deliveryPersonName}</span>
                              </p>
                              <p className="text-slate-500 font-bold mt-1 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-orange-500" /> {order.deliveryPersonPhone}
                              </p>
                            </div>

                            {/* Reassign option */}
                            <button
                              type="button"
                              onClick={() => {
                                // Reset values to clear the assignment
                                handleAssignDelivery(order.id, "", "");
                              }}
                              className="text-[10px] font-black text-slate-450 hover:text-orange-600 transition underline cursor-pointer"
                            >
                              Revoke & Re-assign Rider
                            </button>
                          </div>

                          {/* OTP Verification Prompt for Order */}
                          {order.status === "Delivery Agent Assigned" ? (
                            <div className="bg-orange-600/5 p-4 rounded-xl border border-orange-200/55 space-y-3">
                              <div className="text-xs text-orange-950 font-bold">
                                🔒 Secure Handshake Required
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                                  Ask the customer for the 4-digit verification code showing on their active order tracking status block.
                                </p>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="Enter 4-Digit Customer OTP"
                                  value={enteredOtps[order.id] || ""}
                                  onChange={(e) => setEnteredOtps({
                                    ...enteredOtps,
                                    [order.id]: e.target.value.replace(/\D/g, "")
                                  })}
                                  className="px-3.5 py-2.5 bg-white border border-orange-200 rounded-xl font-mono text-center tracking-widest text-sm font-extrabold focus:outline-none focus:ring-1 focus:ring-orange-500 sm:w-56"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const entered = enteredOtps[order.id];
                                    if (!entered || entered.length !== 4) {
                                      alert("Please enter a valid 4-digit numeric code.");
                                      return;
                                    }
                                    const verified = await handleVerifyOtp(order.id, entered);
                                    if (verified) {
                                      // Clear input State
                                      setEnteredOtps({ ...enteredOtps, [order.id]: "" });
                                    }
                                  }}
                                  className="px-5 py-2 hover:opacity-95 bg-gradient-to-r from-orange-600 to-red-650 text-white font-black text-xs rounded-xl transition cursor-pointer shrink-0 shadow-sm shadow-orange-100"
                                >
                                  Complete Delivery with OTP
                                </button>
                              </div>
                            </div>
                          ) : (
                            order.status === "Delivered" && (
                              <div className="bg-green-50 p-3 rounded-xl border border-green-150 text-green-700 font-extrabold text-xs">
                                ✓ Handshake Complete: Verifiably delivered to customer.
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom action row */}
                    {order.status !== "Delivered" && order.status !== "Cancelled" && (
                      <div className="p-3.5 bg-orange-50/20 border-t border-orange-50 flex justify-between items-center gap-2">
                        {/* Cancel order button */}
                        <button
                          onClick={() => handleUpdateStatus(order.id, "Cancelled")}
                          className="flex items-center gap-1.5 py-2 px-4 text-red-650 hover:bg-red-50 rounded-xl text-xs font-black cursor-pointer transition border border-red-100"
                        >
                          <Ban className="w-4 h-4" />
                          Cancel Ticket
                        </button>

                        {/* Status advancement button */}
                        {action && (
                          <button
                            onClick={() => {
                              if (!action.disabled) {
                                handleUpdateStatus(order.id, action.next);
                              }
                            }}
                            id={`btn-order-advance-${order.id}`}
                            disabled={action.disabled}
                            className={`flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-black transition-all shadow-xs ${
                              action.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                            } ${action.color}`}
                          >
                            <action.icon className="w-4 h-4 text-white/90" />
                            {action.label}
                            {!action.disabled && <ArrowRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB VIEW 2: CUISINES & MENU MANAGEMENT --- */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-3xl border border-orange-100 shadow-md shadow-orange-100/10 gap-5">
            <div>
              <h3 className="font-sans font-black text-[#0F172A] text-lg">Cuisines and Food Items Catalog</h3>
              <p className="text-slate-500 text-xs font-semibold">Add, edit, or delete dishes reflecting on client browser instantly.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBulkLoadPresets}
                disabled={bulkLoading}
                className="flex items-center justify-center gap-1.5 px-4.5 py-3 bg-orange-50 hover:bg-orange-100/80 disabled:opacity-50 text-orange-950 font-black text-xs rounded-xl cursor-pointer transition border border-orange-200 shadow-xs"
              >
                {bulkLoading ? (
                  <>
                    <RefreshCcw className="w-4 h-4 text-orange-600 animate-spin" />
                    <span>Importing Presets...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                    <span>Auto-Fill 15 Cuisines (Free)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={openAddMenuItem}
                id="btn-add-menu-item"
                className="flex items-center justify-center gap-1.5 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-xs rounded-xl cursor-pointer transition shadow-md shadow-orange-100"
              >
                <Plus className="w-4 h-4" /> Add Custom Delicacy
              </button>
            </div>
          </div>

          {/* Educational Quick Setup Helper Banner */}
          {restaurant.menu.length === 0 && !bulkSuccessMessage && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-3xl border border-orange-150 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-black text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  Hotel Manager Hack — Quick Start Setup
                </p>
                <p className="text-slate-705 text-xs leading-relaxed max-w-xl font-medium">
                  Don't have time to manually upload pictures, categories, and ingredients for all items? Press the <strong>Auto-Fill</strong> button above to load 15 exquisite local & global favorite cuisines instantly. Then, simply click <strong>Edit</strong> beside any item to adjust its price!
                </p>
              </div>
              <button
                type="button"
                onClick={handleBulkLoadPresets}
                disabled={bulkLoading}
                className="shrink-0 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                {bulkLoading ? "Preparing Menu..." : "Fill My Menu Now"}
              </button>
            </div>
          )}

          {bulkSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-950 font-medium rounded-2xl text-xs space-y-1 relative shadow-xs animate-fade-in pl-11">
              <Check className="w-5 h-5 text-emerald-600 absolute left-4 top-4.5" />
              <p className="font-extrabold text-emerald-900">Success Setup Complete!</p>
              <p className="leading-relaxed">{bulkSuccessMessage}</p>
            </div>
          )}

          {/* Menu item Editor Form Card (Collapsible) */}
          {isEditingMenu && (
            <div className="bg-white rounded-[32px] border-2 border-orange-200 p-6 shadow-md shadow-orange-100/20 space-y-4 relative" id="menu-editor-card">
              <button
                onClick={() => setIsEditingMenu(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="font-sans font-black text-[#0F172A] text-lg border-b border-orange-50 pb-2">
                {selectedMenuItem ? `Modifying Spec: "${selectedMenuItem.name}"` : "Add New Specialized Delicacy"}
              </h4>

              {menuError && (
                <div className="p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-xs font-bold">
                  {menuError}
                </div>
              )}

              <form onSubmit={handleSaveMenuItem} className="grid grid-cols-1 md:grid-cols-3 gap-4.5 text-xs">
                <div>
                  <label className="block text-slate-800 font-extrabold mb-1.5 pl-1">Dish/Food Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sizzling Garlic Chicken Wings"
                    className="w-full p-3 border border-orange-100/95 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-slate-800 font-semibold"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                  />
                </div>

                 <div>
                  <label className="block text-slate-850 font-extrabold mb-1.5 pl-1">Price (Rupees ₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="e.g. 150"
                    className="w-full p-3 border border-orange-100/95 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-slate-900 font-bold font-sans"
                    value={menuPrice}
                    onChange={(e) => setMenuPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-extrabold mb-1.5 pl-1">Category Group</label>
                  <select
                    className="w-full p-3 border border-orange-100/95 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-slate-850 font-extrabold"
                    value={menuCategory}
                    onChange={(e) => setMenuCategory(e.target.value)}
                  >
                    <option value="Starters">Starters & Appetizers</option>
                    <option value="Mains">Main Entrées</option>
                    <option value="Pizzas">Gourmet Pizzas & Tandoors</option>
                    <option value="Pastas">Artisanal Pastas & Noodles</option>
                    <option value="Sides">Sides & Loaded Shakes</option>
                    <option value="Cakes">Patisserie Cakes & Sweets</option>
                    <option value="Beverages">Chilled Drinks & Mocktails</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-800 font-extrabold mb-1.5 pl-1">Gourmet Image URL</label>
                  <input
                    type="url"
                    placeholder="Provide image link, or leave blank to use premium preset"
                    className="w-full p-3 border border-orange-100/95 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-slate-800 font-semibold font-mono"
                    value={menuImageUrl}
                    onChange={(e) => setMenuImageUrl(e.target.value)}
                  />
                </div>

                {/* Drag and Drop and Direct Upload Section */}
                <div className="md:col-span-3 border border-dashed border-orange-200 rounded-2xl bg-orange-50/5 p-4.5 flex flex-col items-center justify-center text-center">
                  <span className="font-extrabold text-[#0F172A] text-xs mb-2">Upload Dish Picture (Auto-Resizes)</span>
                  <div 
                    className="w-full border-2 border-dashed border-orange-100/80 hover:border-orange-500 bg-white rounded-2xl p-4 cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        try {
                          const file = e.dataTransfer.files[0];
                          const base64 = await resizeImage(file);
                          setMenuImageUrl(base64);
                        } catch (err) {
                          setMenuError("Could not process uploaded image file.");
                        }
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = async (e: any) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            const file = e.target.files[0];
                            const base64 = await resizeImage(file);
                            setMenuImageUrl(base64);
                          } catch (err) {
                            setMenuError("Could not resolve image file.");
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    {menuImageUrl ? (
                      <div className="flex items-center gap-4 text-left">
                        <img 
                          src={menuImageUrl} 
                          className="w-20 h-20 bg-orange-50/10 rounded-2xl overflow-hidden shrink-0 border border-orange-100 object-cover" 
                          alt="Uploaded Preview" 
                          referrerPolicy="no-referrer" 
                        />
                        <div>
                          <p className="text-xs text-emerald-600 font-extrabold">✓ Image Resized Successfully</p>
                          <p className="text-[10px] text-slate-500 font-normal mt-0.5">Custom layout dimensions calculated. Automatically matched with demo display!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-500">
                        <Plus className="w-5 h-5 text-orange-500 group-hover:scale-110 transition" />
                        <p className="text-xs font-bold text-slate-700">Drag & drop your dish picture here, or click to browse</p>
                        <p className="text-[10px] text-slate-400">Fits perfectly to dashboard thumbnails (w-20 h-20)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-extrabold mb-1.5 pl-1">Availability Status</label>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      type="button"
                      onClick={() => setMenuAvailable(!menuAvailable)}
                      className="text-slate-700 transition cursor-pointer"
                    >
                      {menuAvailable ? (
                        <ToggleRight className="w-10 h-10 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-350" />
                      )}
                    </button>
                    <span className="font-extrabold text-sm text-[#0F172A]">{menuAvailable ? "Serving Active" : "Suspended / Sold Out"}</span>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pl-1">
                    <label className="text-slate-800 font-extrabold font-sans">
                      Delicacy Ingredients / Culinary description
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAIDescription}
                      disabled={aiLoading || !menuName.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 hover:bg-orange-200 custom-ai-whip disabled:opacity-40 text-orange-950 text-xs font-black rounded-lg transition-all border border-orange-200 cursor-pointer text-slate-850"
                      title={menuName.trim() ? "Whip up an awesome ingredient & quality description!" : "Please enter a food/dish name first."}
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCcw className="w-3 h-3 animate-spin text-orange-650" />
                          <span>Mashing Spices...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                          <span>Whip with AI Magic</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder={aiLoading ? "Whipping up descriptive culinary brilliance from our chef model..." : "Mention custom blends, specific spices, organic additions description..."}
                    className="w-full p-3 border border-orange-100/95 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-slate-805 font-medium leading-relaxed font-sans"
                    value={menuDescription}
                    onChange={(e) => setMenuDescription(e.target.value)}
                    disabled={aiLoading}
                  />
                  {!menuName.trim() && (
                    <p className="text-[10px] text-slate-400 mt-1 pl-1">
                      💡 Tip: Type a food name above (e.g. "Butter Chicken") then click "Whip with AI Magic" for dynamic ingredients & delicious details!
                    </p>
                  )}
                </div>

                <div className="md:col-span-3 pt-2.5 flex justify-end gap-3.5 border-t border-orange-50">
                  <button
                    type="button"
                    onClick={() => setIsEditingMenu(false)}
                    className="px-5 py-2.5 border border-orange-200 text-orange-700 hover:bg-orange-50/30 font-black rounded-xl cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    id="btn-save-menu-item"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black rounded-xl transition shadow-md shadow-emerald-100 cursor-pointer"
                  >
                    {loading ? "Saving Item..." : "Register Culinary Item"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Dish list grid configured with curved bento grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurant.menu.map((dish) => (
              <div
                key={dish.id}
                id={`manager-menu-item-${dish.id}`}
                className="bg-white p-5 rounded-3xl border border-orange-100/90 flex gap-4.5 hover:border-orange-355 transition duration-300 relative group shadow-sm"
              >
                {/* Visual Thumbnail */}
                <div className="w-20 h-20 bg-orange-50/10 rounded-2xl overflow-hidden shrink-0 relative border border-orange-100">
                  <img
                    src={dish.imageUrl}
                    alt={dish.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {!dish.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] uppercase font-black text-white tracking-widest leading-none">
                      Sold Out
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-grow flex flex-col justify-between text-xs">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-sans font-black text-slate-900 text-sm leading-tight">{dish.name}</h4>
                      <span className="text-orange-700 font-black text-sm whitespace-nowrap bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                        ₹{dish.price.toFixed(0)}
                      </span>
                    </div>
                    <span className="text-[9px] bg-orange-100/60 text-orange-850 px-2 py-0.5 rounded-md font-black uppercase tracking-wider inline-block mt-1">
                      {dish.category}
                    </span>
                    <p className="text-slate-505 text-[10px] line-clamp-2 mt-1.5 font-semibold leading-relaxed">
                      {dish.description}
                    </p>
                  </div>

                  {/* Operational actions inline */}
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-orange-50">
                    {/* Toggle availability */}
                    <button
                      onClick={() => handleToggleAvailability(dish)}
                      className={`text-[11px] font-black flex items-center gap-1 cursor-pointer transition ${dish.isAvailable ? "text-green-600" : "text-slate-400"}`}
                    >
                      {dish.isAvailable ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500 stroke-[3]" /> Serving Active
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-slate-400 stroke-[3]" /> Suspended
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditMenuItem(dish)}
                        className="p-1.5 px-3 bg-blue-50/60 border border-blue-100 text-blue-700 hover:bg-blue-100/60 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(dish.id)}
                        className="p-1.5 px-3 bg-red-50/60 border border-red-100 text-red-705 hover:bg-red-100/60 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB VIEW 3: PORTAL SETTINGS EDITOR --- */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-[32px] border border-orange-100 p-6 md:p-8 space-y-6 shadow-md shadow-orange-100/15">
          <div>
            <h3 className="font-sans font-black text-[#0F172A] text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500 animate-spin-slow" />
              Digitised Restaurant Settings
            </h3>
            <p className="text-slate-500 text-xs mt-1 font-medium">Update hotel descriptions, average gourmet preparation time, and delivery charges.</p>
          </div>

          {hotelMessage && (
            <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold shadow-3xs">
              {hotelMessage}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4.5 text-xs">
            <div>
              <label className="block text-slate-800 font-extrabold mb-1.5 pl-1 font-sans">Eatary/Hotel Name</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-orange-100 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-semibold text-slate-800"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-800 font-extrabold mb-1.5 pl-1 font-sans">Primary Specialties / Cuisines</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-orange-100 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-semibold text-slate-800"
                value={hotelCuisine}
                onChange={(e) => setHotelCuisine(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-800 font-extrabold mb-1.5 pl-1 font-sans">Average Delivery Time Duration</label>
              <input
                type="text"
                placeholder="e.g. 20-30 min"
                className="w-full p-3 border border-orange-100 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-bold font-mono text-slate-800"
                value={hotelTime}
                onChange={(e) => setHotelTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-800 font-extrabold mb-1.5 pl-1 font-sans">Delivery Fee (Rupees ₹)</label>
              <input
                type="number"
                step="1"
                className="w-full p-3 border border-orange-100 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-bold text-slate-900"
                value={hotelFee}
                onChange={(e) => setHotelFee(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-800 font-extrabold mb-1.5 pl-1 font-sans">Restaurant Banner Landscape Image URL</label>
              <input
                type="url"
                className="w-full p-3 border border-orange-100 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-semibold font-mono text-slate-800"
                value={hotelImage}
                onChange={(e) => setHotelImage(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-800 font-extrabold mb-1.5 pl-1 font-sans">Hotel Profile Biography Remarks</label>
              <textarea
                rows={3}
                className="w-full p-3 border border-orange-100 bg-orange-50/10 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-semibold leading-relaxed text-slate-800"
                value={hotelDesc}
                onChange={(e) => setHotelDesc(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 pt-2.5 flex justify-end border-t border-orange-50">
              <button
                type="submit"
                disabled={loading}
                id="btn-save-hotel-settings"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-550 hover:shadow-md text-white font-black rounded-xl transition shadow-sm shadow-orange-100 cursor-pointer flex items-center gap-1.5"
              >
                {loading ? "Saving Portal Profile..." : "Save Portal Configuration"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
