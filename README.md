# nintex-statuses

90-day uptime tracker for all 27 Nintex platform services, sourced from the public [status.nintex.com](https://status.nintex.com) Status.io page and its JSON API.

## How it works

A GitHub Actions workflow runs daily at 05:00 UTC:

1. Fetches current status + active incidents from the Status.io JSON API (`/1.0/status/{page_id}`)
2. Scrapes the public history page to discover all historical incident IDs
3. Fetches each incident's detail page to extract affected components, timeline (dates, status codes, states), and details
4. Computes 90-day daily status per component by merging incident timeline segments
5. Writes the result to `data/nintex-uptime.json` and auto-commits

A second workflow deploys the `site/` directory to GitHub Pages.

## Data sources

- **JSON API**: `https://status.nintex.com/1.0/status/566925105401bb333d000014` — current overall status, component list, and active incidents (with full timeline and affected components)
- **History page**: `https://status.nintex.com/pages/history/566925105401bb333d000014` — scraped for incident IDs (parsed with BeautifulSoup)
- **Incident detail pages**: `https://status.nintex.com/pages/incident/566925105401bb333d000014/{incident_id}` — scraped for affected components and timeline entries

Component uptime is computed from incident data: for each incident, non-operational (status &ge; 300) timeline segments are assigned to affected components. Daily status is the worst status code across all incidents affecting that component on that day.

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
│   ├── fetch.yaml      # Daily fetch + commit
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
# Install dependencies
pip install -r requirements.txt

# Fetch fresh data
python scripts/fetch_nintex_uptime.py

# Serve locally
cd site && python -m http.server
# Then open http://localhost:8000
```

## GitHub Pages setup

1. Push this repo to GitHub
2. In repo Settings → Pages → Source: GitHub Actions
3. Trigger `fetch.yaml` manually to populate initial data
4. Push to `main` to trigger the Pages deploy
