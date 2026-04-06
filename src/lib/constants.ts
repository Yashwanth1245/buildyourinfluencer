export const TRY_PACK = {
  id: 'try_pack',
  name: 'Try Pack',
  price: 5,
  credits: 40,
  description: 'Try all features with 40 credits. One-time only.',
  features: [
    '40 High-Res Credits',
    'Full Feature Access',
    'Direct System Downloads',
    'No Commitment'
  ]
};

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 19,
    yearlyPrice: 19,
    totalYearlyPrice: 228,
    credits: 170,
    description: 'Perfect for individual creators',
    popular: false,
    features: [
      { text: '170 High-Res Credits', included: true },
      { text: 'Kling v2.6 Standard Motion', included: true },
      { text: 'Base Image Selection', included: true },
      { text: 'Direct System Downloads', included: true },
      { text: 'No Watermark', included: true },
      { text: 'Social Media Optimized (9:16)', included: true },
    ]
  },
  {
    id: 'professional',
    name: 'Pro ⭐',
    monthlyPrice: 39,
    yearlyPrice: 35,
    totalYearlyPrice: 421,
    credits: 400,
    description: 'Most popular for serious influencers',
    popular: true,
    features: [
      { text: '400 High-Res Credits', included: true },
      { text: 'Pro Motion Synthesis', included: true },
      { text: 'Audio Toggle Control', included: true },
      { text: 'Base Image Control', included: true },
      { text: 'Direct System Downloads', included: true },
      { text: 'Social Media Optimized (9:16)', included: true },
    ]
  },
  {
    id: 'business',
    name: 'Creator',
    monthlyPrice: 79,
    yearlyPrice: 71,
    totalYearlyPrice: 853,
    credits: 800,
    description: 'Ultimate studio-grade toolkit',
    popular: false,
    features: [
      { text: '800 High-Res Credits', included: true },
      { text: 'Custom Reference Support', included: true },
      { text: 'All Motion Templates', included: true },
      { text: 'Dedicated History Tracking', included: true },
      { text: 'Direct System Downloads', included: true },
      { text: 'Social Media Optimized (9:16)', included: true },
    ]
  }
];
