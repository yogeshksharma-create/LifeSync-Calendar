-- Create connected_accounts table to track user-connected calendar providers
create table if not exists public.connected_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text,
  metadata jsonb,
  created_at timestamptz default now()
);
