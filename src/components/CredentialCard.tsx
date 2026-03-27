import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, ShieldOff } from 'lucide-react-native';

import { VerifiableCredential } from '@/types';
import { getGradientColors } from '@/constants/colors';
import { getCredentialStatus } from '@/utils/credentialUtils';
import type { WalletDocument } from '@/wallet-core/facade';

interface CredentialCardProps {
  credential?: VerifiableCredential;
  document?: WalletDocument;
  showStatus?: boolean;
  width?: number;
}

// ISO 7810 ID-1 aspect ratio: 85.60mm × 53.98mm ≈ 1.586:1
const ASPECT_RATIO = 85.6 / 53.98;

export default function CredentialCard({
  credential,
  document,
  showStatus = false,
  width,
}: CredentialCardProps) {
  const resolvedCredential = document?.credential ?? credential;
  if (!resolvedCredential) {
    return null;
  }

  const [cardWidth, setCardWidth] = React.useState(width ?? 0);
  const cardHeight = cardWidth > 0 ? cardWidth / ASPECT_RATIO : 0;

  const gradientKey = document?.credential.visual?.gradientKey ?? resolvedCredential.visual?.gradientKey ?? 'eu';
  const [colorStart, colorEnd] = getGradientColors(gradientKey);
  const statusInfo = showStatus ? getCredentialStatus(resolvedCredential) : null;
  const isInactive = statusInfo?.isRevoked || statusInfo?.isExpired;

  function onLayout(e: LayoutChangeEvent) {
    if (!width) {
      setCardWidth(e.nativeEvent.layout.width);
    }
  }

  const shortId = resolvedCredential.id.replace('urn:uuid:', '').slice(0, 8).toUpperCase();

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.wrapper,
        { height: cardHeight > 0 ? cardHeight : undefined },
        isInactive && styles.wrapperInactive,
      ]}
    >
      <LinearGradient
        colors={[colorStart, colorEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.gradient]}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>EU DIGITAL WALLET</Text>
        <Globe color="rgba(255,255,255,0.7)" size={16} />
      </View>

      {/* Title */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {document?.title ?? resolvedCredential.visual?.title ?? resolvedCredential.type[resolvedCredential.type.length - 1]}
        </Text>
        {(document?.description ?? resolvedCredential.visual?.description) ? (
          <Text style={styles.description} numberOfLines={1}>
            {document?.description ?? resolvedCredential.visual?.description}
          </Text>
        ) : null}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.issuer} numberOfLines={1}>
          {document?.issuer.name ?? resolvedCredential.issuer.name}
        </Text>
        <Text style={styles.credId}>#{shortId}</Text>
      </View>

      {/* Status badge */}
      {showStatus && statusInfo && statusInfo.status !== 'active' ? (
        <View style={[styles.badge, getBadgeStyle(statusInfo.status)]}>
          <Text style={styles.badgeText}>{getBadgeLabel(statusInfo.status)}</Text>
        </View>
      ) : null}

      {/* Revoked stamp overlay */}
      {statusInfo?.isRevoked ? (
        <View style={styles.revokedOverlay}>
          <View style={styles.revokedStamp}>
            <ShieldOff color="#EF4444" size={20} />
            <Text style={styles.revokedText}>REVOKED</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function getBadgeStyle(status: string) {
  switch (status) {
    case 'revoked': return { backgroundColor: '#EF4444' };
    case 'expired': return { backgroundColor: '#EF4444' };
    case 'near_expiry': return { backgroundColor: '#F59E0B' };
    default: return { backgroundColor: '#10B981' };
  }
}

function getBadgeLabel(status: string) {
  switch (status) {
    case 'revoked': return 'REVOKED';
    case 'expired': return 'EXPIRED';
    case 'near_expiry': return 'EXPIRING SOON';
    default: return 'ACTIVE';
  }
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  wrapperInactive: {
    opacity: 0.6,
  },
  gradient: {
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  issuer: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  credId: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  revokedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  revokedStamp: {
    borderWidth: 2.5,
    borderColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    transform: [{ rotate: '-12deg' }],
  },
  revokedText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
