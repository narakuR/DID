# T25 — ProfileScreen（个人资料 + 5个 Modal）

> **阶段**: 6 - 屏幕实现
> **依赖**: T04（authStore）, T05（walletStore）, T06（settingsStore）, T08（biometricService）, T13（PinPad）, T15（Modal）, T10（i18n）
> **产出文件**: `src/screens/profile/ProfileScreen.tsx`

---

## 任务描述

实现个人资料页面和5个功能 Modal：个人信息编辑、安全设置、语言选择、云同步向导、登出确认。

---

## 主屏幕布局

### 用户卡片（顶部渐变卡片）

```typescript
<LinearGradient colors={['#003399', '#1a56db']} start={{x:0,y:0}} end={{x:1,y:1}}>
  {/* 圆形头像：显示 nickname 前两字或 "AM" */}
  <View style={styles.avatar}>
    <Text>{(user?.nickname?.substring(0, 2) || 'AM').toUpperCase()}</Text>
  </View>
  <Text style={styles.name}>{user?.nickname || 'Alex Mustermann'}</Text>
  <Text style={styles.phone}>{user?.phoneNumber || ''}</Text>
</LinearGradient>
```

### 设置菜单列表

每项结构：
```
[图标（彩色背景圆）] [标签] [可选 value 文字] [ChevronRight]
```

```typescript
const menuItems = [
  { icon: User, label: t('profile.personal'), onPress: () => setModal('personal') },
  { icon: Cloud, label: t('profile.cloud_sync'), value: cloudSync.enabled ? t('profile.on') : t('profile.off'), onPress: () => setModal('cloud') },
  { icon: theme === 'dark' ? Moon : Sun, label: t('profile.dark_mode'), value: theme === 'dark' ? t('profile.on') : t('profile.off'), onPress: toggleTheme },
  { icon: Globe, label: t('profile.language'), value: LANGUAGE_NAMES[language], onPress: () => setModal('language') },
  { icon: Lock, label: t('profile.security'), onPress: () => setModal('security') },
  { icon: Shield, label: t('profile.privacy'), onPress: undefined },  // 预留
  { icon: HelpCircle, label: t('profile.help'), onPress: undefined },  // 预留
];
```

### 登出按钮

```
[全宽圆角按钮，红色浅色背景（#FEF2F2），红色文字]
LogOut 图标 | t('profile.logout')
点击 → setModal('logout')
```

---

## Modal 1：个人信息编辑

```
[Modal 底部弹窗]
  User 图标前缀 | Nickname 输入框
  Smartphone 图标前缀 | 手机号输入框
  [保存按钮] → authStore.updateUser({ nickname, phoneNumber })
```

---

## Modal 2：安全设置

```
[Modal 底部弹窗]

[认证方式切换]（2列按钮）
  [生物识别]  [PIN 码]
  当前选中：蓝色边框

[若选择 PIN]：
  [新 PIN 输入框（6位）]（显示6个圆点 + PinPad）
  [确认 PIN 输入框]（显示6个圆点 + PinPad）
  等两次 PIN 均满6位且一致才激活保存

[保存按钮]
  PIN 模式：biometricService.savePin(newPin) + authStore.updateUser({ authMethod: 'PIN' })
  生物识别：authStore.updateUser({ authMethod: 'BIO' })
```

---

## Modal 3：语言选择

```
[Modal 底部弹窗]

6种语言列表（可滚动）：
  🇬🇧 English
  🇨🇳 中文
  🇪🇸 Español
  🇫🇷 Français
  🇵🇹 Português
  🇸🇦 العربية

每项：
  当前选中：蓝色背景 + 白色 Check 图标
  其他：白色背景 + 灰色文字

点击 → settingsStore.setLanguage(lang)
  切换 'ar' 时：弹出 Alert 提示"需要重启 App 使 RTL 布局生效"
```

---

## Modal 4：云同步向导（分5步）

```typescript
type CloudSyncStep = 'intro' | 'bio' | 'password' | 'syncing' | 'success';
// 已启用时：进入 manage 视图
```

**未启用：5步流程**

```
Step 1 (intro)：
  Cloud 图标 + 功能介绍文字
  [下一步按钮]

Step 2 (bio)：
  Fingerprint 图标 + pulse 动画
  文字：t('cloud.verify_identity')
  自动调用 biometricService.authenticate()
  ✅ 成功 → step = 'password'
  ❌ 失败 → 显示错误，可重试

Step 3 (password)：
  [密码输入框]（需 >= 4位）
  [确认密码输入框]
  两次一致才激活确认按钮
  [确认按钮] → biometricService.saveCloudKey(password) → step = 'syncing'

Step 4 (syncing)：
  1.5s "加密中..." → 2s "上传中..."
  完成 → step = 'success'

Step 5 (success)：
  绿色 CheckCircle
  [完成按钮]
  → authStore.updateCloudSync(true, new Date().toISOString())
  → 关闭 Modal
```

**已启用：管理视图**

```
显示上次同步时间：t('cloud.last_sync', { time: lastSync })
[立即同步按钮] → 模拟 1.5s 同步 → 更新 lastSync
[禁用备份按钮（红色）]
  点击 → Alert 确认 → authStore.updateCloudSync(false)
```

---

## Modal 5：登出确认（2步）

```typescript
type LogoutStep = 'confirm' | 'bio';
```

```
Step 1 (confirm)：
  AlertTriangle 图标（红色背景圆）
  警告文字（登出会清除本地数据）
  [删除并退出按钮（红色）] → step = 'bio'
  [取消按钮]

Step 2 (bio)：
  Fingerprint pulse 动画
  自动调用 biometricService.authenticate()
  ✅ 成功：
    walletStore.clearWallet()
    authStore.logout()
    （导航系统自动回到 Onboarding）
  ❌ 失败：显示错误提示
```

---

## 验证标准

- [ ] 点击深色模式：主题立即切换，菜单项图标从 Sun 变 Moon
- [ ] 语言切换为 zh：所有文字立即切换为中文
- [ ] 个人信息保存后，用户卡片显示新昵称
- [ ] 云同步5步流程可完整走通
- [ ] 登出确认 → 生物识别 → 数据清除 → 自动跳回 Onboarding
- [ ] 安全设置中 PIN 两次不一致时保存按钮不激活
