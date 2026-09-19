'use strict';

module.exports = {
  config: {
    app_name: [process.env.NEW_RELIC_APP_NAME || 'notification-service'],
    license_key: process.env.NEW_RELIC_LICENSE_KEY || '',
    logging: {
      level: 'info'
    },
    application_logging: {
      forwarding: {
        enabled: true
      }
    },
    allow_all_headers: true
  }
};