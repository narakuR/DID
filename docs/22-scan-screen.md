# T22 — ScanScreen（QR 扫描）

> **阶段**: 6 - 屏幕实现
> **依赖**: T05（walletStore）, T03（Mock数据）, T14（CredentialCard）, T10（i18n）
> **产出文件**: `src/screens/scan/ScanScreen.tsx`

---

## 任务描述

实现 QR 码扫描屏幕（Modal 方式呈现），支持真实相机扫描和 Demo 模式，扫描后弹出凭证接收确认。

---

## 权限与相机初始化

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';

const [permission, requestPermission] = useCameraPermissions();
const [scanned, setScanned] = useState(false);
const [showOffer, setShowOffer] = useState(false);
const [mockCredential, setMockCredential] = useState<VerifiableCredential | null>(null);

useEffect(() => {
  requestPermission();
}, []);
```

---

## 布局（全屏，黑色背景）

```
[SafeAreaView, flex:1, backgroundColor:#000]

  [Header 区（顶部半透明渐变遮罩）]
    [X 关闭按钮] ← navigation.goBack()
    [标题] t('scan.title')，白色文字

  [相机视图区域]（flex:1）
    ✅ 有权限：
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={!scanned ? handleBarcodeScanned : undefined}
      />
      [扫描框 UI 覆盖层]

    ❌ 无权限：
      [灰色背景]
      [AlertCircle 图标（红色）]
      [说明文字]
      [Demo 模式说明]

  [底部区域]
    [Camera 图标按钮（Demo 模式）] → handleDemoScan()
```

---

## 扫描框 UI

```typescript
// 半透明遮罩 + 中央镂空
<View style={StyleSheet.absoluteFillObject}>
  {/* 上方遮罩 */}
  <View style={[styles.mask, { flex: 1 }]} />
  <View style={{ flexDirection: 'row', height: SCAN_BOX_SIZE }}>
    {/* 左侧遮罩 */}
    <View style={[styles.mask, { flex: 1 }]} />
    {/* 扫描框（透明）*/}
    <View style={styles.scanBox}>
      {/* 四角标记（EU 黄色） */}
      <CornerMarker position="topLeft" />
      <CornerMarker position="topRight" />
      <CornerMarker position="bottomLeft" />
      <CornerMarker position="bottomRight" />
      {/* 扫描线 */}
      {!scanned && <ScanLine />}
      {/* 处理中 pulse */}
      {scanned && <ProcessingPulse />}
    </View>
    {/* 右侧遮罩 */}
    <View style={[styles.mask, { flex: 1 }]} />
  </View>
  {/* 下方遮罩 */}
  <View style={[styles.mask, { flex: 1 }]} />
</View>
```

**四角标记样式**：
```typescript
// 每个角：L形，2条线，EU Yellow (#FFCE00)，lineWidth: 4, lineLength: 24
cornerLine: {
  width: 24,
  height: 4,
  backgroundColor: '#FFCE00',
  borderRadius: 2,
}
```

**扫描线动画**：
```typescript
const scanLineAnim = useRef(new Animated.Value(0)).current;

Animated.loop(
  Animated.sequence([
    Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
    Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
  ])
).start();

// translateY 映射：0 → 0, 1 → SCAN_BOX_SIZE - 4
const translateY = scanLineAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, SCAN_BOX_SIZE - 4],
});

<Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
// 扫描线：宽100%, 高2px, 背景色红色
```

---

## 扫描处理逻辑

```typescript
const handleBarcodeScanned = ({ type, data }: BarcodeScanningResult) => {
  if (scanned) return;
  setScanned(true);
  // 解析 QR 数据（Demo 中忽略，直接生成 mock credential offer）
  const offer = generateMockOffer();
  setMockCredential(offer);
  setShowOffer(true);
};

const handleDemoScan = () => {
  setScanned(true);
  setTimeout(() => {
    const offer = generateMockOffer();
    setMockCredential(offer);
    setShowOffer(true);
  }, 1500);
};

// 生成模拟健康保险凭证 Offer
const generateMockOffer = (): VerifiableCredential => ({
  // HealthInsuranceCredential，来自 Mock 数据或新建
  ...
});
```

---

## 凭证接收确认 Modal

```
[底部弹窗（全屏高度 modal）]
  [ShieldCheck 图标（绿色）]
  [标题] t('scan.offer')
  [说明] "{issuer.name} wants_to_add"

  [凭证预览卡片（CredentialCard compact 模式）]
  [Signed by {issuer.name}]

  [接受按钮（主，蓝色）]
    → walletStore.addCredential(mockCredential)
    → Haptics.notificationAsync(Success)
    → navigation.navigate('Wallet')（返回钱包主页）

  [拒绝按钮（灰色文字）]
    → 关闭 Modal，resetScanned()
```

---

## 验证标准

- [ ] 有相机权限时：CameraView 全屏显示，扫描线上下往复动画
- [ ] 无相机权限时：显示 Demo 模式界面和手动触发按钮
- [ ] Demo 按钮点击后 1.5s 出现接收确认 Modal
- [ ] 接受凭证后：walletStore.credentials 增加 1 条，跳转钱包主页
- [ ] 拒绝凭证后：返回扫描状态，可再次扫描
- [ ] 四角标记颜色为 EU Yellow (`#FFCE00`)
