(function () {
  const charts = {};
  const labels = { count: "Observations", avg_rank: "Average rank", median_rank: "Median rank", avg_weeks_on_chart: "Average weeks on chart" };
  let allRows = [];
  const formatNumber = value => Number(value).toLocaleString();
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  function populateSelect(id, values, label) { const select = document.getElementById(id); select.innerHTML = `<option value="">${label}</option>`; values.forEach(value => { const option = document.createElement("option"); option.value = value; option.textContent = value; select.appendChild(option); }); }
  function filteredRows() { const year = document.getElementById("yearFilter").value; const artist = document.getElementById("artistFilter").value; const movement = document.getElementById("movementFilter").value; const maxRank = Math.min(100, Math.max(1, Number(document.getElementById("maxRank").value) || 100)); return allRows.filter(row => (!year || row.year === Number(year)) && (!artist || row.artist === artist) && (!movement || row.movement === movement) && row.rank <= maxRank); }
  function metric(values, measure) { if (measure === "count") return values.length; if (measure === "avg_rank") return d3.mean(values, row => row.rank); if (measure === "median_rank") return Hot100Data.median(values.map(row => row.rank)); return d3.mean(values, row => row.weeks_on_chart); }
  function groupedMetric(rows, field, measure) { const grouped = d3.rollup(rows, values => metric(values, measure), row => row[field]); return [...grouped.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })); }
  function renderChart(id, type, chartLabels, values, label, colors) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), { type, data: { labels: chartLabels, datasets: [{ label, data: values, backgroundColor: colors || "#c6f36a", borderColor: "#c6f36a", borderWidth: 2, tension: .25, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "rgba(198, 243, 106, .12)" }, ticks: { color: "#9da7a1" } }, x: { grid: { display: false }, ticks: { color: "#9da7a1", maxRotation: 0 } } } } }); }
  function updateCharts(rows) {
    const measure = document.getElementById("measureSelect").value;
    const breakdown = document.getElementById("breakdownSelect").value;
    const trend = groupedMetric(rows, breakdown, measure);
    renderChart("trendChart", "line", trend.map(d => d[0]), trend.map(d => d[1]), labels[measure]);

    const artists = [...d3.rollup(rows, values => values.length, row => row.artist).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart("artistChart", "bar", artists.map(d => d[0]), artists.map(d => d[1]), "Weekly appearances");

    const movementLabels = ["New", "Up", "Down", "Unchanged"];
    const movement = movementLabels.map(label => rows.filter(row => row.movement === label).length);
    renderChart("movementChart", "doughnut", movementLabels, movement, "Movement", ["#ff625c", "#c6f36a", "#9da7a1", "#46524b"]);

    const buckets = [["1–10", 1, 10], ["11–25", 11, 25], ["26–50", 26, 50], ["51–75", 51, 75], ["76–100", 76, 100]];
    const longevity = buckets.map(([, low, high]) => { const bucketRows = rows.filter(row => row.rank >= low && row.rank <= high); return bucketRows.length ? d3.mean(bucketRows, row => row.weeks_on_chart) : 0; });
    renderChart("longevityChart", "bar", buckets.map(d => d[0]), longevity, "Average weeks on chart");
  }
  function formatDate(value) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }
  function movementClass(value) { return String(value || "unknown").toLowerCase().replace(/[^a-z]+/g, "-"); }
  function selectSong(row, card) {
    document.querySelectorAll(".song-card.is-selected").forEach(item => item.classList.remove("is-selected"));
    card?.classList.add("is-selected");
    const detail = document.getElementById("selectedSongDetail");
    if (!detail) return;
    detail.innerHTML = "";
    const kicker = document.createElement("span");
    kicker.className = "detail-kicker";
    kicker.textContent = `RANK ${row.rank} · ${formatDate(row.chart_date)}`;
    const title = document.createElement("strong");
    title.textContent = row.song;
    const artist = document.createElement("span");
    artist.textContent = `${row.artist} · ${row.weeks_on_chart} weeks on chart · peak ${row.peak_position}`;
    detail.append(kicker, title, artist);
  }
  function updateTable(rows) {
    const list = document.getElementById("songCardList");
    if (!list) return;
    list.innerHTML = "";
    const visibleRows = rows.slice().sort((a, b) => a.chart_date.localeCompare(b.chart_date) || a.rank - b.rank).slice(0, 100);
    visibleRows.forEach(row => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "song-card";
      card.setAttribute("aria-label", `Rank ${row.rank}, ${row.song} by ${row.artist}, ${formatDate(row.chart_date)}`);

      const rank = document.createElement("span");
      rank.className = "song-card-rank";
      rank.textContent = String(row.rank).padStart(2, "0");
      const content = document.createElement("span");
      content.className = "song-card-content";
      const title = document.createElement("strong");
      title.className = "song-card-title";
      title.textContent = row.song;
      const artist = document.createElement("span");
      artist.className = "song-card-artist";
      artist.textContent = row.artist;
      content.append(title, artist);
      const date = document.createElement("span");
      date.className = "song-card-date";
      date.textContent = formatDate(row.chart_date);
      const stats = document.createElement("span");
      stats.className = "song-card-stats";
      stats.textContent = `Peak ${row.peak_position} · ${row.weeks_on_chart} wks`;
      const movement = document.createElement("span");
      movement.className = `song-card-movement movement-${movementClass(row.movement)}`;
      movement.textContent = row.movement;
      const arrow = document.createElement("span");
      arrow.className = "song-card-arrow";
      arrow.textContent = "↗";
      card.append(rank, content, date, stats, movement, arrow);
      card.addEventListener("click", () => selectSong(row, card));
      list.appendChild(card);
    });
    setText("tableSummary", `Showing ${visibleRows.length.toLocaleString()} of ${rows.length.toLocaleString()} filtered rows`);
  }
  function updateDashboard() { const rows = filteredRows(); setText("rowCount", formatNumber(rows.length)); setText("songCount", formatNumber(new Set(rows.map(row => row.song)).size)); setText("artistCount", formatNumber(new Set(rows.map(row => row.artist)).size)); setText("averageWeeks", (rows.length ? d3.mean(rows, row => row.weeks_on_chart) : 0).toFixed(1)); setText("dashboardStatus", `${formatNumber(rows.length)} rows match the current filters.`); updateCharts(rows); updateTable(rows); }
  function resetFilters() { ["yearFilter", "artistFilter", "movementFilter"].forEach(id => { document.getElementById(id).value = ""; }); document.getElementById("maxRank").value = 100; document.getElementById("measureSelect").value = "count"; document.getElementById("breakdownSelect").value = "year"; updateDashboard(); }
  function start(rows) { allRows = rows; populateSelect("yearFilter", [...new Set(rows.map(row => row.year))].sort((a, b) => a - b), "All years"); populateSelect("artistFilter", [...new Set(rows.map(row => row.artist))].sort(), "All artists"); ["yearFilter", "artistFilter", "movementFilter", "maxRank", "measureSelect", "breakdownSelect"].forEach(id => { document.getElementById(id).addEventListener("input", updateDashboard); document.getElementById(id).addEventListener("change", updateDashboard); }); document.getElementById("resetFilters").addEventListener("click", resetFilters); updateDashboard(); }
  Hot100Data.loadRows().then(start).catch(error => { console.error(error); setText("dashboardStatus", "The data could not be loaded. Run scripts/build_data.py first."); });
})();
