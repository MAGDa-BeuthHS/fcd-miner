-- function that returns a setof of cutted linestrings (including speed and time) with trip_ids
CREATE OR REPLACE FUNCTION get_linesubstring(
  points geometry,
  search_radius DOUBLE PRECISION,
  trip_limit INTEGER,
  OUT trip_id INTEGER,
  OUT geom GEOMETRY
  ) RETURNS SETOF RECORD AS
$$
WITH find_segments AS (
  SELECT DISTINCT
    trip_id
  FROM
    matched_tracks_segments,
    ST_DumpPoints($1) dp
  WHERE
    fcd_segment_bbox && ST_Buffer((dp).geom, $2)
), create_substrings AS (
  SELECT
    t.id,
    ST_LineSubString(
      geom,
      ST_LineLocatePoint(t.geom, ST_GeometryN($1, 1)),
      ST_LineLocatePoint(t.geom, ST_GeometryN($1, ST_NumGeometries($1)))
    ) AS geom
  FROM
    matched_tracks_occupied t
  JOIN
    find_segments s
    ON s.trip_id = t.id
  WHERE
    _ST_DWithin(ST_GeometryN($1, 1), t.geom, $2)
    AND _ST_DWithin(ST_GeometryN($1, 1), t.geom, $2)
    AND ST_LineLocatePoint(t.geom, ST_GeometryN($1, 1)) < ST_LineLocatePoint(t.geom, ST_GeometryN($1, ST_NumGeometries($1)))
)
SELECT
  s.id,
  s.geom
FROM
  create_substrings s
JOIN LATERAL (
  SELECT
	array_agg(_ST_DWithin((dp).geom, s.geom, $2)) AS intersects
  FROM
	ST_DumpPoints($1) dp
) p ON (true)
WHERE
  TRUE = ALL (p.intersects)
LIMIT $3;
$$
LANGUAGE sql;

-- function that returns the JSON required for the application
CREATE OR REPLACE FUNCTION get_trip_geojson(
  points geometry,
  search_radius DOUBLE PRECISION,
  hour_start INTEGER DEFAULT 1,
  hour_end INTEGER DEFAULT 24,
  trip_limit INTEGER DEFAULT 10000
  ) RETURNS JSON AS
$$
SELECT
  row_to_json(fc) AS json_result
FROM (
  SELECT
    'FeatureCollection' AS type,
    COALESCE(array_to_json(array_agg(f)), '[]'::json) AS features
  FROM (
	SELECT 
      'Feature' AS type,
      row_to_json(row(
        q.trip_id,
        round(ST_Length(q.geom::geography)),
        CASE WHEN ST_M(ST_EndPoint(geom)) - ST_M(ST_StartPoint(geom)) > 0
        THEN round(ST_M(ST_EndPoint(geom)) - ST_M(ST_StartPoint(geom)))
        ELSE round((ST_Length(q.geom::geography) / (z.avg_speed * 0.27777777777778))::numeric, 3) END,
        round(z.avg_speed)
      )) AS properties,
      ST_AsGeoJSON(q.geom)::json AS geometry
    FROM
      get_linesubstring($1, $2, $5) q
    JOIN LATERAL (
      SELECT
        avg(ST_Z((dp).geom)) AS avg_speed
      FROM
	    ST_DumpPoints(q.geom) dp
    ) z ON (true)
    WHERE
      extract(hour from to_timestamp(ST_M(ST_StartPoint(q.geom)))) + 1 <= $4
      AND extract(hour from to_timestamp(ST_M(ST_EndPoint(q.geom)))) + 1 >= $3
    ORDER BY
      round(ST_Length(q.geom::geography)),
      --round(ST_M(ST_EndPoint(geom)) - ST_M(ST_StartPoint(geom))),
      round(z.avg_speed) DESC
  ) f
) fc
$$
LANGUAGE sql;

-- example query
--SELECT get_trip_geojson(ST_GeomFromText('MULTIPOINT(13.73 51.04, 13.7324336260356 51.03927555023)', 4326), 0.001, 6, 12, 1000);


-- function that returns a setof of cutted linestrings (including speed and time) with trip_ids
CREATE OR REPLACE FUNCTION get_dumped_trip_agg(
  points geometry,
  search_radius DOUBLE PRECISION,
  hour_start INTEGER DEFAULT 1,
  hour_end INTEGER DEFAULT 24,
  trip_coverage_rate INTEGER DEFAULT 10,
  OUT trip_count INTEGER,
  OUT avg_speed INTEGER,
  OUT avg_traveltime NUMERIC,
  OUT geom GEOMETRY,
  OUT total_trip_count INTEGER
  ) RETURNS SETOF RECORD AS
$$
SELECT
  q.trip_count,
  q.avg_speed,
  round(COALESCE(q.avg_traveltime, ST_Length(q.geom::geography) / (q.avg_speed * 0.27777777777778))::numeric, 3) AS avg_traveltime,
  q.geom,
  q.total_trip_count
FROM (
  SELECT
    count(l.id)::int AS trip_count,
    round(PERCENTILE_CONT(0.50)
      WITHIN GROUP (ORDER BY (ST_Z(ST_StartPoint(l.line)) + ST_Z(ST_EndPoint(l.line)))/2)
    )::int AS avg_speed,
    PERCENTILE_CONT(0.25)
      WITHIN GROUP (ORDER BY (ST_M(ST_EndPoint(l.line)) - ST_M(ST_StartPoint(l.line))))
      FILTER (WHERE ST_M(ST_EndPoint(l.line)) - ST_M(ST_StartPoint(l.line)) > 0) AS avg_traveltime,
    ST_Force2D(l.line) AS geom,
    l.total_trip_count::int
  FROM (
    SELECT
      dp.id,
      max(dp.rid) OVER () AS total_trip_count,
      ST_MakeLine(
        lag((dp.pt).geom, 1, NULL) OVER (PARTITION BY dp.id ORDER BY dp.id, (dp.pt).path),
        (dp.pt).geom
      ) AS line
    FROM (
      SELECT
        row_number() OVER () AS rid,
        trip_id AS id,
        ST_DumpPoints(geom) AS pt
      FROM
        get_linesubstring($1, $2, 1000000)
    ) dp
  ) l
  WHERE
    l.line IS NOT NULL
    AND extract(hour from to_timestamp(ST_M(ST_StartPoint(l.line)))) + 1 <= $4
    AND extract(hour from to_timestamp(ST_M(ST_EndPoint(l.line)))) + 1 >= $3
  GROUP BY
    ST_Force2D(l.line),
    l.total_trip_count 
  HAVING
    count(l.id) >= (l.total_trip_count / 100 * $5)
) q
ORDER BY
  trip_count DESC;
$$
LANGUAGE sql;

-- function that returns the JSON required for the application
CREATE OR REPLACE FUNCTION get_dumped_trip_agg_geojson(
  points geometry,
  search_radius DOUBLE PRECISION,
  hour_start INTEGER DEFAULT 0,
  hour_end INTEGER DEFAULT 24,
  trip_coverage_rate INTEGER DEFAULT 10
  ) RETURNS JSON AS
$$
SELECT
  row_to_json(fc) AS json_result
FROM (
  SELECT
    'FeatureCollection' AS type,
    COALESCE(array_to_json(array_agg(f)),'[]'::json) AS features
  FROM (
	SELECT
      'Feature' AS type,
      row_to_json(row(
        row_number() OVER (),
        round(ST_Length(q.geom::geography)),
        q.trip_count,
        q.avg_speed,
        q.avg_traveltime,
        q.total_trip_count
      )) AS properties,
      ST_AsGeoJSON(q.geom)::json AS geometry
    FROM
      get_dumped_trip_agg($1, $2, $3, $4, $5) q
  ) f
) fc
$$
LANGUAGE sql;

-- example query
--SELECT get_dumped_trip_agg_geojson(ST_GeomFromText('MULTIPOINT(13.73 51.04, 13.7324336260356 51.03927555023)', 4326), 0.001, 6, 12, 5);

CREATE OR REPLACE FUNCTION get_trip_agg(
  points geometry,
  search_radius DOUBLE PRECISION,
  hour_start INTEGER DEFAULT 1,
  hour_end INTEGER DEFAULT 24,
  trip_coverage_rate INTEGER DEFAULT 10,
  OUT trip_count INTEGER,
  OUT avg_speed INTEGER,
  OUT avg_traveltime NUMERIC,
  OUT geom GEOMETRY
  ) RETURNS SETOF RECORD AS
$$
WITH RECURSIVE get_lines AS (
  SELECT
    row_number() OVER () AS tid,
    trip_count,
    avg_speed,
    avg_traveltime,
    geom
  FROM
    get_dumped_trip_agg($1, $2, $3, $4, $5)
), start_lines AS (
  SELECT
    tid,
    trip_count,
    avg_speed,
    avg_traveltime,
    geom
  FROM
    get_lines
  WHERE
    _ST_DWithin(ST_GeometryN($1, 1), geom, $2)
), line_iterator(tid, tids, trip_count, avg_speed, avg_traveltime, line_geom, traversals) AS (
  SELECT
    s1.tid,
    ARRAY[s1.tid] AS tids,
    s1.trip_count,
    s1.avg_speed,
    s1.avg_traveltime,
    ST_MakeLine(ST_GeometryN($1, 1), ST_EndPoint(s1.geom)) AS line_geom,
    1 AS traversals
  FROM
    start_lines s1
  LEFT JOIN
    start_lines s2
    ON ST_Equals(ST_StartPoint(s1.geom), ST_EndPoint(s2.geom))
  WHERE
    s2.tid IS NULL
  UNION ALL
    SELECT
      i.tid,
      i.tids || l.tid AS tids,
      l.trip_count,
      l.avg_speed,
      l.avg_traveltime,
      l.geom,
      i.traversals + 1 AS traversals
    FROM
      get_lines l,
      line_iterator i
    WHERE
      l.tid <> ANY (i.tids)
      AND ST_Equals(ST_StartPoint(l.geom), ST_EndPoint(i.line_geom))
)
SELECT
  trip_count,
  avg_speed,
  avg_traveltime,
  geom
FROM (
  SELECT
    round(avg(trip_count))::int AS trip_count,
    round(avg(avg_speed))::int AS avg_speed,
    round(sum(avg_traveltime)::numeric, 3) AS avg_traveltime,
    ST_LineMerge(ST_Collect(line_geom ORDER BY traversals)) AS geom
  FROM
    line_iterator
  GROUP BY
	tid
) s
WHERE
  _ST_DWithin(ST_GeometryN($1, ST_NumGeometries($1)), geom, $2);
$$
LANGUAGE sql;

-- function that returns the JSON required for the application
CREATE OR REPLACE FUNCTION get_trip_agg_geojson(
  points geometry,
  search_radius DOUBLE PRECISION,
  hour_start INTEGER DEFAULT 0,
  hour_end INTEGER DEFAULT 24,
  trip_coverage_rate INTEGER DEFAULT 10
  ) RETURNS JSON AS
$$
SELECT
  row_to_json(fc) AS json_result
FROM (
  SELECT
    'FeatureCollection' AS type,
    COALESCE(array_to_json(array_agg(f)),'[]'::json) AS features
  FROM (
	SELECT
      'Feature' AS type,
      row_to_json(row(
        row_number() OVER (),
        round(ST_Length(q.geom::geography)),
        q.trip_count,
        q.avg_speed,
        q.avg_traveltime
      )) AS properties,
      ST_AsGeoJSON(q.geom)::json AS geometry
    FROM
      get_trip_agg($1, $2, $3, $4, $5) q
  ) f
) fc
$$
LANGUAGE sql;

-- example query
--SELECT get_trip_agg_geojson(ST_GeomFromText('MULTIPOINT(13.73 51.04, 13.7324336260356 51.03927555023)', 4326), 0.001, 6, 12, 5);
