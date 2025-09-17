import { AvailabilityService as ApiAvailabilityService } from './availability.provider-api.service';
import { SupabaseAvailabilityService } from './availability.service';

const source = process.env.AVAILABILITY_SOURCE;
export const AvailabilityService = source === 'supplier_api' ? ApiAvailabilityService : SupabaseAvailabilityService;
