/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
}

export interface Restaurant {
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

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "manager" | "restaurant_manager" | "delivery";
  address?: string;
  phone?: string;
  restaurantId?: string; // Associated restaurant for managers
}
