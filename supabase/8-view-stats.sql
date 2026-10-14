-- =====================================================================
-- 第 8 步：后台浏览量统计（只有管理员能看）
-- 在 Supabase → SQL Editor 执行一次（可以重复执行）
-- 每条帖子每天一行，记录当天浏览次数；统计从执行这段 SQL 之后开始累计
-- =====================================================================

create table if not exists public.post_views_daily (
  day     date   not null,
  post_id bigint not null references public.posts(id) on delete cascade,
  views   integer not null default 0,
  primary key (day, post_id)
);
create index if not exists post_views_daily_post_idx on public.post_views_daily (post_id);

-- 只有管理员能读；任何人都不能直接写（只能通过下面的 increment_view）
alter table public.post_views_daily enable row level security;
drop policy if exists "views 管理员可读" on public.post_views_daily;
create policy "views 管理员可读" on public.post_views_daily for select using (public.is_admin());
revoke insert, update, delete on public.post_views_daily from anon, authenticated;

-- 浏览数 +1：总浏览数 + 当天浏览数（按达拉斯时间算"哪一天"）
create or replace function public.increment_view(pid bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass', 'on', true);
  update public.posts set view_count = view_count + 1 where id = pid and not is_hidden;
  if found then
    insert into public.post_views_daily (day, post_id, views)
    values ((now() at time zone 'America/Chicago')::date, pid, 1)
    on conflict (day, post_id) do update set views = post_views_daily.views + 1;
  end if;
end;
$$;
grant execute on function public.increment_view(bigint) to anon, authenticated;

-- 管理后台：最近 N 天的统计（只有管理员能调用）
drop function if exists public.admin_view_stats(integer);
create function public.admin_view_stats(days integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/Chicago')::date;
  since date := today - (greatest(least(days, 365), 1) - 1);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception '只有管理员可以查看';
  end if;

  select jsonb_build_object(
    -- 每天的浏览量（没有浏览的日子补 0）
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'views', coalesce(v.views, 0)) order by d), '[]'::jsonb)
      from generate_series(since, today, interval '1 day') d
      left join (select day, sum(views) as views from post_views_daily where day >= since group by day) v on v.day = d::date
    ),
    -- 浏览最多的帖子
    'top_posts', (
      select coalesce(jsonb_agg(t order by t.views desc), '[]'::jsonb)
      from (
        select p.id, p.title, p.category, sum(v.views)::int as views, p.view_count as total
        from post_views_daily v join posts p on p.id = v.post_id
        where v.day >= since
        group by p.id
        order by sum(v.views) desc
        limit 10
      ) t
    ),
    -- 各板块的浏览量
    'by_category', (
      select coalesce(jsonb_agg(c order by c.views desc), '[]'::jsonb)
      from (
        select p.category, sum(v.views)::int as views
        from post_views_daily v join posts p on p.id = v.post_id
        where v.day >= since
        group by p.category
      ) c
    ),
    'today',      (select coalesce(sum(views), 0) from post_views_daily where day = today),
    'yesterday',  (select coalesce(sum(views), 0) from post_views_daily where day = today - 1),
    'last7',      (select coalesce(sum(views), 0) from post_views_daily where day > today - 7),
    'last30',     (select coalesce(sum(views), 0) from post_views_daily where day > today - 30),
    'all_time',   (select coalesce(sum(view_count), 0) from posts),
    'new_posts',  (select count(*) from posts where created_at >= since),
    'new_users',  (select count(*) from profiles where created_at >= since)
  ) into result;

  return result;
end;
$$;
revoke execute on function public.admin_view_stats(integer) from public, anon;
grant execute on function public.admin_view_stats(integer) to authenticated;

notify pgrst, 'reload schema';
