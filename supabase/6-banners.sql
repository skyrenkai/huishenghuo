-- =====================================================================
-- 第 6 步：首页滚动图片广告位（只有管理员可以添加、修改、删除）
-- 在 Supabase → SQL Editor 执行一次（可以重复执行）
-- =====================================================================

create table if not exists public.banners (
  id         bigint generated always as identity primary key,
  image_url  text not null,
  link_url   text check (link_url is null or char_length(link_url) <= 500),
  title      text check (title is null or char_length(title) <= 60),
  sort       integer not null default 0,
  is_active  boolean not null default true,
  ends_at    timestamptz,               -- 可选：到期自动不显示
  created_at timestamptz not null default now()
);

create index if not exists banners_sort_idx on public.banners (sort, id);

alter table public.banners enable row level security;

drop policy if exists "banners 公开可读" on public.banners;
create policy "banners 公开可读" on public.banners for select
  using ((is_active and (ends_at is null or ends_at > now())) or public.is_admin());

drop policy if exists "banners 管理员可写" on public.banners;
create policy "banners 管理员可写" on public.banners for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;

notify pgrst, 'reload schema';
