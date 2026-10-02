
  # Mobile Wireframe for Yz English

  This is a code bundle for Mobile Wireframe for Yz English. The original project is available at https://www.figma.com/design/OOO8epYOSINKud6eXb6Zpw/Mobile-Wireframe-for-Yz-English.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Scene data and media

  The public site does not use Supabase. Both local preview and production
  read the published lesson catalogue from `src/data/scenes.ts` through
  `src/data/scenes-access.ts`.

  - Lesson structure, bilingual copy, dialogue timing, vocabulary, and tips
    live in `src/data/scenes.ts`.
  - Video and other media URLs point to Aliyun OSS.
  - `VISIBLE_SCENE_SLUGS` controls which lessons appear publicly.
  - Adding or editing the catalogue currently requires a normal site deploy.

  The old Supabase files remain in the repository only as archived migration
  history and are not part of the public site's runtime data path.
  
