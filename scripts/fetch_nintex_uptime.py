import json
import time
import requests
from datetime import datetime, timezone

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


def fetch():
    url = f"{BASE}/1.0/status/{PAGE_ID}"
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json()["result"]

    result = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "status_overall": data.get("status_overall"),
        "components": data.get("status", []),        # includes containers per component
        "incidents": data.get("incidents", []),       # active incidents
        "maintenance": data.get("maintenance", {}),   # active + upcoming
    }

    with open("data/nintex-uptime.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"Fetched at {result['fetched_at']}")
    print(f"  Components: {len(result['components'])}")
    print(f"  Active incidents: {len(result['incidents'])}")

fetch()
