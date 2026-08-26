const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Serve static frontend files from the 'dist' folder
app.use(express.static(path.join(__dirname, 'apps/web/dist')));

// Proxy /api requests to your backend on port 5000
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
}));

// For any other request, serve index.html (support client-side routing)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'apps/web/dist', 'index.html'));
});

const PORT = 5174;
app.listen(PORT, () => {
  console.log('Proxy server running on http://localhost:' + PORT);
  console.log('Proxying /api -> http://localhost:5000');
});