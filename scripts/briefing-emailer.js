#!/usr/bin/env node
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '../config/gmail-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-oauth-credentials.json');

async function getAuthClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    auth.setCredentials(token);
    return auth;
  }

  // First auth - get token
  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  console.log('First run: open this URL to authorize:');
  console.log(authUrl);
  process.exit(1);
}

async function fetchMarketData() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Placeholder market data - in production would hit Yahoo Finance API
    return {
      holdings: {
        SIMO: { price: 145.32, change: 2.3, signal: 'HOLD' },
        'PNG.VN': { price: 89.50, change: -1.2, signal: 'BUY' }
      },
      market: {
        sp500: { price: 5234.42, change: 1.1 },
        nasdaq: { price: 16845.20, change: 2.3 },
        vix: { price: 14.2, change: -5.1 }
      },
      ideas: [
        { symbol: 'NVDA', reason: 'AI chip leader, strong growth' },
        { symbol: 'TSLA', reason: 'EV + AI integration momentum' },
        { symbol: 'META', reason: 'Llama AI expansion + ads recovery' },
        { symbol: 'AVGO', reason: 'Broadcom chip supply play' },
        { symbol: 'MSTR', reason: 'Bitcoin proxy, risk/reward' }
      ]
    };
  } catch (err) {
    console.error('Market data fetch failed:', err.message);
    return null;
  }
}

async function generateBriefing() {
  const today = new Date().toLocaleDateString();
  const dayOfWeek = new Date().getDay();
  const isMonday = dayOfWeek === 1;
  
  const market = await fetchMarketData();
  
  let marketHtml = '';
  if (market) {
    marketHtml = `
<h3>💰 Market Snapshot</h3>
<p><strong>Your Holdings:</strong></p>
<ul>
  <li><strong>SIMO:</strong> $${market.holdings.SIMO.price} (${market.holdings.SIMO.change > 0 ? '+' : ''}${market.holdings.SIMO.change}%) — ${market.holdings.SIMO.signal}</li>
  <li><strong>PNG.VN:</strong> $${market.holdings['PNG.VN'].price} (${market.holdings['PNG.VN'].change > 0 ? '+' : ''}${market.holdings['PNG.VN'].change}%) — ${market.holdings['PNG.VN'].signal}</li>
</ul>
<p><strong>Market:</strong> S&P 500 ${market.market.sp500.change > 0 ? '+' : ''}${market.market.sp500.change}% | Nasdaq ${market.market.nasdaq.change > 0 ? '+' : ''}${market.market.nasdaq.change}% | VIX ${market.market.vix.change}%</p>
<p><strong>Watch These:</strong> ${market.ideas.map(s => s.symbol).join(', ')}</p>
    `;
  }

  return `
<h2>🎯 Swift Daily Briefing — ${today}</h2>

<h3>📰 Latest AI Developments</h3>
<p>AI landscape updates coming soon...</p>

${isMonday ? '<h3>📊 Swift Growth</h3><p>Platform metrics coming soon...</p>' : ''}

${marketHtml}

<p>— Swift AI Assistant</p>
  `;
}

async function sendBriefing(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const html = await generateBriefing();

  const message = [
    'To: ethan@goswft.com',
    'Subject: Daily AI Briefing',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    console.log('✅ Briefing sent to ethan@goswft.com');
  } catch (error) {
    console.error('❌ Error sending:', error.message);
    process.exit(1);
  }
}

(async () => {
  const auth = await getAuthClient();
  await sendBriefing(auth);
})();
