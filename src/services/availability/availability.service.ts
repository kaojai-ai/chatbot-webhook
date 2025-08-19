import OpenAI from 'openai';

interface AvailableCourt {
  date: string;
  availableCourts: Array<{
    courtName: string;
    availableSlots: Array<{
      start: string;
      end: string;
    }>;
  }>;
}

interface CourtMatch {
    id: number;
    user_id: number | null;
    court_id: number;
    time_start: string;
    time_end: string;
}

interface CourtType {
    id: number;
    name: string;
    name_en: string;
    price: number;
    // Add other fields as needed
}

interface Court {
    id: number;
    name: string;
    name_en: string;
    court_type: CourtType;
    matches: CourtMatch[];
    price: number;
}

interface Sport {
    id: number;
    name: string;
    name_en: string;
    // Add other sport fields as needed
}

interface ProviderSport {
    id: number;
    sport: Sport;
    courts: Court[];
}

type EstAvailabilityDate = {
    year?: number,
    month?: number,
    date?: number,
    language?: string
};

export class AvailabilityService {
    private openai: OpenAI;
    private apiBaseUrl: string;
    private providerId: string;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.apiBaseUrl = process.env.AVAILABILITY_API_URL || '';
        this.providerId = process.env.PROVIDER_ID || '10202';
    }

    private getDates(estimateDate: EstAvailabilityDate): { timeStart: string, timeEnd: string } {
        const date = new Date();
        const year = estimateDate.year ?? date.getFullYear();
        const month = estimateDate.month ?? date.getMonth() + 1;
        const day = estimateDate.date ?? 1;

        date.setFullYear(year);
        date.setMonth(month - 1);
        date.setDate(day);

        const timeStart = new Date(date);
        const timeEnd = new Date(date);

        if (estimateDate.date) {
            timeStart.setDate(day - 4);
            timeEnd.setDate(day + 4);
        } else {
            timeStart.setMonth(month - 1, 1);
            timeEnd.setMonth(month, 0);
        }

        return {
            timeStart: timeStart.toISOString().split('T')[0],
            timeEnd: timeEnd.toISOString().split('T')[0],
        };
    }

    async checkAvailability(estimateDate: EstAvailabilityDate): Promise<ProviderSport[]> {
        const { timeStart, timeEnd } = this.getDates(estimateDate);

        try {
            const response = await fetch(`${this.apiBaseUrl}/${this.providerId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.AVAILABILITY_API_KEY}`,
                    'x-lang': 'th'
                },
                body: JSON.stringify({
                    time_start: timeStart,
                    time_end: timeEnd
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `API request failed with status ${response.status}: ${JSON.stringify(errorData)}`
                );
            }

            const data: ProviderSport[] = await response.json();
            return data;
        } catch (error) {
            console.error('Error checking availability:', error);
            throw new Error('Failed to check availability. Please try again later.');
        }
    }

    private transformAvailabilityData(availability: ProviderSport[], estimateDate: EstAvailabilityDate): AvailableCourt[] {
        const result: AvailableCourt[] = [];
        // Map<DateString, Map<CourtName, Array<{start: string, end: string}>>>
        const dateToCourtVacantSlots = new Map<string, Map<string, Array<{ start: string; end: string }>>>();

        // Helpers
        const parseDateTime = (s: string) => new Date(s.replace(' ', 'T'));
        const buildDateTime = (dateStr: string, timeStrHHmm: string) => new Date(`${dateStr}T${timeStrHHmm}:00`);
        const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => (aStart < bEnd && aEnd > bStart);

        // Group matches by court and date, then compute vacant 1-hour slots between 09:00-21:00
        availability.forEach((sport) => {
            sport.courts.forEach((court) => {
                // Group matches by date for this court
                const matchesByDate = new Map<string, CourtMatch[]>();
                court.matches.forEach((m) => {
                    const d = m.time_start.split(' ')[0];
                    if (!matchesByDate.has(d)) matchesByDate.set(d, []);
                    matchesByDate.get(d)!.push(m);
                });

                // For each date, generate hourly slots and exclude booked ones
                matchesByDate.forEach((matches, dateStr) => {
                    // Prepare container
                    if (!dateToCourtVacantSlots.has(dateStr)) {
                        dateToCourtVacantSlots.set(dateStr, new Map());
                    }
                    const courtMap = dateToCourtVacantSlots.get(dateStr)!;

                    const vacant: Array<{ start: string; end: string }> = [];

                    for (let hour = 9; hour < 21; hour++) {
                        const hh = hour.toString().padStart(2, '0');
                        const nextHh = (hour + 1).toString().padStart(2, '0');
                        const slotStartStr = `${hh}:00`;
                        const slotEndStr = `${nextHh}:00`;

                        const slotStart = buildDateTime(dateStr, slotStartStr);
                        const slotEnd = buildDateTime(dateStr, slotEndStr);

                        const isBooked = matches.some((m) => {
                            const mStart = parseDateTime(m.time_start);
                            const mEnd = parseDateTime(m.time_end);
                            return overlaps(mStart, mEnd, slotStart, slotEnd);
                        });

                        if (!isBooked) {
                            vacant.push({ start: slotStartStr, end: slotEndStr });
                        }
                    }

                    if (vacant.length > 0) {
                        courtMap.set(court.name, vacant);
                    }
                });
            });
        });

        // Convert map to array and sort by date
        const sortedDates = Array.from(dateToCourtVacantSlots.entries()).sort(
            ([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
        );

        // Find the 3 closest dates to estimateDate
        const targetDate = new Date(
            estimateDate.year ?? new Date().getFullYear(),
            (estimateDate.month ?? new Date().getMonth() + 1) - 1,
            estimateDate.date ?? 1
        );

        const closestDates = sortedDates
            .map(([date]) => ({ date, diff: Math.abs(new Date(date).getTime() - targetDate.getTime()) }))
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 3)
            .map((item) => item.date);

        // Build the result array with only the closest dates and courts that have vacancies
        closestDates.forEach((date) => {
            const courtMap = dateToCourtVacantSlots.get(date);
            if (courtMap) {
                const availableCourts = Array.from(courtMap.entries())
                    .map(([courtName, slots]) => ({ courtName, availableSlots: slots }))
                    .filter((c) => c.availableSlots.length > 0);

                if (availableCourts.length > 0) {
                    result.push({
                        date,
                        availableCourts,
                    });
                }
            }
        });

        return result;
    }

    async getFormattedAvailability(estimateDate: EstAvailabilityDate, language: string = 'Thai'): Promise<string> {
        try {
            const availability = await this.checkAvailability(estimateDate);
            const formattedData = this.transformAvailabilityData(availability, estimateDate);

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-5-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that formats ski/snowboard slope availability information.
                     Respond with a very short, fun, clear, friendly message, with emoji in ${language} that summarizes the availability details.`
                    },
                    {
                        role: 'user',
                        content: `These are the closest slot that still available (ว่าง), please provide a summary in ${language}:
                     ${JSON.stringify(formattedData, null, 2)}`
                    }
                ],
            });

            return completion.choices[0]?.message?.content || 'Availability information is not available.';
        } catch (error) {
            console.error('Error getting formatted availability:', error);
            return 'Sorry, we encountered an error while checking availability. Please try again later.';
        }
    }
}
