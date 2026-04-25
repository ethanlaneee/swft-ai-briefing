#!/usr/bin/env node
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

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

async function fetchStockPrice(symbol) {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    const data = await response.json();
    if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result[0]) {
      const quote = data.quoteResponse.result[0];
      return {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChangePercent
      };
    }
    return null;
  } catch (err) {
    console.error(`Failed to fetch ${symbol}:`, err.message);
    return null;
  }
}

function getSignal(change) {
  if (change > 5) return 'SELL';
  if (change > 2) return 'HOLD';
  if (change > -2) return 'HOLD';
  if (change > -5) return 'BUY';
  return 'STRONG BUY';
}

async function fetchMarketData() {
  try {
    // Fetch your holdings
    const simoData = await fetchStockPrice('SIMO');
    const pngData = await fetchStockPrice('PNG.VN');
    
    // Fetch indices
    const sp500 = await fetchStockPrice('^GSPC');
    const nasdaq = await fetchStockPrice('^IXIC');
    const vix = await fetchStockPrice('^VIX');
    
    // Stock ideas (AI/tech focused)
    const ideas = ['NVDA', 'TSLA', 'META', 'AVGO', 'MSTR'];
    const ideaData = [];
    for (const symbol of ideas) {
      const data = await fetchStockPrice(symbol);
      if (data) {
        ideaData.push({
          symbol,
          price: data.price,
          change: data.change,
          signal: getSignal(data.change)
        });
      }
    }
    
    return {
      holdings: {
        SIMO: simoData ? { ...simoData, signal: getSignal(simoData.change) } : null,
        'PNG.VN': pngData ? { ...pngData, signal: getSignal(pngData.change) } : null
      },
      market: {
        sp500: sp500 || { price: 'N/A', change: 'N/A' },
        nasdaq: nasdaq || { price: 'N/A', change: 'N/A' },
        vix: vix || { price: 'N/A', change: 'N/A' }
      },
      ideas: ideaData
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
  if (market && market.holdings.SIMO && market.holdings['PNG.VN']) {
    marketHtml = `
<h3>💰 Market Snapshot</h3>
<p><strong>Your Holdings:</strong></p>
<ul>
  <li><strong>SIMO:</strong> $${market.holdings.SIMO.price.toFixed(2)} (${market.holdings.SIMO.change > 0 ? '+' : ''}${market.holdings.SIMO.change.toFixed(2)}%) — ${market.holdings.SIMO.signal}</li>
  <li><strong>PNG.VN:</strong> $${market.holdings['PNG.VN'].price.toFixed(2)} (${market.holdings['PNG.VN'].change > 0 ? '+' : ''}${market.holdings['PNG.VN'].change.toFixed(2)}%) — ${market.holdings['PNG.VN'].signal}</li>
</ul>
<p><strong>Market:</strong> S&P 500 ${market.market.sp500.change > 0 ? '+' : ''}${market.market.sp500.change.toFixed(2)}% | Nasdaq ${market.market.nasdaq.change > 0 ? '+' : ''}${market.market.nasdaq.change.toFixed(2)}% | VIX ${market.market.vix.change.toFixed(2)}%</p>
<p><strong>Top Watches:</strong> ${market.ideas.slice(0, 3).map(s => `${s.symbol} ${s.signal}`).join(' | ')}</p>
    `;
  } else {
    marketHtml = '<h3>💰 Market Snapshot</h3><p>Market data updating...</p>';
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
