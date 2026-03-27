import type { StoredPresentationRequest } from './types';

const pendingRequests = new Map<string, StoredPresentationRequest>();

export function createPresentationId(): string {
  return `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function savePresentationRequest(
  presentationId: string,
  request: StoredPresentationRequest
): void {
  pendingRequests.set(presentationId, request);
}

export function getPresentationRequest(
  presentationId: string
): StoredPresentationRequest | undefined {
  return pendingRequests.get(presentationId);
}

export function deletePresentationRequest(presentationId: string): void {
  pendingRequests.delete(presentationId);
}
