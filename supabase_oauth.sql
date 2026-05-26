-- Table to store OAuth provider tokens for server-side refresh
create table if not exists public.oauth_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  token_type text,
  provider_account_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_oauth_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_oauth_updated_at on public.oauth_tokens;
create trigger set_oauth_updated_at
  before update on public.oauth_tokens
  for each row execute function public.set_oauth_updated_at();
