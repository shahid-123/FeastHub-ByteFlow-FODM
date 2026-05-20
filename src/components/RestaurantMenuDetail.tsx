import { useState, useMemo } from "react";
import { Restaurant, MenuItem, User } from "../types";
import { ArrowLeft, ShoppingBag, Plus, Minus, Receipt, Edit2, ShieldAlert, Heart, Truck, Clock, Info } from "lucide-react";

interface RestaurantMenuDetailProps {
  restaurant: Restaurant;
  currentUser: User | null;
  onBack: () => void;
  onPlaceOrder: (items: { id: string; quantity: number }[], deliveryAddress: string, instructions: string) => Promise<boolean>;
}

export default function RestaurantMenuDetail({ restaurant, currentUser, onBack, onPlaceOrder }: RestaurantMenuDetailProps) {
  // Cart state maps: item id -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [deliveryAddress, setDeliveryAddress] = useState(currentUser?.address || "");
  const [instructions, setInstructions] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  // Group menu items by category
  const groupedMenu = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    restaurant.menu.forEach((item) => {
      const cat = item.category || "Other Signature Cuts";
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [restaurant]);

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const cartItemsCount = useMemo(() => {
    return (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);
  }, [cart]);

  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    const itemsList: { item: MenuItem; qty: number }[] = [];

    (Object.entries(cart) as [string, number][]).forEach(([id, qty]) => {
      const match = restaurant.menu.find((m) => m.id === id);
      if (match) {
        subtotal += match.price * qty;
        itemsList.push({ item: match, qty });
      }
    });

    const deliveryFee = restaurant.deliveryFee;
    const total = subtotal + (subtotal > 0 ? deliveryFee : 0);

    return {
      subtotal,
      deliveryFee,
      total,
      itemsList
    };
  }, [cart, restaurant]);

  const handleCheckout = async () => {
    if (!currentUser) {
      setCheckoutErr("Please login using the authorization panel to place an order.");
      return;
    }

    if (!deliveryAddress.trim()) {
      setCheckoutErr("Please specify a delivery address.");
      return;
    }

    if (cartItemsCount === 0) {
      setCheckoutErr("Choose at least 1 menu item to process order request.");
      return;
    }

    setCheckoutErr(null);
    setCheckoutLoading(true);

    const payload = (Object.entries(cart) as [string, number][]).map(([id, qty]) => ({ id, quantity: qty }));
    
    try {
      const success = await onPlaceOrder(payload, deliveryAddress, instructions);
      if (success) {
        setCart({});
        setInstructions("");
      } else {
        setCheckoutErr("Checkout validation failed on server. Try again.");
      }
    } catch (e) {
      setCheckoutErr("Error establishing checkouts. Please make sure database is online.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6" id={`restaurant-menu-${restaurant.id}`}>
      {/* Back to Browser bar */}
      {/* Back to Browser bar formatted with vibrant back action button */}
      <button
        onClick={onBack}
        id="btn-back-to-restaurants"
        className="inline-flex items-center gap-2 text-xs font-extrabold text-[#0F172A] hover:text-orange-600 bg-white border border-orange-100 px-4.5 py-2 rounded-xl transition cursor-pointer shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-orange-500" />
        Back to Restaurants
      </button>

      {/* Restaurant Cover with increased curvature */}
      <div className="relative rounded-3xl overflow-hidden bg-gray-900 text-white min-h-64 flex flex-col justify-end p-6 md:p-8 shadow-md">
        <div className="absolute inset-0 bg-cover bg-center brightness-40" style={{ backgroundImage: `url(${restaurant.imageUrl})` }}></div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap gap-2 items-center mb-2.5">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
              {restaurant.cuisine}
            </span>
            <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
              ★ {restaurant.rating.toFixed(1)} Rating
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-sans tracking-tight">{restaurant.name}</h1>
          <p className="text-gray-100 text-sm md:text-base mt-2.5 font-medium leading-relaxed">{restaurant.description}</p>
          
          <div className="flex flex-wrap items-center gap-6 mt-4.5 pt-4.5 border-t border-white/15 text-sm font-semibold text-gray-300 border-dashed">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-400" />
              Preps in {restaurant.deliveryTime}
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-orange-400" />
              Delivery charge: ₹{restaurant.deliveryFee.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Layout Split: Menu content vs Cart checkout card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-8">
          {(Object.entries(groupedMenu) as [string, MenuItem[]][]).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h3 className="font-sans font-black text-orange-950 text-xl border-l-4 border-orange-500 pl-3.5 uppercase tracking-wide">
                {category}
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {items.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      id={`menu-item-card-${item.id}`}
                      className={`flex flex-col sm:flex-row gap-4 bg-white p-4.5 rounded-3xl border transition duration-200 ${
                        qty > 0 ? "border-orange-300 shadow-md shadow-orange-50 bg-orange-50/10" : "border-orange-100 shadow-sm"
                      } ${!item.isAvailable ? "opacity-60" : ""}`}
                    >
                      {/* Dish Thumbnail */}
                      <div className="w-full sm:w-28 h-28 shrink-0 bg-gray-50 rounded-2xl overflow-hidden relative border border-orange-50">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white text-[9px] uppercase font-black tracking-widest">
                            Sold Out
                          </div>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-sans font-extrabold text-[#0F172A] text-lg">{item.name}</h4>
                            <span className="text-orange-600 font-black text-lg whitespace-nowrap">₹{item.price.toFixed(0)}</span>
                          </div>
                          <p className="text-sm text-slate-650 font-medium leading-relaxed mt-1.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        {/* Order action */}
                        <div className="flex items-center justify-between mt-3.5">
                          <span className={`text-[10px] font-bold ${item.isAvailable ? "text-green-600 bg-green-50 px-2.5 py-1 rounded-lg" : "text-red-500"}`}>
                            {item.isAvailable ? "Available Now" : "Unavailable"}
                          </span>

                          {item.isAvailable && (
                            <div className="flex items-center gap-2 bg-orange-50/40 border border-orange-100 rounded-xl p-1.5 shadow-2xs">
                              {qty > 0 ? (
                                <>
                                  <button
                                    onClick={() => updateCartQuantity(item.id, -1)}
                                    id={`btn-dec-qty-${item.id}`}
                                    className="p-1 text-orange-700 hover:text-orange-950 hover:bg-white rounded-lg transition"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center text-xs font-black text-orange-950">{qty}</span>
                                  <button
                                    onClick={() => updateCartQuantity(item.id, 1)}
                                    id={`btn-inc-qty-${item.id}`}
                                    className="p-1 text-orange-700 hover:text-orange-950 hover:bg-white rounded-lg transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                  <button
                                    onClick={() => updateCartQuantity(item.id, 1)}
                                    id={`btn-add-to-cart-${item.id}`}
                                    className="px-3.5 py-1.5 bg-white hover:bg-orange-100 text-orange-900 border border-orange-150 text-xs font-extrabold rounded-lg shadow-2xs transition cursor-pointer"
                                  >
                                    Add to Order
                                  </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Shopping Cart and checkout form */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-orange-100 shadow-lg p-6 sticky top-6" id="shopping-cart-checkout-box">
            <div className="flex items-center justify-between pb-4 border-b border-orange-50 mb-4">
              <h3 className="font-sans font-black text-orange-950 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                Selected Items
              </h3>
              <span className="bg-orange-100 text-orange-850 px-2.5 py-0.5 rounded-xl text-[11px] font-black">
                {cartItemsCount} items
              </span>
            </div>

            {cartItemsCount === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <ShoppingBag className="w-12 h-12 stroke-1 mx-auto mb-3 text-orange-250 animate-bounce" />
                <p className="text-xs font-bold text-slate-700">Your meal box is empty.</p>
                <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Select delicacies from the menu to build your virtual delivery package.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* List items */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                  {cartCalculations.itemsList.map(({ item, qty }) => (
                    <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-orange-50/50 text-slate-800">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-sm">{item.name}</p>
                        <p className="text-xs text-orange-600 font-bold">{qty} × ₹{item.price.toFixed(0)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">₹{(item.price * qty).toFixed(0)}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping & Delivery Inputs */}
                <div className="space-y-3 pt-3">
                  <div>
                    <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-1.5">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      className="w-full text-sm p-3 bg-orange-50/30 border border-orange-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden text-slate-805 font-semibold"
                      placeholder="e.g. Station Road near Bus Stand, Shadnagar, Telangana"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      Cooking Guidelines
                      <span className="text-[10px] text-slate-400 font-normal lowercase font-sans">Optional</span>
                    </label>
                    <textarea
                      rows={2}
                      className="w-full text-sm p-3 bg-orange-50/30 border border-orange-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-hidden text-slate-850 font-medium"
                      placeholder="e.g. Please bring extra raita, call upon arrival, make it spicy..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-orange-50/30 rounded-2xl p-4.5 space-y-2 text-sm border border-orange-100/70 shadow-2xs">
                  <div className="flex justify-between text-slate-650 font-bold">
                    <span>Subtotal</span>
                    <span>₹{cartCalculations.subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-655 font-bold">
                    <span>Delivery Service Fee</span>
                    <span>₹{cartCalculations.deliveryFee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between font-black text-orange-950 text-base pt-2 border-t border-orange-100">
                    <span>Estimated Total</span>
                    <span>₹{cartCalculations.total.toFixed(0)}</span>
                  </div>
                </div>

                {/* Identity banner */}
                {!currentUser ? (
                  <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/80 flex items-start gap-1.5 text-xs text-amber-900 leading-relaxed shadow-3xs">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-amber-955 mr-1">Authorisation Required:</span> Log in with a demo account or sign up on the left profile card first to make checkouts.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-orange-50/40 rounded-xl p-2.5 border border-orange-100/60">
                    <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Placing order as <strong className="text-slate-800 font-bold">{currentUser.name}</strong></span>
                  </div>
                )}

                {checkoutErr && (
                  <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200 font-semibold text-center">
                    {checkoutErr}
                  </p>
                )}

                {/* Instant Place Order Button */}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !currentUser}
                  id="btn-process-checkout"
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !currentUser 
                      ? "bg-slate-205 cursor-not-allowed text-slate-400" 
                      : "bg-gradient-to-r from-orange-500 to-red-550 shadow-md shadow-orange-150 hover:shadow-lg hover:shadow-orange-200"
                  }`}
                >
                  {checkoutLoading ? (
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 text-orange-200" />
                      Place Delivery Order (₹{cartCalculations.total.toFixed(0)})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
