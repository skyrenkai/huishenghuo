-- =====================================================================
-- 第 5 步：本地新闻支持图文排版（从公众号复制粘贴，保留格式和图片）
-- 在 Supabase → SQL Editor 执行一次（可以重复执行）
-- =====================================================================

alter table public.posts add column if not exists body_html text;

alter table public.posts drop constraint if exists posts_body_html_len;
alter table public.posts add constraint posts_body_html_len
  check (body_html is null or char_length(body_html) <= 300000);
