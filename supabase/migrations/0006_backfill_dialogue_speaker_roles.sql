-- Restores the real English speaker role (Teacher, Parent, Dentist, ...)
-- into scenes.dialogue[].speaker for every already-synced row.
--
-- Every scene synced before the sync-scene Edge Function stopped
-- collapsing roles (see supabase/functions/sync-scene/validation.ts) has
-- its dialogue[].speaker forced to only "You" or "Staff". The Chinese
-- dialogue[].speakerZh was never touched by that collapsing step, so it
-- still holds the real role (e.g. "老师", "牙医"). This backfill derives
-- the correct English speaker from speakerZh using the reverse of
-- SPEAKER_ZH_MAP in google-apps-script/Code.gs — the project's existing
-- role map — so nothing here is guessed from dialogue content.
--
-- Idempotent: it branches on speakerZh (untouched by this migration), not
-- speaker, so re-running it is a no-op the second time.
update public.scenes
set dialogue = (
  select jsonb_agg(
    elem || jsonb_build_object(
      'speaker',
      case elem->>'speakerZh'
        when '顾客' then 'Customer'
        when '店员' then 'Clerk'
        when '工作人员' then 'Staff'
        when '收银员' then 'Cashier'
        when '服务员' then 'Server'
        when '前台工作人员' then 'Receptionist'
        when '老师' then 'Teacher'
        when '家长' then 'Parent'
        when 'Leo 家长' then 'Parent A'
        when 'Ethan 家长' then 'Parent B'
        else elem->>'speaker'
      end
    )
  )
  from jsonb_array_elements(dialogue) elem
)
where dialogue is not null;
