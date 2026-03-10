#!/usr/bin/env python3
"""Scrape all 16 archive pages from youngsookchoi.com."""

import urllib.request
import urllib.parse
import os
import re
import json
import time
from bs4 import BeautifulSoup

ARCHIVES = [
    ("childrens-peace-party", "Children's Peace Party", "https://youngsookchoi.com/childrens-peace-party"),
    ("on-the-fringe", "On the Fringe", "https://youngsookchoi.com/on-the-fringe"),
    ("moulding-home", "Moulding Home", "https://youngsookchoi.com/moulding-home"),
    ("talking-knots", "Talking Knots", "https://youngsookchoi.com/talking-knots"),
    ("equal-ride", "Equal Ride", "https://youngsookchoi.com/equal-ride"),
    ("headland", "Headland", "https://youngsookchoi.com/headland"),
    ("neo-caligraphy", "Neo Calligraphy", "https://youngsookchoi.com/neo-caligraphy"),
    ("when-the-sun-came-out-so-did-submarines", "When the sun sets", "https://youngsookchoi.com/when-the-sun-came-out-so-did-submarines"),
    ("dis-camouflage", "Un-Camouflage", "https://youngsookchoi.com/dis-camouflage"),
    ("50-gold-al-balad", "50 Gold Al Balad", "https://youngsookchoi.com/50-gold-al-balad"),
    ("new-griffin-act-of-gold", "New Griffin", "https://youngsookchoi.com/new-griffin-act-of-gold"),
    ("land-rites", "Land Rites", "https://youngsookchoi.com/land-rites"),
    ("gate-22-returning-land", "GATE 22", "https://youngsookchoi.com/gate-22-returning-land"),
    ("guro-gongdan-19662013", "Guro Gongdan 19662013", "https://youngsookchoi.com/guro-gongdan-19662013"),
    ("bacchus-economics", "Bacchus Economics", "https://youngsookchoi.com/bacchus-economics"),
    ("nameless-name", "Nameless Name", "https://youngsookchoi.com/nameless-name"),
]

IMAGES_DIR = "/Users/ziv/Documents/GitHub/youngsook-site/public/images"

def fetch_page(url):
    """Fetch a page with a browser-like User-Agent."""
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='replace')

def get_filename_from_url(url):
    """Extract filename from URL."""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    # Get the last part of the path
    filename = os.path.basename(path)
    # Remove query string if in filename
    filename = filename.split('?')[0]
    return filename

def download_image(url, slug, existing_names):
    """Download image and return local path. Returns None if skipped."""
    if 'gdpr' in url.lower():
        return None

    filename = get_filename_from_url(url)
    if not filename or '.' not in filename:
        return None

    local_name = f"{slug}-{filename}"
    local_path = os.path.join(IMAGES_DIR, local_name)

    if os.path.exists(local_path):
        print(f"  [skip] {local_name} already exists")
        return f"/images/{local_name}"

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        with open(local_path, 'wb') as f:
            f.write(data)
        print(f"  [ok] {local_name} ({len(data)} bytes)")
        return f"/images/{local_name}"
    except Exception as e:
        print(f"  [fail] {url}: {e}")
        return None

def scrape_page(slug, title, url):
    """Scrape a single archive page."""
    print(f"\n=== Scraping {slug} ===")
    html = fetch_page(url)
    soup = BeautifulSoup(html, 'html.parser')

    # Extract paragraphs from article .entry-content p
    article = soup.find('article')
    content = []
    if article:
        entry_content = article.find(class_='entry-content')
        if entry_content:
            for p in entry_content.find_all('p'):
                inner = p.decode_contents().strip()
                if inner:
                    content.append(inner)

    print(f"  paragraphs: {len(content)}")

    # Extract images
    images_data = []
    if article:
        for img in article.find_all('img'):
            src = img.get('src', '')
            alt = img.get('alt', '')
            if src and 'gdpr' not in src.lower():
                images_data.append({'src': src, 'alt': alt})

    print(f"  images found: {len(images_data)}")

    # Download images
    local_images = []
    existing_names = set(os.listdir(IMAGES_DIR))
    for img in images_data:
        local_path = download_image(img['src'], slug, existing_names)
        if local_path:
            local_images.append(local_path)

    return {
        'slug': slug,
        'title': title,
        'content': content,
        'images': local_images,
        'raw_images_data': images_data,
    }

def replace_wp_urls_in_content(content_list, slug, images_map):
    """Replace WordPress URLs in content with local paths."""
    result = []
    for para in content_list:
        for orig_url, local_path in images_map.items():
            para = para.replace(orig_url, local_path)
        result.append(para)
    return result

# Main scraping
all_data = []
for slug, title, url in ARCHIVES:
    try:
        data = scrape_page(slug, title, url)
        all_data.append(data)
        time.sleep(0.5)  # Be polite
    except Exception as e:
        print(f"ERROR scraping {slug}: {e}")
        all_data.append({
            'slug': slug,
            'title': title,
            'content': [],
            'images': [],
            'raw_images_data': [],
        })

# Save as JSON for inspection
output_path = "/tmp/archives_scraped.json"
with open(output_path, 'w') as f:
    json.dump(all_data, f, indent=2)

print(f"\n\nSaved to {output_path}")
print("\nSummary:")
for item in all_data:
    print(f"  {item['slug']}: {len(item['content'])} paragraphs, {len(item['images'])} images")
