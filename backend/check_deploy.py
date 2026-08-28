import httpx

headers = {"Authorization": "Bearer rnd_qPPyQH4ZQESrKB9V2ifnyAqAdQjx", "Accept": "application/json"}
r = httpx.get("https://api.render.com/v1/services/srv-da8ac1vavr4c73etmdn0/deploys?limit=3", headers=headers)
deploys = r.json()
for d in deploys:
    dep = d.get("deploy", {})
    print("ID:", dep.get("id"))
    print("Status:", dep.get("status"))
    print("Error:", dep.get("error", {}).get("message", "N/A") if dep.get("error") else "N/A")
    print("---")
