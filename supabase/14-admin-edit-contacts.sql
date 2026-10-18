-- 14-admin-edit-contacts.sql：管理员编辑别人的帖子时，也能修改联系方式
-- 原来只有作者本人能写联系方式；管理员改帖子时联系方式保存不了。可以重复执行。

drop policy if exists "contacts 作者可写" on public.post_contacts;
create policy "contacts 作者可写" on public.post_contacts for all
  using (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.posts p where p.id = post_id and (p.author_id = (select auth.uid()) or (select public.is_admin()))));
