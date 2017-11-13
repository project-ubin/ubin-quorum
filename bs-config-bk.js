'use strict';
var fallback = require('connect-history-api-fallback');
var log = require('connect-logger');
var cors = require('cors');

module.exports = {
  server: {
    baseDir: ['./src', './build/contracts'],
    middleware: [
      log({format: '%date %status %method %url'}),
      cors(),
      fallback({
        index: '/index.html',
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
      })
    ]
  },
  cors: true,
  port: 8000
};
