import { getPincodes } from '../utils/data-loader.js';
import type { PincodeLookup } from '../types.js';

export function lookupPincode(pincode: string): PincodeLookup {
  const data = getPincodes();
  const pc = String(pincode).trim();
  const entry = data[pc];

  let state = 'Unknown';
  let city = 'Unknown';
  let tier = 3;
  let points = 80;

  if (entry) {
    state = entry.state;
    city = entry.district || 'Unknown';
    tier = entry.tier || 3;
  }

  // Assign points based on tier
  if (tier === 1) points = 100;
  else if (tier === 2) points = 90;
  else points = 80;

  // Determine blocked region based on state
  let blocked_region: string | null = null;
  const s = state.toLowerCase();
  
  if (s.includes('jammu') || s.includes('kashmir')) {
    blocked_region = 'J&K';
  } else if (
    ['arunachal pradesh', 'assam', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura'].some(ne => s.includes(ne))
  ) {
    blocked_region = 'North East India';
  } else if (s.includes('kerala')) {
    blocked_region = 'Kerala';
  }

  return {
    pincode: pc,
    city,
    state,
    tier,
    points,
    is_blocked: blocked_region !== null,
    blocked_region,
  };
}
