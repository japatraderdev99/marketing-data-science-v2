export interface AdFormat {
  id: string;
  label: string;
  channel: string;
  channelHex: string;
  width: number;
  height: number;
  ratio: string;
}

export const AD_FORMATS: AdFormat[] = [
  { id: 'ig-feed',    label: 'Feed',          channel: 'Instagram',      channelHex: '#E1306C', width: 1080, height: 1080, ratio: '1:1'    },
  { id: 'ig-stories', label: 'Stories/Reels', channel: 'Instagram',      channelHex: '#E1306C', width: 1080, height: 1920, ratio: '9:16'   },
  { id: 'fb-feed',    label: 'Feed',          channel: 'Facebook',       channelHex: '#1877F2', width: 1080, height: 1350, ratio: '4:5'    },
  { id: 'fb-stories', label: 'Stories',       channel: 'Facebook',       channelHex: '#1877F2', width: 1080, height: 1920, ratio: '9:16'   },
  { id: 'linkedin',   label: 'LinkedIn',      channel: 'LinkedIn',       channelHex: '#0A66C2', width: 1200, height: 628,  ratio: '1.91:1' },
  { id: 'pinterest',  label: 'Pinterest',     channel: 'Pinterest',      channelHex: '#E60023', width: 1000, height: 1500, ratio: '2:3'    },
  { id: 'twitter',    label: 'Twitter / X',   channel: 'Twitter',        channelHex: '#000000', width: 1200, height: 675,  ratio: '16:9'   },
  { id: 'gdn-rect',   label: '300×250',       channel: 'Google Display', channelHex: '#4285F4', width: 300,  height: 250,  ratio: '6:5'    },
  { id: 'gdn-lead',   label: '728×90',        channel: 'Google Display', channelHex: '#4285F4', width: 728,  height: 90,   ratio: '8:1'    },
];

/** Returns display width/height to fit a format inside a max container */
export function scaleFormat(format: AdFormat, maxW: number, maxH: number): { w: number; h: number } {
  const sw = maxW / format.width;
  const sh = maxH / format.height;
  const s = Math.min(sw, sh);
  return { w: Math.round(format.width * s), h: Math.round(format.height * s) };
}
