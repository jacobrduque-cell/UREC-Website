-- UREC Platform — Phase 3 seed: assignment groups, HW1, rubric
--
-- Ports the real HW1 content and rubric out of the old prototype
-- (urec_workspace_v2.html — HW1_DESCRIPTION / HW1_RUBRIC) rather than
-- inventing placeholder content. Weighted categories match the
-- prototype's Grades page exactly: Homework 60% / Case Studies 25% /
-- Participation 15%.

-- rubric_criteria only had a single `description` column from Phase 1
-- (20260717000000). The prototype's rubric has a short criterion
-- label and a longer description as separate fields (Criteria /
-- Description / Pts columns) — adding that distinction back now,
-- before any real rubric data exists to migrate.
alter table public.rubric_criteria
  add column if not exists criterion text not null default '';

insert into public.assignment_groups (course_id, name, weight_pct, position)
select c.id, g.name, g.weight_pct, g.position
from public.courses c
cross join (values
  ('Homework Assignments', 60, 1),
  ('Case Studies', 25, 2),
  ('Participation', 15, 3)
) as g(name, weight_pct, position)
where c.name = 'UREC Analyst Program'
  and not exists (
    select 1 from public.assignment_groups ag
    where ag.course_id = c.id and ag.name = g.name
  );

insert into public.assignments (
  course_id, assignment_group_id, title, description, points_possible,
  due_at, submission_type, accepted_file_types, published
)
select
  c.id,
  ag.id,
  'HW1: Defining CRE & Core Metrics',
  $html$<p><strong>Sections Covered:</strong> Defining Commercial Real Estate &middot; Basic Formulas &amp; Terms</p>

<h3>Question 1 &mdash; Risk &amp; Income Characteristics</h3>
<p>For each asset class below, briefly answer one sentence per bullet.</p>
<p><strong>Multifamily</strong></p>
<ul>
  <li>Typical lease length:</li>
  <li>Primary demand driver:</li>
  <li>One reason income is relatively stable:</li>
</ul>
<p><strong>Office</strong></p>
<ul>
  <li>Typical lease length:</li>
  <li>Primary demand driver:</li>
  <li>One reason income can be volatile:</li>
</ul>
<p><strong>Retail</strong></p>
<ul>
  <li>Typical lease structure (gross/N/NN/NNN):</li>
  <li>Primary driver of tenant health:</li>
  <li>One key risk to landlord cash flow:</li>
</ul>

<h3>Question 2 &mdash; Stabilized vs. Value-Add Thinking</h3>
<p>Classify each scenario as Stabilized or Non-Stabilized, then answer the questions that follow.</p>
<p><strong>Scenario A:</strong> 95% leased grocery-anchored retail center with long-term leases, minimal near-term capex, and steady in-place NOI.</p>
<p><strong>Scenario B:</strong> 60% leased suburban office building with below-market rents and a planned $5M repositioning program.</p>
<p>For each scenario:</p>
<ul>
  <li>Is the asset stabilized or non-stabilized?</li>
  <li>What is the investor primarily buying: income or upside?</li>
  <li>Which return metric matters more: Cap Rate / Cash-on-Cash or IRR / Equity Multiple?</li>
</ul>

<h3>Question 3 &mdash; Risk&ndash;Return Profiles</h3>
<p>Match each deal to the most appropriate risk&ndash;return profile: Core / Core Plus / Value-Add / Opportunistic.</p>
<ul>
  <li><strong>a.</strong> 100% leased Class A multifamily property in a prime urban location with no planned renovations.</li>
  <li><strong>b.</strong> Industrial portfolio leased to multiple tenants with moderate lease rollover over the next three years.</li>
  <li><strong>c.</strong> High-vacancy office/flex asset requiring significant capex and lease-up.</li>
  <li><strong>d.</strong> Entitled land with no current income and a ground-up development plan.</li>
</ul>
<p><em>Briefly justify your choices.</em></p>

<h3>Question 4 &mdash; Risk Ranking</h3>
<p>Rank the following asset classes from least risky to most risky.</p>
<ul>
  <li>Industrial</li>
  <li>Multifamily</li>
  <li>Retail</li>
  <li>Office</li>
  <li>Hospitality</li>
</ul>
<p>Then choose one (or more) factors below and explain (3&ndash;5 sentences) how it influenced your ranking:</p>
<ul>
  <li>Lease length</li>
  <li>Tenant diversification</li>
  <li>Demand stability</li>
  <li>Income volatility</li>
</ul>

<h3>Question 5 &mdash; NOI Waterfall</h3>
<p>A multifamily property has the following assumptions:</p>
<ul>
  <li>Potential Gross Income (PGI): <code>$2,000,000</code></li>
  <li>Vacancy: <code>5%</code></li>
  <li>Credit Loss: <code>1%</code></li>
  <li>Operating Expenses: <code>$700,000</code></li>
</ul>
<p><strong>a.</strong> Calculate Vacancy Loss<br><strong>b.</strong> Calculate Effective Gross Income (EGI)<br><strong>c.</strong> Calculate Net Operating Income (NOI)<br><strong>d.</strong> Which line item above has the largest impact on value and why?</p>

<h3>Question 6 &mdash; Cap Rate Application</h3>
<p>A property trades for $25,000,000 at a 6.25% cap rate.</p>
<p><strong>a.</strong> What is the implied NOI?<br><strong>b.</strong> If NOI increases by 10% and the cap rate remains constant, what is the new property value?<br><strong>c.</strong> In 2&ndash;3 sentences, explain what this tells you about the relationship between NOI growth and value.</p>

<h3>Question 7 &mdash; Debt Metrics</h3>
<p>A lender is reviewing the following deal:</p>
<ul>
  <li>NOI: <code>$1,200,000</code></li>
  <li>Loan Amount: <code>$15,000,000</code></li>
  <li>Annual Debt Service: <code>$900,000</code></li>
  <li>Appraised Value: <code>$22,000,000</code></li>
</ul>
<p><strong>a.</strong> Calculate:</p>
<ul>
  <li>Debt Service Coverage Ratio (DSCR)</li>
  <li>Loan-to-Value (LTV)</li>
  <li>Debt Yield</li>
</ul>
<p><strong>b.</strong> Based on these metrics, would this loan likely be approved? Why or why not?</p>

<h3>Question 8 &mdash; Return Metrics</h3>
<p>In 4&ndash;6 sentences, answer the following:</p>
<ol>
  <li>Why might a stabilized, low-risk asset produce a high Cash-on-Cash return but a relatively low IRR?</li>
  <li>In what type of investment would IRR matter more than Cash-on-Cash?</li>
</ol>

<h3>Submission Requirements</h3>
<ul>
  <li>Submit as a single <strong>PDF</strong></li>
  <li>Show all work for calculations</li>
  <li>Be concise but clear in explanations</li>
</ul>$html$,
  100,
  '2026-09-07 23:59:00-07'::timestamptz,
  'file',
  array['pdf'],
  true
from public.courses c
join public.assignment_groups ag
  on ag.course_id = c.id and ag.name = 'Homework Assignments'
where c.name = 'UREC Analyst Program'
  and not exists (
    select 1 from public.assignments a
    where a.course_id = c.id and a.title = 'HW1: Defining CRE & Core Metrics'
  );

insert into public.rubrics (course_id, title)
select c.id, 'HW1 Rubric'
from public.courses c
where c.name = 'UREC Analyst Program'
  and not exists (
    select 1 from public.rubrics r
    where r.course_id = c.id and r.title = 'HW1 Rubric'
  );

insert into public.rubric_criteria (rubric_id, criterion, description, points, position)
select r.id, x.criterion, x.description, x.points, x.position
from public.rubrics r
join public.courses c on c.id = r.course_id
cross join (values
  ('Asset class analysis (Q1)', 'Correctly identifies lease length, demand drivers, and stability/volatility factors', 15, 1),
  ('Stabilized vs. value-add classification (Q2)', 'Correct classification and metric selection with justification', 10, 2),
  ('Risk-return profile matching (Q3)', 'Correct pairings with clear justification', 15, 3),
  ('Risk ranking (Q4)', 'Logical ranking with sound reasoning', 10, 4),
  ('NOI waterfall calculations (Q5)', 'All calculations correct with work shown', 15, 5),
  ('Cap rate application (Q6)', 'Correct math and clear interpretation', 10, 6),
  ('Debt metrics (Q7)', 'DSCR, LTV, Debt Yield calculated correctly with lending judgment', 15, 7),
  ('Return metrics discussion (Q8)', 'Clear reasoning connecting metric choice to investment type', 10, 8)
) as x(criterion, description, points, position)
where c.name = 'UREC Analyst Program'
  and r.title = 'HW1 Rubric'
  and not exists (
    select 1 from public.rubric_criteria rc
    where rc.rubric_id = r.id and rc.criterion = x.criterion
  );

insert into public.assignment_rubrics (assignment_id, rubric_id)
select a.id, r.id
from public.assignments a
join public.courses c on c.id = a.course_id
join public.rubrics r on r.course_id = c.id and r.title = 'HW1 Rubric'
where c.name = 'UREC Analyst Program'
  and a.title = 'HW1: Defining CRE & Core Metrics'
  and not exists (
    select 1 from public.assignment_rubrics ar
    where ar.assignment_id = a.id and ar.rubric_id = r.id
  );
