WITH params AS (
  SELECT
    $1::uuid  AS tenant_id,
    $2::uuid  AS resource_id,
    $3::timestamptz AS t0,
    $4::timestamptz AS t1,
    $5::int   AS slot_mins
),
days AS (  -- just the days we need in the resource’s timezone
  SELECT d::date AS day
  FROM params, LATERAL generate_series(date_trunc('day', t0), date_trunc('day', t1), '1 day') d
),
open_windows AS (  -- map weekday rules → concrete day windows
  SELECT
    tsrange(
      (day + oh.open_time)::timestamptz,
      (day + oh.close_time)::timestamptz,
      '[)'
    ) AS win
  FROM params p
  JOIN days d ON true
  JOIN operating_hours oh
    ON (oh.resource_id = p.resource_id OR oh.resource_id IS NULL)
   AND extract(dow FROM d.day) = oh.weekday
),
bounded AS (  -- keep only inside [t0, t1)
  SELECT tsrange(GREATEST(lower(win), t0), LEAST(upper(win), t1), '[)') AS win
  FROM open_windows, params
  WHERE upper(win) > t0 AND lower(win) < t1
),
slots AS (
  SELECT
    gs AS slot_start,
    gs + (p.slot_mins || ' minutes')::interval AS slot_end
  FROM bounded b, params p
  CROSS JOIN LATERAL generate_series(
    lower(b.win),
    upper(b.win) - (p.slot_mins || ' minutes')::interval,
    (p.slot_mins || ' minutes')::interval
  ) AS gs
),
no_closure AS (
  SELECT s.*
  FROM slots s, params p
  WHERE NOT EXISTS (
    SELECT 1 FROM closures c
    WHERE c.tenant_id = p.tenant_id
      AND (c.resource_id = p.resource_id OR c.resource_id IS NULL)
      AND tstzrange(s.slot_start, s.slot_end, '[)') && c.closed_during
  )
),
free AS (
  SELECT nc.*
  FROM no_closure nc, params p
  WHERE NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.tenant_id   = p.tenant_id
      AND b.resource_id = p.resource_id
      AND b.status = 'confirmed'
      AND tstzrange(nc.slot_start, nc.slot_end, '[)') && b.when
  )
)
SELECT slot_start, slot_end
FROM free
ORDER BY slot_start;
