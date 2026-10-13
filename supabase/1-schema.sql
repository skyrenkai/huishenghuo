-- =====================================================================
-- 第 1 步：惠生活 数据库结构（执行一次）
-- 打开 Supabase → SQL Editor → New query → 整段粘贴 → Run
-- =====================================================================

-- ---------- 1. 用户资料 ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '新用户' check (char_length(name) between 1 and 30),
  avatar_url  text,
  is_admin    boolean not null default false,
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 微信账号对应关系：单独一张表，不对外公开（只有服务器端能读写）
create table public.wechat_identities (
  wechat_id  text primary key,
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- 2. 帖子 ----------
create table public.posts (
  id            bigint generated always as identity primary key,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  city          text not null,
  category      text not null,
  subcategory   text not null,
  title         text not null check (char_length(title) between 2 and 60),
  body          text not null default '' check (char_length(body) <= 5000),
  price         text check (char_length(price) <= 40),
  extra         jsonb not null default '{}'::jsonb,
  images        jsonb not null default '[]'::jsonb check (jsonb_array_length(images) <= 9),
  status        text not null default 'active' check (status in ('active', 'done')),
  is_pinned     boolean not null default false,
  is_hidden     boolean not null default false,
  view_count    integer not null default 0,
  comment_count integer not null default 0,
  bumped_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index posts_feed_idx on public.posts (is_hidden, is_pinned desc, bumped_at desc);
create index posts_cat_idx  on public.posts (category, city, bumped_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

-- 联系方式单独一张表：只有登录用户才能看到，防止被爬虫抓走电话
create table public.post_contacts (
  post_id  bigint primary key references public.posts(id) on delete cascade,
  phone    text check (char_length(phone) <= 30),
  wechat   text check (char_length(wechat) <= 40),
  email    text check (char_length(email) <= 80)
);

-- ---------- 3. 评论 ----------
create table public.comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- ---------- 4. 举报 ----------
create table public.reports (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 200),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  unique (post_id, reporter_id)
);

-- =====================================================================
-- 辅助函数
-- =====================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_banned from public.profiles where id = auth.uid()), false);
$$;

-- 当前请求是不是来自网页上的普通用户（SQL Editor 和服务器端管理员请求不算）
create or replace function public.is_end_user()
returns boolean language sql stable as $$
  select coalesce(auth.jwt()->>'role', '') in ('authenticated', 'anon')
         and coalesce(current_setting('app.bypass', true), '') <> 'on';
$$;

-- =====================================================================
-- 新用户注册时自动建资料（邮箱 / Google / 微信 都会走这里）
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1),
      '新用户'
    ), 30),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 防止用户通过前端改不该改的字段
-- =====================================================================
create or replace function public.guard_profiles()
returns trigger language plpgsql as $$
begin
  if public.is_end_user() then
    if new.is_admin is distinct from old.is_admin then
      raise exception '不允许修改该字段';
    end if;
    if new.is_banned is distinct from old.is_banned and not public.is_admin() then
      raise exception '不允许修改该字段';
    end if;
    if new.id <> auth.uid() and not public.is_admin() then
      raise exception '只能修改自己的资料';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_profiles before update on public.profiles
  for each row execute function public.guard_profiles();

create or replace function public.guard_posts()
returns trigger language plpgsql as $$
declare
  today_count int;
begin
  if not public.is_end_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.category = 'news' and not public.is_admin() then
      raise exception '本地新闻只能由管理员发布';
    end if;
    -- 防刷：每人每天最多发 10 条
    select count(*) into today_count from public.posts
      where author_id = auth.uid() and created_at > now() - interval '1 day';
    if today_count >= 10 and not public.is_admin() then
      raise exception '今天发布太多了，明天再来吧';
    end if;
    new.author_id := auth.uid();
    new.view_count := 0;
    new.comment_count := 0;
    new.bumped_at := now();
    new.created_at := now();
    if not public.is_admin() then
      new.is_pinned := false;
      new.is_hidden := false;
    end if;
    return new;
  end if;

  -- UPDATE
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.view_count := old.view_count;
  new.comment_count := old.comment_count;
  new.updated_at := now();
  if not public.is_admin() then
    new.is_pinned := old.is_pinned;
    new.is_hidden := old.is_hidden;
    if new.category = 'news' and old.category <> 'news' then
      raise exception '本地新闻只能由管理员发布';
    end if;
    -- 刷新（顶上去）：24 小时一次
    if new.bumped_at is distinct from old.bumped_at then
      if old.bumped_at > now() - interval '24 hours' then
        raise exception '24 小时内只能刷新一次';
      end if;
      new.bumped_at := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_posts before insert or update on public.posts
  for each row execute function public.guard_posts();

-- 浏览数 +1（任何人都能调用，但只能 +1）
create or replace function public.increment_view(pid bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass', 'on', true);
  update public.posts set view_count = view_count + 1 where id = pid;
end;
$$;
grant execute on function public.increment_view(bigint) to anon, authenticated;

-- 评论数自动维护
create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass', 'on', true);
  update public.posts p
     set comment_count = (select count(*) from public.comments c
                          where c.post_id = p.id and not c.is_hidden)
   where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;
create trigger comments_count after insert or update or delete on public.comments
  for each row execute function public.sync_comment_count();

-- 评论防刷：每人每天 100 条
create or replace function public.guard_comments()
returns trigger language plpgsql as $$
begin
  if public.is_end_user() and not public.is_admin() then
    if (select count(*) from public.comments
        where author_id = auth.uid() and created_at > now() - interval '1 day') >= 100 then
      raise exception '今天评论太多了';
    end if;
    new.author_id := auth.uid();
    new.is_hidden := false;
  end if;
  return new;
end;
$$;
create trigger guard_comments before insert on public.comments
  for each row execute function public.guard_comments();

-- =====================================================================
-- 行级权限（RLS）：谁能看、谁能改
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.post_contacts enable row level security;
alter table public.comments      enable row level security;
alter table public.reports       enable row level security;
alter table public.wechat_identities enable row level security;  -- 不建任何策略 = 前端完全读不到

-- 资料：所有人可看昵称头像；自己改自己的；管理员可封号
create policy "profiles 公开可读" on public.profiles for select using (true);
create policy "profiles 本人或管理员可改" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- 帖子
create policy "posts 公开可读" on public.posts for select
  using (not is_hidden or author_id = auth.uid() or public.is_admin());
create policy "posts 登录且未封号可发" on public.posts for insert
  with check (auth.uid() = author_id and not public.is_banned());
create policy "posts 本人或管理员可改" on public.posts for update
  using (author_id = auth.uid() or public.is_admin());
create policy "posts 本人或管理员可删" on public.posts for delete
  using (author_id = auth.uid() or public.is_admin());

-- 联系方式：登录后可看；只有帖子作者能写
create policy "contacts 登录可读" on public.post_contacts for select
  using (auth.uid() is not null);
create policy "contacts 作者可写" on public.post_contacts for all
  using (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- 评论
create policy "comments 公开可读" on public.comments for select
  using (not is_hidden or public.is_admin());
create policy "comments 登录可发" on public.comments for insert
  with check (auth.uid() = author_id and not public.is_banned());
create policy "comments 本人或管理员可删" on public.comments for delete
  using (author_id = auth.uid() or public.is_admin());
create policy "comments 管理员可隐藏" on public.comments for update
  using (public.is_admin());

-- 举报：登录可提交；只有管理员能看和处理
create policy "reports 登录可举报" on public.reports for insert
  with check (auth.uid() = reporter_id);
create policy "reports 管理员可看" on public.reports for select using (public.is_admin());
create policy "reports 管理员可处理" on public.reports for update using (public.is_admin());

-- =====================================================================
-- 图片存储：post-images 桶（公开可读，单张最大 2 MB）
-- 文件路径规则：<用户id>/<随机名>.jpg，只能往自己的文件夹上传
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "images 上传到自己文件夹" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images 删除自己的" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =====================================================================
-- 给已经注册过的老账号补建资料（新项目里这一步什么也不做）
-- =====================================================================
insert into public.profiles (id, name, avatar_url)
select u.id,
       left(coalesce(nullif(u.raw_user_meta_data->>'name', ''),
                     nullif(u.raw_user_meta_data->>'full_name', ''),
                     split_part(u.email, '@', 1), '新用户'), 30),
       coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;
