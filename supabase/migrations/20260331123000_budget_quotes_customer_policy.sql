-- Allow customers to read quotes linked to their budgets

create policy "Customers can read their quotes" on public.budget_quotes
for select to authenticated
using (
  exists (
    select 1
    from public.budgets b
    join public.site_surveys s on s.id = b.survey_id
    where b.id = budget_quotes.budget_id
      and s.customer_id = auth.uid()
  )
);
