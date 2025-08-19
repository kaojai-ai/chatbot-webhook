import OpenAI from 'openai';

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

    async getFormattedAvailability(estimateDate: EstAvailabilityDate, language: string = 'th'): Promise<string> {
        try {

            const availability = await this.checkAvailability(estimateDate);

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that analyzes and formats ski/snowboard slope availability information.
                     Respond with a clear, friendly message in ${language} that summarizes the availability details.
                     Include available time slots, prices, and any other relevant information.`
                    },
                    {
                        role: 'user',
                        content: `Please analyze this ski slope availability data and provide a summary in ${language}:
                     ${JSON.stringify(availability, null, 2)}`
                    }
                ],
                temperature: 0.7
            });

            return completion.choices[0]?.message?.content || 'Availability information is not available.';
        } catch (error) {
            console.error('Error getting formatted availability:', error);
            return 'Sorry, we encountered an error while checking availability. Please try again later.';
        }
    }
}
