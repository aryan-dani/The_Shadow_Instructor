-- Create a table for public profiles using Supabase Auth
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,

  constraint username_length check (char_length(full_name) >= 3)
);

-- Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for interviews
create table public.interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  job_role text not null,
  topic text not null,
  overall_score integer, -- 0 to 100
  duration_seconds integer,
  video_url text, -- Store URL if video is uploaded to storage
  transcript text,
  custom_name text -- User-defined name for the interview
);

-- Set up RLS for interviews
alter table public.interviews enable row level security;

create policy "Users can view their own interviews."
  on interviews for select
  using ( auth.uid() = user_id );

-- Allow public access for leaderboard aggregation (optional, or rely on service role)
-- For now, let's keep it private and use a specific function or view for leaderboard if needed.
-- Or, if the requirement is a public leaderboard, we might need a flag 'is_public'.
-- Let's assume basic leaderboard is public for top scores ? 
-- Actually, let's allow everyone to see all interviews for the leaderboard for now, 
-- but maybe we restricting the detailed view (transcript) to the owner.

create policy "Users can insert their own interviews."
  on interviews for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own interviews."
  on interviews for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own interviews."
  on interviews for delete
  using ( auth.uid() = user_id );

-- Create a secure view for the leaderboard (shows only best score per user per role)
create or replace view public.leaderboard as
select distinct on (user_id, job_role)
  id, 
  user_id, 
  created_at, 
  job_role, 
  topic, 
  overall_score, 
  duration_seconds,
  custom_name
from public.interviews
where overall_score is not null
order by user_id, job_role, overall_score desc;

-- Grant access to the view
grant select on public.leaderboard to anon, authenticated;

-- Create a table for detailed metrics
create table public.interview_metrics (
  id uuid default gen_random_uuid() primary key,
  interview_id uuid references public.interviews(id) on delete cascade not null,
  metric_name text not null, -- e.g., 'Confidence', 'Clarity', 'Technical Accuracy'
  score integer not null, -- 0 to 100
  feedback text
);

-- Set up RLS for metrics
alter table public.interview_metrics enable row level security;

create policy "Users can view their own metrics."
  on interview_metrics for select
  using ( 
    exists (
      select 1 from public.interviews 
      where id = interview_metrics.interview_id 
      and user_id = auth.uid()
    )
  );

create policy "Users can insert metrics for their interviews."
  on interview_metrics for insert
  with check ( 
    exists (
      select 1 from public.interviews 
      where id = interview_metrics.interview_id 
      and user_id = auth.uid()
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Performance Indexes
create index if not exists interviews_user_id_idx on public.interviews(user_id);
create index if not exists interviews_score_idx on public.interviews(overall_score desc);

-- STORAGE BUCKETS (for Resumes and Interview Videos)
-- Note: You need to create a bucket named 'interviews' and 'resumes' in the Supabase Dashboard -> Storage
-- or run this if you have the storage extension enabled (standard on Supabase).

insert into storage.buckets (id, name, public)
values ('interviews', 'interviews', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Storage Policies (Interviews)
create policy "Users can upload their own interview videos"
  on storage.objects for insert
  with check ( bucket_id = 'interviews' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can view their own interview videos"
  on storage.objects for select
  using ( bucket_id = 'interviews' and auth.uid()::text = (storage.foldername(name))[1] );

-- Storage Policies (Resumes)
create policy "Users can upload their own resumes"
  on storage.objects for insert
  with check ( bucket_id = 'resumes' and auth.uid() = owner );

create policy "Users can view their own resumes"
  on storage.objects for select
  using ( bucket_id = 'resumes' and auth.uid() = owner );
