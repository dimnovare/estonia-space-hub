// ─── Frontend Service Layer ───
// Mock async services structured for future backend replacement

import { MOCK_USERS, MOCK_SUPPLIERS, MOCK_INVOICES, MOCK_MESSAGES, MOCK_AUDIT_LOG } from "./mockStore";
import { MOCK_BOOKINGS, MOCK_NOTIFICATIONS } from "@/data/mockBookings";
import { MOCK_ORDERS } from "@/data/mockOrders";
import type { User, Supplier, Order, Booking, Notification, Invoice, Message, AuditLogEntry, OrderStatus } from "./types";

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ─── User Service ───
export const userService = {
  async getAll(): Promise<User[]> {
    await delay();
    return [...MOCK_USERS];
  },
  async getById(id: string): Promise<User | undefined> {
    await delay(100);
    return MOCK_USERS.find(u => u.id === id);
  },
  async updateStatus(id: string, status: "active" | "blocked"): Promise<User> {
    await delay(200);
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) throw new Error("User not found");
    return { ...user, status };
  },
};

// ─── Supplier Service ───
export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    await delay();
    return [...MOCK_SUPPLIERS];
  },
  async getById(id: string): Promise<Supplier | undefined> {
    await delay(100);
    return MOCK_SUPPLIERS.find(s => s.id === id);
  },
  async updateStatus(id: string, isActive: boolean): Promise<Supplier> {
    await delay(200);
    const sup = MOCK_SUPPLIERS.find(s => s.id === id);
    if (!sup) throw new Error("Supplier not found");
    return { ...sup, isActive };
  },
  async testIntegration(id: string): Promise<{ success: boolean; latency: number }> {
    await delay(800);
    const sup = MOCK_SUPPLIERS.find(s => s.id === id);
    if (!sup || sup.integrationType !== "api") return { success: false, latency: 0 };
    return { success: sup.integrationHealth === "healthy", latency: Math.floor(Math.random() * 200) + 50 };
  },
};

// ─── Order Service ───
export const orderService = {
  async getAll(): Promise<Order[]> {
    await delay();
    return [...MOCK_ORDERS];
  },
  async getByBookingId(bookingId: string): Promise<Order | undefined> {
    await delay(100);
    return MOCK_ORDERS.find(o => o.bookingId === bookingId);
  },
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await delay(200);
    const order = MOCK_ORDERS.find(o => o.id === id);
    if (!order) throw new Error("Order not found");
    return { ...order, status };
  },
};

// ─── Booking Service ───
export const bookingService = {
  async getAll(): Promise<Booking[]> {
    await delay();
    return [...MOCK_BOOKINGS];
  },
  async getById(id: string): Promise<Booking | undefined> {
    await delay(100);
    return MOCK_BOOKINGS.find(b => b.id === id);
  },
};

// ─── Notification Service ───
export const notificationService = {
  async getAll(): Promise<Notification[]> {
    await delay(100);
    return [...MOCK_NOTIFICATIONS];
  },
  async markRead(id: string): Promise<void> {
    await delay(100);
  },
  async markAllRead(): Promise<void> {
    await delay(100);
  },
};

// ─── Invoice Service ───
export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    await delay();
    return [...MOCK_INVOICES];
  },
  async getByBookingId(bookingId: string): Promise<Invoice | undefined> {
    await delay(100);
    return MOCK_INVOICES.find(i => i.bookingId === bookingId);
  },
};

// ─── Message Service ───
export const messageService = {
  async getByBookingId(bookingId: string): Promise<Message[]> {
    await delay(200);
    return MOCK_MESSAGES.filter(m => m.bookingId === bookingId);
  },
  async send(bookingId: string, text: string): Promise<Message> {
    await delay(300);
    return {
      id: `msg-${Date.now()}`,
      bookingId,
      from: "customer",
      senderName: "Teie",
      text,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      read: true,
    };
  },
};

// ─── Audit Service ───
export const auditService = {
  async getAll(): Promise<AuditLogEntry[]> {
    await delay();
    return [...MOCK_AUDIT_LOG];
  },
};

export type { User, Supplier, Order, Booking, Notification, Invoice, Message, AuditLogEntry, OrderStatus };
