export interface Country {
  name: string
  code: string
}

export const COUNTRIES: Country[] = [
  { name: 'Argentina', code: 'AR' },
  { name: 'Australia', code: 'AU' },
  { name: 'Austria', code: 'AT' },
  { name: 'Belgium', code: 'BE' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Canada', code: 'CA' },
  { name: 'Chile', code: 'CL' },
  { name: 'China', code: 'CN' },
  { name: 'Colombia', code: 'CO' },
  { name: 'Croatia', code: 'HR' },
  { name: 'Czech Republic', code: 'CZ' },
  { name: 'Denmark', code: 'DK' },
  { name: 'Egypt', code: 'EG' },
  { name: 'Finland', code: 'FI' },
  { name: 'France', code: 'FR' },
  { name: 'Germany', code: 'DE' },
  { name: 'Ghana', code: 'GH' },
  { name: 'Greece', code: 'GR' },
  { name: 'Hong Kong', code: 'HK' },
  { name: 'Hungary', code: 'HU' },
  { name: 'India', code: 'IN' },
  { name: 'Indonesia', code: 'ID' },
  { name: 'Ireland', code: 'IE' },
  { name: 'Israel', code: 'IL' },
  { name: 'Italy', code: 'IT' },
  { name: 'Japan', code: 'JP' },
  { name: 'Jordan', code: 'JO' },
  { name: 'Kenya', code: 'KE' },
  { name: 'Malaysia', code: 'MY' },
  { name: 'Mexico', code: 'MX' },
  { name: 'Morocco', code: 'MA' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'New Zealand', code: 'NZ' },
  { name: 'Nigeria', code: 'NG' },
  { name: 'Norway', code: 'NO' },
  { name: 'Philippines', code: 'PH' },
  { name: 'Poland', code: 'PL' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Qatar', code: 'QA' },
  { name: 'Romania', code: 'RO' },
  { name: 'Russia', code: 'RU' },
  { name: 'Saudi Arabia', code: 'SA' },
  { name: 'Singapore', code: 'SG' },
  { name: 'South Africa', code: 'ZA' },
  { name: 'South Korea', code: 'KR' },
  { name: 'Spain', code: 'ES' },
  { name: 'Sweden', code: 'SE' },
  { name: 'Switzerland', code: 'CH' },
  { name: 'Taiwan', code: 'TW' },
  { name: 'Thailand', code: 'TH' },
  { name: 'Turkey', code: 'TR' },
  { name: 'UAE', code: 'AE' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'USA', code: 'US' },
  { name: 'Vietnam', code: 'VN' },
]

export function countryFlag(code: string): string {
  const offset = 127397
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join('')
}

export function countryFlagUrl(code: string): string {
  return `https://flagcdn.com/w160/${code.toLowerCase()}.png`
}

export function countryImageUrl(name: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(name)}/800/450`
}

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code)
}
