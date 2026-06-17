"""
Fetch current WNBA headlines from Google News RSS queries and store them
inside src/data/wnba_data.json under the top-level "news" field.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path
from urllib.parse import quote, urlparse
from xml.etree import ElementTree

import requests

DATA_FILE = Path(__file__).parent.parent / "src" / "data" / "wnba_data.json"

QUERIES = [
    ("WNBA", "General"),
    ("WNBA injuries", "Injuries"),
    ("WNBA flagrant foul OR WNBA suspension", "Discipline"),
    ("WNBA trade OR WNBA signing", "Transactions"),
]
MAX_AGE_DAYS = 3
MAX_ARTICLES = 10


def write_json_atomic(path, payload, *, indent=None):
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=indent)
    temp_path.replace(path)


def build_feed_url(query: str) -> str:
    encoded = quote(query)
    return f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"


def clean_summary(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text).replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def source_name(link: str) -> str:
    host = urlparse(link).netloc.lower().replace("www.", "")
    return host or "Unknown Source"


def split_title_and_source(title: str):
    if " - " in title:
        headline, trailing = title.rsplit(" - ", 1)
        trailing = trailing.strip()
        if trailing:
            return headline.strip(), trailing
    return title, None


def extract_image_url(description: str) -> str | None:
    match = re.search(r'<img[^>]+src="([^"]+)"', description)
    if not match:
        return None
    url = unescape(match.group(1)).strip()
    if "news.google.com" in url:
        return None
    return url


def parse_feed(query: str, category: str):
    response = requests.get(build_feed_url(query), timeout=20)
    response.raise_for_status()
    root = ElementTree.fromstring(response.text)
    items = []

    limit = 3 if category == "Transactions" else 6
    for item in root.findall("./channel/item")[:limit]:
        raw_title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        published_at = parse_published_at(pub_date)
        raw_description = item.findtext("description") or ""
        description = clean_summary(raw_description)
        title, title_source = split_title_and_source(raw_title)
        if not title or not link or published_at is None or is_stale(published_at):
            continue
        article = {
            "id": f"{category.lower()}-{abs(hash((title, link)))}",
            "title": title,
            "source": title_source or source_name(link),
            "link": link,
            "published_at": published_at.isoformat(),
            "category": category,
            "summary": description[:160] if description else title,
        }
        image_url = extract_image_url(raw_description)
        if image_url:
            article["image_url"] = image_url
        items.append(article)

    return items


def parse_published_at(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
    except ValueError:
        try:
            return datetime.strptime(value, "%a, %d %b %Y %H:%M:%S %z").astimezone(timezone.utc)
        except ValueError:
            return None


def is_stale(published_at: datetime) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    return published_at < cutoff


def main():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    collected = []
    seen = set()
    for query, category in QUERIES:
        try:
            for item in parse_feed(query, category):
                key = (item["title"].lower(), item["link"])
                if key in seen:
                    continue
                seen.add(key)
                collected.append(item)
        except Exception as error:
            print(f"WARNING: failed to fetch '{query}': {error}")

    priority = {"Injuries": 4, "Discipline": 3, "Transactions": 2, "General": 1}
    collected.sort(
        key=lambda article: (
            article["published_at"],
            priority.get(article["category"], 0),
        ),
        reverse=True,
    )
    data["news"] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "articles": collected[:MAX_ARTICLES],
    }
    write_json_atomic(DATA_FILE, data)
    print(f"Saved {len(collected[:MAX_ARTICLES])} WNBA news stories into {DATA_FILE.name}")


if __name__ == "__main__":
    main()
