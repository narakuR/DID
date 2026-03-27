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
  BadgeCheck,
} from 'lucide-react-native';

import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/hooks/useTheme';
import { COLORS } from '@/constants/colors';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { protocolFlowService } from '@/services/protocolFlowService';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type BusyAction = 'ehic' | 'clipboard' | 'verifier' | null;

type VerifierInitResponse = {
  client_id?: string;
  request_uri?: string;
  request_uri_method?: string;
};

async function createTestIssuerOffer(): Promise<string> {
  const credentialOffer = {
    credential_issuer: 'https://localhost:8444/pid-issuer',
    credential_configuration_ids: [
      INTEGRATION_CONFIG.credentials.ehic.credentialConfigurationId,
    ],
    grants: {
      authorization_code: {
        authorization_server:
          'https://localhost:8444/idp/realms/pid-issuer-realm',
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
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const environmentRows = useMemo(
    () => [
      { label: 'Issuer', value: INTEGRATION_CONFIG.issuer.baseUrl },
      { label: 'Verifier', value: INTEGRATION_CONFIG.verifier.baseUrl },
      { label: '回调', value: INTEGRATION_CONFIG.app.issuanceRedirectUri },
      { label: '首张证', value: INTEGRATION_CONFIG.credentials.ehic.label },
    ],
    []
  );

  async function startIssuanceFromUri(uri: string) {
    await protocolFlowService.handleUri(uri, navigation);
  }

  async function handleIssueEhic() {
    setBusyAction('ehic');
    try {
      const offerUri = await createTestIssuerOffer();
      await startIssuanceFromUri(offerUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert(
        '测试签发方不可用',
        `无法生成 EHIC 凭证 offer。\n${message}`
      );
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
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Hospital color="#FFFFFF" size={22} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={[styles.heroEyebrow, { color: colors.textSecondary }]}>
                Test Issuer
              </Text>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                领取 EHIC SD-JWT VC
              </Text>
            </View>
          </View>

          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
            通过当前集成环境生成真实 credential offer，拉起浏览器授权，并把签发结果回写到钱包。
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, { opacity: busyAction ? 0.7 : 1 }]}
            onPress={() => {
              void handleIssueEhic();
            }}
            disabled={busyAction !== null}
          >
            {busyAction === 'ehic' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <ExternalLink color="#FFFFFF" size={18} />
                <Text style={styles.primaryButtonText}>从测试签发方领取 EHIC</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.noteRow}>
            <ShieldCheck color={COLORS.status.active} size={16} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              PID 下一阶段再接入，这一版先把 EHIC 闭环跑通。
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>其他入口</Text>

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
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
