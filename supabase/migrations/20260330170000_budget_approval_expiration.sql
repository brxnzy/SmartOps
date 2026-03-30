-- Update approve_budget_by_token to mark budget as expired when link is expired

create or replace function public.approve_budget_by_token(
  p_token text,
  p_decision text,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_link record;
  v_status text;
begin
  select id, budget_id, expires_at, used_at
  into v_link
  from public.budget_approval_links
  where token_hash = digest(p_token, 'sha256')
  limit 1;

  if v_link is null then
    raise exception 'Link invalido';
  end if;

  if v_link.used_at is not null then
    raise exception 'Link ya utilizado';
  end if;

  if v_link.expires_at < now() then
    update public.budgets
    set status = 'expirada',
        updated_at = now()
    where id = v_link.budget_id;

    raise exception 'Link expirado';
  end if;

  if lower(p_decision) not in ('aprobar', 'rechazar') then
    raise exception 'Decision invalida';
  end if;

  v_status := case when lower(p_decision) = 'aprobar' then 'aprobada' else 'rechazada' end;

  update public.budgets
  set status = v_status,
      approval_method = 'link',
      approval_notes = p_notes,
      approved_at = case when v_status = 'aprobada' then now() else null end,
      rejected_at = case when v_status = 'rechazada' then now() else null end,
      updated_at = now()
  where id = v_link.budget_id;

  update public.budget_approval_links
  set used_at = now()
  where id = v_link.id;

  return v_link.budget_id;
end;
$$;
