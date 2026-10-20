-- 15-home-sections.sql：首页所有板块一次查完（原来要 16 次查询，现在 1 次），减轻数据库压力
-- 规则和原来一样：正在置顶的排最前（按置顶到期时间），再按最新排序；只取已审核、没隐藏的。
-- 用调用者的权限执行（security invoker），所以访客只能看到公开的帖子。可以重复执行。

create or replace function public.home_sections(p_city text, p_codes text[], p_counts int[])
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select coalesce(jsonb_object_agg(c.code, coalesce(s.posts, '[]'::jsonb)), '{}'::jsonb)
  from unnest(p_codes, p_counts) as c(code, n)
  left join lateral (
    select jsonb_agg(to_jsonb(t) - 'pin_order' - 'sort_ts' order by t.pin_order, t.sort_ts desc) as posts
    from (
      select p.id, p.city, p.category, p.subcategory, p.title, p.price, p.images, p.status,
             p.pinned_until, p.view_count, p.comment_count, p.bumped_at, p.created_at, p.is_approved,
             case when p.pinned_until > now() then 0 else 1 end as pin_order,
             case when p.pinned_until > now() then p.pinned_until else p.bumped_at end as sort_ts
      from public.posts p
      where p.category = c.code
        and not p.is_hidden and p.is_approved
        and (coalesce(p_city, '') = '' or p.city = p_city)
      order by 15, 16 desc
      limit greatest(c.n, 0)
    ) t
  ) s on true;
$$;

grant execute on function public.home_sections(text, text[], int[]) to anon, authenticated;

notify pgrst, 'reload schema';
