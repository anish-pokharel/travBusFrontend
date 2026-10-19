export type Role = 'admin' | 'passenger' | 'counter';

export interface User { id: string; name: string; email: string; phone?: string; role: Role; counterId?: string; isActive: boolean; createdAt?: string; counter?: any; }

export interface ApiResponse<T> { success: boolean; data: T; message?: string; meta?: { page: number; limit: number; total: number }; [k: string]: any; }

export interface Seat {
  seatId: string; seatNumber: string; row: number; col: number; x?: number; y?: number;
  kind: 'seat' | 'berth'; category: string; pricingCategory: string; active: boolean; bookable: boolean;
  position: 'window' | 'aisle' | 'middle' | 'none'; accessible: boolean; restrictions?: string; rotation?: number; metadata?: any;
}

export type ElementType = 'driver' | 'empty' | 'aisle' | 'front_door' | 'rear_door' | 'side_door' | 'emergency_exit' | 'luggage' | 'restricted' | 'staff' | 'label';

export interface LayoutElement { id: string; type: ElementType; row: number; col: number; rowSpan: number; colSpan: number; label?: string; rotation?: number; }

export interface Layout {
  _id?: string; name: string; vehicleType: string; version?: number; layoutKey?: string;
  rows: number; columns: number; seats: Seat[]; elements: LayoutElement[];
  totalSeats?: number; bookableSeats?: number; usedByTrips?: number;
}

export type SeatStatus = 'available' | 'held' | 'booked' | 'blocked';
export interface SeatState { status: SeatStatus; price: number; seatNumber: string; }

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  bus: 'Bus', tourist_bus: 'Tourist Bus', local_bus: 'Local Bus', deluxe_bus: 'Deluxe Bus', sleeper_bus: 'Sleeper Bus',
  hiace: 'HiAce', microbus: 'Microbus', coaster: 'Coaster', van: 'Van', car: 'Car', taxi: 'Taxi', suv: 'SUV', custom: 'Custom',
};

export const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash', esewa: 'eSewa', khalti: 'Khalti', other: 'Other' };
