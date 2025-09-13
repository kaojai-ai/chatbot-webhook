import OpenAI from 'openai';
import supabaseClient from '../../../shared/providers/supabase';

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

type EstAvailabilityDate = {
    year?: number,
    month?: number,
    date?: number,
    language?: string
};

export class SupabaseAvailabilityService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
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
            // If a specific date is provided, fetch 4 days before and after that date
            timeStart.setDate(day - 4);
            timeEnd.setDate(day + 4);
        } else {
            // If only month is provided (no specific date), fetch the entire month
            if (estimateDate.month) {
                const firstDay = new Date(year, month - 1, 1);
                const lastDay = new Date(year, month, 0); // last day of the month
                return {
                    timeStart: firstDay.toISOString().split('T')[0],
                    timeEnd: lastDay.toISOString().split('T')[0],
                };
            } else {
                // If both date and month are absent, fetch for 7 days from today
                const today = new Date();
                const sevenDaysLater = new Date();
                sevenDaysLater.setDate(today.getDate() + 6); // 7-day window including today
                return {
                    timeStart: today.toISOString().split('T')[0],
                    timeEnd: sevenDaysLater.toISOString().split('T')[0],
                };
            }
        }

        return {
            timeStart: timeStart.toISOString().split('T')[0],
            timeEnd: timeEnd.toISOString().split('T')[0],
        };
    }

    private toSupabaseTs(dateStr: string, timeZone: string, endOfDay = false): string {
        const time = endOfDay ? '23:59:59' : '00:00:00';
        const d = new Date(`${dateStr}T${time}`);
        const inv = new Date(d.toLocaleString('en-US', { timeZone }));
        const diff = d.getTime() - inv.getTime();
        return new Date(d.getTime() - diff).toISOString();
    }

    async checkAvailability({ timeStart, timeEnd }: { timeStart: string; timeEnd: string }): Promise<Map<string, Map<string, Array<{ start: string; end: string }>>>> {
        const tenantId = process.env.BOOKING_TENANT_ID;
        if (!tenantId) {
            throw new Error('BOOKING_TENANT_ID env is required');
        }

        const { data: tenantCfg } = await supabaseClient
            .from('tenant_configs')
            .select('timezone')
            .eq('tenant_id', tenantId)
            .single();
        const timeZone = tenantCfg?.timezone || 'UTC';

        const { data: resources } = await supabaseClient
            .schema('booking')
            .from('resources')
            .select('id, name, slot_granularity_minutes')
            .eq('tenant_id', tenantId);

        const dateToCourtVacantSlots = new Map<string, Map<string, Array<{ start: string; end: string }>>>();

        for (const r of resources ?? []) {
            const { data: slots, error } = await supabaseClient.rpc(
                'booking.get_free_slots',
                {
                    tenant_id: tenantId,
                    resource_id: r.id,
                    t0: this.toSupabaseTs(timeStart, timeZone),
                    t1: this.toSupabaseTs(timeEnd, timeZone, true),
                    slot_mins: r.slot_granularity_minutes,
                },
            );

            if (error || !slots) continue;

            (slots as { slot_start: string; slot_end: string }[]).forEach((s) => {
                const dateStr = new Date(s.slot_start).toLocaleDateString('en-CA', { timeZone });
                const start = new Date(s.slot_start).toLocaleTimeString('en-GB', {
                    timeZone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                });
                const end = new Date(s.slot_end).toLocaleTimeString('en-GB', {
                    timeZone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                });

                if (!dateToCourtVacantSlots.has(dateStr)) {
                    dateToCourtVacantSlots.set(dateStr, new Map());
                }
                const courtMap = dateToCourtVacantSlots.get(dateStr)!;
                if (!courtMap.has(r.name)) {
                    courtMap.set(r.name, []);
                }
                courtMap.get(r.name)!.push({ start, end });
            });
        }

        return dateToCourtVacantSlots;
    }

    private transformAvailabilityData(
        dateToCourtVacantSlots: Map<string, Map<string, Array<{ start: string; end: string }>>>,
        estimateDate: EstAvailabilityDate,
    ): AvailableCourt[] {
        const result: AvailableCourt[] = [];

        const sortedDates = Array.from(dateToCourtVacantSlots.entries()).sort(
            ([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime(),
        );

        const targetDate = new Date(
            estimateDate.year ?? new Date().getFullYear(),
            (estimateDate.month ?? new Date().getMonth() + 1) - 1,
            estimateDate.date ?? 1,
        );

        const closestDates = sortedDates
            .map(([date]) => ({ date, diff: Math.abs(new Date(date).getTime() - targetDate.getTime()) }))
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 3)
            .map((item) => item.date);

        closestDates.forEach((date) => {
            const courtMap = dateToCourtVacantSlots.get(date);
            if (courtMap) {
                const availableCourts = Array.from(courtMap.entries()).map(([courtName, slots]) => ({
                    courtName,
                    availableSlots: slots,
                }));

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
            const rangeDate = this.getDates(estimateDate);

            const availability = await this.checkAvailability(rangeDate);
            const formattedData = this.transformAvailabilityData(availability, estimateDate);

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-5-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant man that formats ski/snowboard slope availability information.
                     Respond with a very short, clear, friendly message, with emoji in ${language} that summarizes the availability details. Start by telling about the range user requested date in ${language}. If no availability, encourage user to input some date`
                    },
                    {
                        role: 'user',
                        content: `These are the closest available slots to the requested date, please provide a summary in ${language}.
Requested date context: ${JSON.stringify(rangeDate)}
Availability (closest to the requested date):
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
