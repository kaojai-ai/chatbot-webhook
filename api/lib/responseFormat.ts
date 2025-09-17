import { clampText } from "../../shared/lib";
import { AvailabilityByDate } from "../services/availability/types";


const MAX_COURTS_PER_CARD = 3;
const MAX_SLOTS_PER_COURT = 3;
const CAROUSEL_TEXT_MAX_LENGTH = 60;

export const formatAvailabilityDetails = (availableCourts: AvailabilityByDate['availableResources']): string => {
  const courts = availableCourts.slice(0, MAX_COURTS_PER_CARD);
  const details = courts.map((court) => {
    const slotTexts = court.availableSlots
      .slice(0, MAX_SLOTS_PER_COURT)
      .map((slot) => `${slot.start}-${slot.end}`)
      .join(', ');
    const suffix = court.availableSlots.length > MAX_SLOTS_PER_COURT ? '…' : '';
    return `${court.resourceName}: ${slotTexts}${suffix}`;
  });

  if (availableCourts.length > MAX_COURTS_PER_CARD) {
    details.push('…');
  }

  const text = details.join('\n\n').trim();
  return clampText(text || 'มีเวลาว่างหลายช่วงเวลาให้เลือก', CAROUSEL_TEXT_MAX_LENGTH);
};
