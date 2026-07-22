-- ============================================================
-- Concept glossary + flashcards
-- ============================================================
--
-- A searchable RE-finance glossary (the CRE 101 vocabulary UREC teaches)
-- plus a per-member spaced-repetition flashcard deck over the same terms.
-- Exec authors terms; any signed-in member reads them and studies.

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  term text not null,
  definition text not null default '',
  formula text,
  category text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index glossary_terms_course_id_idx on public.glossary_terms(course_id);

alter table public.glossary_terms enable row level security;
-- Educational content: any signed-in member reads; only exec writes.
create policy "glossary_select" on public.glossary_terms
  for select to authenticated using (true);
create policy "glossary_write_exec" on public.glossary_terms
  for all to authenticated using (public.is_exec()) with check (public.is_exec());
grant select, insert, update, delete on public.glossary_terms to authenticated;

-- Per-member spaced-repetition state (SM-2-lite; see lib/srs.ts).
create table public.flashcard_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  term_id uuid not null references public.glossary_terms(id) on delete cascade,
  due_at timestamptz not null default now(),
  interval_days numeric(7, 2) not null default 0,
  ease numeric(4, 2) not null default 2.5,
  reps integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, term_id)
);
alter table public.flashcard_progress enable row level security;
create policy "flashcard_progress_own" on public.flashcard_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.flashcard_progress to authenticated;

-- Seed the CRE 101 vocabulary (scoped to the Analyst Program course).
insert into public.glossary_terms (course_id, term, definition, formula, category, position)
select c.id, t.term, t.definition, nullif(t.formula, ''), t.category, t.position
from public.courses c
cross join (values
  ('Net Operating Income (NOI)', 'A property''s annual income after operating expenses but before debt service and capital items. The core measure of a property''s cash-generating ability.', 'NOI = Effective Gross Income − Operating Expenses', 'Income', 1),
  ('Effective Gross Income (EGI)', 'All income a property actually collects: potential rent minus vacancy and credit loss, plus other income (parking, fees, reimbursements).', 'EGI = Potential Gross Income − Vacancy + Other Income', 'Income', 2),
  ('Potential Gross Income (PGI)', 'The income a property would produce at 100% occupancy and market rents — the top line before any vacancy is taken out.', 'PGI = In-place Rent × Rentable SF', 'Income', 3),
  ('Cap Rate', 'The unlevered yield on a property: first-year NOI divided by price. Higher cap = cheaper/riskier; lower cap = more expensive/safer.', 'Cap Rate = NOI ÷ Purchase Price', 'Valuation', 4),
  ('Exit / Terminal Cap Rate', 'The cap rate assumed at sale, used to value the property on its forward NOI. Usually set above the going-in cap to be conservative.', 'Sale Price = Forward NOI ÷ Exit Cap Rate', 'Valuation', 5),
  ('Gross Rent Multiplier / Price per SF', 'Quick valuation shorthands — price divided by rentable square feet, used to sanity-check a deal against comps.', 'Price per SF = Purchase Price ÷ Rentable SF', 'Valuation', 6),
  ('Loan-to-Value (LTV)', 'The size of the loan as a share of the property''s value — the primary lever for how much leverage a deal uses.', 'LTV = Loan Amount ÷ Property Value', 'Debt', 7),
  ('Debt Service Coverage Ratio (DSCR)', 'How comfortably NOI covers annual debt service. Lenders size loans to a minimum DSCR (often ~1.20–1.25x).', 'DSCR = NOI ÷ Annual Debt Service', 'Debt', 8),
  ('Debt Yield', 'A leverage-independent measure of loan risk: NOI over loan amount. Lenders use it to cap loan size regardless of cap rate.', 'Debt Yield = NOI ÷ Loan Amount', 'Debt', 9),
  ('Amortization', 'The gradual paydown of loan principal over a schedule (e.g. 30 years). Each payment is part interest, part principal.', '', 'Debt', 10),
  ('Loan-to-Cost (LTC)', 'For development/value-add: the loan as a share of total project cost (purchase + hard + soft costs), rather than of value.', 'LTC = Loan Amount ÷ Total Project Cost', 'Debt', 11),
  ('Internal Rate of Return (IRR)', 'The annualized return that sets the net present value of all cash flows to zero. The headline return metric — sensitive to timing.', 'NPV(IRR) = 0', 'Returns', 12),
  ('Equity Multiple', 'Total cash returned to equity divided by equity invested. Ignores timing (a 2.0x can be a good or bad IRR depending on hold).', 'Equity Multiple = Total Distributions ÷ Equity Invested', 'Returns', 13),
  ('Cash-on-Cash Return', 'Annual pre-tax cash flow to equity divided by equity invested — the in-place yield to the investor in a given year.', 'CoC = Annual Cash Flow ÷ Equity Invested', 'Returns', 14),
  ('Levered vs. Unlevered Return', 'Unlevered return is the property''s return with no debt; levered is the return to equity after debt. Leverage amplifies both gains and losses.', '', 'Returns', 15),
  ('Capital Stack', 'The layers of capital funding a deal, from senior debt (lowest risk/return) up through mezzanine and equity (highest risk/return).', '', 'Capital', 16),
  ('Waterfall', 'The rules for splitting profits between LPs and the GP, usually in tiers gated by return hurdles.', '', 'Capital', 17),
  ('Promote / Carried Interest', 'The GP''s outsized share of profits above a hurdle — the incentive fee that rewards the sponsor for performance.', '', 'Capital', 18),
  ('Preferred Return (Pref)', 'A minimum return LPs earn before the GP participates in profits (e.g. an 8% pref).', '', 'Capital', 19),
  ('Triple Net Lease (NNN)', 'A lease where the tenant pays taxes, insurance, and maintenance on top of base rent — common in industrial and retail.', '', 'Leasing', 20),
  ('WALT', 'Weighted Average Lease Term — the average remaining lease length across tenants, weighted by rent. A gauge of income durability.', '', 'Leasing', 21),
  ('Tenant Improvements & Leasing Commissions (TI/LC)', 'Capital spent to sign or renew tenants: build-out allowances (TI) and broker fees (LC). Sits below the NOI line.', '', 'Leasing', 22),
  ('Risk Profiles: Core / Value-Add / Opportunistic', 'The risk-return spectrum: Core (stabilized, low risk), Value-Add (some lease-up/renovation), Opportunistic (development/distress, highest risk).', '', 'Strategy', 23),
  ('Pro Forma', 'A multi-year projection of a property''s income, expenses, debt, and sale used to underwrite returns — the model itself.', '', 'Strategy', 24),
  ('Reversion', 'The net proceeds from selling the property at the end of the hold — usually the single largest cash flow in the model.', 'Reversion = Sale Price − Sale Costs − Loan Payoff', 'Strategy', 25)
) as t(term, definition, formula, category, position)
where c.name = 'UREC Analyst Program'
  and not exists (
    select 1 from public.glossary_terms g where g.course_id = c.id and g.term = t.term
  );
