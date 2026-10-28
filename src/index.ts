import geoip from 'geoip-lite';

export type RiskCode =
  | 'ip_address_not_used_before'
  | 'new_login_location'
  | 'impossible_travel_detected';

export type Login = { ip: string; at: Date };

export type LoginRisk = {
  /** 0 to 7. The same weights the LoginLlama API gives these three codes. */
  score: number;
  codes: RiskCode[];
  /** ISO country code of the login, when the IP has one. */
  country?: string;
};

const WEIGHTS: Record<RiskCode, number> = {
  ip_address_not_used_before: 2,
  new_login_location: 2,
  impossible_travel_detected: 3
};

// Faster than an airliner. Below the noise floor of IP geolocation, any speed
// is possible, so short hops never count.
const MAX_SPEED_KMH = 800;
const MIN_DISTANCE_KM = 200;

const locate = (ip: string) => geoip.lookup(ip) ?? undefined;

function distanceKm([lat1, lon1]: number[], [lat2, lon2]: number[]) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Scores a login against the same user's earlier logins, offline, from the IP
 * address alone. A first login has nothing to compare against and scores 0.
 */
export function scoreLogin(login: Login, history: Login[]): LoginRisk {
  const here = locate(login.ip);
  const codes: RiskCode[] = [];

  if (history.length) {
    if (!history.some((past) => past.ip === login.ip)) {
      codes.push('ip_address_not_used_before');
    }

    const countries = history.map((past) => locate(past.ip)?.country);
    if (here && !countries.includes(here.country)) {
      codes.push('new_login_location');
    }

    const last = history.reduce((a, b) => (a.at > b.at ? a : b));
    const there = locate(last.ip);
    const hours = (login.at.getTime() - last.at.getTime()) / 3_600_000;
    if (here && there && hours > 0) {
      const km = distanceKm(there.ll, here.ll);
      if (km >= MIN_DISTANCE_KM && km / hours > MAX_SPEED_KMH) {
        codes.push('impossible_travel_detected');
      }
    }
  }

  return {
    score: codes.reduce((sum, code) => sum + WEIGHTS[code], 0),
    codes,
    country: here?.country
  };
}
