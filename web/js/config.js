export const APP_CONFIG = {
  USE_MOCK_DATA: true,
  FIREBASE: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: ''
  },
  POLICY: {
    jurisdiction: 'NG',
    storePolicy: 'store safety policy',
    disabledRequestTypes: ['escort'],
    parentalConsentRequiredRegions: ['NG', 'EU', 'UK', 'US']
  },
  PRIVACY: {
    policyUrl: 'https://example.com/privacy',
    childrenNoticeUrl: 'https://example.com/privacy/children',
    supportEmail: 'privacy@example.com'
  }
};
