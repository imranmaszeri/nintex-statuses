import json
import time
import requests
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

PAGE_ID = "566925105401bb333d000014"
BASE = "https://status.nintex.com"
DAYS = 90

STATUS_TEXT_TO_CODE = {
    "Operational": 100,
    "Under Maintenance": 200,
    "Degraded Performance": 300,
    "Partial Service Disruption": 400,
    "Major Service Disruption": 500,
    "Service Disruption": 500,
}

STATE_CODES = {100: "INVESTIGATING", 200: "IDENTIFIED", 300: "MONITORING", 400: "RESOLVED"}


def normalise_component_name(name):
    if not name:
        return ""
    return " ".join(str(name).split()).strip().lower()


def push_sample(items, value, max_items=10):
    if value and value not in items and len(items) < max_items:
        items.append(value)


def make_diagnostics():
    return {
        "schema_version": 1,
        "incident_processing": {
            "total_incidents": 0,
            "matched_incidents": 0,
            "skipped_no_components": 0,
            "skipped_unmatched_components": 0,
            "skipped_no_timeline": 0,
            "samples": {
                "matched": [],
                "skipped_no_components": [],
                "skipped_unmatched_components": [],
                "skipped_no_timeline": [],
            },
        },
        "scrape_warnings": [],
        "unknown_status_texts": [],
    }


def parse_incident_datetime(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        pass
    for fmt in ("%B %d, %Y %I:%M%p UTC", "%B %d, %Y %I:%M %p UTC"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def fetch_incident_detail(incident_id, diagnostics=None):
    url = f"{BASE}/pages/incident/{PAGE_ID}/{incident_id}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    title_el = soup.select_one(".panel-title h5.white") or soup.select_one(".panel-title h5")
    title = ""
    if title_el:
        status_span = title_el.find("span", class_="incident_status_description")
        if status_span:
            status_span.decompose()
        title = title_el.get_text(" ", strip=True)

    components_affected = []
    locations_affected = []
    for row in soup.select("#statusio_incident .row"):
        label_el = row.select_one(".event_inner_title")
        text_el = row.select_one(".event_inner_text")
        if not label_el or not text_el:
            continue
        label = label_el.get_text(strip=True)
        value = text_el.get_text(strip=True)
        if label == "Components":
            components_affected = [c.strip() for c in value.split(",") if c.strip()]
        elif label == "Locations":
            locations_affected = [l.strip() for l in value.split(",") if l.strip()]

    timeline = []
    for time_el in soup.select(".incident_time"):
        dt = parse_incident_datetime(time_el.get_text(strip=True))

        row_parent = time_el.find_parent(class_="row")
        if not row_parent:
            continue

        status_text = "Operational"
        status_code = 100
        state_text = "Unknown"

        status_el = row_parent.select_one(".incident_update_status strong")
        if status_el:
            span = status_el.find("span")
            if span and span.get("data-original-title"):
                status_text = span["data-original-title"]
                status_code = STATUS_TEXT_TO_CODE.get(status_text, 100)
                if diagnostics is not None and status_text not in STATUS_TEXT_TO_CODE:
                    push_sample(diagnostics["unknown_status_texts"], status_text)
            full_text = status_el.get_text(" ", strip=True)
            if span:
                full_text = full_text.replace(span.get_text("", strip=True), "", 1)
            state_text = full_text.strip().split("\n")[0].strip()

        details_el = row_parent.select_one(".incident_message_details")
        details = details_el.get_text(" ", strip=True) if details_el else ""

        timeline.append({
            "datetime": dt.isoformat() if dt else time_el.get_text(strip=True),
            "status_text": status_text,
            "status_code": status_code,
            "state": state_text,
            "details": details,
        })

    if diagnostics is not None:
        if not components_affected:
            diagnostics["scrape_warnings"].append({
                "incident_id": incident_id,
                "type": "missing_components",
                "url": f"{BASE}/pages/incident/{PAGE_ID}/{incident_id}",
            })
        if not timeline:
            diagnostics["scrape_warnings"].append({
                "incident_id": incident_id,
                "type": "missing_timeline",
                "url": f"{BASE}/pages/incident/{PAGE_ID}/{incident_id}",
            })

    return {
        "id": incident_id,
        "title": title,
        "url": f"{BASE}/pages/incident/{PAGE_ID}/{incident_id}",
        "components": components_affected,
        "locations": locations_affected,
        "timeline": timeline,
    }


def fetch_maintenance_detail(maintenance_id, diagnostics=None):
    url = f"{BASE}/pages/maintenance/{PAGE_ID}/{maintenance_id}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    title_el = soup.select_one(".panel-title h5.white") or soup.select_one(".panel-title h5")
    title = ""
    if title_el:
        for status_span in title_el.select("span"):
            status_span.decompose()
        title = title_el.get_text(" ", strip=True)

    components_affected = []
    locations_affected = []
    for row in soup.select("#statusio_incident .row"):
        label_el = row.select_one(".event_inner_title")
        text_el = row.select_one(".event_inner_text")
        if not label_el or not text_el:
            continue
        label = label_el.get_text(strip=True)
        value = text_el.get_text(strip=True)
        if label == "Components":
            components_affected = [c.strip() for c in value.split(",") if c.strip()]
        elif label == "Locations":
            locations_affected = [l.strip() for l in value.split(",") if l.strip()]

    timeline = []
    for time_el in soup.select(".incident_time, .maintenance_time"):
        dt = parse_incident_datetime(time_el.get_text(strip=True))
        row_parent = time_el.find_parent(class_="row")
        if not row_parent:
            continue

        state_text = "UPDATE"
        status_el = row_parent.select_one(".incident_update_status strong")
        if status_el:
            full_text = status_el.get_text(" ", strip=True)
            state_text = full_text.strip().split("\n")[0].strip() or "UPDATE"

        details_el = row_parent.select_one(".incident_message_details")
        details = details_el.get_text(" ", strip=True) if details_el else ""

        timeline.append({
            "datetime": dt.isoformat() if dt else time_el.get_text(strip=True),
            "status_text": "Under Maintenance",
            "status_code": 200,
            "state": state_text,
            "details": details,
        })

    if diagnostics is not None and not timeline:
        diagnostics["scrape_warnings"].append({
            "maintenance_id": maintenance_id,
            "type": "missing_maintenance_timeline",
            "url": url,
        })

    return {
        "id": maintenance_id,
        "title": title,
        "url": url,
        "components": components_affected,
        "locations": locations_affected,
        "timeline": timeline,
    }


def scrape_history_ids(skip_incident_ids, diagnostics=None, max_pages=1):
    next_url = f"{BASE}/pages/history/{PAGE_ID}"
    seen_pages = set()
    incident_ids = []
    maintenance_ids = []

    for _ in range(max_pages):
        if not next_url or next_url in seen_pages:
            break
        seen_pages.add(next_url)

        resp = requests.get(next_url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        for link in soup.select('a[href*="/pages/incident/"]'):
            href = link.get("href", "")
            if f"/pages/incident/{PAGE_ID}/" not in href:
                continue
            iid = href.rstrip("/").split("/")[-1]
            if iid and iid not in skip_incident_ids and iid not in incident_ids:
                incident_ids.append(iid)

        for link in soup.select('a[href*="/pages/maintenance/"]'):
            href = link.get("href", "")
            if f"/pages/maintenance/{PAGE_ID}/" not in href:
                continue
            mid = href.rstrip("/").split("/")[-1]
            if mid and mid not in maintenance_ids:
                maintenance_ids.append(mid)

        next_link = None
        for link in soup.select("a[href]"):
            if "next page" in link.get_text(" ", strip=True).lower():
                next_link = link
                break

        next_url = urljoin(BASE, next_link["href"]) if next_link and next_link.get("href") else None

    if diagnostics is not None and next_url:
        diagnostics["scrape_warnings"].append({
            "type": "history_page_limit_reached",
            "details": f"Reached pagination limit of {max_pages} pages",
        })

    return incident_ids, maintenance_ids


def scrape_historical_incidents(incident_ids, diagnostics=None):

    incidents = []
    for iid in incident_ids:
        try:
            detail = fetch_incident_detail(iid, diagnostics=diagnostics)
            incidents.append(detail)
            time.sleep(0.3)
        except Exception as e:
            print(f"  Warning: failed to fetch incident {iid}: {e}")
            if diagnostics is not None:
                diagnostics["scrape_warnings"].append({
                    "incident_id": iid,
                    "type": "fetch_error",
                    "details": str(e),
                    "url": f"{BASE}/pages/incident/{PAGE_ID}/{iid}",
                })

    return incidents


def scrape_historical_maintenances(maintenance_ids, diagnostics=None):
    maintenances = []

    for mid in maintenance_ids:
        try:
            detail = fetch_maintenance_detail(mid, diagnostics=diagnostics)
            maintenances.append(detail)
            time.sleep(0.2)
        except Exception as e:
            print(f"  Warning: failed to fetch maintenance {mid}: {e}")
            if diagnostics is not None:
                diagnostics["scrape_warnings"].append({
                    "maintenance_id": mid,
                    "type": "maintenance_fetch_error",
                    "details": str(e),
                    "url": f"{BASE}/pages/maintenance/{PAGE_ID}/{mid}",
                })

    return maintenances


def normalise_incident(api_incident):
    aid = api_incident.get("_id", "")
    components_list = [c["name"] for c in api_incident.get("components_affected", [])]
    locations_list = [c["name"] for c in api_incident.get("containers_affected", [])]

    timeline = []
    for msg in api_incident.get("messages", []):
        timeline.append({
            "datetime": msg.get("datetime", ""),
            "status_text": "",
            "status_code": msg.get("status", 100),
            "state": STATE_CODES.get(msg.get("state", 0), "UNKNOWN"),
            "details": msg.get("details", ""),
        })

    return {
        "id": aid,
        "title": api_incident.get("name", ""),
        "url": f"{BASE}/pages/incident/{PAGE_ID}/{aid}",
        "components": components_list,
        "locations": locations_list,
        "timeline": timeline,
    }


def compute_component_days(components, all_incidents, diagnostics, days=DAYS):
    name_to_idx = {}
    for i, c in enumerate(components):
        name_to_idx[normalise_component_name(c["name"])] = i

    comp_data = {i: {} for i in range(len(components))}
    incident_by_id = {x["id"]: x for x in all_incidents if x.get("id")}

    now = datetime.now(timezone.utc)
    end_date = now.replace(hour=23, minute=59, second=59, microsecond=0)
    start_date = (end_date - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    incident_stats = diagnostics["incident_processing"]
    incident_stats["total_incidents"] = len(all_incidents)

    for incident in all_incidents:
        inc_comps = incident.get("components", [])

        if not inc_comps:
            incident_stats["skipped_no_components"] += 1
            push_sample(incident_stats["samples"]["skipped_no_components"], incident.get("id"))
            continue

        affected = []
        for name in inc_comps:
            idx = name_to_idx.get(normalise_component_name(name))
            if idx is not None and idx not in affected:
                affected.append(idx)

        if not affected:
            incident_stats["skipped_unmatched_components"] += 1
            push_sample(incident_stats["samples"]["skipped_unmatched_components"], incident.get("id"))
            continue

        entries = []
        for msg in incident.get("timeline", []):
            dt = parse_incident_datetime(msg.get("datetime", ""))
            if dt is None:
                continue
            entries.append({"dt": dt.astimezone(timezone.utc), "status": msg.get("status_code", 100), "state": msg.get("state", "").upper()})
        if not entries:
            incident_stats["skipped_no_timeline"] += 1
            push_sample(incident_stats["samples"]["skipped_no_timeline"], incident.get("id"))
            continue

        incident_stats["matched_incidents"] += 1
        push_sample(incident_stats["samples"]["matched"], incident.get("id"))

        entries.sort(key=lambda e: e["dt"])

        for i, entry in enumerate(entries):
            seg_start = entry["dt"]
            seg_status = entry["status"]
            if seg_status == 100:
                continue

            if i + 1 < len(entries):
                seg_end = entries[i + 1]["dt"]
            elif "RESOLVED" in entry["state"]:
                continue
            else:
                seg_end = now

            s = max(seg_start, start_date)
            e = min(seg_end, end_date)
            if s >= e:
                continue

            current = s
            while current < e:
                day_start = current.replace(hour=0, minute=0, second=0, microsecond=0)
                day_off = (day_start - start_date).days
                if 0 <= day_off < days:
                    for ci in affected:
                        dd = comp_data[ci].setdefault(day_off, {"status": 100, "incidents": {}})
                        dd["status"] = max(dd["status"], seg_status)
                        prev = dd["incidents"].get(incident["id"])
                        if prev is None:
                            dd["incidents"][incident["id"]] = [s, e]
                        else:
                            prev[0] = min(prev[0], s)
                            prev[1] = max(prev[1], e)
                current = day_start + timedelta(days=1)

    for ci in range(len(components)):
        days_list = []
        downtime_days = 0

        for d in range(days):
            day_date = start_date + timedelta(days=d)
            date_str = day_date.strftime("%d %b %Y")

            dd = comp_data[ci].get(d, {"status": 100, "incidents": {}})
            stat = dd["status"]

            day_incidents = []
            for iid, overlap in dd.get("incidents", {}).items():
                inc = incident_by_id.get(iid)
                if inc:
                    tl = inc.get("timeline", [])
                    first_dt = tl[0]["datetime"] if tl else None
                    day_inc = {
                        "id": inc["id"],
                        "name": inc.get("title", inc["id"]),
                        "status": stat,
                        "datetime_open": first_dt,
                    }
                    if overlap:
                        day_inc["overlap_start"] = overlap[0].isoformat()
                        day_inc["overlap_end"] = overlap[1].isoformat()
                    day_incidents.append(day_inc)

            if stat not in (100, 200):
                downtime_days += 1

            days_list.append({
                "date": date_str,
                "status": stat,
                "incidents": day_incidents,
                "maintenances": [],
                "related_incidents": [],
            })

        uptime = round(100.0 * (days - downtime_days) / days, 1)
        components[ci]["days"] = days_list
        components[ci]["uptime_percentage"] = uptime

    return components


def fetch():
    url = f"{BASE}/1.0/status/{PAGE_ID}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()["result"]

    components = data.get("status", [])
    diagnostics = make_diagnostics()

    # Normalise active incidents from API
    active_ids = set()
    active_incidents = []
    for ai in data.get("incidents", []):
        inc = normalise_incident(ai)
        if inc["id"]:
            active_ids.add(inc["id"])
            active_incidents.append(inc)

    try:
        incident_ids, maintenance_ids = scrape_history_ids(skip_incident_ids=active_ids, diagnostics=diagnostics, max_pages=1)
    except Exception as e:
        print(f"Failed to fetch history page: {e}")
        diagnostics["scrape_warnings"].append({"type": "history_page_fetch_error", "details": str(e)})
        incident_ids, maintenance_ids = [], []

    # Scrape historical incidents from detail pages
    historical_incidents = scrape_historical_incidents(incident_ids=incident_ids, diagnostics=diagnostics)

    # Scrape historical maintenances from detail pages
    historical_maintenances = scrape_historical_maintenances(maintenance_ids=maintenance_ids, diagnostics=diagnostics)

    all_incidents = active_incidents + historical_incidents

    # Compute 90-day daily status per component
    components = compute_component_days(components, all_incidents, diagnostics)

    result = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "status_overall": data.get("status_overall"),
        "components": components,
        "incidents": all_incidents,
        "maintenance": {
            **data.get("maintenance", {}),
            "historical": historical_maintenances,
        },
        "diagnostics": diagnostics,
    }

    with open("data/nintex-uptime.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"Fetched at {result['fetched_at']}")
    print(f"  Components: {len(result['components'])}")
    print(f"  Active incidents: {len(active_incidents)}")
    print(f"  Historical incidents: {len(historical_incidents)}")
    print(f"  Historical maintenances: {len(historical_maintenances)}")
    print(f"  Total incidents: {len(all_incidents)}")
    print(f"  Matched incidents: {diagnostics['incident_processing']['matched_incidents']}")
    print(f"  Skipped incidents (no components): {diagnostics['incident_processing']['skipped_no_components']}")
    print(f"  Skipped incidents (unmatched components): {diagnostics['incident_processing']['skipped_unmatched_components']}")


if __name__ == "__main__":
    fetch()
