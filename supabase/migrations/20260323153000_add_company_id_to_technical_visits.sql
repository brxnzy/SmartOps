alter table if exists public.technical_visits
add column if not exists company_id uuid;

update public.technical_visits as technical_visit
set company_id = survey.company_id
from public.site_surveys as survey
where survey.id = technical_visit.site_survey_id
  and technical_visit.company_id is null;

create index if not exists technical_visits_company_id_idx
on public.technical_visits (company_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'technical_visits_company_id_fkey'
  ) then
    alter table public.technical_visits
    add constraint technical_visits_company_id_fkey
    foreign key (company_id) references public.companies (id)
    on update cascade
    on delete cascade;
  end if;
end $$;
