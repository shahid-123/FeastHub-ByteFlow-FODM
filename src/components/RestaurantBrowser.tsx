import { useState, useMemo } from "react";
import { Restaurant } from "../types";
import { Search, Star, Clock, Heart, Truck, Award } from "lucide-react";

interface RestaurantBrowserProps {
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

export default function RestaurantBrowser({ restaurants, onSelectRestaurant }: RestaurantBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");

  const cuisinesList = useMemo(() => {
    const list = new Set<string>();
    restaurants.forEach((r) => {
      // Split by commas/ampersands to extract individual tags, clean up
      r.cuisine.split(/[&,]/).forEach((tag) => {
        list.add(tag.trim());
      });
    });
    return ["All", ...Array.from(list)];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.menu.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCuisine =
        selectedCuisine === "All" ||
        r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase());

      return matchesSearch && matchesCuisine;
    });
  }, [restaurants, searchQuery, selectedCuisine]);

  return (
    <div className="space-y-6" id="restaurant-browser-root">
      {/* Brand Hero Banner structured for FeastHub Vibrant Palette */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-550 text-white p-8 md:p-12 shadow-md">
        <div className="absolute inset-0 bg-cover bg-center brightness-35 mix-blend-overlay" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80')" }}></div>
        <div className="relative z-10 max-w-xl animate-fade-in">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md mb-4 border border-white/10">
            <Award className="w-3.5 h-3.5 text-yellow-350" />
            Top Thermal Delivery in Shadnagar
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-sans tracking-tight leading-tight">
            Best Hotels in Shadnagar & Rangareddy
          </h2>
          <p className="text-orange-50/95 text-sm md:text-base mt-3.5 font-medium max-w-md leading-relaxed">
            Savor piping hot delicacies from certified local kitchens across Shadnagar, Rangareddy district, Telangana. Delivered with instant live tracking!
          </p>
        </div>
      </div>

      {/* Filters and Search toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4.5 rounded-3xl border border-orange-100 shadow-md shadow-orange-100/20">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search restaurants, dishes, cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-orange-100 rounded-xl text-sm bg-orange-50/20 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-hidden transition-all duration-200"
          />
        </div>

        {/* Cuisines tag scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {cuisinesList.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setSelectedCuisine(cuisine)}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold whitespace-nowrap transition-all duration-250 cursor-pointer ${
                selectedCuisine === cuisine
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-150 scale-102"
                  : "bg-orange-50/60 text-orange-950 hover:bg-orange-100/90"
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List with Premium Card styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            onClick={() => onSelectRestaurant(restaurant)}
            id={`rest-card-${restaurant.id}`}
            className="group bg-white rounded-3xl border border-orange-100/95 shadow-md hover:shadow-xl hover:border-orange-200 overflow-hidden cursor-pointer transition-all duration-350 transform hover:-translate-y-1.5 flex flex-col h-full"
          >
            {/* Header image with badges */}
            <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
              <img
                src={restaurant.imageUrl}
                alt={restaurant.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-black text-slate-800 flex items-center gap-1 shadow-sm border border-orange-50/50">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                {restaurant.rating.toFixed(1)}
              </div>
              <div className="absolute top-3 right-3 bg-black/45 backdrop-blur-xs p-2 rounded-full text-white hover:bg-red-500 hover:text-white transition duration-200 shadow-sm">
                <Heart className="w-4 h-4 fill-transparent hover:fill-current" />
              </div>
            </div>

            {/* Content info */}
            <div className="p-5 flex-grow flex flex-col justify-between">
              <div>
                <h3 className="font-sans font-extrabold text-[#0F172A] text-xl group-hover:text-orange-550 transition-colors">
                  {restaurant.name}
                </h3>
                <span className="text-orange-655 text-xs font-black uppercase tracking-wider mt-2.5 inline-block bg-orange-150/40 px-2.5 py-0.5 rounded-md">
                  {restaurant.cuisine}
                </span>
                <p className="text-slate-650 text-sm line-clamp-2 mt-3 font-medium leading-relaxed">
                  {restaurant.description}
                </p>
              </div>

              {/* Delivery footer tags */}
              <div className="flex items-center gap-4 text-sm font-bold text-slate-550 mt-5 pt-3.5 border-t border-orange-50/70">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  {restaurant.deliveryTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-orange-500" />
                  {restaurant.deliveryFee === 0 ? "Free Delivery" : `₹${restaurant.deliveryFee.toFixed(0)} Delivery`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="bg-white rounded-3xl border border-orange-100 p-12 text-center shadow-md shadow-orange-100/20" id="restaurants-empty-state">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 font-sans">No restaurants found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto leading-relaxed">
            We couldn't find matches for "{searchQuery}" under "{selectedCuisine}". Try looking for another cuisine search term or clean filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCuisine("All");
            }}
            id="btn-clear-browser-filters"
            className="mt-5 px-5 py-2.5 bg-gradient-to-r from-orange-550 to-red-500 text-white text-xs font-extrabold rounded-xl hover:shadow-md transition cursor-pointer shadow-sm"
          >
            Clear Search & Filters
          </button>
        </div>
      )}
    </div>
  );
}
