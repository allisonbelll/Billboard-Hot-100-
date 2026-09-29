(function (window) {
  const DATA_PATH = "data/hot100_2010_2025.csv";

  function numberOrNull(value) {
    return value === "" || value === null || value === undefined ? null : Number(value);
  }

  function parseRow(row) {
    return {
      ...row,
      year: Number(row.year),
      rank: Number(row.rank),
      last_week_rank: numberOrNull(row.last_week_rank),
      peak_position: Number(row.peak_position),
      weeks_on_chart: Number(row.weeks_on_chart),
      rank_change: numberOrNull(row.rank_change),
    };
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  async function loadRows() {
    return d3.csv(DATA_PATH, parseRow);
  }

  window.Hot100Data = { DATA_PATH, loadRows, median };
})(window);
