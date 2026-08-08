-- Replaces the placeholder pdf_resources rows (fictional bundle/collection
-- packs that were never real) with one free "scene" PDF per real scene,
-- matching src/data/resources.ts and the pdf_resources block in
-- supabase/seed.sql. No bundled/collection/travel/country packs exist yet
-- (none are seeded here) — those get added as their own rows once real
-- combined packs are ready. file_path is left untouched (stays whatever it
-- already is, null by default) so this never clobbers a file that was
-- already uploaded for one of these ids.
insert into public.pdf_resources (
  id, title, title_zh, type, description, scene_count, is_free, category, status, sort_order
) values
  (1, 'Returning Clothes at a Store — PDF', '在商店退衣服学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Shopping & Returns', 'published', 1),
  (2, 'Picking Up a Child Early from School — PDF', '提前接孩子放学学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'School & Family', 'published', 2),
  (3, 'Booking a Dentist Appointment — PDF', '预约牙医学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Healthcare', 'published', 3),
  (4, 'Asking for a Costco Price Adjustment — PDF', 'Costco价格调整申请学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Shopping & Returns', 'published', 4),
  (5, 'Ordering at a Drive-Through — PDF', '得来速点餐学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Food & Restaurants', 'published', 5),
  (6, 'Reporting a Repair Issue to Your Landlord — PDF', '向房东报修学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Housing', 'published', 6),
  (7, 'Checking In at a Hotel — PDF', '酒店入住学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Travel', 'published', 7),
  (8, 'Airport Check-In and Baggage Drop — PDF', '机场值机与行李托运学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Travel', 'published', 8),
  (9, 'Calling in Sick at Work — PDF', '打电话请病假学习资料', 'scene', 'Full dialogue, key expressions, vocabulary, and culture tips for this specific scene.', 1, true, 'Work', 'published', 9)
on conflict (id) do update set
  title = excluded.title,
  title_zh = excluded.title_zh,
  type = excluded.type,
  description = excluded.description,
  scene_count = excluded.scene_count,
  is_free = excluded.is_free,
  category = excluded.category,
  status = excluded.status,
  sort_order = excluded.sort_order;

select setval('pdf_resources_id_seq', (select max(id) from public.pdf_resources));
