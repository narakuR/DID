export const CREDENTIALS_CONFIG = {
  defaultTestCredential:
    process.env.EXPO_PUBLIC_DEFAULT_TEST_CREDENTIAL || 'ehic_sd_jwt_vc',
  ehic: {
    enabled: (process.env.EXPO_PUBLIC_EHIC_ENABLED || 'true') === 'true',
    credentialConfigurationId:
      process.env.EXPO_PUBLIC_EHIC_CREDENTIAL_CONFIGURATION_ID ||
      'urn:eudi:ehic:1:dc+sd-jwt-compact',
    scope:
      process.env.EXPO_PUBLIC_EHIC_SCOPE || 'urn:eudi:ehic:1:dc+sd-jwt',
    vct: process.env.EXPO_PUBLIC_EHIC_VCT || 'urn:eudi:ehic:1',
    label: 'EHIC SD-JWT VC',
  },
  pid: {
    enabled: (process.env.EXPO_PUBLIC_PID_ENABLED || 'true') === 'true',
    credentialConfigurationId:
      process.env.EXPO_PUBLIC_PID_CREDENTIAL_CONFIGURATION_ID ||
      'eu.europa.ec.eudi.pid_vc_sd_jwt',
    scope:
      process.env.EXPO_PUBLIC_PID_SCOPE || 'eu.europa.ec.eudi.pid_vc_sd_jwt',
    vct: process.env.EXPO_PUBLIC_PID_VCT || 'urn:eudi:pid:1',
    label: 'PID SD-JWT VC',
  },
} as const;
