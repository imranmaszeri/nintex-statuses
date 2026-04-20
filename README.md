# nintex-statuses

90-day uptime tracker for all 27 Nintex platform services, sourced directly from the [status.nintex.com](https://status.nintex.com) Status.io API.

## How it works

A GitHub Actions workflow runs daily at 05:00 UTC, fetching per-component 90-day uptime data from the Status.io API and committing the result to `data/nintex-uptime.json`. A second workflow deploys the `site/` directory to GitHub Pages.

Unlike Atom-feed-based trackers, Status.io exposes a structured per-component endpoint — no feed parsing or historical replay needed.

## Data source

- **API**: `https://status.nintex.com/pages/566925105401bb333d000014/status_chart/component/{id}/uptime`
- **Components**: 27 Nintex services
- **Coverage**: 90 days of daily status + incident data per component

## Status codes

| Code | Meaning | Impact |
|------|---------|--------|
| 100 | Operational | none |
| 200 | Maintenance | maintenance |
| 300 | Degraded Performance | minor |
| 400 | Partial Outage | minor |
| 500 | Major Outage | major |

## Structure

```
nintex-statuses/
├── .github/workflows/
│   ├── fetch.yaml      # Daily API fetch + commit
│   └── pages.yaml      # GitHub Pages deploy
├── scripts/
│   └── fetch_nintex_uptime.py
├── site/
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── data/
    └── nintex-uptime.json
```

## Local development

```bash
# Fetch fresh data
pip install requests
python scripts/fetch_nintex_uptime.py

# Serve locally (Python)
cd site && python -m http.server
# Then open http://localhost:8000 — note: adjust DATA_URL in app.js if needed
```

## GitHub Pages setup

1. Push this repo to GitHub
2. In repo Settings → Pages → Source: GitHub Actions
3. Enable Actions and trigger `fetch.yaml` manually to populate initial data
4. Push to `main` to trigger the Pages deploy
