import { APP_CONFIG } from './config.js';

export const AGE_CATEGORIES = {
  UNDER_13: 'under_13',
  TEEN: 'teen',
  ADULT: 'adult',
  UNKNOWN: 'unknown'
};

export function getAgeCategory(age) {
  const value = Number(age);
  if (!Number.isFinite(value) || value < 0) return AGE_CATEGORIES.UNKNOWN;
  if (value < 13) return AGE_CATEGORIES.UNDER_13;
  if (value < 18) return AGE_CATEGORIES.TEEN;
  return AGE_CATEGORIES.ADULT;
}

export function getPolicyContext(overrides = {}) {
  return {
    jurisdiction: overrides.jurisdiction || APP_CONFIG.POLICY.jurisdiction,
    storePolicy: overrides.storePolicy || APP_CONFIG.POLICY.storePolicy,
    disabledRequestTypes: overrides.disabledRequestTypes || APP_CONFIG.POLICY.disabledRequestTypes,
    parentalConsentRequiredRegions:
      overrides.parentalConsentRequiredRegions || APP_CONFIG.POLICY.parentalConsentRequiredRegions
  };
}

export function isRequestTypeAllowed(type, policyContext = getPolicyContext()) {
  return !policyContext.disabledRequestTypes.includes(type);
}

export function requiresParentalConsent(ageCategory, policyContext = getPolicyContext()) {
  return (
    ageCategory === AGE_CATEGORIES.UNDER_13 &&
    policyContext.parentalConsentRequiredRegions.includes(policyContext.jurisdiction)
  );
}

export function getRestrictionNotice(policyContext = getPolicyContext()) {
  if (!policyContext.disabledRequestTypes.length) return null;
  return `Some request types are unavailable in ${policyContext.jurisdiction} due to ${policyContext.storePolicy}.`;
}
