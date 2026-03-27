import { Alert } from 'react-native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import type { RootStackParamList } from '@/navigation/types';
import type { WalletOperation } from '@/wallet-core/domain/models';
import type { ProtocolResult } from '@/wallet-core/types/protocol';
import { INTEGRATION_CONFIG } from '@/config/integration';
import { walletProtocolService } from '@/services/walletProtocolService';
import { normalizeIssuerContextUrl } from '@/wallet-core/transport/urlResolver';
import { toWalletDocument } from '@/wallet-core/domain/models';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

class ProtocolFlowService {
  async handleUri(
    uri: string,
    navigation: RootNavigation
  ): Promise<ProtocolResult> {
    const operation = await walletProtocolService.handleUriOperation(uri);
    return this.handleOperation(operation, navigation);
  }

  async handleOperation(
    operation: WalletOperation,
    navigation: RootNavigation
  ): Promise<ProtocolResult> {
    if (operation.kind === 'issuance_completed') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Main', { screen: 'Wallet' });
      return operation.protocolResult;
    }

    if (operation.kind === 'presentation_requested') {
      navigation.navigate('PresentationConfirm', { session: operation.session });
      return operation.protocolResult;
    }

    if (operation.kind === 'issuance_redirect' && operation.session.redirectUrl) {
      const authSession = await WebBrowser.openAuthSessionAsync(
        normalizeIssuerContextUrl(operation.session.redirectUrl),
        INTEGRATION_CONFIG.app.issuanceRedirectUri
      );

      if (authSession.type === 'success' && authSession.url) {
        const callbackOperation = await walletProtocolService.handleUriOperation(
          authSession.url
        );
        return this.handleOperation(callbackOperation, navigation);
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

    if (operation.kind === 'failure') {
      Alert.alert('流程失败', operation.message);
      return operation.protocolResult;
    }

    return operation.protocolResult;
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
      navigation.navigate('PresentationConfirm', {
        session: {
          id: `presentation-${Date.now()}`,
          presentationId: result.request.presentationId,
          verifier: result.request.verifier,
          status: 'requested',
          matches: result.request.matches.map((match) => ({
            queryId: match.queryId,
            document: toWalletDocument(match.credential),
            disclosedClaims: match.disclosedClaims,
          })),
        },
      });
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
