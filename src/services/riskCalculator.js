const geoip = require('geoip-lite');
const useragent = require('useragent');

const knownGoodUserAgents = ['Chrome', 'Firefox', 'Safari', 'Edge'];
const TOR_EXIT_NODE_IPS = []; 

function calculateRiskScore(req) {
  let score = 0;

  const ip = req.ip;
  const userAgentString = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const fingerprint = req.headers['x-device-fingerprint'] || '';
  const geo = geoip.lookup(ip);
  const agent = useragent.parse(userAgentString);

  // 1. Geolocation Risk
  if (!geo || !geo.country) {
    score += 25; // Unknown location
  } else if (['CN', 'RU', 'KP', 'IR'].includes(geo.country)) {
    score += 30; // High-risk countries (example only)
  }

  // 2. TOR Exit Node Check
  if (TOR_EXIT_NODE_IPS.includes(ip)) {
    score += 50;
  }

  // 3. Suspicious User Agent
  if (!knownGoodUserAgents.some(ua => agent.family.includes(ua))) {
    score += 20;
  }

  // 4. Missing Device Fingerprint
  if (!fingerprint || fingerprint.length < 10) {
    score += 10;
  }

  // 5. Accept-Language header missing or weird
  if (!acceptLanguage || !/^[a-z]{2}(-[A-Z]{2})?$/.test(acceptLanguage.split(',')[0])) {
    score += 5;
  }

  // 6. Brute-force hint (too many attempts)
  // You might integrate Redis or DB here to add dynamic scoring

  // Normalize to 0 - 100
  return Math.min(score, 100);
}

module.exports = {
  calculateRiskScore
};
