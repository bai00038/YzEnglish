
  # Mobile Wireframe for Yz English

  This is a code bundle for Mobile Wireframe for Yz English. The original project is available at https://www.figma.com/design/OOO8epYOSINKud6eXb6Zpw/Mobile-Wireframe-for-Yz-English.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Supabase (schema prepared, not yet connected)

  The app currently reads all content from static mock data in `src/data/`
  (`scenes.ts`, `resources.ts`). A Supabase schema has been prepared under
  `supabase/` for a future migration to a real backend, but **the app does
  not talk to Supabase yet** — `src/data/scenes-access.ts` and
  `src/data/resources.ts` are still the only data source. Nothing below is
  required to run the app today.

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
    the schema above, for a typed `SupabaseClient<Database>` later. Not
    imported anywhere yet.

  ### One-time setup (when you're ready to connect)

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
     anon public key from **Settings → API**:
     ```
     VITE_SUPABASE_URL=...
     VITE_SUPABASE_ANON_KEY=...
     ```
     Never put the `service_role` key in `.env*` — it must never reach the
     client bundle. All content authoring for now happens directly in the
     Supabase Dashboard, which is already access-controlled at the account
     level, so no service-role key or custom admin app is needed.
  4. That's it for setup — there is no code yet that reads these env vars.
     Swapping `src/data/scenes-access.ts` / `src/data/resources.ts` over to
     query Supabase instead of the static arrays is a separate follow-up
     task.

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
  