import { lookupPincode } from '../scoring/pincode-lookup.js';

export async function handleCheckPincode(args: { pincode: string }) {
  const result = lookupPincode(args.pincode);
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(result, null, 2),
    }],
  };
}
