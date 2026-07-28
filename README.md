
  # Mobile Wireframe for Yz English

  This is a code bundle for Mobile Wireframe for Yz English. The original project is available at https://www.figma.com/design/OOO8epYOSINKud6eXb6Zpw/Mobile-Wireframe-for-Yz-English.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Supabase

  The app reads scenes, categories, and PDF resources from Supabase.
  `src/data/scenes-access.ts` and `src/data/resources-access.ts` expose React
  hooks (`useScenes`, `useFeaturedScenes`, `useSceneDetail`, `useCategoryNames`,
  `useResources`) that query Supabase directly, returning `{ data, loading,
  error }` so pages can render loading/error/empty states.

  There is no authentication, no admin dashboard, and no write path from the
  app — public visitors only ever `SELECT` published rows (enforced by RLS,
  not just by the frontend). All content authoring happens in the Supabase
  Dashboard.

  ### Local development without a Supabase project

  If `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are unset, or a
  Supabase request fails, **and** you're running in dev (`npm run dev`), the
  data layer falls back to the static mock data in `src/data/scenes.ts` and
  `src/data/resources.ts` and logs a `console.warn` so it's never mistaken for
  real data. This fallback is dev-only and isolated to that one branch in
  `withDevFallback()` in `scenes-access.ts`/`resources-access.ts` — a
  production build (`npm run build` output) never falls back; a missing or
  broken Supabase connection surfaces as a real error state in the UI instead.

  ### What's in `supabase/`

  ```
  supabase/
    migrations/
      0001_create_categories.sql
      0002_create_scenes.sql
      0003_create_pdf_resources.sql
      0004_rls_policies.sql
      0005_storage_buckets.sql
    seed.sql
  ```

  - **3 tables**: `categories`, `scenes`, `pdf_resources`. Scene lesson content
    (dialogue, expressions, vocabulary, culture tips) is stored as JSONB
    columns directly on `scenes` rather than child tables, so it stays easy
    to view and hand-edit as a single JSON blob per scene in the Supabase
    Dashboard's Table Editor.
  - **Row Level Security**: enabled on all 3 tables. `anon`/`authenticated`
    roles can only `SELECT`, and only rows where `status = 'published'`.
    There are no insert/update/delete policies for those roles at all — every
    write happens through the Dashboard (SQL Editor or Table Editor), which
    uses the privileged `postgres` role and bypasses RLS.
  - **Storage buckets**: `scene-photos` and `pdf-resources`, both public-read,
    for scene cover images and downloadable PDFs respectively.
  - **`src/data/database.types.ts`**: hand-written TypeScript types matching
    the schema above, used by `src/lib/supabaseClient.ts` for a typed
    `SupabaseClient<Database>`.

  ### One-time setup

  1. Create a project at [supabase.com](https://supabase.com) if you don't
     already have one.
  2. In the Supabase SQL Editor, run the migration files **in order**
     (`0001` → `0005`), then run `supabase/seed.sql`.
     - If your project blocks direct `insert`s into `storage.buckets` from
       the SQL Editor, create the two buckets manually instead — Dashboard →
       Storage → New bucket, named exactly `scene-photos` and
       `pdf-resources`, with "Public bucket" turned on — then run just the
       two `create policy ... on storage.objects` statements from
       `0005_storage_buckets.sql`.
     - Alternatively, if you use the [Supabase CLI](https://supabase.com/docs/guides/cli),
       `supabase db push` applies the migrations and `supabase db seed`
       (or `psql -f supabase/seed.sql`) loads the seed data.
  3. Copy `.env.example` to `.env.local` and fill in your project's URL and
     publishable key from **Settings → API**:
     ```
     VITE_SUPABASE_URL=...
     VITE_SUPABASE_PUBLISHABLE_KEY=...
     ```
     Never put the `service_role` (secret) key in `.env*` — it must never
     reach the client bundle. The publishable key is safe in the browser: it
     only grants what RLS allows, i.e. read-only access to published rows.
     All content authoring happens directly in the Supabase Dashboard, which
     is already access-controlled at the account level, so no service-role
     key or custom admin app is needed.
  4. Restart `npm run dev` after adding `.env.local` so Vite picks up the new
     variables.

  ### Managing content via the Supabase Dashboard

  Until a custom admin UI exists, the Dashboard **is** the admin panel:

  - **Table Editor**: add or edit rows in `categories`, `scenes`, and
    `pdf_resources` directly. Edit the `dialogue`, `expressions`,
    `vocabulary`, and `tips` JSONB cells using its built-in JSON editor.
  - **Publish/unpublish**: flip a row's `status` between `draft` and
    `published` — RLS makes the change take effect immediately, with no
    deploy needed.
  - **Storage**: upload images to `scene-photos` or PDFs to `pdf-resources`,
    then copy the public URL into a scene's `photo_url` or a resource's
    `file_path`.
  