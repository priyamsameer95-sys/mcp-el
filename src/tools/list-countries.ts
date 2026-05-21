import { getCountries } from '../utils/data-loader.js';

export async function handleListCountries() {
  const countries = getCountries();
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(countries, null, 2),
    }],
  };
}
