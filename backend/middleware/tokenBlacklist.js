// /middleware/tokenBlacklist.js

const blacklist = new Set();
function add(token) {
  console.log('Adding to blacklist:', token);
  blacklist.add(token);
}

function has(token) {
  const isBlacklisted = blacklist.has(token);
  console.log('Checking blacklist for token:', token, '=>', isBlacklisted);
  return isBlacklisted;
}


module.exports = { add, has };
