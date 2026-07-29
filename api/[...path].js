// Vercel serverless entry: all /api/* requests are handled by the shared request handler.
// Static files (index.html, app.js, styles.css, logo) are served directly from /public by Vercel.
module.exports = require('../server.js').handler;
