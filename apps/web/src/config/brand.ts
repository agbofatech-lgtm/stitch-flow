export const BRAND = {
  productName: 'StitchFlow',
  parentName: 'AGBOFA Technology Ltd',
  tagline: 'Tailoring Business Platform',
  version: '1.0.0',

  colors: {
    primary: '#0F6E8C',
    primaryDark: '#0C5C74',
    charcoal: '#1E2933',
    white: '#FFFFFF',
    background: '#F8FBFC',
    surface: '#FFFFFF',
    border: '#D9E5EA',
    mutedText: '#64748B',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },

  typography: {
    primary: 'Inter',
    alternatives: ['Space Grotesk', 'Satoshi'],
  },

  logo: {
    primaryDescription: 'StitchFlow primary logo with subtitle',
    compactDescription: 'StitchFlow wordmark',
    symbolDescription: 'Needle forming an S',
  },

  assets: {
    agbofaLogo: '/src/assets/agbofa-logo.png',
    logoPrimary: '/src/assets/stitchflow-logo.png',
    logoDark: '/src/assets/stitchflow-dark-logo.png',
    symbol: '/src/assets/stitchflow-symbol.svg',
    favicon16: '/src/assets/stitchflow-favicon-16.png',
    favicon32: '/src/assets/stitchflow-favicon-32.png',
    favicon48: '/src/assets/stitchflow-favicon-48.png',
    favicon64: '/src/assets/stitchflow-favicon-64.png',
  },

  company: {
    legalName: 'Agbofa Technologies Ltd',
    supportEmail: 'support@agbofa.com',
    supportPhone: '+233 000 000 000',
    country: 'Ghana',
  },

  footerText: 'Built by Agbofa Technologies Ltd',
} as const;

export type BrandConfig = typeof BRAND;
