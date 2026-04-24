import json
import time
import requests
import re
from datetime import datetime, timezone
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

PAGE_ID = "566925105401bb333d000014"
BASE = "https://status.nintex.com"

COMPONENTS = [
    {"id": "66e9bb3e7c63fe64a2877580", "name": "Nintex Licensing and Permitting"},
    {"id": "566925105401bb333d000024", "name": "Nintex Workflow for Office 365 - Workflow Designer"},
    {"id": "5669279e1c0398863c000005", "name": "Nintex Workflow for Office 365 - Workflow Execution"},
    {"id": "566d51ee162d054731000404", "name": "Nintex Workflow for Office 365 - Notifications"},
    {"id": "566928ed5401bb333d000030", "name": "Nintex Workflow for Office 365 - Store"},
    {"id": "566927b93399baba6800001f", "name": "Nintex Forms for Office 365 - Form Filler"},
    {"id": "5669267e5401bb333d000026", "name": "Nintex Forms for Office 365 - Form Designer"},
    {"id": "567347391212f8873c000a2b", "name": "Nintex Forms for Office 365 - Mobile Gateway"},
    {"id": "56734df93399baba68000987", "name": "Nintex Forms for SharePoint - Live Forms"},
    {"id": "566937485401bb333d000056", "name": "Nintex Live Services"},
    {"id": "59f90adc2cd214649ebc3727", "name": "Nintex DocGen for Salesforce"},
    {"id": "59f90b46f0a66804d7d5de16", "name": "Nintex DocGen for Salesforce \u2013 FedRAMP"},
    {"id": "59f90b7550230b4d0f0a5305", "name": "Nintex DocGen API"},
    {"id": "57fe9677e60a2e20190004e8", "name": "Nintex Automation Cloud"},
    {"id": "5faa0b2a387c0204c2f0dca8", "name": "Nintex Analytics"},
    {"id": "566d50845401bb333d000438", "name": "Nintex App Studio - Portal"},
    {"id": "566d50f65401bb333d00043a", "name": "Nintex App Studio - Build Services"},
    {"id": "5beb9d68789f5d04bfff35bb", "name": "Nintex Process Manager - Production"},
    {"id": "5beb9d1c11d49f04b9a16ef2", "name": "Nintex Process Manager - Freetrial/Demo"},
    {"id": "5beb9d7c82f61304c301a07d", "name": "Nintex Process Manager - Freetrial site provisioning"},
    {"id": "5e2f570d4f7e6f04b9f6b645", "name": "Nintex Process Manager - Reporting API"},
    {"id": "5e576204f8d13904b21662bf", "name": "Nintex RPA"},
    {"id": "607f1a358f8624052e243fc9", "name": "Nintex Customer Central"},
    {"id": "607f1a49c089c20535d00df3", "name": "Nintex Partner Central"},
    {"id": "659e3576fadb1d3b77f91177", "name": "Nintex K2 Cloud"},
    {"id": "659e35c0862fea3c0d592d5a", "name": "Nintex K2 Trust"},
    {"id": "6849b005ff590105def6213a", "name": "Nintex DocGen Manager"},
]


def fetch_historical_incidents():
    """Fetch historical incidents from the history page."""
    url = f"{BASE}/pages/history/{PAGE_ID}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    incidents = []
    
    # Find all incident sections - they start with h5 containing links
    for h5 in soup.find_all('h5'):
        link = h5.find('a')
        if link and 'pages/incident/' in link.get('href', ''):
            incident_url = link['href']
            # Ensure full URL
            if not incident_url.startswith('http'):
                incident_url = f"{BASE}{incident_url}"
            
            title = link.get_text().strip()
            
            # The status might be in the h5 text after the link
            h5_text = h5.get_text()
            status = "Unknown"
            if "Operational" in h5_text:
                status = "Operational"
            elif "Service Disruption" in h5_text:
                status = "Service Disruption"
            elif "Partial Service Disruption" in h5_text:
                status = "Partial Service Disruption"
            elif "Degraded Performance" in h5_text:
                status = "Degraded Performance"
            
            incidents.append({
                'id': incident_url.split('/')[-1],
                'url': incident_url,
                'title': title,
                'status': status,
                'components': [],  # Could be enhanced with better parsing
                'locations': [],   # Could be enhanced with better parsing
                'timeline': []     # Could be enhanced with better parsing
            })
    
    return incidents


def fetch():
    url = f"{BASE}/1.0/status/{PAGE_ID}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()["result"]

    components = data.get("status", [])
    
    # Fetch uptime data for each component
    for component in components:
        component_id = component["id"]
        uptime_url = f"{BASE}/pages/{PAGE_ID}/status_chart/component/{component_id}/uptime"
        try:
            uptime_resp = requests.get(uptime_url, headers=HEADERS, timeout=15)
            uptime_resp.raise_for_status()
            uptime_data = uptime_resp.json()
            component["days"] = uptime_data.get("days", [])
            component["uptime_percentage"] = uptime_data.get("uptime_percentage", 100)
        except Exception as e:
            print(f"Failed to fetch uptime for {component['name']}: {e}")
            component["days"] = []
            component["uptime_percentage"] = 100

    # Fetch historical incidents
    try:
        historical_incidents = fetch_historical_incidents()
    except Exception as e:
        print(f"Failed to fetch historical incidents: {e}")
        historical_incidents = []

    # Get active incidents
    active_incidents = data.get("incidents", [])
    
    # Ensure all incident URLs are properly formatted
    for incident in active_incidents + historical_incidents:
        if 'url' in incident and not incident['url'].startswith('http'):
            incident['url'] = f"{BASE}{incident['url']}"
        elif 'incident_url' in incident and not incident['incident_url'].startswith('http'):
            incident['incident_url'] = f"{BASE}{incident['incident_url']}"

    result = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "status_overall": data.get("status_overall"),
        "components": components,
        "incidents": active_incidents + historical_incidents,
        "maintenance": data.get("maintenance", {}),
    }

    with open("../data/nintex-uptime.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"Fetched at {result['fetched_at']}")
    print(f"  Components: {len(result['components'])}")
    print(f"  Active incidents: {len(active_incidents)}")
    print(f"  Historical incidents: {len(historical_incidents)}")
    print(f"  Total incidents: {len(result['incidents'])}")

fetch()
