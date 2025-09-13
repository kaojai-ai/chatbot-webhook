import { AvailabilityService as ApiAvailabilityService } from './availability.service';
import { SupabaseAvailabilityService } from './availability.supabase.service';

const source = process.env.AVAILABILITY_SOURCE;
export const AvailabilityService = source === 'supabase' ? SupabaseAvailabilityService : ApiAvailabilityService;
