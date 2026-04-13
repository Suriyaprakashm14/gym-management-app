// Address master data — country_code / state_code / city_code structure
// label = names.en, value = code  (what gets stored in DB)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CountryData {
  country_code: string;
  names: { en: string };
  is_active: boolean;
}

export interface StateData {
  country_code: string;
  state_code: string;
  names: { en: string };
  is_active: boolean;
}

export interface CityData {
  country_code: string;
  state_code: string;
  city_code: string;
  names: { en: string };
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Country master data
// ---------------------------------------------------------------------------

export const countryMasterData: CountryData[] = [
  { country_code: 'IN', names: { en: 'India' }, is_active: true },
  { country_code: 'US', names: { en: 'United States' }, is_active: true },
  { country_code: 'GB', names: { en: 'United Kingdom' }, is_active: true },
];

// ---------------------------------------------------------------------------
// State master data — Indian states and UTs
// ---------------------------------------------------------------------------

export const stateMasterData: StateData[] = [
  { country_code: 'IN', state_code: 'AP', names: { en: 'Andhra Pradesh' }, is_active: true },
  { country_code: 'IN', state_code: 'AR', names: { en: 'Arunachal Pradesh' }, is_active: true },
  { country_code: 'IN', state_code: 'AS', names: { en: 'Assam' }, is_active: true },
  { country_code: 'IN', state_code: 'BR', names: { en: 'Bihar' }, is_active: true },
  { country_code: 'IN', state_code: 'CT', names: { en: 'Chhattisgarh' }, is_active: true },
  { country_code: 'IN', state_code: 'GA', names: { en: 'Goa' }, is_active: true },
  { country_code: 'IN', state_code: 'GJ', names: { en: 'Gujarat' }, is_active: true },
  { country_code: 'IN', state_code: 'HR', names: { en: 'Haryana' }, is_active: true },
  { country_code: 'IN', state_code: 'HP', names: { en: 'Himachal Pradesh' }, is_active: true },
  { country_code: 'IN', state_code: 'JH', names: { en: 'Jharkhand' }, is_active: true },
  { country_code: 'IN', state_code: 'KA', names: { en: 'Karnataka' }, is_active: true },
  { country_code: 'IN', state_code: 'KL', names: { en: 'Kerala' }, is_active: true },
  { country_code: 'IN', state_code: 'MP', names: { en: 'Madhya Pradesh' }, is_active: true },
  { country_code: 'IN', state_code: 'MH', names: { en: 'Maharashtra' }, is_active: true },
  { country_code: 'IN', state_code: 'MN', names: { en: 'Manipur' }, is_active: true },
  { country_code: 'IN', state_code: 'ML', names: { en: 'Meghalaya' }, is_active: true },
  { country_code: 'IN', state_code: 'MZ', names: { en: 'Mizoram' }, is_active: true },
  { country_code: 'IN', state_code: 'NL', names: { en: 'Nagaland' }, is_active: true },
  { country_code: 'IN', state_code: 'OR', names: { en: 'Odisha' }, is_active: true },
  { country_code: 'IN', state_code: 'PB', names: { en: 'Punjab' }, is_active: true },
  { country_code: 'IN', state_code: 'RJ', names: { en: 'Rajasthan' }, is_active: true },
  { country_code: 'IN', state_code: 'SK', names: { en: 'Sikkim' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', names: { en: 'Tamil Nadu' }, is_active: true },
  { country_code: 'IN', state_code: 'TS', names: { en: 'Telangana' }, is_active: true },
  { country_code: 'IN', state_code: 'TR', names: { en: 'Tripura' }, is_active: true },
  { country_code: 'IN', state_code: 'UP', names: { en: 'Uttar Pradesh' }, is_active: true },
  { country_code: 'IN', state_code: 'UK', names: { en: 'Uttarakhand' }, is_active: true },
  { country_code: 'IN', state_code: 'WB', names: { en: 'West Bengal' }, is_active: true },
  // Union Territories
  { country_code: 'IN', state_code: 'AN', names: { en: 'Andaman and Nicobar Islands' }, is_active: true },
  { country_code: 'IN', state_code: 'CH', names: { en: 'Chandigarh' }, is_active: true },
  { country_code: 'IN', state_code: 'DN', names: { en: 'Dadra and Nagar Haveli and Daman and Diu' }, is_active: true },
  { country_code: 'IN', state_code: 'DL', names: { en: 'Delhi' }, is_active: true },
  { country_code: 'IN', state_code: 'JK', names: { en: 'Jammu and Kashmir' }, is_active: true },
  { country_code: 'IN', state_code: 'LA', names: { en: 'Ladakh' }, is_active: true },
  { country_code: 'IN', state_code: 'LD', names: { en: 'Lakshadweep' }, is_active: true },
  { country_code: 'IN', state_code: 'PY', names: { en: 'Puducherry' }, is_active: true },
];

// ---------------------------------------------------------------------------
// City master data — Tamil Nadu cities
// ---------------------------------------------------------------------------

export const cityMasterData: CityData[] = [
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_CHN', names: { en: 'Chennai' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_CBE', names: { en: 'Coimbatore' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_MDU', names: { en: 'Madurai' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TRY', names: { en: 'Tiruchirappalli' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_SLM', names: { en: 'Salem' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TUP', names: { en: 'Tiruppur' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TNJ', names: { en: 'Thanjavur' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_VLR', names: { en: 'Vellore' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_ERD', names: { en: 'Erode' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_DGL', names: { en: 'Dindigul' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TVL', names: { en: 'Tirunelveli' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TUT', names: { en: 'Thoothukudi' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_NGL', names: { en: 'Nagercoil' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_KUM', names: { en: 'Kumbakonam' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_CUD', names: { en: 'Cuddalore' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_KAR', names: { en: 'Karur' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_NAM', names: { en: 'Namakkal' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_RMM', names: { en: 'Ramanathapuram' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_SIV', names: { en: 'Sivakasi' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_PDY', names: { en: 'Pudukkottai' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_DHR', names: { en: 'Dharmapuri' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_KRI', names: { en: 'Krishnagiri' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_VNR', names: { en: 'Virudhunagar' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TNK', names: { en: 'Tenkasi' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_ARI', names: { en: 'Ariyalur' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_MAY', names: { en: 'Mayiladuthurai' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TVR', names: { en: 'Tiruvarur' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_KAN', names: { en: 'Kanchipuram' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_CHG', names: { en: 'Chengalpattu' }, is_active: true },
  { country_code: 'IN', state_code: 'TN', city_code: 'TN_TPT', names: { en: 'Tirupattur' }, is_active: true },
];

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_COUNTRY_CODE = 'IN';
export const DEFAULT_STATE_CODE = 'TN';
export const DEFAULT_CITY_CODE = 'TN_TNJ'; // Thanjavur

// ---------------------------------------------------------------------------
// Option getters  —  label = English name, value = code
// ---------------------------------------------------------------------------

export const getCountryOptions = () =>
  countryMasterData
    .filter((c) => c.is_active)
    .map((c) => ({ label: c.names.en, value: c.country_code }));

/** Returns state options filtered by country_code. */
export const getStateOptions = (countryCode?: string) =>
  stateMasterData
    .filter((s) => s.is_active && (!countryCode || s.country_code === countryCode))
    .map((s) => ({ label: s.names.en, value: s.state_code }));

/** Returns city options filtered by state_code. */
export const getCityOptions = (stateCode?: string) =>
  cityMasterData
    .filter((c) => c.is_active && (!stateCode || c.state_code === stateCode))
    .map((c) => ({ label: c.names.en, value: c.city_code }));

/** True when we have dropdown city data for this state_code. */
export const hasCityOptions = (stateCode?: string): boolean =>
  !!stateCode && cityMasterData.some((c) => c.is_active && c.state_code === stateCode);

/** Resolve a city_code back to its English name (for display in the table). */
export const getCityName = (cityCode?: string): string => {
  if (!cityCode) return '';
  const city = cityMasterData.find((c) => c.city_code === cityCode);
  return city ? city.names.en : cityCode;
};

/** Resolve a state_code back to its English name. */
export const getStateName = (stateCode?: string): string => {
  if (!stateCode) return '';
  const state = stateMasterData.find((s) => s.state_code === stateCode);
  return state ? state.names.en : stateCode;
};

/** Resolve a country_code back to its English name. */
export const getCountryName = (countryCode?: string): string => {
  if (!countryCode) return '';
  const country = countryMasterData.find((c) => c.country_code === countryCode);
  return country ? country.names.en : countryCode;
};
