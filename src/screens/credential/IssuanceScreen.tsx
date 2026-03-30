import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Hospital,
  ScanLine,
  ClipboardPaste,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  IdCard,
} from 'lucide-react-native';

import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { protocolFlowService } from '@/services/protocolFlowService';
import { walletIdentityService } from '@/services/walletIdentityService';
import { useIdentityStore } from '@/store/identityStore';
import { oid4vciClient } from '@/wallet-core/protocol/oid4vci/client';
import { listAvailableIssuerCredentialConfigurations } from '@/wallet-core/protocol/oid4vci/offerResolver';
import type { ResolvedCredentialConfiguration } from '@/wallet-core/protocol/oid4vci/types';
import { fetchJson } from '@/wallet-core/transport/httpClient';
import { normalizeIssuerContextUrl } from '@/wallet-core/transport/urlResolver';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type BusyAction = 'issuer' | 'clipboard' | 'verifier' | `issue:${string}` | null;

type VerifierInitResponse = {
  client_id?: string;
  request_uri?: string;
  request_uri_method?: string;
};

function deriveJwtVcIssuerMetadataUrl(issuerBaseUrl: string): string {
  const parsed = new URL(issuerBaseUrl);
  return `${parsed.origin}/.well-known/jwt-vc-issuer${parsed.pathname}`;
}

function summarizeMetadata(label: string, value: unknown): string {
  if (!value || typeof value !== 'object') {
    return `${label}: <empty>`;
  }

  const objectValue = value as Record<string, unknown>;
  const topLevelKeys = Object.keys(objectValue).sort();
  const candidate =
    objectValue.credential_configurations_supported ??
    objectValue.credentialConfigurationsSupported ??
    objectValue.credentials_supported ??
    objectValue.credentialsSupported ??
    objectValue.knownCredentialConfigurations ??
    objectValue.known_credential_configurations ??
    (objectValue.signedCredentials as Record<string, unknown> | undefined)
      ?.credential_configurations_supported ??
    (objectValue.signedCredentials as Record<string, unknown> | undefined)
      ?.credentialConfigurationsSupported ??
    (objectValue.signedCredentials as Record<string, unknown> | undefined)
      ?.credentials_supported ??
    (objectValue.signedCredentials as Record<string, unknown> | undefined)
      ?.credentialsSupported ??
    (objectValue.signedCredentials as Record<string, unknown> | undefined)
      ?.knownCredentialConfigurations ??
    objectValue.type_metadata ??
    objectValue.typeMetadata ??
    objectValue.types_supported ??
    objectValue.typesSupported ??
    objectValue.vcts_supported ??
    objectValue.vctsSupported;

  let candidateSummary = 'none';
  if (Array.isArray(candidate)) {
    candidateSummary = `array(${candidate.length})`;
  } else if (candidate && typeof candidate === 'object') {
    candidateSummary = `object(${Object.keys(candidate as Record<string, unknown>).length})`;
  } else if (typeof candidate === 'string') {
    candidateSummary = candidate;
  }

  const preview = JSON.stringify(objectValue, null, 2)?.slice(0, 900) ?? '';

  return [
    `${label}:`,
    `keys=${topLevelKeys.join(', ') || '<none>'}`,
    `candidate=${candidateSummary}`,
    preview,
  ].join('\n');
}

async function createTestIssuerOffer(
  credentialConfigurationId: string
): Promise<string> {
  const credentialOffer = {
    credential_issuer: INTEGRATION_CONFIG.issuer.publicBaseUrl,
    credential_configuration_ids: [credentialConfigurationId],
    grants: {
      authorization_code: {
        authorization_server: `${INTEGRATION_CONFIG.issuer.authorizationServerPublicBaseUrl}/realms/pid-issuer-realm`,
      },
    },
  };

  return `openid-credential-offer://?credential_offer=${encodeURIComponent(
    JSON.stringify(credentialOffer)
  )}`;
}

async function createTestVerifierRequest(): Promise<string> {
  const response = await fetch(INTEGRATION_CONFIG.verifier.initTransactionUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dcql_query: {
        credentials: [
          {
            id: 'ehic_sd_jwt_query',
            format: 'dc+sd-jwt',
            meta: {
              vct_values: [INTEGRATION_CONFIG.credentials.ehic.vct],
            },
            claims: [{ path: ['family_name'] }, { path: ['given_name'] }],
          },
        ],
      },
      nonce: `nonce-${Date.now()}`,
      response_mode: INTEGRATION_CONFIG.verifier.defaultResponseMode,
      jar_mode: INTEGRATION_CONFIG.verifier.defaultJarMode,
      request_uri_method: 'post',
      profile: 'openid4vp',
      authorization_request_scheme: INTEGRATION_CONFIG.verifier.requestScheme,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as VerifierInitResponse;
  if (!payload.request_uri) {
    throw new Error('Verifier 未返回 request_uri');
  }

  const params = new URLSearchParams();
  params.set('request_uri', payload.request_uri);
  if (payload.request_uri_method) {
    params.set('request_uri_method', payload.request_uri_method);
  }
  if (payload.client_id) {
    params.set('client_id', payload.client_id);
  }

  return `${INTEGRATION_CONFIG.verifier.requestScheme}://authorize?${params.toString()}`;
}

export default function IssuanceScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const identityStatus = useIdentityStore((s) => s.status);
  const identityError = useIdentityStore((s) => s.errorMessage);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [issuerCredentialOptions, setIssuerCredentialOptions] = useState<
    ResolvedCredentialConfiguration[]
  >([]);
  const [issuerOptionsLoaded, setIssuerOptionsLoaded] = useState(false);
  const [issuerDebugSummary, setIssuerDebugSummary] = useState<string | null>(null);
  const [devToolsExpanded, setDevToolsExpanded] = useState(false);

  const environmentRows = useMemo(
    () => [
      { label: 'Issuer', value: INTEGRATION_CONFIG.issuer.baseUrl },
      { label: 'Canonical Issuer', value: INTEGRATION_CONFIG.issuer.publicBaseUrl },
      { label: 'Verifier', value: INTEGRATION_CONFIG.verifier.baseUrl },
      { label: '回调', value: INTEGRATION_CONFIG.app.issuanceRedirectUri },
      {
        label: '默认测试证',
        value: INTEGRATION_CONFIG.credentials.defaultTestCredential,
      },
    ],
    []
  );

  async function startIssuanceFromUri(uri: string) {
    await protocolFlowService.handleUri(uri, navigation);
  }

  async function handleIssueCredential(credentialConfigurationId: string) {
    if (identityStatus !== 'ready') {
      setBusyAction(`issue:${credentialConfigurationId}`);
      try {
        await walletIdentityService.ensureReady(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Alert.alert('钱包身份尚未就绪', `钱包身份初始化失败：${message}`);
        return;
      } finally {
        setBusyAction(null);
      }

      if (useIdentityStore.getState().status !== 'ready') {
        Alert.alert('钱包身份尚未就绪', '需要完成设备认证后才能初始化钱包身份。');
        return;
      }
    }

    setBusyAction(`issue:${credentialConfigurationId}`);
    try {
      const offerUri = await createTestIssuerOffer(credentialConfigurationId);
      await startIssuanceFromUri(offerUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert(
        '测试签发方不可用',
        `无法生成 credential offer。\n${message}`
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadIssuerCredentials() {
    setBusyAction('issuer');
    try {
      const issuerMetadata = await oid4vciClient.resolveIssuerMetadata(
        INTEGRATION_CONFIG.issuer.publicBaseUrl
      );
      const options =
        await listAvailableIssuerCredentialConfigurations(
          INTEGRATION_CONFIG.issuer.publicBaseUrl,
          issuerMetadata
        );
      setIssuerCredentialOptions(options);
      setIssuerOptionsLoaded(true);

      if (options.length === 0) {
        let jwtVcIssuerMetadata: unknown = null;
        try {
          jwtVcIssuerMetadata = await fetchJson(
            deriveJwtVcIssuerMetadataUrl(INTEGRATION_CONFIG.issuer.publicBaseUrl),
            { rewriteUrl: normalizeIssuerContextUrl }
          );
        } catch (error) {
          jwtVcIssuerMetadata = {
            error: error instanceof Error ? error.message : String(error),
          };
        }

        setIssuerDebugSummary(
          [
            summarizeMetadata('openid-credential-issuer', issuerMetadata),
            summarizeMetadata('jwt-vc-issuer', jwtVcIssuerMetadata),
          ].join('\n\n')
        );
      } else {
        setIssuerDebugSummary(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('读取 issuer metadata 失败', message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePasteOffer() {
    setBusyAction('clipboard');
    try {
      const clipboard = (await Clipboard.getStringAsync()).trim();
      if (!clipboard) {
        Alert.alert('剪贴板为空', '请先复制 issuer 的 credential offer 链接。');
        return;
      }

      const looksLikeOffer =
        clipboard.startsWith('openid-credential-offer://') ||
        clipboard.startsWith('openid4vci://') ||
        clipboard.includes('credential_offer=') ||
        clipboard.includes('credential_offer_uri=');

      if (!looksLikeOffer) {
        Alert.alert(
          '内容不是 offer',
          '剪贴板内容不是可识别的 credential offer，请复制 issuer 返回的领取链接。'
        );
        return;
      }

      await startIssuanceFromUri(clipboard);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('读取失败', message);
    } finally {
      setBusyAction(null);
    }
  }

  function openScanner() {
    navigation.navigate('Main', { screen: 'Scan' });
  }

  async function handleTestVerifier() {
    setBusyAction('verifier');
    try {
      const openid4vpUri = await createTestVerifierRequest();
      await protocolFlowService.handleUri(openid4vpUri, navigation);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert(
        '测试验证方不可用',
        `无法初始化 EHIC 展示请求。\n${message}`
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>添加证件</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.identityBanner,
              {
                backgroundColor:
                  identityStatus === 'ready'
                    ? '#E8F5E9'
                    : identityStatus === 'error'
                      ? '#FEE2E2'
                      : identityStatus === 'idle'
                        ? '#FFF7ED'
                      : '#EFF6FF',
              },
            ]}
          >
            <Text
              style={[
                styles.identityBannerText,
                {
                  color:
                    identityStatus === 'ready'
                      ? '#166534'
                      : identityStatus === 'error'
                        ? '#991B1B'
                        : identityStatus === 'idle'
                          ? '#9A3412'
                        : '#1D4ED8',
                },
              ]}
            >
              {identityStatus === 'ready'
                ? '钱包身份已就绪，可直接领取和出示证件'
                : identityStatus === 'error'
                  ? `钱包身份初始化失败：${identityError ?? 'Unknown error'}`
                  : identityStatus === 'idle'
                    ? '钱包身份尚未初始化，首次领取时将触发设备认证并完成创建'
                    : '正在初始化钱包身份与签名密钥…'}
            </Text>
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Hospital color="#FFFFFF" size={22} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>
                推荐入口
              </Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                领取 pid-issuer 支持的签证
              </Text>
            </View>
          </View>

          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
            先读取 issuer metadata，再按 `credential_configuration_id` 动态生成领取入口。
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { opacity: busyAction ? 0.7 : 1 }]}
            onPress={() => {
              void handleLoadIssuerCredentials();
            }}
            disabled={busyAction !== null || identityStatus === 'initializing'}
          >
            {busyAction === 'issuer' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <ExternalLink color="#FFFFFF" size={18} />
                <Text style={styles.primaryButtonText}>读取签发方支持的签证类型</Text>
              </>
            )}
          </TouchableOpacity>

          {issuerOptionsLoaded ? (
            <View style={styles.issuerList}>
              {issuerCredentialOptions.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.noteRow}>
                    <ShieldCheck color={COLORS.status.warning} size={16} />
                    <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                      issuer metadata 中没有发现可领取的 credential configuration。
                    </Text>
                  </View>
                  {issuerDebugSummary ? (
                    <View
                      style={[
                        styles.debugCard,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.debugTitle, { color: colors.text }]}>
                        Metadata 调试摘要
                      </Text>
                      <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                        {issuerDebugSummary}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                issuerCredentialOptions.map((option, index) => {
                  const loading = busyAction === `issue:${option.id}`;
                  return (
                    <TouchableOpacity
                      key={`${option.id}:${option.source ?? 'issuer'}:${index}`}
                      style={[
                        styles.issuerOptionCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={() => {
                        void handleIssueCredential(option.id);
                      }}
                      disabled={busyAction !== null}
                    >
                      <View style={styles.issuerOptionContent}>
                        <View style={styles.issuerOptionIcon}>
                          <IdCard color={COLORS.euBlue} size={18} />
                        </View>
                        <View style={styles.issuerOptionInfo}>
                          <Text style={[styles.issuerOptionTitle, { color: colors.text }]}>
                            {option.displayName}
                          </Text>
                          <Text
                            style={[
                              styles.issuerOptionMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {option.id}
                          </Text>
                          <Text
                            style={[
                              styles.issuerOptionMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            format: {option.rawFormat ?? option.format}
                          </Text>
                        </View>
                        {loading ? (
                          <ActivityIndicator color={COLORS.euBlue} size="small" />
                        ) : (
                          <ChevronRight color={colors.textSecondary} size={18} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            <View style={styles.noteRow}>
              <ShieldCheck color={COLORS.status.active} size={16} />
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                支持 `https://localhost/pid-issuer` 暴露的全部 credential configuration。
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.environmentCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setDevToolsExpanded((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.sectionToggleTextWrap}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>开发调试</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                扫码、剪贴板导入和测试验证方入口
              </Text>
            </View>
            {devToolsExpanded ? (
              <ChevronUp color={colors.textSecondary} size={18} />
            ) : (
              <ChevronDown color={colors.textSecondary} size={18} />
            )}
          </TouchableOpacity>

          {devToolsExpanded ? (
            <View style={styles.section}>
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => {
                  void handleTestVerifier();
                }}
                disabled={busyAction !== null}
              >
                <View style={styles.actionLeft}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#7C3AED18' }]}>
                    <BadgeCheck color="#7C3AED" size={20} />
                  </View>
                  <View style={styles.actionTextWrap}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>打开测试验证方</Text>
                    <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                      直接创建一个 EHIC 的 OpenID4VP 请求，用于验证展示闭环。
                    </Text>
                  </View>
                </View>
                {busyAction === 'verifier' ? (
                  <ActivityIndicator color={colors.textSecondary} size="small" />
                ) : (
                  <ChevronRight color={colors.textSecondary} size={18} />
                )}
              </TouchableOpacity>

              {INTEGRATION_CONFIG.dev.enableScanOffer && (
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={openScanner}
                >
                  <View style={styles.actionLeft}>
                    <View style={[styles.actionIconWrap, { backgroundColor: `${COLORS.euBlue}18` }]}>
                      <ScanLine color={COLORS.euBlue} size={20} />
                    </View>
                    <View style={styles.actionTextWrap}>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>扫描 issuer 二维码</Text>
                      <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                        支持 credentials offer 和 verifier request 两类二维码。
                      </Text>
                    </View>
                  </View>
                  <ChevronRight color={colors.textSecondary} size={18} />
                </TouchableOpacity>
              )}

              {INTEGRATION_CONFIG.dev.enablePasteOffer && (
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    void handlePasteOffer();
                  }}
                  disabled={busyAction !== null}
                >
                  <View style={styles.actionLeft}>
                    <View style={[styles.actionIconWrap, { backgroundColor: '#0F766E18' }]}>
                      <ClipboardPaste color="#0F766E" size={20} />
                    </View>
                    <View style={styles.actionTextWrap}>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>从剪贴板导入 offer</Text>
                      <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                        适合调试时复制 `openid-credential-offer://...` 链接后直接领证。
                      </Text>
                    </View>
                  </View>
                  {busyAction === 'clipboard' ? (
                    <ActivityIndicator color={colors.textSecondary} size="small" />
                  ) : (
                    <ChevronRight color={colors.textSecondary} size={18} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noteRow}>
              <ShieldCheck color={COLORS.status.active} size={16} />
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                默认已隐藏调试入口，展开后可使用扫描、导入和验证调试能力。
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.environmentCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>当前集成环境</Text>
          {environmentRows.map((row) => (
            <View key={row.label} style={styles.environmentRow}>
              <Text style={[styles.environmentLabel, { color: colors.textSecondary }]}>
                {row.label}
              </Text>
              <Text style={[styles.environmentValue, { color: colors.text }]} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 32,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  identityBanner: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  identityBannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.euBlue,
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.euBlue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  issuerList: {
    gap: 12,
  },
  emptyState: {
    gap: 12,
  },
  issuerOptionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  issuerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  issuerOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FF',
  },
  issuerOptionInfo: {
    flex: 1,
    gap: 2,
  },
  issuerOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  issuerOptionMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  debugCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  debugText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Courier',
  },
  section: {
    gap: 12,
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionToggleTextWrap: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  environmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  environmentRow: {
    gap: 4,
  },
  environmentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  environmentValue: {
    fontSize: 13,
    lineHeight: 18,
  },
});
