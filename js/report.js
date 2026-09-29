(function () {
  const charts = {};
  const palette = ["#ff5b77", "#ffd65c", "#6ff2ca", "#5ad7ff", "#f38bdc", "#ae8cff"];
  const formatNumber = value => Number(value).toLocaleString();
  const percent = value => `${(value * 100).toFixed(1)}%`;

  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  function makeChart(id, type, labels, values, label, options = {}) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), {
      type,
      data: { labels, datasets: [{ label, data: values, backgroundColor: options.backgroundColor || palette, borderColor: options.borderColor || "#f45b69", borderWidth: 2, fill: false, tension: .25 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: options.beginAtZero !== false, grid: { color: "#3b3e63" }, ticks: { color: "#b4b2c3" } }, x: { grid: { display: false }, ticks: { color: "#b4b2c3", maxRotation: 0 } } } },
    });
  }

  function renderReport(rows) {
    const years = [...new Set(rows.map(row => row.year))].sort((a, b) => a - b);
    const weeks = new Set(rows.map(row => row.chart_date));
    setText("statRows", formatNumber(rows.length));
    setText("statWeeks", formatNumber(weeks.size));
    setText("statSongs", formatNumber(new Set(rows.map(row => row.song)).size));
    setText("statArtists", formatNumber(new Set(rows.map(row => row.artist)).size));
    setText("reportStatus", `${formatNumber(rows.length)} rows loaded from ${years[0]} through ${years.at(-1)}.`);

    const numberOneByYear = d3.rollup(rows.filter(row => row.rank === 1), values => new Set(values.map(row => row.song)).size, row => row.year);
    const numberOneValues = years.map(year => numberOneByYear.get(year) || 0);
    const peakLeadershipYear = years[numberOneValues.indexOf(Math.max(...numberOneValues))];
    setText("findingYearOne", peakLeadershipYear);
    setText("findingOne", `${peakLeadershipYear} had ${formatNumber(Math.max(...numberOneValues))} distinct No. 1 songs in the snapshot.`);
    makeChart("chartOne", "line", years, numberOneValues, "Distinct No. 1 songs", { beginAtZero: true });

    const artistCounts = d3.rollup(rows, values => values.length, row => row.artist);
    const topArtists = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    setText("findingTopArtist", topArtists[0][0]);
    setText("findingTwo", `${topArtists[0][0]} appears ${formatNumber(topArtists[0][1])} times in the weekly song-level data.`);
    makeChart("chartTwo", "bar", topArtists.map(d => d[0]), topArtists.map(d => d[1]), "Weekly appearances");

    const longest = rows.reduce((best, row) => row.weeks_on_chart > best.weeks_on_chart ? row : best, rows[0]);
    setText("findingLongest", formatNumber(longest.weeks_on_chart));
    setText("findingThree", `${longest.song} by ${longest.artist} has the highest weeks-on-chart value observed in the snapshot.`);
    const longestSongs = [...d3.rollup(rows, values => d3.max(values, row => row.weeks_on_chart), row => `${row.song} · ${row.artist}`).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    makeChart("chartThree", "bar", longestSongs.map(d => d[0]), longestSongs.map(d => d[1]), "Maximum weeks on chart", { beginAtZero: true });
    const movementCounts = d3.rollup(rows, values => values.length, row => row.movement);
    const movementLabels = ["New", "Up", "Down", "Unchanged"];
    const movementValues = movementLabels.map(label => movementCounts.get(label) || 0);
    const dominantMovement = movementLabels[movementValues.indexOf(Math.max(...movementValues))];
    setText("findingMovement", dominantMovement);
    setText("findingFour", `${dominantMovement} accounts for ${percent(Math.max(...movementValues) / rows.length)} of all observations.`);
    makeChart("chartFour", "doughnut", movementLabels, movementValues, "Movement", { backgroundColor: palette });

    const decadeRank = d3.rollup(rows, values => d3.mean(values, row => row.rank), row => row.decade);
    const decades = [...decadeRank.keys()].sort();
    const decadeValues = decades.map(decade => decadeRank.get(decade));
    const strongestDecade = decades[decadeValues.indexOf(Math.min(...decadeValues))];
    setText("findingDecade", strongestDecade);
    setText("findingFive", `${strongestDecade} has the lowest average rank at ${decadeRank.get(strongestDecade).toFixed(1)}; lower is stronger.`);
    makeChart("chartFive", "bar", decades, decadeValues, "Average rank", { beginAtZero: false });

    const averageLongevity = d3.rollup(rows, values => d3.mean(values, row => row.weeks_on_chart), row => row.year);
    const longevityValues = years.map(year => averageLongevity.get(year));
    const longevityYear = years[longevityValues.indexOf(Math.max(...longevityValues))];
    setText("findingLongevityYear", longevityYear);
    setText("findingSix", `${longevityYear} has the highest average weeks-on-chart value at ${averageLongevity.get(longevityYear).toFixed(1)} weeks.`);
    makeChart("chartSix", "line", years, longevityValues, "Average weeks on chart", { beginAtZero: true });

    const topTenRows = rows.filter(row => row.rank <= 10);
    setText("findingTopTenShare", percent(topTenRows.length / rows.length));
    setText("findingSeven", `There are ${formatNumber(topTenRows.length)} observations ranked in the Top 10.`);
    const rankBuckets = ["1–10", "11–25", "26–50", "51–75", "76–100"];
    const bucketRanges = [[1, 10], [11, 25], [26, 50], [51, 75], [76, 100]];
    const bucketValues = bucketRanges.map(([low, high]) => rows.filter(row => row.rank >= low && row.rank <= high).length);
    makeChart("chartSeven", "bar", rankBuckets, bucketValues, "Observations");

    const newEntries = rows.filter(row => row.movement === "New");
    const numberOneDebuts = newEntries.filter(row => row.rank === 1).length;
    const debutShare = newEntries.length ? numberOneDebuts / newEntries.length : 0;
    setText("findingDebuts", percent(debutShare));
    setText("findingEight", `${formatNumber(numberOneDebuts)} of ${formatNumber(newEntries.length)} new entries debuted at No. 1.`);
    const debutsByYear = d3.rollup(newEntries, values => values.filter(row => row.rank === 1).length, row => row.year);
    makeChart("chartEight", "bar", years, years.map(year => debutsByYear.get(year) || 0), "No. 1 debuts");
    if (window.Hot100Music) window.Hot100Music.start(rows);
  }

  Hot100Data.loadRows().then(renderReport).catch(error => {
    console.error(error);
    setText("reportStatus", "The data could not be loaded. Run scripts/build_data.py first.");
  });
})();
