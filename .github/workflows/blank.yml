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

  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
  });

  console.log('First run: open this URL to authorize:');
  console.log(authUrl);
  process.exit(1);
}

async function generateBriefing() {
  const today = new Date().toLocaleDateString();
  return `
<h2>🎯 Swift AI Briefing — ${today}</h2>

<h3>📰 Latest AI Developments</h3>
<p>AI landscape updates coming soon...</p>

<h3>📊 Swift Growth (Mondays only)</h3>
<p>Platform metrics coming soon...</p>

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
