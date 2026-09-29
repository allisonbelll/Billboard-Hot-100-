#!/usr/bin/env python3
"""Build the course-project Billboard Hot 100 CSV."""

import csv
import json
import urllib.request
from datetime import date
from pathlib import Path


SOURCE_URL = (
    "https://raw.githubusercontent.com/"
    "mhollingshead/billboard-hot-100/main/all.json"
)
START_DATE = date(2010, 1, 1)
END_DATE = date(2025, 12, 31)
OUTPUT_FILE = Path("data/hot100_2010_2025.csv")

COLUMNS = [
    "chart_date", "year", "decade", "song", "artist", "rank",
    "last_week_rank", "peak_position", "weeks_on_chart", "rank_change",
    "movement",
]


def download_charts():
    request = urllib.request.Request(
        SOURCE_URL,
        headers={"User-Agent": "Billboard-Hot-100-course-project"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.load(response)


def build_rows(charts):
    rows = []
    for chart in charts:
        chart_date_text = chart["date"]
        chart_date = date.fromisoformat(chart_date_text)
        if not START_DATE <= chart_date <= END_DATE:
            continue

        year = chart_date.year
        decade = f"{year // 10 * 10}s"
        for song in chart["data"]:
            rank = int(song["this_week"])
            last_week = song.get("last_week")
            last_week = int(last_week) if last_week is not None else None

            if last_week is None:
                rank_change = None
                movement = "New"
            else:
                # Positive rank_change means the song improved its position.
                rank_change = last_week - rank
                movement = (
                    "Up" if rank_change > 0 else
                    "Down" if rank_change < 0 else
                    "Unchanged"
                )

            rows.append({
                "chart_date": chart_date_text,
                "year": year,
                "decade": decade,
                "song": song["song"],
                "artist": song["artist"],
                "rank": rank,
                "last_week_rank": last_week,
                "peak_position": int(song["peak_position"]),
                "weeks_on_chart": int(song["weeks_on_chart"]),
                "rank_change": rank_change,
                "movement": movement,
            })

    return sorted(rows, key=lambda row: (row["chart_date"], row["rank"]))


def validate(rows):
    if len(rows) < 50_000:
        raise ValueError(f"Expected at least 50,000 rows; found {len(rows):,}.")
    if len(COLUMNS) < 8:
        raise ValueError("The output must contain at least eight columns.")
    if len({row["chart_date"] for row in rows}) < 5:
        raise ValueError("The time column must contain at least five periods.")
    if len({row["artist"] for row in rows}) < 10:
        raise ValueError("The group column must contain at least ten values.")


def main():
    print("Downloading the historical Billboard archive...")
    rows = build_rows(download_charts())
    validate(rows)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Created {OUTPUT_FILE}")
    print(f"Rows: {len(rows):,}")
    print(f"Columns: {len(COLUMNS)}")
    print(f"Weekly periods: {len({row['chart_date'] for row in rows}):,}")
    print(f"Unique songs: {len({row['song'] for row in rows}):,}")
    print(f"Unique artists: {len({row['artist'] for row in rows}):,}")


if __name__ == "__main__":
    main()
