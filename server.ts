import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required in settings");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  imageUrl: string;
  description: string;
  menu: MenuItem[];
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number;
  status: "Pending" | "Accepted" | "Ready" | "Delivery Agent Assigned" | "Delivered" | "Cancelled";
  deliveryAddress: string;
  timestamp: string;
  instructions?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  deliveryOtp?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "manager" | "restaurant_manager" | "delivery";
  address?: string;
  phone?: string;
  restaurantId?: string; // Associated restaurant for managers
}

// Global default cuisines list
const defaultMenu: MenuItem[] = [
  {
    id: "m-1",
    name: "Paneer Malai Tikka",
    category: "Starters",
    price: 180,
    description: "Melt-in-your-mouth cottage cheese cubes marinated in cardamom cream, fresh cashews, and grilled to golden perfection.",
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-2",
    name: "Crispy Chilli Mushrooms",
    category: "Starters",
    price: 160,
    description: "Crunchy tempura-fried organic handpicked mushrooms wok-tossed with green bell peppers, dark chillies, and soy reduction.",
    imageUrl: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-3",
    name: "Grand Mughlai Murgh",
    category: "Mains",
    price: 240,
    description: "Tender chunks of boneless tandoori chicken slow folded in a buttery cashew-tomato gravy, with premium whole-ground kitchen spices.",
    imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-4",
    name: "Anjeeri Shahi Kofta",
    category: "Mains",
    price: 220,
    description: "Fabulous golden vegetable and cottage cheese balls stuffed with royal dry sweet figs simmered in premium creamy almond sauce.",
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-5",
    name: "Deccani Mutton Biryani",
    category: "Mains",
    price: 290,
    description: "Traditional kettle-steamed rich basmati rice cooked layered with tender local mutton cuts, ghee, and pure saffron essence.",
    imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-6",
    name: "Tandoori Chicken Tikka Pizza",
    category: "Pizzas",
    price: 270,
    description: "Piping-hot sourdough hand-stretched crust baked with spicy fire-roasted chicken tikka bites, charred red onions, and fresh mozzarella sky.",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-7",
    name: "Spicy Paneer Makhani Pizza",
    category: "Pizzas",
    price: 250,
    description: "Fabulous wood-grilled artisan flatbread loaded with rich paneer makhani butter, sweet bell peppers, and melting cheese.",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-8",
    name: "Tandoori Masala Penne",
    category: "Pastas",
    price: 190,
    description: "Premium durum-wheat penne pasta cooked in a robust fiery tandoori butter cream reduction with flame-charred bell vegetables.",
    imageUrl: "https://images.unsplash.com/photo-1563379971899-660589a01cc3?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-9",
    name: "Creamy Garlic Fettuccine",
    category: "Pastas",
    price: 210,
    description: "Velvety ribbons of fettuccine pasta folded with sautéed wild forest mushrooms, crushed garlic, and aged parmesan shavings.",
    imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-10",
    name: "Peri Peri Potato Wedges",
    category: "Sides",
    price: 120,
    description: "Extra crispy skin-on baby potato wedges dusted in fiery African bird's eye peri-peri spices, served with fresh garlic garlic whip.",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-11",
    name: "Crispy Cheese Corn Triangles",
    category: "Sides",
    price: 130,
    description: "Deep-fried golden pastry envelopes stuffed with golden baby corn kernels, diced capsicum, and premium melting cheddar.",
    imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-12",
    name: "Deccan Double Ka Meetha",
    category: "Cakes",
    price: 90,
    description: "Golden-fried artisan sweet bread slices cooked with high cardamom whole milk cream, topped with roasted cashews and silver sheet.",
    imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-13",
    name: "Molten Choco Lava Cupcake",
    category: "Cakes",
    price: 110,
    description: "Premium single-origin bittersweet chocolate muffin featuring an incredible hot oozing cocoa core, served fresh.",
    imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-14",
    name: "Royal Badam Kesar Milk",
    category: "Beverages",
    price: 60,
    description: "Authentic slow-simmered hot or iced milk frothed with Kashmiri saffron strands, sweet cardamom, and fine shaved pistachios.",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  },
  {
    id: "m-15",
    name: "Royal Mint Lime Cooler",
    category: "Beverages",
    price: 70,
    description: "Sparkling natural soda muddled under field-fresh sweet spearmints, squeezed green citrus limes, and rich rock salt powder.",
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80",
    isAvailable: true
  }
];

function getNewDefaultMenu(restaurantId: string): MenuItem[] {
  return defaultMenu.map((item, idx) => ({
    ...item,
    id: `menu-${restaurantId}-${idx + 1}`
  }));
}

// In-Memory Data Store (Updated default restaurant list as requested)
let restaurants: Restaurant[] = [
  {
    id: "rest-1",
    name: "Dimond Bawarchi Restorant",
    cuisine: "Hyderabadi Dum Biryani & Mughlai",
    rating: 4.8,
    deliveryTime: "20-30 min",
    deliveryFee: 30,
    imageUrl: "https://images.unsplash.com/photo-1585938338392-50a59970d2ee?auto=format&fit=crop&w=600&q=80",
    description: "Famous for firewood claypot mutton & chicken Dum Biryani, spicy masala curries, and rich traditional tandoori delights.",
    menu: getNewDefaultMenu("rest-1")
  },
  {
    id: "rest-2",
    name: "Sai Krishna Restorant",
    cuisine: "Pure Veg South Indian Tiffins & Meals",
    rating: 4.7,
    deliveryTime: "15-25 min",
    deliveryFee: 25,
    imageUrl: "https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?auto=format&fit=crop&w=600&q=80",
    description: "Delicious butter dosas, soft idlis with multiple spicy chutneys, and classic Andhra veg meals prepared pure and fresh.",
    menu: getNewDefaultMenu("rest-2")
  },
  {
    id: "rest-3",
    name: "Kritunga Restorant",
    cuisine: "Spicy Rayalaseema & Natukodi Specialties",
    rating: 4.6,
    deliveryTime: "25-35 min",
    deliveryFee: 30,
    imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80",
    description: "Traditional fiery wood fire cooked items like Natukodi chicken curry, Ragi Sangati, and premium spiced pulaos.",
    menu: getNewDefaultMenu("rest-3")
  },
  {
    id: "rest-4",
    name: "Santhosh Dhaba Restorant",
    cuisine: "North Indian & Punjabi Veg Classics",
    rating: 4.5,
    deliveryTime: "20-30 min",
    deliveryFee: 20,
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    description: "Rich buttery North Indian delicacies, creamy Shahi Paneer, Dal Makhani, sweet soft lassi, and oven-hot tandoori rotis.",
    menu: getNewDefaultMenu("rest-4")
  }
];

// In-Memory Users Store
let users: User[] = [
  {
    id: "user-cust-demo",
    name: "Jane Doe",
    email: "customer@gmail.com",
    role: "customer",
    address: "H.No 3-84/A, Bypass Road, Shadnagar, Rangareddy District, Telangana",
    phone: "+91 98480 22338"
  },
  {
    id: "user-mngr-demo",
    name: "Vijay Kumar",
    email: "manager@gmail.com",
    role: "manager",
    phone: "+91 91111 22222",
    restaurantId: "rest-1"
  },
  {
    id: "user-rider-ramu",
    name: "Ramu Goud",
    email: "ramu@feasthub.com",
    role: "delivery",
    phone: "+91 91000 55661"
  },
  {
    id: "user-rider-somesh",
    name: "Somesh Rao",
    email: "somesh@feasthub.com",
    role: "delivery",
    phone: "+91 92000 88772"
  },
  {
    id: "user-rider-shiva",
    name: "Shiva Reddy",
    email: "shiva@feasthub.com",
    role: "delivery",
    phone: "+91 93000 99883"
  }
];

// In-Memory Orders Store
let orders: Order[] = [
  {
    id: "order-101",
    userId: "user-cust-demo",
    userName: "Jane Doe",
    userPhone: "+91 98480 22338",
    restaurantId: "rest-1",
    restaurantName: "Hotel Shadnagar Grand",
    items: [
      { id: "menu-1-1", name: "Paneer Butter Masala", price: 220, quantity: 1 },
      { id: "menu-1-2", name: "Butter Naan", price: 40, quantity: 3 }
    ],
    totalAmount: 370, // 220 + 120 + 30 delivery fee
    status: "Delivered",
    deliveryAddress: "H.No 3-84/A, Bypass Road, Shadnagar, Rangareddy District, Telangana",
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    instructions: "Please make it medium-spicy and call upon arrival."
  },
  {
    id: "order-102",
    userId: "user-cust-demo",
    userName: "Jane Doe",
    userPhone: "+91 98480 22338",
    restaurantId: "rest-1",
    restaurantName: "Hotel Shadnagar Grand",
    items: [
      { id: "menu-1-3", name: "Chicken Dum Biryani (Single)", price: 180, quantity: 2 }
    ],
    totalAmount: 390, // 360 + 30 delivery fee
    status: "Ready",
    deliveryAddress: "H.No 3-84/A, Bypass Road, Shadnagar, Rangareddy District, Telangana",
    timestamp: new Date().toISOString(),
    instructions: "Extra gravy and raita please!"
  }
];

// Start the Express setup
async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // --- REST API ENDPOINTS ---

  // User Auth - Login
  app.post("/api/auth/login", (req, res) => {
    const { phone, email } = req.body;
    
    let matchedUser: User | undefined;

    // First search by cleanest numerical phone match if phone is provided
    if (phone) {
      const cleanInput = phone.replace(/\D/g, "");
      matchedUser = users.find(u => {
        if (!u.phone) return false;
        const cleanUserPhone = u.phone.replace(/\D/g, "");
        return cleanUserPhone === cleanInput || u.phone === phone;
      });
    }

    // Fallback: search by email to support existing shortcuts
    if (!matchedUser && email) {
      matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (matchedUser) {
      return res.json({
        success: true,
        user: matchedUser,
        token: `mock-jwt-token-for-${matchedUser.id}`
      });
    }

    // Default fast-access checks
    if (email === "customer@gmail.com" || email === "manager@gmail.com" || email === "rider@gmail.com") {
      const isRider = email.startsWith("rider");
      const isManager = email.startsWith("manager");
      
      let defaultUser: User;
      if (isRider) {
        defaultUser = {
          id: "user-rider-ramu",
          name: "Ramu Goud",
          email: "rider@gmail.com",
          role: "delivery",
          phone: "+91 91000 55661"
        };
      } else {
        defaultUser = {
          id: isManager ? "user-mngr-demo" : "user-cust-demo",
          name: isManager ? "Vijay Kumar" : "Jane Doe",
          email: email,
          role: isManager ? "manager" : "customer",
          address: isManager ? undefined : "H.No 3-84/A, Bypass Road, Shadnagar, Rangareddy District, Telangana",
          phone: isManager ? "+91 91111 22222" : "+91 98480 22338",
          restaurantId: isManager ? "rest-1" : undefined
        };
      }
      
      if (!users.some(u => u.id === defaultUser.id)) {
        users.push(defaultUser);
      }
      return res.json({
        success: true,
        user: defaultUser,
        token: `mock-jwt-token-for-${defaultUser.id}`
      });
    }

    return res.status(401).json({ 
      success: false, 
      message: "Mobile number or credentials not recognized. Try one of the Demo shortcuts, or register a new identity!" 
    });
  });

  // User Auth - Register
  app.post("/api/auth/register", (req, res) => {
    const { name, role, phone, address, managerCode } = req.body;

    if (!name || !phone || !role) {
      return res.status(400).json({ success: false, message: "Name, phone number, and role are required." });
    }

    const cleanInput = phone.replace(/\D/g, "");
    if (!cleanInput) {
      return res.status(400).json({ success: false, message: "A valid phone number is required." });
    }

    const existing = users.find(u => {
      if (!u.phone) return false;
      return u.phone.replace(/\D/g, "") === cleanInput;
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "A user with this mobile number is already registered." });
    }

    // New User Entry
    const newId = `user-${Date.now()}`;
    let associatedRestId: string | undefined = undefined;

    // If manager, associate with a restaurant. If they provide code, make it that, or else assign Spicy Sensation or create a new one!
    if (role === "manager" || role === "restaurant_manager") {
      // Either select an existing hotel style or create one in memory for this manager
      if (managerCode && managerCode.trim().startsWith("rest-")) {
        associatedRestId = managerCode.trim();
      } else {
        // Create an empty restaurant for them named after them!
        const rId = `rest-custom-${Date.now()}`;
        const newHotel: Restaurant = {
          id: rId,
          name: `${name}'s Culinary Kitchen`,
          cuisine: "Fusion & Bistro Classics",
          rating: 5.0,
          deliveryTime: "20-30 min",
          deliveryFee: 30,
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
          description: "Freshly added digitized restaurant managed in real time with our cloud system.",
          menu: []
        };
        restaurants.push(newHotel);
        associatedRestId = rId;
      }
    }

    const newUser: User = {
      id: newId,
      name,
      email: `${cleanInput}@feasthub.com`, // Back-populate email representation for standard fields
      role: role as "customer" | "manager",
      address: role === "customer" ? (address || "Shadnagar, Rangareddy District, Telangana") : undefined,
      phone: phone,
      restaurantId: associatedRestId
    };

    users.push(newUser);

    res.json({
      success: true,
      user: newUser,
      token: `mock-jwt-token-for-${newUser.id}`
    });
  });

  // GET Restaurants List
  app.get("/api/restaurants", (req, res) => {
    res.json(restaurants);
  });

  // GET single restaurant details
  app.get("/api/restaurants/:id", (req, res) => {
    const restaurant = restaurants.find(r => r.id === req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant/Hotel not found." });
    }
    res.json(restaurant);
  });

  // POST Create custom restaurant (e.g., if a manager signs up and wants to define a new hotel)
  app.post("/api/restaurants", (req, res) => {
    const { name, cuisine, deliveryTime, deliveryFee, imageUrl, description, managerId, id } = req.body;
    if (!name || !cuisine) {
      return res.status(400).json({ message: "Hotel Name and Cuisine type are required." });
    }

    const newId = id || `rest-${Date.now()}`;
    const newRest: Restaurant = {
      id: newId,
      name,
      cuisine,
      rating: 4.5,
      deliveryTime: deliveryTime || "25-35 min",
      deliveryFee: Number(deliveryFee) || 1.99,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
      description: description || "Freshly digitized gourmet eatery.",
      menu: []
    };

    restaurants.push(newRest);

    // Update manager connection if possible
    if (managerId) {
      const mgr = users.find(u => u.id === managerId);
      if (mgr) {
        mgr.restaurantId = newId;
      }
    }

    res.json({ success: true, restaurant: newRest });
  });

  // PUT Update restaurant details
  app.put("/api/restaurants/:id", (req, res) => {
    const { name, cuisine, deliveryTime, deliveryFee, imageUrl, description } = req.body;
    const rest = restaurants.find(r => r.id === req.params.id);
    if (!rest) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    if (name) rest.name = name;
    if (cuisine) rest.cuisine = cuisine;
    if (deliveryTime) rest.deliveryTime = deliveryTime;
    if (deliveryFee !== undefined) rest.deliveryFee = Number(deliveryFee);
    if (imageUrl) rest.imageUrl = imageUrl;
    if (description) rest.description = description;

    res.json({ success: true, restaurant: rest });
  });

  // --- MENU ITEMS MANAGEMENT (Hotel Manager) ---

  // GET Menu Items
  app.get("/api/restaurants/:id/menu", (req, res) => {
    const restaurant = restaurants.find(r => r.id === req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant culinary records not found." });
    }
    res.json(restaurant.menu);
  });

  // POST Add Menu Item
  app.post("/api/restaurants/:id/menu", (req, res) => {
    const { name, category, price, description, imageUrl, isAvailable } = req.body;
    const restaurant = restaurants.find(r => r.id === req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant/Hotel not found." });
    }

    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: "Menu Item Name, Category, and Price are required inputs." });
    }

    const newItem: MenuItem = {
      id: `menu-item-${Date.now()}`,
      name,
      category,
      price: Number(price),
      description: description || "Signature special recipe.",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
    };

    restaurant.menu.push(newItem);
    res.json({ success: true, menuItem: newItem, menu: restaurant.menu });
  });

  // POST Bulk Load Premium Cuisine Presets
  app.post("/api/restaurants/:id/menu/presets", (req, res) => {
    const restaurant = restaurants.find(r => r.id === req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant culinary records not found." });
    }

    const defaultPresets = [
      {
        name: "Paneer Malai Tikka",
        category: "Starters",
        price: 180,
        description: "Melt-in-your-mouth cottage cheese cubes marinated in sweet cardamom cream, fresh cashews, and grilled to golden perfection.",
        imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Crispy Chilli Mushrooms",
        category: "Starters",
        price: 160,
        description: "Crunchy tempura-fried organic handpicked mushrooms wok-tossed with sweet green bell peppers, dark chillies, and soy reduction.",
        imageUrl: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Grand Mughlai Murgh",
        category: "Mains",
        price: 240,
        description: "Tender chunks of boneless tandoori chicken slow folded in a buttery cashew-tomato gravy, with stoneground kitchen spices.",
        imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Anjeeri Shahi Kofta",
        category: "Mains",
        price: 220,
        description: "Fabulous golden vegetable and cottage cheese balls stuffed with royal dry sweet figs simmered in velvet almond sauce.",
        imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Deccani Mutton Biryani",
        category: "Mains",
        price: 290,
        description: "Traditional kettle-steamed premium basmati rice cooked layered with tender local mutton cuts, ghee, and real saffron essence.",
        imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Tandoori Chicken Tikka Pizza",
        category: "Pizzas",
        price: 270,
        description: "Piping-hot sourdough hand-stretched crust baked with spicy fire-roasted chicken tikka bites, charred red onions, and fresh mozzarella sky.",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Spicy Paneer Makhani Pizza",
        category: "Pizzas",
        price: 250,
        description: "Fabulous wood-grilled artisan flatbread loaded with rich paneer korma butter cubes, sweet sweet bell peppers, and melting cheese.",
        imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Tandoori Masala Penne",
        category: "Pastas",
        price: 190,
        description: "Premium durum-wheat penne pasta cooked in a robust fiery tandoori butter cream reduction with flame-charred bell vegetables.",
        imageUrl: "https://images.unsplash.com/photo-1563379971899-660589a01cc3?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Creamy Garlic Fettuccine",
        category: "Pastas",
        price: 210,
        description: "Velvety ribbons of fettuccine pasta folded with sautéed wild forest mushrooms, crushed garlic, and aged parmesan shavings.",
        imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Peri Peri Potato Wedges",
        category: "Sides",
        price: 120,
        description: "Extra crispy skin-on baby potato wedges dusted in fiery African bird's eye peri-peri spices, served with fresh garlic garlic whip.",
        imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Crispy Cheese Corn Triangles",
        category: "Sides",
        price: 130,
        description: "Deep-fried golden pastry envelopes stuffed with golden baby corn kernels, diced capsicum, and premium melting cheddar.",
        imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Deccan Double Ka Meetha",
        category: "Cakes",
        price: 90,
        description: "Golden-fried artisan sweet bread crusts cooked with high cardamom whole milk cream, topped with roasted cashews and silver sheet.",
        imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Molten Choco Lava Cupcake",
        category: "Cakes",
        price: 110,
        description: "Premium single-origin bittersweet chocolate muffin featuring an incredible hot oozing cocoa core, served fresh.",
        imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Royal Badam Kesar Milk",
        category: "Beverages",
        price: 60,
        description: "Authentic slow-simmered hot or iced milk frothed with Kashmiri saffron strands, sweet cardamom, and fine shaved pistachios.",
        imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80"
      },
      {
        name: "Royal Mint Lime Cooler",
        category: "Beverages",
        price: 70,
        description: "Sparkling natural soda muddled under field-fresh sweet spearmints, squeezed green citrus limes, and rich rock salt powder.",
        imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80"
      }
    ];

    let countAdded = 0;
    defaultPresets.forEach(preset => {
      const exists = restaurant.menu.some(m => m.name.toLowerCase() === preset.name.toLowerCase());
      if (!exists) {
        restaurant.menu.push({
          id: `menu-item-preset-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          name: preset.name,
          category: preset.category,
          price: preset.price,
          description: preset.description,
          imageUrl: preset.imageUrl,
          isAvailable: true
        });
        countAdded++;
      }
    });

    res.json({ success: true, count: countAdded, menu: restaurant.menu });
  });

  // PUT Update Menu Item
  app.put("/api/restaurants/:id/menu/:itemId", (req, res) => {
    const { name, category, price, description, imageUrl, isAvailable } = req.body;
    const { id: restId, itemId } = req.params;

    const restaurant = restaurants.find(r => r.id === restId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant/Hotel not found." });
    }

    const itemObj = restaurant.menu.find(m => m.id === itemId);
    if (!itemObj) {
      return res.status(404).json({ message: "Specified Menu Item not found in records." });
    }

    if (name) itemObj.name = name;
    if (category) itemObj.category = category;
    if (price !== undefined) itemObj.price = Number(price);
    if (description !== undefined) itemObj.description = description;
    if (imageUrl) itemObj.imageUrl = imageUrl;
    if (isAvailable !== undefined) itemObj.isAvailable = Boolean(isAvailable);

    res.json({ success: true, menuItem: itemObj, menu: restaurant.menu });
  });

  // DELETE Menu Item
  app.delete("/api/restaurants/:id/menu/:itemId", (req, res) => {
    const { id: restId, itemId } = req.params;

    const restaurant = restaurants.find(r => r.id === restId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant/Hotel not found." });
    }

    const index = restaurant.menu.findIndex(m => m.id === itemId);
    if (index === -1) {
      return res.status(404).json({ message: "Menu item not found in records to delete." });
    }

    const deletedItem = restaurant.menu.splice(index, 1)[0];
    res.json({ success: true, deletedItem, menu: restaurant.menu });
  });

  // --- ORDERS ORCHESTRATION ---

  // GET Orders list
  // Query parameters: userId, restaurantId
  app.get("/api/orders", (req, res) => {
    const { userId, restaurantId } = req.query;

    let filteredOrders = [...orders];

    if (userId) {
      filteredOrders = filteredOrders.filter(o => o.userId === userId);
    }

    if (restaurantId) {
      filteredOrders = filteredOrders.filter(o => o.restaurantId === restaurantId);
    }

    // Sort by timestamp descending
    filteredOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(filteredOrders);
  });

  // GET single order and track status
  app.get("/api/orders/:id/track", (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order records not found." });
    }
    res.json(order);
  });

  // POST Submit New Order
  app.post("/api/orders", (req, res) => {
    const { userId, userName, userPhone, restaurantId, items, deliveryAddress, instructions } = req.body;

    if (!userId || !restaurantId || !items || !items.length || !deliveryAddress) {
      return res.status(400).json({ message: "Missing required order variables (items, address, user reference)." });
    }

    const targetRestaurant = restaurants.find(r => r.id === restaurantId);
    if (!targetRestaurant) {
      return res.status(404).json({ message: "Selected restaurant records do not exist." });
    }

    // Validate and calculate totals
    let calculatedSubtotal = 0;
    const resolvedItems: OrderItem[] = [];

    for (const requested of items) {
      const originalItem = targetRestaurant.menu.find(m => m.id === requested.id);
      if (!originalItem) {
        return res.status(400).json({ message: `Menu item with ID ${requested.id} is no longer available.` });
      }
      calculatedSubtotal += (originalItem.price * requested.quantity);
      resolvedItems.push({
        id: originalItem.id,
        name: originalItem.name,
        price: originalItem.price,
        quantity: requested.quantity
      });
    }

    const totalBill = calculatedSubtotal + targetRestaurant.deliveryFee;

    const newOrder: Order = {
      id: `order-${Math.floor(100 + Math.random() * 900)}`, // easy reading format, e.g. "order-314"
      userId,
      userName: userName || "Anonymous Customer",
      userPhone: userPhone || "+1 (555) 000-0000",
      restaurantId,
      restaurantName: targetRestaurant.name,
      items: resolvedItems,
      totalAmount: parseFloat(totalBill.toFixed(2)),
      status: "Pending",
      deliveryAddress,
      timestamp: new Date().toISOString(),
      instructions: instructions || ""
    };

    orders.unshift(newOrder); // Add to the front of list
    res.json({ success: true, order: newOrder });
  });

  // PUT Assign Delivery Rider
  app.put("/api/orders/:id/assign-delivery", (req, res) => {
    const { deliveryPersonName, deliveryPersonPhone } = req.body;
    
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order records not found." });
    }

    // Support clearing the rider assignment to correct mistakes
    if (deliveryPersonName === "" && deliveryPersonPhone === "") {
      order.deliveryPersonName = undefined;
      order.deliveryPersonPhone = undefined;
      order.deliveryOtp = undefined;
      // Reset back to Ready step so they can re-allocate
      order.status = "Ready";
      return res.json({ success: true, order });
    }

    if (!deliveryPersonName || !deliveryPersonPhone) {
      return res.status(400).json({ success: false, message: "Delivery person name and contact number are required." });
    }

    order.deliveryPersonName = deliveryPersonName;
    order.deliveryPersonPhone = deliveryPersonPhone;
    order.status = "Delivery Agent Assigned"; // transition onto assignment
    
    // Generate a secure 4-digit delivery completion tracking code on status update to Deliver Agent Assigned
    if (!order.deliveryOtp) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }
    
    res.json({ success: true, order });
  });

  // POST Verify Delivery OTP to complete order delivery
  app.post("/api/orders/:id/verify-otp", (req, res) => {
    const { otp } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order records not found." });
    }

    if (!otp) {
      return res.status(400).json({ success: false, message: "Please enter the numeric delivery confirmation OTP." });
    }

    if (!order.deliveryOtp || order.deliveryOtp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Verification failed. The OTP entered is incorrect. Please ask the customer to check their order portal." });
    }

    order.status = "Delivered";
    res.json({ success: true, order });
  });

  // PUT Update Order Status (Accepted, Ready, Delivery Agent Assigned, Delivered, Cancelled)
  app.put("/api/orders/:id/status", (req, res) => {
    const { status } = req.body;
    const validStatuses = ["Pending", "Accepted", "Ready", "Delivery Agent Assigned", "Delivered", "Cancelled"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status code. Options: ${validStatuses.join(", ")}` });
    }

    const order = orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order records not found to update." });
    }

    order.status = status as Order["status"];
    
    // If transitioning to/through Delivery Agent Assigned, make sure an OTP exists
    if (order.status === "Delivery Agent Assigned" && !order.deliveryOtp) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    res.json({ success: true, order });
  });

  // POST Generate AI Culinary Description & Ingredients
  app.post("/api/gemini/describe", async (req, res) => {
    const { dishName, category } = req.body;
    if (!dishName) {
      return res.status(400).json({ success: false, message: "Dish/Food Name is required." });
    }

    try {
      const client = getGeminiClient();
      const prompt = `Provide a mouthwatering, single-sentence culinary description including key premium ingredients for the dish named "${dishName}"${category ? ` in the "${category}" category` : ""}. Keep it under 15-20 words, clean, elegant, and engaging for restaurant menu display. Do not wrap with double quotes. Do not say "This is a" or begin with generic prefixes. Just return the creative description with highlighted ingredients.`;
      
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const description = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "A delicate specialty recipe crafted with fresh handpicked ingredients.";
      res.json({ success: true, description });
    } catch (error: any) {
      console.error("[Gemini AI Error] Describe Failed:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to generate dynamic culinary description." 
      });
    }
  });

  // Setup Vite middleware for development, otherwise serve the bundled single page build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BiteFlow Server] Running dynamically on http://0.0.0.0:${PORT}`);
  });
}

startServer();
