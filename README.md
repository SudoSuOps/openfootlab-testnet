# OpenFootLab Testnet

The public OpenFootLab landing site for the Jupiter office and mobile service across Palm Beach and Martin counties. It includes the no-charge 15-Day FLO Foot Profile Builder, client and practice pathways, a FootLabOS/FLO overview, personalized manufacturing details, and a three-step contact flow.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Build production files with `npm run build`.

## Contact delivery

The contact flow posts to the Cloudflare Pages Function at `/api/contact`. Production requires `RESEND_API_KEY`, with optional `CONTACT_TO` and `CONTACT_FROM` environment variables. The form and endpoint explicitly restrict medical records, diagnoses, wound photos, and urgent concerns; this is a general contact flow, not a medical intake system.
