-- Migration 007: Update college_list status enum to reflect the broader
-- "Targets" concept. The old admissions-flavored set (Interested, Researching,
-- Likely, Target, Reach, Applying, Archived) is replaced by an
-- intent-based set (Dream, Reach, Match, Necessity) plus closed states
-- (Actualized, Set aside) that move an entry to the bottom of the UI.

-- 1) Drop the existing CHECK constraint so we can migrate the data without
--    fighting it.
alter table public.college_list
  drop constraint if exists college_list_status_check;

-- 2) Re-map old values to the closest new equivalent. Anything not matched
--    falls through to 'Dream' so no row gets orphaned.
update public.college_list
   set status = case status
     when 'Interested'  then 'Dream'
     when 'Researching' then 'Reach'
     when 'Likely'      then 'Match'
     when 'Target'      then 'Match'
     when 'Reach'       then 'Reach'
     when 'Applying'    then 'Necessity'
     when 'Archived'    then 'Set aside'
     else 'Dream'
   end
 where status is not null
   and status not in ('Dream', 'Reach', 'Match', 'Necessity', 'Actualized', 'Set aside');

-- 3) Update the default to match the new active-default in the UI.
alter table public.college_list
  alter column status set default 'Dream';

-- 4) Re-add the CHECK constraint with the new allowed values.
alter table public.college_list
  add constraint college_list_status_check
  check (status in ('Dream', 'Reach', 'Match', 'Necessity', 'Actualized', 'Set aside'));
