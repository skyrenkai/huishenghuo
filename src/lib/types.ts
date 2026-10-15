export type PostImage = { url: string; thumb: string }

export type Profile = {
  id: string
  name: string
  avatar_url: string | null
  is_admin: boolean
  is_banned: boolean
  created_at: string
}

export type Post = {
  id: number
  author_id: string
  city: string
  category: string
  subcategory: string
  title: string
  body: string
  body_html?: string | null
  price: string | null
  extra: Record<string, string>
  images: PostImage[]
  status: 'active' | 'done'
  pinned_until: string | null
  is_hidden: boolean
  view_count: number
  comment_count: number
  bumped_at: string
  created_at: string
  edited_at?: string | null // 内容最后一次修改的时间（执行 9-edited-at.sql 后才有）
  author?: Pick<Profile, 'name' | 'avatar_url'> | null
}

export type PostContact = {
  post_id: number
  phone: string | null
  wechat: string | null
  email: string | null
}

export type Comment = {
  id: number
  post_id: number
  author_id: string
  body: string
  created_at: string
  author?: Pick<Profile, 'name' | 'avatar_url'> | null
}

// 列表页需要的字段（不取正文，省流量）
export const POST_LIST_FIELDS =
  'id, city, category, subcategory, title, price, images, status, pinned_until, view_count, comment_count, bumped_at, created_at'

export type PostListItem = Pick<
  Post,
  | 'id'
  | 'city'
  | 'category'
  | 'subcategory'
  | 'title'
  | 'price'
  | 'images'
  | 'status'
  | 'pinned_until'
  | 'view_count'
  | 'comment_count'
  | 'bumped_at'
  | 'created_at'
>
