// Quick test to see what's deployed on Railway
const express = require('express');
const app = express();

app.get('/test-deployment', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'not set',
    hasShopifyToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
    hasShopifyDomain: !!process.env.SHOPIFY_STORE_DOMAIN,
    version: 'v2.0-with-discount-functionality'
  });
});

module.exports = app;