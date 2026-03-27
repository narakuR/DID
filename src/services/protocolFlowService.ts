import { Alert } from 'react-native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import type { RootStackParamList } from '@/navigation/types';
import type { ProtocolResult } from '@/plugins/types';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { walletProtocolService } from '@/services/walletProtocolService';
import { normalizeIssuerContextUrl } from '@/utils/integrationUrls';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

class ProtocolFlowService {
  async handleUri(
    uri: string,
    navigation: RootNavigation
  ): Promise<ProtocolResult> {
    const result = await walletProtocolService.handleUri(uri);
    return this.handleResult(result, navigation);
  }

  async handleResult(
    result: ProtocolResult,
    navigation: RootNavigation
  ): Promise<ProtocolResult> {
    if (result.type === 'credential_received') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Main', { screen: 'Wallet' });
      return result;
    }

    if (result.type === 'presentation_request') {
      navigation.navigate('PresentationConfirm', { request: result.request });
      return result;
    }

    if (result.type === 'redirect') {
      const authSession = await WebBrowser.openAuthSessionAsync(
        normalizeIssuerContextUrl(result.url),
        INTEGRATION_CONFIG.app.issuanceRedirectUri
      );

      if (authSession.type === 'success' && authSession.url) {
        const callbackResult = await walletProtocolService.handleUri(authSession.url);
        return this.handleResult(callbackResult, navigation);
      }

      return {
        type: 'error',
        message:
          authSession.type === 'cancel'
            ? '用户取消了浏览器授权。'
            : authSession.type === 'dismiss'
              ? '浏览器授权已关闭。'
              : '浏览器授权未完成。',
      };
    }

    if (result.type === 'error') {
      Alert.alert('流程失败', result.message);
    }

    return result;
  }
}

export const protocolFlowService = new ProtocolFlowService();
