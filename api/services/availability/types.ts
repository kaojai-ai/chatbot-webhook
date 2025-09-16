export interface EstAvailabilityDate {
  year?: number;
  month?: number;
  date?: number;
  language?: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export interface AvailableCourtAvailability {
  courtName: string;
  availableSlots: AvailableSlot[];
}

export interface AvailabilityByDate {
  date: string;
  availableCourts: AvailableCourtAvailability[];
}

export interface AvailabilityOverview {
  summary: string;
  availabilityByDate: AvailabilityByDate[];
}
