import httpx
import xml.etree.ElementTree as ET

subreddits = ["SpainFinance", "finanzaspersonales", "espana", "investing", "expats"]
keywords = ["dubai", "invertir", "hacienda", "impuestos", "ahorros", "inversión", "patrimonio", "rentabilidad", "piso", "casa", "comprar", "hipoteca", "fondos", "dinero"]

print("=== REAL LIVE REDDIT RSS SCAN TEST ===")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

found_posts = []

with httpx.Client(headers=headers, timeout=15.0, follow_redirects=True) as client:
    for sub in subreddits:
        url = f"https://www.reddit.com/r/{sub}/new.rss"
        try:
            r = client.get(url)
            print(f"Querying r/{sub}.rss: HTTP {r.status_code}")
            if r.status_code == 200:
                root = ET.fromstring(r.content)
                # Atom feed namespace
                ns = {'atom': 'http://www.w3.org/2005/Atom'}
                entries = root.findall('atom:entry', ns)
                for entry in entries:
                    title_elem = entry.find('atom:title', ns)
                    title = title_elem.text if title_elem is not None else ""
                    content_elem = entry.find('atom:content', ns)
                    content = content_elem.text if content_elem is not None else ""
                    link_elem = entry.find('atom:link', ns)
                    link = link_elem.attrib.get('href', '') if link_elem is not None else ""
                    author_elem = entry.find('atom:author/atom:name', ns)
                    author = author_elem.text if author_elem is not None else ""
                    
                    combined = (title + " " + content).lower()
                    matched = [kw for kw in keywords if kw in combined]
                    
                    if matched:
                        # Clean HTML tags from snippet
                        import re
                        clean_text = re.sub(r'<[^>]+>', ' ', content)
                        clean_text = ' '.join(clean_text.split())
                        
                        found_posts.append({
                            "subreddit": f"r/{sub}",
                            "author": author,
                            "title": title,
                            "url": link,
                            "matched_keywords": matched,
                            "snippet": clean_text[:200]
                        })
        except Exception as e:
            print(f"Error on r/{sub}: {e}")

print(f"\nTotal real posts matching investment keywords: {len(found_posts)}\n")
for i, p in enumerate(found_posts[:6]):
    print(f"--- [POST {i+1}] en {p['subreddit']} por {p['author']} ---")
    print(f"Título: {p['title']}")
    print(f"Link Real: {p['url']}")
    print(f"Palabras detectadas: {p['matched_keywords']}")
    print(f"Contenido: {p['snippet']}...")
    print()
