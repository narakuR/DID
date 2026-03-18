# T23 — ActivityScreen（活动日志）

> **阶段**: 6 - 屏幕实现
> **依赖**: T03（Mock 数据）, T15（ActivityLogItem）, T10（i18n）
> **产出文件**: `src/screens/activity/ActivityScreen.tsx`

---

## 任务描述

实现活动日志屏幕，包含7天柱状图、类型筛选按钮组和活动日志列表。

---

## 布局结构

```
[SafeAreaView]
  [ScrollView]
    [顶部图表区]
    [筛选按钮组]
    [活动日志列表 / 空状态]
```

---

## 顶部图表区

```
[标题行]
  [左] t('activity.disclosures')  fontSize:20  fontWeight:'700'
  [右] 绿色 badge "+12%"           fontSize:12  backgroundColor:#22C55E  color:white  borderRadius:12

[react-native-gifted-charts BarChart]
  数据：MOCK_GRAPH_DATA（7天）
  最高值（Sat=8）：barColor: '#003399'（EU Blue）
  其他：barColor: '#E5E7EB'（浅灰）
  宽度：屏幕宽 - 32px
  高度：200px
  X轴：Mon~Sun，小字
  showTooltip：true（悬停显示数值）
```

BarChart 数据处理：
```typescript
const maxValue = Math.max(...MOCK_GRAPH_DATA.map(d => d.disclosures));
const barData = MOCK_GRAPH_DATA.map(d => ({
  value: d.disclosures,
  label: d.name,
  frontColor: d.disclosures === maxValue ? COLORS.euBlue : '#E5E7EB',
}));
```

---

## 筛选按钮组（横向 ScrollView）

```typescript
type ActivityFilter = 'ALL' | 'PRESENTED' | 'RECEIVED' | 'REVOKED';

const filterOptions: Array<{ label: string; value: ActivityFilter; color: string }> = [
  { label: 'ALL', value: 'ALL', color: '#6B7280' },
  { label: 'PRESENTED', value: 'PRESENTED', color: '#3B82F6' },  // 蓝色
  { label: 'RECEIVED', value: 'RECEIVED', color: '#22C55E' },     // 绿色
  { label: 'REVOKED', value: 'REVOKED', color: '#EF4444' },       // 红色
];
```

样式：
- 选中：对应颜色背景填充，白色文字
- 未选中：灰色背景，灰色文字
- 按钮圆角 20px，水平 padding 16px

---

## 活动日志列表过滤

```typescript
const filteredLogs = useMemo(() => {
  if (filter === 'ALL') return MOCK_ACTIVITY_LOGS;
  return MOCK_ACTIVITY_LOGS.filter(log => log.action === filter);
}, [filter]);
```

---

## 活动日志卡片（ActivityLogItem 来自 T15）

```
每条日志：
  [左侧圆圈图标]
    PRESENTED：蓝色背景，ArrowUpRight（↗）
    RECEIVED： 绿色背景，ArrowDownLeft（↙）
    REVOKED：  红色背景，Trash2

  [中间内容]
    [机构名称]（粗体）
    [凭证图标 + 凭证名称]（小字）
    [动作描述]
      PRESENTED：t('activity.presented_to', { entity })
      RECEIVED：t('activity.received_from', { entity })
      REVOKED：t('activity.revoked')

  [右侧时间]（月/日 时:分）
```

---

## 空状态

```
[居中，flex:1]
  [History 图标（灰色，48px）]
  [t('activity.empty')]（灰色文字）
```

---

## 验证标准

- [ ] 柱状图渲染，Sat（值=8）为蓝色，其余为灰色
- [ ] 筛选 PRESENTED：只显示 PRESENTED 类型日志（4条）
- [ ] 筛选 REVOKED：只显示 REVOKED 类型（1条 LibraryCard）
- [ ] 每条日志图标颜色与动作类型对应
- [ ] 选择空筛选后显示空状态
