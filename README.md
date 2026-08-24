# Softboard

A personal digital softboard (cork board for the internet age): pin ideas, text
notes and photos anywhere on an infinite canvas — and send things to it from
your own WhatsApp. Message a bot and the note/photo lands on your board
automatically.

Built with Next.js (App Router) + Tailwind CSS. Data is stored locally in
`data/board.json` with uploaded images in `data/uploads/`.

## Features

- Sticky-note style pins: add text notes and photos
- Drag pins anywhere, double-click to edit, recolour or delete them
- Photos you send to your WhatsApp bot are downloaded and pinned automatically
  (captions included)
- The board polls every few seconds, so WhatsApp arrivals appear live

## Quick start (board only)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and start pinning.

## Sending pins from WhatsApp (Cloud API)

One-time setup:

1. **Create a Meta app** at https://developers.facebook.com → *My Apps* →
   *Create App* → use the **Business** type, then add the **WhatsApp** product.
2. **Get credentials**: in *WhatsApp → API Setup* you'll find:
   - a temporary **access token** (copy it)
   - a **test phone number** and its **Phone number ID**
3. **Add yourself as a recipient** on that same page: enter your own WhatsApp
   number and confirm the code WhatsApp sends you (test numbers can only talk
   to verified recipients).
4. **Expose your local server.** Meta must be able to reach your machine over
   HTTPS, so run a tunnel in a second terminal:
   ```bash
   npx ngrok http 3000        # or: cloudflared tunnel --url http://localhost:3000
   ```
   Keep this running while you use the WhatsApp feature.
5. **Configure the webhook**: in *WhatsApp → Configuration*, set
   - **Callback URL**: `https://<your-tunnel-domain>/api/webhook/whatsapp`
   - **Verify token**: any random string — put the *same* value in `.env.local`
   
   Click *Verify and save* (the app answers Meta's challenge), then under
   *Webhook fields* subscribe to **messages**.
6. **Fill in `.env.local`** (copy `.env.example`):
   ```
   WHATSAPP_ACCESS_TOKEN=EAAG...       # step 2 token
   WHATSAPP_PHONE_NUMBER_ID=123456789  # step 2 phone number ID
   WHATSAPP_VERIFY_TOKEN=my-random-string
   WHATSAPP_ALLOWED_FROM=919876543210  # optional: only accept your number
   ```
7. Restart `npm run dev`, then **send a WhatsApp message or photo from your
   phone to the test number** — within a few seconds it should appear pinned on
   your board at http://localhost:3000.

## Troubleshooting

- **Webhook "Verify and save" fails** → make sure the tunnel is running, the
  callback URL path is exactly `/api/webhook/whatsapp`, and the verify token
  matches `WHATSAPP_VERIFY_TOKEN` character-for-character.
- **Nothing arrives on the board** → check the `npm run dev` terminal for
  `[whatsapp-webhook]` errors; confirm you subscribed to the *messages*
  webhook field; confirm your number is added as a recipient.
- **Token stopped working after ~24h** → Meta's tokens from *API Setup* are
  temporary. For a long-lived one create a System User in Business Settings
  and generate a permanent token with `whatsapp_business_messaging` +
  `whatsapp_business_management` permissions.
- **Only my messages, please** → set `WHATSAPP_ALLOWED_FROM` to your number.

## Project layout

```
src/
  app/
    page.tsx                     renders the board
    api/pins/                    GET list · POST create · PATCH/DELETE by id
    api/upload/                  POST photo upload (multipart)
    api/media/[name]/            serves saved photos
    api/webhook/whatsapp/        GET verify · POST incoming messages
  components/Board.tsx           canvas UI (drag, edit, upload, polling)
  lib/store.ts                   JSON file storage + image helpers
data/
  board.json                     all pins
  uploads/                       photos
```
