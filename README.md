<div align="center">

# ð£ Ralia for Promoters

### Turn your audience into income â accept offers, post, submit proof, get paid.

<br/>

![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)

![Port](https://img.shields.io/badge/dev_port-6400-E11D48?style=flat-square)

</div>

---

The **promoter** app is where creators and distributors earn. Sign up, get matched to campaigns
that fit your audience, accept an offer, post the creative, and submit a screenshot as proof.
Pay lands in your balance after an admin verifies it.

## ð§­ The promoter journey

```mermaid
flowchart LR
    S["ð§ Sign up<br/>email OTP"] --> O["ð§© Onboard<br/>channels + profile"]
    O --> M{{"ð¯ Matched to<br/>eligible campaigns"}}
    M --> A["â Accept offer"]
    A --> T["ðï¸ Post on each<br/>scheduled day"]
    T --> U["ð¸ Submit proof<br/>per day"]
    U --> V{"ð¡ï¸ Admin verifies"}
    V -->|approved| Pay["ð° Paid pro-rata"]
    V -->|rejected| A2["â©ï¸ Resubmit"]

    classDef pay fill:#dcfce7,stroke:#16a34a,color:#14532d;
    class Pay pay;
```

## ðï¸ Multi-day delivery timeline

A campaign can ask for several posts over a run window. Your assignment breaks into a **Day 1â¦N**
timeline â each day has its own deadline, its own status, and its own submit button. You're paid
**per approved day**.

```mermaid
flowchart LR
    D1["Day 1<br/>â approved"]:::ok --> D2["Day 2<br/>â approved"]:::ok --> D3["Day 3<br/>â³ due today"]:::now --> D4["Day 4<br/>â»ï¸ upcoming"]:::soon
    classDef ok fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef now fill:#fef9c3,stroke:#ca8a04,color:#713f12;
    classDef soon fill:#f1f5f9,stroke:#94a3b8,color:#334155;
```

> Deadlines you see are an **internal** buffer â always earlier than the client's real end date, so
> there's room to recover a missed day. Miss two days in a row and the remaining posts are
> reassigned to keep the campaign on track.

## ð Sign-up & verification

Verification is by **email OTP** â register, and a 6-digit code lands in your inbox. Your tracking
link (the one you share) routes through the API so your clicks count toward your pay.

## ð Quickstart

```bash
npm install
cp .env.example .env     # set API_ORIGIN (defaults to http://localhost:6100)
npm run dev              # http://localhost:6400
```

Seeded logins: `promoter1@ralia.test` â¦ `promoter40@ralia.test` Â· password `Password123!`

<details>
<summary><b>ð Environment</b></summary>

| Variable | Purpose |
|---|---|
| `API_ORIGIN` | The API origin the Next server proxies `/v1` + `/r` to |
| `NODE_ENV` | `production` in deploys |
</details>

<details>
<summary><b>ð ï¸ Scripts</b></summary>

| Script | Does |
|---|---|
| `dev` | dev server on :6400 |
| `build` | production build |
| `start:prod` | `node server.js` (only for a self-hosted Node host; Vercel builds natively) |
| `typecheck` | `tsc --noEmit` |
</details>

## ð¢ Deployment

Deploys to **Vercel** (native Next.js) — import the repo, set `API_ORIGIN` + `NEXT_PUBLIC_APP_ENV`, and Vercel builds each push. See `DEPLOY.md`.

---

<div align="center">
<sub>Part of Ralia Â· <a href="../ralia-api">API</a> Â· <a href="../ralia-client">Client</a> Â· <a href="../ralia-admin">Admin</a></sub>
</div>
