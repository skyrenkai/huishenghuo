// 分类配置：想加分类、改名字、加字段，只改这个文件即可

export type FieldDef = {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  placeholder?: string
  options?: string[]
  suffix?: string
  wide?: boolean // 占满一整行（例如地址），可以填长一些
}

export type Category = {
  code: string
  name: string
  glyph: string // 分类图标上的单个汉字
  color: string // 图标底色
  subs: string[] // 子类
  fields: FieldDef[] // 该分类专属字段
  priceLabel?: string // 价格框的名字；没有就不显示价格框
  adminOnly?: boolean // 只有管理员能发
  rich?: boolean // 图文文章：用富文本编辑器，可直接粘贴公众号文章；不显示联系方式
  contactFields?: FieldDef[] // 放在"联系方式"里的专属字段（例如地址、联系人）；wide 的排在电话前面，其他排在后面
  imagesFirst?: boolean // 发布页先放图片、再放详细描述
  contactBox?: boolean // 图文板块也显示电话、微信、邮箱等联系方式输入框
  noReview?: boolean // 普通用户发布不用管理员审核（要和 13-service-no-review.sql 里的 no_review 列表一致）
}

export const CATEGORIES: Category[] = [
  {
    code: 'house',
    name: '房屋租售',
    glyph: '房',
    color: '#c8322a',
    subs: ['房屋出租', '房屋求租', '房屋出售', '房屋求购'],
    priceLabel: '租金 / 售价',
    fields: [], // 户型、面积、小区、入住时间不再单独填写，写在详细描述里即可
  },
  {
    code: 'job',
    name: '求职招聘',
    glyph: '职',
    color: '#2f5d9e',
    subs: ['招聘', '求职'],
    priceLabel: '薪资',
    fields: [
      { key: 'position', label: '职位', type: 'text', placeholder: '例如：餐馆服务员、会计' },
      { key: 'job_type', label: '工作类型', type: 'select', options: ['全职', '兼职', '临时工'] },
      { key: 'company', label: '公司 / 店名', type: 'text' },
    ],
  },
  {
    code: 'used',
    name: '二手闲置',
    glyph: '闲',
    color: '#13795b',
    subs: ['出售', '求购', '免费送'],
    priceLabel: '价格',
    fields: [
      { key: 'condition', label: '成色', type: 'select', options: ['全新', '几乎全新', '轻微使用痕迹', '明显使用痕迹'] },
      { key: 'pickup', label: '交易方式', type: 'select', options: ['自取', '可送货', '可邮寄'] },
    ],
  },
  {
    code: 'car',
    name: '汽车买卖',
    glyph: '车',
    color: '#4a5563',
    subs: ['出售', '求购', '租车'],
    priceLabel: '价格',
    fields: [
      { key: 'model', label: '品牌型号', type: 'text', placeholder: '例如：Toyota Camry' },
      { key: 'year', label: '年份', type: 'number' },
      { key: 'mileage', label: '里程', type: 'number', suffix: 'miles' },
      { key: 'title', label: '产权', type: 'select', options: ['Clean title', 'Salvage / Rebuilt', '有贷款'] },
    ],
  },
  {
    code: 'ride',
    name: '顺风车',
    glyph: '拼',
    color: '#d0832a',
    subs: ['车找人', '人找车', '机场接送'],
    priceLabel: '费用',
    fields: [
      { key: 'from', label: '出发地', type: 'text' },
      { key: 'to', label: '目的地', type: 'text' },
      { key: 'depart', label: '出发时间', type: 'text', placeholder: '例如：周五下午 3 点' },
      { key: 'seats', label: '座位 / 人数', type: 'number' },
    ],
  },
  {
    code: 'biz',
    name: '生意转让',
    glyph: '店',
    color: '#7a4b9e',
    subs: ['店铺转让', '求购店铺', '寻找合伙'],
    priceLabel: '转让价',
    fields: [
      { key: 'industry', label: '行业', type: 'select', options: ['餐馆', '美甲美发', '按摩', '零售', '其他'] },
      { key: 'rent', label: '月租金', type: 'text' },
    ],
  },
  {
    code: 'service',
    name: '本地服务',
    glyph: '服',
    color: '#0f6e8a',
    subs: ['装修维修', '搬家', '家政保洁', '接送机', '美容美发', '法律财税', '教育培训', '保险', '会计', '地产中介', '贷款', '医生', '牙医', '其他'],
    // 本地服务的发布顺序：标题、服务范围、图文内容（可粘贴文章和图片）、地址、电话、微信、邮箱、联系人（不填收费）
    fields: [{ key: 'area', label: '服务范围', type: 'text', placeholder: '例如：整个 DFW' }],
    contactFields: [
      { key: 'address', label: '地址', type: 'text', placeholder: '例如：7709 San Jacinto Pl, Suite 206, Plano, TX 75024', wide: true },
      { key: 'contact_name', label: '联系人', type: 'text', placeholder: '例如：王先生' },
    ],
    rich: true, // 和优惠信息一样用图文编辑器，可以直接粘贴宣传文章和图片
    contactBox: true, // 本地服务需要留联系方式，保留电话、微信、邮箱、地址、联系人
    noReview: true, // 发布后马上显示，不用审核
  },
  {
    code: 'help',
    name: '打听求助',
    glyph: '问',
    color: '#b5591f',
    subs: ['打听', '求推荐', '求助'],
    fields: [],
  },
  {
    code: 'social',
    name: '交友活动',
    glyph: '友',
    color: '#c24d7c',
    subs: ['同城活动', '找搭子', '征婚交友'],
    fields: [{ key: 'when', label: '时间', type: 'text' }],
  },
  {
    code: 'deal',
    name: '优惠信息',
    glyph: '惠',
    color: '#a42720',
    subs: ['餐馆优惠', '超市特价', '其他'],
    fields: [{ key: 'until', label: '截止日期', type: 'text' }],
    rich: true, // 和吃喝玩乐一样用图文编辑器，可以直接粘贴商家的宣传文章和图片（所有用户都能发）
    noReview: true, // 发布后马上显示，不用审核
  },
  {
    code: 'fun',
    name: '吃喝玩乐',
    glyph: '玩',
    color: '#e76f51',
    subs: ['美食', '游玩', '活动', '其他'],
    fields: [],
    adminOnly: true,
    rich: true,
  },
  {
    code: 'news',
    name: '本地新闻',
    glyph: '讯',
    color: '#1d2530',
    subs: ['社区新闻', '公告'],
    fields: [],
    adminOnly: true,
    rich: true,
  },
]

// 只有管理员能发的板块（数据库规则里也有同样的名单：supabase/7-fun-category.sql）
export const ADMIN_ONLY_CODES = CATEGORIES.filter((c) => c.adminOnly).map((c) => c.code)

export function getCategory(code?: string | null): Category | undefined {
  return CATEGORIES.find((c) => c.code === code)
}

// 达拉斯包括整个 DFW 地区（Plano、Frisco、Richardson 等）
// 目前只做达拉斯（包括整个 DFW 地区）。以后要加城市，在这里加一行即可，城市选择会自动出现：
//   { code: 'houston', name: '休斯顿 Houston' },
//   { code: 'austin', name: '奥斯汀 Austin' },
export const CITIES = [{ code: 'dallas', name: '达拉斯 Dallas' }]

// 只有一个城市时，不显示城市选择
export const SINGLE_CITY = CITIES.length === 1 ? CITIES[0].code : ''

export function cityName(code?: string | null): string {
  const c = CITIES.find((x) => x.code === code)
  return c ? c.name.split(' ')[0] : ''
}
