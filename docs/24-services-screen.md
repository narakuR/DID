# T24 — ServicesScreen（服务市场）

> **阶段**: 6 - 屏幕实现
> **依赖**: T02（ServiceItem 类型）, T15（SearchBar/FilterChips/ServiceItem）, T10（i18n）
> **产出文件**: `src/screens/services/ServicesScreen.tsx`

---

## 任务描述

实现服务市场屏幕，包含11个服务列表、搜索、分类筛选和服务接入流程 Modal。

---

## 静态服务数据

在组件内部或 `constants/mockData.ts` 定义：

```typescript
const SERVICES: ServiceItem[] = [
  { id: 'gov-1', icon: 'Scale', category: 'GOV', name: '犯罪记录查询', provider: '司法部', requiredData: '姓名、国民身份证' },
  { id: 'gov-2', icon: 'FileText', category: 'GOV', name: '税务申报', provider: '联邦税务局', requiredData: '税务ID、收入数据' },
  { id: 'gov-3', icon: 'Building2', category: 'GOV', name: '居住证明', provider: '市政府', requiredData: '地址、居住许可' },
  { id: 'edu-1', icon: 'GraduationCap', category: 'EDU', name: '学历认证', provider: '教育机构', requiredData: '文凭ID' },
  { id: 'edu-2', icon: 'FileText', category: 'EDU', name: '成绩单申请', provider: '大学', requiredData: '学生ID' },
  { id: 'health-1', icon: 'Stethoscope', category: 'HEALTH', name: '医疗记录访问', provider: '卫生部', requiredData: '健康ID' },
  { id: 'health-2', icon: 'Syringe', category: 'HEALTH', name: '接种证明', provider: '卫生部', requiredData: '接种记录' },
  { id: 'trans-1', icon: 'Bus', category: 'TRANSPORT', name: '公共交通开通', provider: '交通局', requiredData: '交通卡' },
  { id: 'trans-2', icon: 'AlertTriangle', category: 'TRANSPORT', name: '交通违章查询', provider: '警察局', requiredData: '驾照、车牌' },
  { id: 'job-1', icon: 'Briefcase', category: 'EMPLOYMENT', name: '求职身份核验', provider: '劳工局', requiredData: '简历、工作经历' },
  { id: 'fin-1', icon: 'Wallet', category: 'FINANCE', name: '银行开户', provider: '金融机构', requiredData: '身份证、地址、信用评分' },
];
```

---

## 屏幕布局

```
[Header]
  [标题] t('services.title')
  [副标题] t('services.subtitle')

[SearchBar]
  过滤：服务名称 + 提供商名称

[FilterChips]
  ALL | GOV | EDU | HEALTH | TRANSPORT | FINANCE | EMPLOYMENT
  选中：黑色背景白字（暗色：白色背景黑字）

[FlatList] 过滤后的服务列表
  每项：ServiceItem（来自 T15）
  点击 → setSelectedService(service)，setShowProcessModal(true)

[空状态] 无匹配服务时
```

---

## 服务处理流程 Modal

5步状态机：

```typescript
type ServiceStep = 'CONNECT' | 'AUTH' | 'SHARE' | 'SUCCESS' | 'REDIRECT';

const serviceSteps: Array<{ step: ServiceStep; duration: number; message: string }> = [
  { step: 'CONNECT', duration: 1500, message: t('services.step_connect') },
  { step: 'AUTH', duration: 2000, message: t('services.step_auth') },
  { step: 'SHARE', duration: 2000, message: t('services.step_share') },
  { step: 'SUCCESS', duration: 1500, message: t('services.step_success') },
  { step: 'REDIRECT', duration: 1500, message: t('services.step_redirect') },
];
```

Modal 打开后自动按顺序执行：

```typescript
useEffect(() => {
  if (!showProcessModal) return;
  let stepIndex = 0;

  const runStep = () => {
    if (stepIndex >= serviceSteps.length) {
      setShowProcessModal(false);
      return;
    }
    const { step, duration } = serviceSteps[stepIndex];
    setCurrentStep(step);
    stepIndex++;
    setTimeout(runStep, duration);
  };

  runStep();
}, [showProcessModal]);
```

**Modal UI**：
```
[全屏 Modal（白色背景）]
  [服务名称标题]

  [步骤列表（垂直）]
  每个步骤：
    [状态图标] | [步骤文字]
    ✅ 已完成步骤：绿色 CheckCircle
    ⏳ 当前步骤：
      CONNECT/SHARE：Loader 旋转 spinner
      AUTH：Fingerprint pulse 动画
      SUCCESS：CheckCircle（绿色，zoom-in 动画）
      REDIRECT：Loader 旋转
    ○ 未开始步骤：灰色圆点，文字半透明（opacity: 0.4）

  步骤之间连接线（竖线）
```

---

## 验证标准

- [ ] 搜索 "税务"：只显示税务申报服务
- [ ] 筛选 HEALTH：只显示医疗相关服务（2项）
- [ ] 点击任意服务：Modal 自动依次执行5步
- [ ] 每步状态正确（已完成=绿色 CheckCircle，进行中=动画，未开始=半透明）
- [ ] REDIRECT 步骤完成后 Modal 自动关闭
