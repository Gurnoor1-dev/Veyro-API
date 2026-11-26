CREATE TABLE IF NOT EXISTS public.api_organisations (
 id text PRIMARY KEY,name text NOT NULL,database_url_encrypted text,fleet_count integer,
 is_active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT api_organisations_fleet_count_nonnegative CHECK(fleet_count IS NULL OR fleet_count>=0)
);
CREATE INDEX IF NOT EXISTS api_organisations_active_idx ON public.api_organisations(is_active);
INSERT INTO public.api_organisations(id,name,database_url_encrypted,is_active)
VALUES('d50dcc80-8dac-4608-970c-61d6a4739488','Virtual Blue',NULL,true)
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,is_active=true,updated_at=now();
