import supabaseClient from '../../../shared/providers/supabase';
import logger from '../../../shared/logger';

interface OperatingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
}

interface Closure {
  start_time: string;
  end_time: string;
  title?: string;
}

export class OperatingHoursService {
  async getOperatingHoursMessage(): Promise<string> {
    const tenantId = process.env.BOOKING_TENANT_ID;
    if (!tenantId) {
      throw new Error('BOOKING_TENANT_ID env is required');
    }

    const { data: operatingHours, error: opErr } = await supabaseClient
      .schema('booking')
      .from('tenant_operating_hour')
      .select('day_of_week, open_time, close_time')
      .eq('tenant_id', tenantId);

    if (opErr) {
      logger.error(opErr, 'Error fetching operating hours: %s', String(opErr));
    }

    const now = new Date();
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);

    const { data: closures, error: clErr } = await supabaseClient
      .schema('booking')
      .from('closures')
      .select('start_time, end_time, title')
      .eq('tenant_id', tenantId)
      .gte('start_time', now.toISOString())
      .lte('start_time', next30.toISOString());

    if (clErr) {
      logger.error(clErr, 'Error fetching closures: %s', String(clErr));
    }

    const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

    const lines = (operatingHours || [])
      .map((oh: OperatingHour) => `${dayNames[oh.day_of_week]}: ${oh.open_time} - ${oh.close_time}`)
      .join('\n');

    let closureLines = '';
    if (closures && closures.length > 0) {
      closureLines = closures
        .map((c: Closure) => {
          const start = new Date(c.start_time).toLocaleDateString('th-TH');
          const end = new Date(c.end_time).toLocaleDateString('th-TH');
          return `${start}${start !== end ? ` ถึง ${end}` : ''}${c.title ? ` (${c.title})` : ''}`;
        })
        .join('\n');
    } else {
      closureLines = 'ไม่มีการปิดให้บริการใน 30 วันข้างหน้า';
    }

    return `เวลาเปิดให้บริการ\n${lines}\n\nกำหนดการปิดให้บริการ\n${closureLines}`;
  }
}
