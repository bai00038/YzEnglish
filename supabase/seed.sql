-- Seed data matching src/data/scenes.ts and src/data/resources.ts as of the
-- pre-Supabase mock data layer, so the site looks identical to today once
-- the data layer is switched over. All rows are published so nothing here
-- introduces a "hidden until reviewed" step that doesn't exist in the app now.
--
-- Idempotent + two-phase by design:
--   1. Every insert below is an upsert (`on conflict ... do update`), so
--      re-running this file — including after a partially-failed prior run —
--      converges on the same state instead of erroring on duplicates.
--   2. All 9 scenes are upserted first with prev_scene_id/next_scene_id left
--      untouched (never included in an insert or its on-conflict SET list).
--      Only after every scene row is guaranteed to exist do the separate
--      UPDATE statements near the end of this file set those self-referencing
--      columns. This avoids the FK ordering bug where scene 1 referenced
--      scenes 3/5 before they'd been inserted.

-- ---------------------------------------------------------------------------
-- categories (matches CATEGORIES in src/data/scenes.ts)
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name_en, sort_order) values
  ('shopping-returns', 'Shopping & Returns', 1),
  ('food-restaurants', 'Food & Restaurants', 2),
  ('school-family', 'School & Family', 3),
  ('healthcare', 'Healthcare', 4),
  ('banking-services', 'Banking & Services', 5),
  ('housing', 'Housing', 6),
  ('transportation', 'Transportation', 7),
  ('social-life', 'Social Life', 8),
  ('work', 'Work', 9),
  ('travel', 'Travel', 10),
  ('emergencies', 'Emergencies', 11)
on conflict (slug) do update set
  name_en = excluded.name_en,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- scenes, phase 1: all 9 rows, prev_scene_id/next_scene_id/related_scene_ids
-- deliberately omitted (left null on insert, left untouched on conflict).
-- id 1 is the full "Returning Clothes at a Store" lesson.
-- ---------------------------------------------------------------------------
insert into public.scenes (
  id, slug, title_en, title_zh, category_id, region, level, duration,
  featured, is_new, description, photo_url, status,
  scene_setup_en, scene_setup_zh, learning_goal_en, learning_goal_zh,
  dialogue, expressions, vocabulary, tips, sort_order
) values (
  1, 'returning-clothes-at-a-store', 'Returning Clothes at a Store', '在商店退衣服',
  (select id from public.categories where slug = 'shopping-returns'),
  'Universal', 'A2–B1', '2 min', true, false,
  'Learn how to handle a return at a clothing store, including what to do when you don''t have a receipt.',
  'https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=700&h=480&fit=crop&auto=format',
  'published',
  'You want to return two items — a jacket and a sweater. You have a receipt for one but not the other.',
  '你要退两件商品——有收据的夹克和丢了收据的毛衣。',
  'Handle a two-item return with different receipt situations.',
  '学会在一张有收据、一张没有的情况下完成退货。',
  $d$[
    {"speaker":"Customer","speakerZh":"顾客","en":"Hi, I'd like to return these two items, please.","zh":"你好，我想退这两件商品。"},
    {"speaker":"Clerk","speakerZh":"店员","en":"Of course! Do you have the receipts for both?","zh":"当然可以。请问两件都有收据吗？"},
    {"speaker":"Customer","speakerZh":"顾客","en":"I have a receipt for the jacket, but I lost the receipt for the sweater.","zh":"夹克有收据，但毛衣的收据找不到了。"},
    {"speaker":"Clerk","speakerZh":"店员","en":"That's okay. For the jacket, I can refund to your original payment method. For the sweater, without a receipt, I can offer store credit.","zh":"没关系。夹克我可以退款到您的原始付款方式。毛衣没有收据的话，我可以给您店内购物积分。"},
    {"speaker":"Customer","speakerZh":"顾客","en":"What exactly is store credit?","zh":"店内积分是什么意思？"},
    {"speaker":"Clerk","speakerZh":"店员","en":"It's a credit you can use toward any future purchase here in the store. It doesn't expire.","zh":"就是可以在本店用于任何未来购物的积分，没有使用期限。"},
    {"speaker":"Customer","speakerZh":"顾客","en":"Okay, that works for me. Here's the receipt for the jacket.","zh":"好的，可以接受。这是夹克的收据。"},
    {"speaker":"Clerk","speakerZh":"店员","en":"Thank you. Did you pay by card?","zh":"谢谢。请问您是刷卡付款的吗？"},
    {"speaker":"Customer","speakerZh":"顾客","en":"Yes, by credit card.","zh":"是的，用信用卡付的。"},
    {"speaker":"Clerk","speakerZh":"店员","en":"Please tap or insert your card. The refund for the jacket will appear within 3 to 5 business days.","zh":"请轻触或插入您的卡。夹克的退款将在3至5个工作日内到账。"},
    {"speaker":"Customer","speakerZh":"顾客","en":"And the store credit for the sweater?","zh":"那毛衣的店内积分呢？"},
    {"speaker":"Clerk","speakerZh":"店员","en":"I'll add it to a store credit card right now. You can use it today if you like.","zh":"我现在就把积分存入购物积分卡，如果您愿意，今天就可以使用。"},
    {"speaker":"Customer","speakerZh":"顾客","en":"Great, thank you so much.","zh":"太好了，非常感谢。"},
    {"speaker":"Clerk","speakerZh":"店员","en":"You're welcome! Have a great day.","zh":"不客气，祝您今天愉快！"}
  ]$d$::jsonb,
  $e$[
    {"label":"OPENING","en":"I'd like to return these.","zh":"我想退这些商品。","note":"Natural opening — works for one or multiple items"},
    {"label":"EXPLAINING","en":"I have a receipt for this one, but not for the other.","zh":"这件有收据，但那件没有。","note":"Explains the situation clearly upfront"},
    {"label":"ASKING","en":"What exactly is store credit?","zh":"店内积分是什么意思？","note":"Ask if you don't understand — staff expect this question"},
    {"label":"AGREEING","en":"That works for me.","zh":"可以接受。/ 没问题。","note":"Casual, friendly way to agree to a solution"},
    {"label":"STAFF PHRASE","en":"The refund will appear within 3 to 5 business days.","zh":"退款将在3至5个工作日内到账。","note":"Staff phrase — know it so you understand the timeline"}
  ]$e$::jsonb,
  $v$[
    {"word":"receipt","phonetic":"/rɪˈsiːt/","pos":"n.","zh":"收据","example":"I have the receipt right here."},
    {"word":"refund","phonetic":"/ˈriːfʌnd/","pos":"n./v.","zh":"退款","example":"Can I get a refund?"},
    {"word":"store credit","phonetic":"","pos":"n.","zh":"店内积分 / 购物券","example":"I'll take store credit."},
    {"word":"original payment method","phonetic":"","pos":"n.","zh":"原始付款方式","example":"Refunded to your original payment method."},
    {"word":"expire","phonetic":"/ɪkˈspaɪər/","pos":"v.","zh":"过期","example":"The store credit doesn't expire."}
  ]$v$::jsonb,
  $t$[
    {"type":"Must Know","title":"No receipt? Store credit is normal","titleZh":"没有收据？店内积分是正常解决方案","body":"In North America, stores are not required to accept returns without a receipt. Most will offer store credit as a compromise — it's common and not a punishment. Don't be surprised or offended.","bodyZh":"在北美，商店没有义务接受无收据退货。大多数商店会提供店内积分作为折中方案——这很常见，并非惩罚。不必感到惊讶或不满。"},
    {"type":"Practical Tip","title":"Keep receipts, even small ones","titleZh":"保留收据，哪怕是小额购物","body":"A photo of your receipt on your phone is usually accepted. Some stores can look up purchases made by credit card if you've lost the paper receipt.","bodyZh":"手机里的收据照片通常也可被接受。如果纸质收据丢失，有些商店可以通过信用卡记录查询购买历史。"},
    {"type":"Good to Know","title":"Refund timing depends on your bank","titleZh":"退款时间取决于您的银行","body":"When a store says '3 to 5 business days', the store has already processed it. The delay is on your bank's side — weekends and holidays don't count.","bodyZh":"当商店说「3至5个工作日」时，商店已经处理完毕。延迟来自您银行的处理时间——周末和节假日不计算在内。"}
  ]$t$::jsonb,
  1
)
on conflict (id) do update set
  slug = excluded.slug,
  title_en = excluded.title_en,
  title_zh = excluded.title_zh,
  category_id = excluded.category_id,
  region = excluded.region,
  level = excluded.level,
  duration = excluded.duration,
  featured = excluded.featured,
  is_new = excluded.is_new,
  description = excluded.description,
  photo_url = excluded.photo_url,
  status = excluded.status,
  scene_setup_en = excluded.scene_setup_en,
  scene_setup_zh = excluded.scene_setup_zh,
  learning_goal_en = excluded.learning_goal_en,
  learning_goal_zh = excluded.learning_goal_zh,
  dialogue = excluded.dialogue,
  expressions = excluded.expressions,
  vocabulary = excluded.vocabulary,
  tips = excluded.tips,
  sort_order = excluded.sort_order;

-- remaining 8 scenes: base/list-view fields only. Content columns are left
-- null, which is what the frontend already renders as a "coming soon"
-- placeholder (see SceneDetailPage.tsx) — these are placeholders, not
-- authored lessons.
insert into public.scenes (
  id, slug, title_en, title_zh, category_id, region, level, duration,
  featured, is_new, description, photo_url, status, sort_order
) values
  (2, 'picking-up-a-child-early-from-school', 'Picking Up a Child Early from School', '提前接孩子放学',
    (select id from public.categories where slug = 'school-family'),
    'Universal', 'A2–B1', '5 min', true, true,
    'Practice talking to the school office when you need to pick up your child before dismissal.',
    'https://images.unsplash.com/photo-1516901408257-500ed7566e6a?w=700&h=480&fit=crop&auto=format',
    'published', 2),
  (3, 'booking-a-dentist-appointment', 'Booking a Dentist Appointment', '预约牙医',
    (select id from public.categories where slug = 'healthcare'),
    'Universal', 'B1–B2', '6 min', false, false,
    'Learn to call a dental clinic, answer intake questions, and confirm your appointment.',
    'https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=700&h=480&fit=crop&auto=format',
    'published', 3),
  (4, 'asking-for-a-costco-price-adjustment', 'Asking for a Costco Price Adjustment', 'Costco价格调整申请',
    (select id from public.categories where slug = 'shopping-returns'),
    'Canada', 'A2–B1', '3 min', false, true,
    'Understand how to request a price adjustment if an item you bought goes on sale within the allowed window.',
    null, 'published', 4),
  (5, 'ordering-at-a-drive-through', 'Ordering at a Drive-Through', '得来速点餐',
    (select id from public.categories where slug = 'food-restaurants'),
    'North America', 'A1–A2', '3 min', true, false,
    'Practice ordering food at a drive-through, including customizing your order and paying.',
    'https://images.unsplash.com/photo-1545575950-59f935d6521c?w=700&h=480&fit=crop&auto=format',
    'published', 5),
  (6, 'reporting-a-repair-issue-to-your-landlord', 'Reporting a Repair Issue to Your Landlord', '向房东报修',
    (select id from public.categories where slug = 'housing'),
    'Universal', 'B1–B2', '5 min', false, false,
    'Learn to describe a maintenance problem clearly and follow up on the repair status.',
    null, 'published', 6),
  (7, 'checking-in-at-a-hotel', 'Checking In at a Hotel', '酒店入住',
    (select id from public.categories where slug = 'travel'),
    'Universal', 'A2–B1', '4 min', false, false,
    'Navigate the front desk check-in process, including room preferences and facility questions.',
    'https://images.unsplash.com/photo-1724230758718-406bab979e67?w=700&h=480&fit=crop&auto=format',
    'published', 7),
  (8, 'airport-check-in-and-baggage-drop', 'Airport Check-In and Baggage Drop', '机场值机与行李托运',
    (select id from public.categories where slug = 'travel'),
    'Universal', 'A2–B1', '5 min', false, true,
    'Handle the airline check-in counter, answer security questions, and deal with overweight baggage.',
    'https://images.unsplash.com/photo-1629308993023-bb7ca078abdc?w=700&h=480&fit=crop&auto=format',
    'published', 8),
  (9, 'calling-in-sick-at-work', 'Calling in Sick at Work', '打电话请病假',
    (select id from public.categories where slug = 'work'),
    'Universal', 'A2–B1', '3 min', false, false,
    'Learn the right words and tone to call your manager when you cannot come to work.',
    null, 'published', 9)
on conflict (id) do update set
  slug = excluded.slug,
  title_en = excluded.title_en,
  title_zh = excluded.title_zh,
  category_id = excluded.category_id,
  region = excluded.region,
  level = excluded.level,
  duration = excluded.duration,
  featured = excluded.featured,
  is_new = excluded.is_new,
  description = excluded.description,
  photo_url = excluded.photo_url,
  status = excluded.status,
  sort_order = excluded.sort_order;

select setval('scenes_id_seq', (select max(id) from public.scenes));

-- ---------------------------------------------------------------------------
-- scenes, phase 2: cross-references, only run now that ids 1, 3, 4, 5, 7 all
-- exist (every scene row was upserted above).
-- ---------------------------------------------------------------------------
update public.scenes
set related_scene_ids = array[4, 5, 7], prev_scene_id = 5, next_scene_id = 3
where id = 1;

-- ---------------------------------------------------------------------------
-- pdf_resources (matches PDF_RESOURCES in src/data/resources.ts)
--
-- One free "scene" PDF per real scene, one row per row in the scenes insert
-- above. No bundled/collection/travel/country packs exist yet, so none are
-- seeded — those get added as their own rows once real combined packs are
-- ready. file_path is left null (no upload yet); the frontend renders that
-- as "materials coming soon", same as scenes.pdf_url = null.
-- ---------------------------------------------------------------------------
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
