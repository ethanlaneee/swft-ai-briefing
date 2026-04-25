name: Daily AI Briefing

on:
  schedule:
    - cron: '0 15 * * *'
  workflow_dispatch:

jobs:
  briefing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install googleapis nodemailer
      - name: Create config
        run: |
          mkdir -p config
          echo '${{ secrets.GMAIL_CREDS }}' > config/google-oauth-credentials.json
          echo '${{ secrets.GMAIL_TOKEN }}' > config/gmail-token.json
      - run: node scripts/briefing-emailer.js
