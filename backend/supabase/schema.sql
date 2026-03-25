create table if not exists charities (
  id text primary key,
  slug text unique not null,
  name text not null,
  category text not null,
  short_description text not null,
  description text not null,
  image_url text not null,
  gallery_images jsonb not null default '[]'::jsonb,
  upcoming_event text not null,
  featured boolean not null default false,
  country_code text not null default 'GB'
);

create table if not exists users (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('subscriber', 'admin')),
  account_type text not null default 'individual' check (account_type in ('individual', 'team', 'corporate')),
  country_code text not null default 'GB',
  organization_name text,
  selected_charity_id text not null references charities(id),
  charity_percentage numeric not null,
  created_at timestamptz not null default now(),
  subscription_plan text not null check (subscription_plan in ('monthly', 'yearly')),
  subscription_status text not null check (subscription_status in ('active', 'inactive', 'cancelled', 'lapsed')),
  started_at timestamptz,
  renewal_date timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text
);

create table if not exists campaigns (
  id text primary key,
  slug text unique not null,
  name text not null,
  description text not null,
  status text not null check (status in ('draft', 'active', 'archived')),
  target_amount numeric not null default 0,
  linked_charity_ids jsonb not null default '[]'::jsonb,
  country_code text not null default 'GB',
  created_at timestamptz not null default now(),
  starts_at timestamptz not null,
  ends_at timestamptz
);

create table if not exists scores (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  value integer not null check (value between 1 and 45),
  played_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists draws (
  id text primary key,
  month_key text not null,
  month_label text not null,
  scheduled_for timestamptz not null,
  mode text not null check (mode in ('random', 'algorithmic')),
  status text not null check (status in ('draft', 'simulated', 'published')),
  carry_over numeric not null default 0,
  simulation_numbers jsonb,
  numbers jsonb,
  prize_pool_total numeric not null default 0,
  winner_ids jsonb not null default '[]'::jsonb,
  simulated_at timestamptz,
  published_at timestamptz
);

create table if not exists draw_entries (
  id text primary key,
  draw_id text not null references draws(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  numbers jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists winners (
  id text primary key,
  draw_id text not null references draws(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  match_count integer not null check (match_count in (3, 4, 5)),
  prize_amount numeric not null,
  proof_url text,
  verification_status text not null check (verification_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  payout_status text not null check (payout_status in ('pending', 'paid')),
  notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists donations (
  id text primary key,
  charity_id text not null references charities(id) on delete cascade,
  user_id text references users(id) on delete set null,
  amount numeric not null,
  donor_name text not null,
  donor_email text,
  kind text not null check (kind in ('subscription', 'independent')),
  reference_id text unique,
  created_at timestamptz not null default now()
);
