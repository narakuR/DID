import { Alert, Platform } from 'react-native';
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
import { pendingIssuanceService } from '@/services/pendingIssuanceService';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

class ProtocolFlowService {
  private async launchAuthorization(
    authorizationUrl: string
  ): Promise<{ type: 'browser'; url: string } | { type: 'success'; url: string } | { type: 'error'; message: string }> {
    if (Platform.OS === 'android') {
      const browser = await WebBrowser.openBrowserAsync(authorizationUrl);
      if (browser.type === 'cancel' || browser.type === 'dismiss') {
        return {
          type: 'error',
          message:
            browser.type === 'cancel'
              ? '用户取消了浏览器授权。'
              : '浏览器授权已关闭。',
        };
      }

      return {
        type: 'browser',
        url: authorizationUrl,
      };
    }

    const authSession = await WebBrowser.openAuthSessionAsync(
      authorizationUrl,
      INTEGRATION_CONFIG.app.issuanceRedirectUri
    );

    if (authSession.type === 'success' && authSession.url) {
      return {
        type: 'success',
        url: authSession.url,
      };
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

  async handleUri(
    uri: string,
    navigation: RootNavigation
  ): Promise<ProtocolResult> {
    await pendingIssuanceService.begin(uri);
    const operation = await walletProtocolService.handleUriOperation(uri);
    return this.handleOperation(operation, navigation);
  }

  async handleOperation(
    operation: WalletOperation,
    navigation: RootNavigation
  ): Promise<ProtocolResult> {
    if (operation.kind === 'issuance_completed') {
      pendingIssuanceService.complete();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Main', { screen: 'Wallet' });
      return operation.protocolResult;
    }

    if (operation.kind === 'presentation_requested') {
      navigation.navigate('PresentationConfirm', { session: operation.session });
      return operation.protocolResult;
    }

    if (operation.kind === 'issuance_redirect' && operation.session.redirectUrl) {
      const authorizationUrl = normalizeIssuerContextUrl(operation.session.redirectUrl);
      const authResult = await this.launchAuthorization(authorizationUrl);

      if (authResult.type === 'success') {
        const callbackOperation = await walletProtocolService.handleUriOperation(
          authResult.url
        );
        return this.handleOperation(callbackOperation, navigation);
      }

      if (authResult.type === 'error') {
        return {
          type: 'error',
          message: authResult.message,
        };
      }

      return operation.protocolResult;
    }

    if (operation.kind === 'failure') {
      pendingIssuanceService.fail();
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
      const authorizationUrl = normalizeIssuerContextUrl(result.url);
      const authResult = await this.launchAuthorization(authorizationUrl);

      if (authResult.type === 'success') {
        const callbackResult = await walletProtocolService.handleUri(authResult.url);
        return this.handleResult(callbackResult, navigation);
      }

      if (authResult.type === 'error') {
        return {
          type: 'error',
          message: authResult.message,
        };
      }

      return result;
    }

    if (result.type === 'error') {
      Alert.alert('流程失败', result.message);
    }

    return result;
  }
}

export const protocolFlowService = new ProtocolFlowService();
