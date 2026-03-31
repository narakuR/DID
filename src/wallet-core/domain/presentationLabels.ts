import type {
  PresentationSupport,
  WalletDocumentPresentationState,
} from './models';

export function getPresentationSupportLabel(support: PresentationSupport): string {
  switch (support) {
    case 'supported':
      return 'Supported';
    case 'planned':
      return 'Planned';
    case 'unsupported':
    default:
      return 'Unsupported';
  }
}

export function getPresentationStateLabel(
  state: WalletDocumentPresentationState
): string {
  switch (state) {
    case 'ready':
      return 'Ready to present';
    case 'missing_device_key':
      return 'Device key missing';
    case 'migration_required':
      return 'Migration required';
    case 'reissuance_required':
      return 'Reissuance required';
    default:
      return state;
  }
}
