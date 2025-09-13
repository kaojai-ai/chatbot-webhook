import supabaseClient from '../../../shared/providers/supabase';
import logger from '../../../shared/logger';

export class OperatingHoursService {
  async getOperatingHoursMessage(): Promise<string> {
    const tenantId = process.env.BOOKING_TENANT_ID;
    if (!tenantId) {
      throw new Error('BOOKING_TENANT_ID env is required');
    }

    const { data: operatingHours, error: opErr } = await supabaseClient
      .schema('booking')
      .from('tenant_operating_hours')
      .select('*')
      .eq('tenant_id', tenantId);

    if (opErr) {
      logger.error(opErr, 'Error fetching operating hours: %s', String(opErr));
    }

    const now = new Date();
    const next30 = new Date();
    next30.setDate(now.getDate() + 30);

    // Postgres range literal: lower-inclusive, upper-exclusive
    const windowRange = `[${now.toISOString()},${next30.toISOString()})`;

    const { data: closures, error: clErr } = await supabaseClient
      .schema('booking')
      .from('closures')
      .select('*')
      .eq('tenant_id', tenantId)
      .filter('closed_during', 'ov', windowRange); // overlaps

    if (clErr) {
      logger.error(clErr, 'Error fetching closures: %s', String(clErr));
    }

    const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

    const lines = (operatingHours || [])
      .map((oh) => `${dayNames[oh.weekday]}: ${oh.open_time} - ${oh.close_time}`)
      .join('\n');

    // TODO load from db
    const tenantTZ = process.env.BOOKING_TENANT_TIMEZONE || 'Asia/Bangkok';

    let closureLines = '';

    if (closures && closures.length > 0) {
      closureLines = closures
        .map((c) => {
          const { start, end } = parsePgTstzRange(c.closed_during as string);

          const startStr = start ? fmtInTZ(start, tenantTZ) : 'ไม่ระบุเริ่มต้น';
          const endStr = end ? fmtInTZ(end, tenantTZ) : 'ไม่ระบุสิ้นสุด';

          const same = start && end ? sameMinute(start, end) : false;
          const rangePart = same ? `${startStr}` : `${startStr} ถึง ${endStr}`;
          const titlePart = c.reason ? ` (${c.reason})` : '';

          return `${rangePart}${titlePart}`;
        })
        .join('\n');
    } else {
      closureLines = 'ไม่มีการปิดให้บริการใน 30 วันข้างหน้า';
    }

    return `เวลาเปิดให้บริการ\n${lines}\n\nกำหนดการปิดให้บริการ\n${closureLines}`;
  }
}
