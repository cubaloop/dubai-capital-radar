import httpx
import xml.etree.ElementTree as ET
import urllib.parse

queries = [
    "inversion inmobiliaria dubai",
    "impuesto grandes fortunas espana",
    "golden visa emiratos arabes espana",
    "comprar piso dubai rentabilidad"
]

print("=== REAL GOOGLE NEWS / FINANCIAL SIGNALS SCAN ===")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

found_articles = []

with httpx.Client(headers=headers, timeout=15.0) as client:
    for q in queries:
        encoded_q = urllib.parse.quote(q)
        url = f"https://news.google.com/rss/search?q={encoded_q}&hl=es&gl=ES&ceid=ES:es"
        try:
            r = client.get(url)
            print(f"Querying Google News for '{q}': HTTP {r.status_code}")
            if r.status_code == 200:
                root = ET.fromstring(r.content)
                items = root.findall('.//item')
                for item in items[:3]:
                    title = item.find('title').text if item.find('title') is not None else ""
                    link = item.find('link').text if item.find('link') is not None else ""
                    pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    source = item.find('source').text if item.find('source') is not None else "Fuente Española"
                    
                    found_articles.append({
                        "query": q,
                        "title": title,
                        "source": source,
                        "pub_date": pub_date,
                        "link": link
                    })
        except Exception as e:
            print(f"Error on '{q}': {e}")

print(f"\nTotal real financial signals extracted: {len(found_articles)}\n")
for i, a in enumerate(found_articles[:6]):
    print(f"--- [NOTICIA {i+1}] {a['source']} ({a['pub_date'][:16]}) ---")
    print(f"Título: {a['title']}")
    print(f"Búsqueda: {a['query']}")
    print(f"Link: {a['link'][:100]}...")
    print()
