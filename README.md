# FeastHub: Secure Multi-Role Fulfillment Engine

## Overview

FeastHub is a real-time, full-stack food delivery orchestrator built with React, Vite, Tailwind CSS, Express, and TypeScript. The application features a secure, synchronized state machine connecting **Customers**, **Hotel/Restaurant Managers**, and **Delivery Partners** in a unified operational loop.

All actors share a state-synchronized backend API, ensuring that actions taken by one role (such as order updates or OTP verification) reflect instantly on all other portals.

---

## 👥 Role Matrix & Registration

FeastHub supports four operational roles, each with specialized permissions and portals:

| Role | Auth Fields Required | Purpose |
| :--- | :--- | :--- |
| **Customer** | Name, Phone, Email, Delivery Address | Places orders, tracks progress, and views secure delivery OTP. |
| **Restaurant Manager** | Name, Phone, Email, Station Code (Manager Code) | Controls kitchen flow, updates menu items, accepts and prepares orders. |
| **Hotel Manager** | Name, Phone, Email, Hotel Code (Manager Code) | High-level administration, manages orders, and assigns delivery agents. |
| **Delivery Partner** | Name, Phone, Email | Receives assignments, views recipient's phone/directions, and validates OTP. |

### 🔑 Unified Credential Sharing
* **Cross-Restaurant Portals**: Restaurant and Hotel managers register with a specific **Hotel Code/Station ID** (e.g., `rest-1` for *Hotel Shadnagar Grand*). 
* **Shared Authentication**: Any manager can go to any restaurant/hotel page and sign in using the same credentials. Their account will dynamically associate with that hotel's order flow, recipe configuration, and transaction list.

---

## 🔄 Secure Dispatch Pipeline State Machine

When a customer places an order, the ticket progress is managed via a strict status lifecycle:

```
[Customer Checkout]
       │
       ▼
 1. 📋 PENDING (Initial Status)
       │
       ▼  [Hotel/Restaurant Manager accepts]
 2. 🤝 ACCEPTED
       │
       ▼  [Kitchen marks food prepared]
 3. 🍳 READY (Food Cooked & Packed)
       │
       ▼  [Manager assigns Delivery Partner]
 4. 🚚 DELIVERY AGENT ASSIGNED (🔐 Secure 4-Digit OTP Generated)
       │  └─► Sent instantly to Customer portal & Hotel invoice
       │
       ▼  [Rider inputs correct Customer OTP]
 5. 🎉 DELIVERED (✓ Completed with exact Date & Timestamp)
       └─► Reflects instantly for Customer, Hotel, and Rider
```

### Detailed Lifecycle Breakdown:

#### Step 1: `Pending`
The customer builds their shopping box and submits their order. The ticket is initially instantiated with `status: "Pending"`. It appears instantly in the Hotel Manager's control panel as an active action item.

#### Step 2: `Accepted`
The Hotel Manager reviews the items and clicks **Accept Order**. This confirms the order and changes the status to `status: "Accepted"`.

#### Step 3: `Ready`
Once the kitchen finishes preparing and packing the dishes, the manager marks the order as **Ready**. Chef cooking completes, and the items are ready for rider pickup.

#### Step 4: `Delivery Agent Assigned` & OTP Generation
The manager selects an active **Delivery Partner** (such as *Ramu Goud*) from the dispatch registry. Once assigned:
1. The status transitions to `status: "Delivery Agent Assigned"`.
2. A secure, randomized **4-digit numeric OTP** is generated server-side.
3. This OTP is instantly securely synchronized and displayed on:
   * **Customer's Order Tracking Page** (hidden until rider assignment).
   * **Hotel/Restaurant Manager's Invoice Panel** for system validation.
   * **Notice**: The Delivery Agent does *not* know the OTP from the UI initially; they must request it from the resident Customer upon arrival.

#### Step 5: Secure OTP Handshake & `Delivered` Completion
When the Delivery Partner arrives at the Customer's address:
1. The Delivery Partner gets the **4-digit OTP** directly from the Customer before handing over the products.
2. The Delivery Partner enters the OTP into the **Verify OTP** section inside their custom courier workstation portal.
3. The server validates the code. Upon successful verification:
   * The status is set to **Delivered** for the order.
   * The order dashboard **reflects "Delivered" simultaneously on all 3 portals** (Customer, Hotel Manager, and Delivery Partner).
   * A permanent **date and timestamp** is stamped on the ledger of the completed order.
   * The Rider's workstation lists the run inside their completed history logs.

---

## ⚡ Instant Demo Shortcuts for Testing

To bypass registration, FeastHub includes custom quick-access profiles in the Login Modal:

1. **Customer Portal Gateway**
   * **Email**: `customer@gmail.com`
   * **Mock User**: Jane Doe
   * **Phone**: `+91 98480 22338`
   * **Address**: H.No 3-84/A, Bypass Road, Shadnagar, Rangareddy District, Telangana

2. **Hotel Manager Gateway**
   * **Email**: `manager@gmail.com`
   * **Mock User**: Vijay Kumar (linked to `rest-1`: *Hotel Shadnagar Grand*)
   * **Phone**: `+91 91111 22222`

3. **Delivery Partner Gateway**
   * **Email**: `rider@gmail.com`
   * **Mock User**: Ramu Goud
   * **Phone**: `+91 91000 55661`

---

## 🛠️ Technology Stack Reference

* **Frontend**: React 18, Vite, Tailwind CSS Pro, Lucide React Icons
* **Animations**: Native layout motion & vibrant transitions
* **Backend**: Express (Node.js) server running on port `3000` with direct state-saving APIs
* **Security & Type Safety**: Strict TypeScript interfaces defined in `/src/types.ts`
