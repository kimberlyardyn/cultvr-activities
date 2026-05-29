-- Migration 008: Add "Getting Close" as an active progress status and rename
-- the previous "Set aside" closed status to "Set Aside For Now" so the UI
-- reads naturally in quick-action buttons.

alter table public.college_list
  drop constraint if exists college_list_status_check;

update public.college_list
   set status = 'Set Aside For Now'
 where status = 'Set aside';

alter table public.college_list
  add constraint college_list_status_check
  check (status in (
    'Dream',
    'Reach',
    'Match',
    'Necessity',
    'Getting Close',
    'Actualized',
    'Set Aside For Now'
  ));
