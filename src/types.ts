export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  serialNumber: string;
  pricePerDay: number;
  status: "available" | "rented" | "maintenance";
  createdAt?: string;
}

export interface Rental {
  id: string;
  toolId: string;
  toolName: string;
  clientName: string;
  clientPhone: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  returnedAt?: string | null; // ISO Date Time
  totalPrice: number;
  status: "active" | "returned" | "overdue";
  calendarEventId?: string | null;
  userId: string;
  createdAt?: string;
}

export interface SMSLog {
  id: string;
  rentalId: string;
  clientName: string;
  clientPhone: string;
  message: string;
  sentAt: string;
  status: "sent" | "delivered" | "failed";
}
