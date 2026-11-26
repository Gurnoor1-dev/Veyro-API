# Veyro API

API-only multi-organisation integration service built with Next.js Route Handlers, Drizzle ORM and Neon PostgreSQL.

**Base URL:** `https://veyro-api.vercel.app/api/v1`

## Architecture
- LiveDock's Neon database is the initial control-plane database and first tenant database (Virtual Blue).
- `public.api_organisations` maps each organisation ID to its own Neon database.
- Tenant connection strings are encrypted with AES-256-GCM before storage. Virtual Blue uses the control-plane `DATABASE_URL`.
- Tenant pilot records follow the `public.app_users` contract: `ifc_user_id`, `ifc_username`, `discord_user_id`, `discord_username`.
- No frontend is included.

## Authentication
Every v1 endpoint requires `Authorization: Bearer <VEYRO_API_KEY>` or `x-api-key: <VEYRO_API_KEY>`. Keep this key server-side; never expose it in browser JavaScript.
Tenant registration requires the separate `x-veyro-admin-key: <VEYRO_ADMIN_KEY>`.

## Endpoints
1. `GET /api/v1/list-organisations`
2. `GET /api/v1/{organisation-id}/list-pilots`
3. `GET /api/v1/{organisation-id}/{pilot-id}/flights?page=1`
4. `GET /api/v1/{organisation-id}/{pilot-id}/flights/{flight-id}`

All successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code", "message" } }`.

### Example organisation
```json
{
 "organisationName":"Virtual Blue",
 "organisationId":"d50dcc80-8dac-4608-970c-61d6a4739488",
 "organisationPilotsNumber":2,
 "organisationFleetNumber":null
}
```
Fleet count is null until configured; the API does not invent an aircraft count.

### Add another organisation
Send from a trusted server:
```http
POST /api/v1/admin/organisations
x-veyro-admin-key: <VEYRO_ADMIN_KEY>
Content-Type: application/json
```
```json
{"organisationId":"infinite-flight-organisation-uuid","organisationName":"Example VA","databaseUrl":"postgresql://...neon.tech/...","fleetNumber":18}
```
The database URL is encrypted before it is saved. New tenant DBs must expose the same `public.app_users` pilot table contract. Use PUT to update organisation name/fleet count; omit databaseUrl to keep the existing encrypted URL.

## Infinite Flight integration
Flight-log routes use PublicApi v3 OAuth2 client-credentials. Configure `IF_OAUTH_CLIENT_ID` and `IF_OAUTH_CLIENT_SECRET` in Vercel. The OAuth client must be Confidential, have **Allow server-to-server access** enabled, and be approved by Infinite Flight.
The upstream user-flights endpoint has no page-size parameter. Veyro combines native Infinite Flight pages into 40-flight response pages.
User flight endpoints have a five-minute minimum polling interval. Results are cached in process memory for five minutes and concurrent requests are deduplicated. Infinite Flight data is not written to Neon or accumulated.

Official docs:
- https://infiniteflight.com/guide/developer-reference/live-api-v3/server-to-server
- https://infiniteflight.com/guide/developer-reference/live-api-v3/user-flights
- https://infiniteflight.com/guide/developer-reference/api-rules/usage-and-data-rules

## Environment
See `.env.example`. Runtime uses Neon HTTP connections. Use a direct URL as `DATABASE_URL_UNPOOLED` for Drizzle migrations.
`GET /api/health` checks the control database. `GET /` returns service metadata. `GET /api/v1/docs` returns a minimal OpenAPI document.
