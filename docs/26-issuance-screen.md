# T26 — IssuanceScreen（添加新凭证）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T03（Mock数据）, T10（i18n）
> **产出文件**: `src/screens/credential/IssuanceScreen.tsx`

---

## 任务描述

实现添加新凭证的屏幕，展示9类证件网格，点击后模拟 OpenID4VCI 发行流程。

---

## 证件类别网格（2列）

```typescript
const CREDENTIAL_CATEGORIES = [
  { id: 'government', icon: 'Landmark', color: '#3B82F6', label: 'Government', desc: 'ID, Residency, Licenses' },
  { id: 'education', icon: 'GraduationCap', color: '#8B5CF6', label: 'Education', desc: 'Diplomas, Certifications' },
  { id: 'health', icon: 'HeartPulse', color: '#EC4899', label: 'Health', desc: 'Insurance, Prescriptions' },
  { id: 'business', icon: 'Briefcase', color: '#374151', label: 'Business', desc: 'Employee ID, Access' },
  { id: 'entertainment', icon: 'Music', color: '#F472B6', label: 'Entertainment', desc: 'Event Tickets, Memberships' },
  { id: 'finance', icon: 'Banknote', color: '#10B981', label: 'Finance', desc: 'Account Proof, Credit Score' },
  { id: 'science', icon: 'FlaskConical', color: '#06B6D4', label: 'Science', desc: 'Research Grants, Lab Access' },
  { id: 'technology', icon: 'Cpu', color: '#6366F1', label: 'Technology', desc: 'Developer Certs, Access Keys' },
  { id: 'other', icon: 'MoreHorizontal', color: '#9CA3AF', label: 'Other', desc: 'Loyalty, Custom' },
];
```

网格布局：
```
2列 FlatGrid 或手动 2列 FlatList
每卡片：
  [彩色图标背景圆（56px）]
  [类别名称]（粗体）
  [描述]（灰色小字）
  圆角卡片，白色背景，阴影
```

---

## OpenID4VCI 模拟流程

进度状态机：
```typescript
type IssuanceStep = 'idle' | 'connecting' | 'authenticating' | 'issuing' | 'success';

const steps: Array<{ step: IssuanceStep; duration: number; message: string }> = [
  { step: 'connecting', duration: 1500, message: t('issue.connecting') },
  { step: 'authenticating', duration: 1500, message: t('issue.authenticating') },
  { step: 'issuing', duration: 2000, message: t('issue.issuing') },
  { step: 'success', duration: 1500, message: t('issue.success') },
];
```

**全屏覆盖 UI（step !== 'idle'）**：

```
[半透明遮罩背景]
[白色圆角卡片（居中）]

  [步骤指示器（小圆点 + 连接线）]
    ○─●─○─○    （connecting 阶段）
    连接线：已完成=蓝色，未完成=灰色

  [主动画区域（圆形）]
    success 步骤：绿色 CheckCircle，zoom-in 动画
    其他步骤：圆形旋转 spinner（边框蓝色）+ 中心 ShieldCheck pulse

  [状态文字]
```

成功后动作：
```typescript
onSuccess: () => {
  // 生成新凭证并加入 wallet
  const newCredential = generateCredentialForCategory(selectedCategory);
  walletStore.addCredential(newCredential);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // 1.5s 后自动返回主页
  setTimeout(() => navigation.goBack(), 1500);
}
```

---

## 进度步骤指示器

```typescript
// 3个圆点，2条连接线
// 步骤对应：connecting=1, authenticating=2, issuing=3（success 复用 issuing 圆点变绿）
<View style={styles.stepIndicator}>
  {[0, 1, 2].map(i => (
    <>
      <View style={[
        styles.stepDot,
        { backgroundColor: currentStepIndex >= i ? '#003399' : '#E5E7EB' }
      ]} />
      {i < 2 && (
        <View style={[
          styles.stepLine,
          { backgroundColor: currentStepIndex > i ? '#003399' : '#E5E7EB' }
        ]} />
      )}
    </>
  ))}
</View>
```

---

## 验证标准

- [ ] 9个类别卡片2列显示
- [ ] 点击任意类别：流程覆盖层出现，依次执行4步
- [ ] 4步依次显示正确文字
- [ ] success 步骤：绿色 CheckCircle 缩放动画
- [ ] 完成后：walletStore.credentials 增加 1 条，自动返回
