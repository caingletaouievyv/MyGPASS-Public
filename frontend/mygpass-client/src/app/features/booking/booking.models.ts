export type PortCatalogItem = {
  portId: number;
  name: string;
};

export type ShippingLineCatalogItem = {
  shippingLineId: number;
  name: string;
};

export type VesselVisitCatalogItem = {
  vesselVisitId: number;
  originPortId: number;
  originPortName: string;
  destinationPortId: number;
  destinationPortName: string;
  shippingLineId: number;
  shippingLineName: string;
  vesselId: number;
  vesselName: string;
  dayOfDeparture: string | null;
  estimatedTimeOfDeparture: string;
};

export type BookingCreateRequest = {
  originPortId: number;
  destinationPortId: number;
  shippingLineId: number;
  vesselVisitId: number;
  departureAt: string;
  passengerCount: number;
};

export type BookingResponse = {
  bookingId: number;
  bookingReference: string;
  paymentId: number;
  passengerCount: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string | null;
  guestAccessToken?: string | null;
};

export type BookingHistoryItem = {
  bookingId: number;
  paymentId?: number | null;
  bookingReference: string;
  userId: number;
  originPortName?: string | null;
  destinationPortName?: string | null;
  shippingLineName?: string | null;
  vesselName?: string | null;
  departureAt?: string | null;
  departureDay?: string | null;
  departureTime?: string | null;
  passengerCount: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string | null;
  createdAt: string;
  expiresAt?: string | null;
};
