# Billboard Hot 100: Weekly Momentum

This project analyzes weekly Billboard Hot 100 song appearances from 2010 through 2025. It contains a report page and an interactive dashboard built with HTML, CSS, JavaScript, D3, and Chart.js.

## Pages

- `index.html` is the report page with headline numbers, eight findings, eight charts, methodology notes, and an interactive 3D record player. Select a chart week to display that week's No. 1 song and play a short browser-generated melody based on the chart row.
- `dashboard.html` is the filtered dashboard with four filters, four summary cards, four charts, a table, and reset controls.

The musical hero uses Three.js from a CDN for the turntable scene and the Web Audio API for the short melody preview. Audio begins only after the visitor presses the play button.

## Data source

The source is the public [Historic Billboard Hot 100 Data](https://github.com/mhollingshead/billboard-hot-100) archive. Its chart object supplies the weekly chart date, song, artist, current rank, previous rank, peak position, and weeks on chart.

The source archive is transformed into one row per song-week by `scripts/build_data.py`. The output adds `year`, `decade`, `rank_change`, and `movement` so the final dataset has 11 columns and supports categorical filtering and numeric summaries.

The data snapshot is intentionally fixed to chart dates from January 1, 2010 through December 31, 2025. This keeps the report and dashboard reproducible instead of changing every time the source archive is updated.

## Row definition and derived fields

One row is one song appearing on one weekly Hot 100 chart. A lower rank is better. `rank_change` is calculated as `last_week_rank - rank`, so a positive value means the song moved upward. A blank `last_week_rank` indicates a new entry and is labeled `New` in `movement`.

## Rebuild the dataset

From the repository root, run:

```bash
python3 scripts/build_data.py
```

This creates `data/hot100_2010_2025.csv` and validates the assignment requirements of at least 50,000 rows, eight columns, five time periods, and ten group values.

## Run locally

Because the pages load a CSV file, serve the repository with a local web server instead of opening the HTML file directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

The repository should be public. In GitHub, open **Settings → Pages**, select **Deploy from a branch**, choose `main`, choose `/(root)`, and save. The expected site URL is:

```text
https://allisonbelll.github.io/Billboard-Hot-100-/
```
