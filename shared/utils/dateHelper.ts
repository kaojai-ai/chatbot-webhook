// Helpers
const parsePgTstzRange = (range: string) => {
    // Examples: [2025-09-13 10:00+07,2025-09-13 12:00+07)
    //           ["2025-09-13 10:00+07","2025-09-13 12:00+07")
    const lowerInc = range.startsWith('[');
    const upperInc = range.endsWith(']');

    const inner = range.slice(1, -1).trim();           // strip [ ), etc.
    // safe split—ISO timestamps won’t contain commas
    let [a, b] = inner.split(',');
    a = (a || '').trim().replace(/^"+|"+$/g, '');
    b = (b || '').trim().replace(/^"+|"+$/g, '');

    // open bounds come back as empty string
    const start = a ? new Date(a) : null;
    const endRaw = b ? new Date(b) : null;

    // Postgres ranges are usually upper-exclusive ')'
    // For display, keep as-is; if you want inclusive feel, subtract 1ms:
    const end = endRaw && !upperInc ? endRaw : endRaw;

    return { start, end, lowerInc, upperInc };
};

const fmtInTZ = (d: Date, tz: string) =>
    new Intl.DateTimeFormat('th-TH', {
        timeZone: tz, dateStyle: 'medium', timeStyle: 'short'
    }).format(d);

const sameMinute = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes();
