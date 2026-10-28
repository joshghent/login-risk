# login-risk

Spot suspicious logins in Node from the IP address alone. No API key, no network
call, no account.

```bash
npm install login-risk
```

```ts
import { scoreLogin } from 'login-risk';

const risk = scoreLogin(
  { ip: '5.62.56.1', at: new Date() }, // this login
  [{ ip: '81.2.69.142', at: twoHoursAgo }] // the same user's earlier logins
);

// {
//   score: 7,
//   codes: ['ip_address_not_used_before', 'new_login_location', 'impossible_travel_detected'],
//   country: 'US'
// }
```

That user signed in from the UK two hours ago and from Seattle now. Nobody flies
that fast.

## What it checks

| Code | When | Score |
| --- | --- | --- |
| `ip_address_not_used_before` | The user has not signed in from this IP before | 2 |
| `new_login_location` | The user has not signed in from this country before | 2 |
| `impossible_travel_detected` | Getting here from the last login needs more than 800 km/h | 3 |

A first login has nothing to compare with and scores 0. Hops under 200 km never
count as travel, because IP geolocation is not that precise.

You store the history. Keep the IP and time of each successful login per user, in
whatever table you already have, and pass the recent ones in.

## What to do with the score

Most apps do one of three things:

- **0 to 2:** let them in.
- **3 or 4:** let them in and email the user: "new sign-in from the US, was this
  you?"
- **5 or more:** ask for a second factor before you create the session.

## What it cannot see

This package knows where an IP is. It does not know what the IP is. It can't tell
you that an address is a Tor exit node, a commercial VPN, a residential proxy or a
botnet, or that the same password has just been tried against four thousand of
your other users. Those need lists that change hourly and a view across many
sites.

[LoginLlama](https://loginllama.app) is the hosted version. It uses the same codes
and scores, adds those signals and device fingerprints, keeps the history for you
and emails your users when something looks wrong. The free plan covers 1,000
checks a month, and there are SDKs for
[Node](https://www.npmjs.com/package/loginllama),
[Python](https://pypi.org/project/loginllama/),
PHP and [Better Auth](https://www.npmjs.com/package/better-auth-loginllama).

## Notes

- The location data comes from [geoip-lite](https://github.com/geoip-lite/node-geoip),
  which bundles the free MaxMind GeoLite database. It is about 100 MB on disk and
  goes stale; see its README for how to refresh it.
- Private and reserved addresses have no location. They still count as new IPs.
- Node 22.18 or newer.

## Licence

MIT
