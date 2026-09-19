export const logger = {
  info: (msg, meta = {}) => console.log(`[INFO] ${msg}`, Object.keys(meta).length ? meta : ''),
  error: (msg, meta = {}) => console.error(`[ERROR] ${msg}`, Object.keys(meta).length ? meta : '')
};