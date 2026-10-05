
  # Mobile Wireframe for Yz English

  This is a code bundle for Mobile Wireframe for Yz English. The original project is available at https://www.figma.com/design/OOO8epYOSINKud6eXb6Zpw/Mobile-Wireframe-for-Yz-English.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Scene data and media

  The public site does not use Supabase. It reads the published lesson list
  from OSS `content/manifest.json` through `src/data/oss-content.ts` and
  `src/data/scenes-access.ts`. Full lesson content comes from each scene JSON.

  - The manifest's `category` field is mapped to a display label by
    `src/data/scene-categories.ts`.
  - For a new scene, set `publishedAt` to its actual public release timestamp
    in ISO 8601 format with timezone, e.g. `2026-10-04T12:00:00-04:00`.
    The NEW badge displays for the next 7 × 24 hours, then disappears without
    removing the scene. Missing/invalid dates do not show NEW. The old
    `isNew` flag does not control the badge anymore.
  - Set `isHot: true` manually in the manifest to show HOT; set it to `false`
    or omit it to hide HOT. A scene can show both badges.
  - Video and other media URLs point to Aliyun OSS.
  - The OSS manifest controls which scenes appear publicly. Publishing a new
    scene or changing badge metadata requires updating that manifest on OSS;
    a site redeploy is not needed for data-only changes.

  The old Supabase files remain in the repository only as archived migration
  history and are not part of the public site's runtime data path.
  
