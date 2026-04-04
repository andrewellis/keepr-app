'use client';

interface EngagementMessage {
  headline: string;
  subtext: string;
  priceComparisonIntro: string;
}

interface RetailerContext {
  detectedRetailer: string;
  messageVariant: 'amazon_screenshot' | 'competitor_screenshot' | 'generic';
}

interface Props {
  engagementMessage: EngagementMessage;
  retailerContext: RetailerContext;
}

const RETAILER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  amazon:    { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-900'  },
  walmart:   { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-900'    },
  target:    { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-900'     },
  bestbuy:   { bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-900'  },
  homedepot: { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-900'  },
  generic:   { bg: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-900'  },
};

export function RetailerEngagementBanner({ engagementMessage, retailerContext }: Props) {
  if (
    retailerContext.messageVariant === 'generic' &&
    !engagementMessage.headline.includes('💰')
  ) {
    return null;
  }

  const colors = RETAILER_COLORS[retailerContext.detectedRetailer] ?? RETAILER_COLORS.generic;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3 mb-4`}>
      <p className={`text-sm font-semibold ${colors.text}`}>
        {engagementMessage.headline}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {engagementMessage.subtext}
      </p>
    </div>
  );
}
