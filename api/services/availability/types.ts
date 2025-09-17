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
  resourceName: string;
  availableSlots: AvailableSlot[];
}

export interface AvailabilityByDate {
  date: string;
  availableResources: AvailableCourtAvailability[];
}


export interface AvailabilityOverview {
  intro?: string;
  cta?: string;
  availableDays: OpenAiAvailableDays[];
  summary?: string;
  error?: string;
}

export interface OpenAiAvailableDays {
  date: string;
  dateFormat: string;
  availabilityText: string;
}
