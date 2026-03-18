# T19 — WalletHomeScreen（钱包主页）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T03（工具函数）, T14（CredentialCard）, T15（SearchBar/FilterChips/AlphaIndex）, T12（导航）
> **产出文件**: `src/screens/wallet/WalletHomeScreen.tsx`

---

## 任务描述

实现钱包主页，包含搜索、分类筛选、字母索引、分组凭证列表（可折叠）和 FAB 按钮。

---

## 状态管理

```typescript
const { credentials } = useWalletStore();
const { user } = useAuthStore();

const [searchQuery, setSearchQuery] = useState('');
const [selectedFilter, setSelectedFilter] = useState<IssuerType | 'ALL'>('ALL');
const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
const listRef = useRef<FlatList>(null);
```

---

## 6.3.1 Header 区域

```
左侧：
  [大字] t('wallet.title')    fontSize: 28, fontWeight: '700'
  [小字] t('wallet.welcome', { nickname: user?.nickname || 'Alex' })

右侧：
  [Bell 图标按钮]
    右上角红色圆点 badge（unreadCount > 0 时显示）
    unreadCount = 过期 + 即将到期 + 已撤销的凭证数量
    点击 → navigation.push('Notifications')
```

---

## 6.3.2 搜索栏

```typescript
const filteredCredentials = useMemo(() => {
  let result = credentials;

  // 分类筛选
  if (selectedFilter !== 'ALL') {
    result = result.filter(c => c.issuer.type === selectedFilter);
  }

  // 搜索过滤（标题、描述、发行机构名）
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(c =>
      c.visual.title.toLowerCase().includes(q) ||
      c.visual.description.toLowerCase().includes(q) ||
      c.issuer.name.toLowerCase().includes(q)
    );
  }

  return result;
}, [credentials, searchQuery, selectedFilter]);
```

---

## 6.3.3 FilterChips

选项：`ALL` + 所有 `IssuerType` 枚举值（8个）

```typescript
const filterOptions = [
  { label: 'ALL', value: 'ALL' },
  { label: 'GOV', value: IssuerType.GOVERNMENT },
  { label: 'TRANSPORT', value: IssuerType.TRANSPORT },
  { label: 'HEALTH', value: IssuerType.HEALTH },
  { label: 'UNIVERSITY', value: IssuerType.UNIVERSITY },
  { label: 'BANK', value: IssuerType.BANK },
  { label: 'CORPORATE', value: IssuerType.CORPORATE },
  { label: 'ENTERTAINMENT', value: IssuerType.ENTERTAINMENT },
];
```

---

## 6.3.5 凭证列表

### 正常模式（非搜索）：分组显示

```typescript
// 按 issuer.type 分组
const groupedCredentials = useMemo(() => {
  const groups: Record<string, VerifiableCredential[]> = {};
  filteredCredentials.forEach(c => {
    const key = c.issuer.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return Object.entries(groups);
}, [filteredCredentials]);
```

**分组标题行**：
```
[Layers 图标]  [类型名称]  [数量 badge]  [ChevronDown/Up]
```
- 点击切换折叠/展开
- 展开动画：`LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)`

**展开内容**：凭证卡片列表，`showStatus=true`
- 已撤销：opacity 0.75
- 已过期：opacity 0.8

### 搜索模式：平铺列表

- 去除分组，直接 `FlatList` 渲染所有匹配凭证

### 空状态

```
[Search 图标（灰色，大）]
[文字] t('wallet.empty_search')
```

---

## 6.3.4 字母索引

```typescript
// 从凭证标题提取首字母
const availableLetters = useMemo(() => {
  const letters = new Set<string>();
  filteredCredentials.forEach(c => {
    const first = c.visual.title[0]?.toUpperCase();
    if (first && /[A-Z]/.test(first)) letters.add(first);
  });
  return Array.from(letters).sort();
}, [filteredCredentials]);

const handleAlphaPress = (letter: string) => {
  const index = filteredCredentials.findIndex(
    c => c.visual.title[0]?.toUpperCase() === letter
  );
  if (index !== -1) {
    listRef.current?.scrollToIndex({ index, animated: true });
    // 1.5s 高亮目标凭证
    setHighlightedId(filteredCredentials[index].id);
    setTimeout(() => setHighlightedId(null), 1500);
  }
};
```

---

## 6.3.7 FAB（浮动操作按钮）

```typescript
// 绝对定位，right: 16, bottom: SafeAreaInsets.bottom + 16
<TouchableOpacity
  style={styles.fab}
  onPress={() => navigation.push('Issuance')}
>
  <Plus color="#FFFFFF" size={24} />
</TouchableOpacity>
```

---

## 验证标准

- [ ] 搜索 "Pilot" 只显示 PilotLicense 凭证
- [ ] 选择 GOVERNMENT 筛选后只显示政府类凭证
- [ ] 分组标题点击折叠/展开，有动画
- [ ] Bell badge 显示即将到期 + 已过期 + 已撤销凭证数量
- [ ] FAB 点击跳转 IssuanceScreen
- [ ] 字母索引点击滚动到对应凭证并高亮 1.5s
