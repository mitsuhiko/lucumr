// LLM word trends visualization for /2026/5/4/content-for-contents-sake/.
// Data sources:
// - Google Trends CSV exports in ../../research/.
// - Coding data: observed word counts in 90 days of coding-agent output
//   divided by expected counts from wordfreq.
// Baseline: monthly mean for 2004-01..2023-12. Recent: monthly mean for 2024-01..2026-04.
(function () {
  "use strict";

  if (window.LLMWordTrendsInit) {
    window.LLMWordTrendsInit();
    return;
  }

  const DATA = {"generated":"2026-05-05","sourceRange":["2004-01","2026-04"],"baselineRange":["2004-01","2023-12"],"recentRange":["2024-01","2026-04"],"codingSource":"90 days of local coding-agent output compared with wordfreq expected counts","maxCodingRatio":79.0,"codingDivergence":[{"word":"durable","label":"durable","observed":164,"expected":4.2,"ratio":39.3,"rank":7},{"word":"habitat","label":"habitat","observed":192,"expected":8.3,"ratio":23.1,"rank":15},{"word":"silently","label":"silently","observed":141,"expected":3.3,"ratio":42.6,"rank":6},{"word":"herald","label":"herald","observed":172,"expected":7.8,"ratio":22.2,"rank":17},{"word":"bedrock","label":"bedrock","observed":105,"expected":1.7,"ratio":63.1,"rank":3},{"word":"caveat","label":"caveat","observed":97,"expected":1.2,"ratio":79.0,"rank":1},{"word":"unrelated","label":"unrelated","observed":118,"expected":5.5,"ratio":21.5,"rank":18},{"word":"churn","label":"churn","observed":74,"expected":1.0,"ratio":72.6,"rank":2},{"word":"peace","label":"peace","observed":361,"expected":91.4,"ratio":3.9,"rank":31},{"word":"friction","label":"friction","observed":110,"expected":4.5,"ratio":24.6,"rank":13},{"word":"intentionally","label":"intentionally","observed":112,"expected":5.8,"ratio":19.5,"rank":22},{"word":"capability","label":"capability","observed":134,"expected":10.2,"ratio":13.2,"rank":26},{"word":"pivot","label":"pivot","observed":85,"expected":2.8,"ratio":30.9,"rank":10},{"word":"framing","label":"framing","observed":82,"expected":3.3,"ratio":24.8,"rank":12},{"word":"plumbing","label":"plumbing","observed":66,"expected":3.4,"ratio":19.5,"rank":21},{"word":"ambiguity","label":"ambiguity","observed":48,"expected":2.0,"ratio":23.6,"rank":14},{"word":"spiritually","label":"spiritually","observed":43,"expected":1.7,"ratio":25.3,"rank":11},{"word":"nuanced","label":"nuanced / nuance","observed":36,"expected":1.1,"ratio":33.6,"rank":9},{"word":"brittle","label":"brittle","observed":33,"expected":1.7,"ratio":19.8,"rank":19},{"word":"thesis","label":"thesis","observed":65,"expected":9.8,"ratio":6.7,"rank":29},{"word":"coherent","label":"coherent","observed":41,"expected":3.7,"ratio":11.0,"rank":27},{"word":"takeaway","label":"takeaway","observed":31,"expected":1.8,"ratio":17.0,"rank":23},{"word":"operationally","label":"operationally","observed":20,"expected":0.4,"ratio":45.8,"rank":4},{"word":"legible","label":"legible","observed":19,"expected":0.5,"ratio":34.6,"rank":8},{"word":"cadence","label":"cadence","observed":26,"expected":1.1,"ratio":22.6,"rank":16},{"word":"snark","label":"snark","observed":17,"expected":0.4,"ratio":43.7,"rank":5},{"word":"opaque","label":"opaque","observed":30,"expected":2.0,"ratio":14.7,"rank":25},{"word":"agnostic","label":"agnostic","observed":18,"expected":0.9,"ratio":19.7,"rank":20},{"word":"scaffolding","label":"scaffolding","observed":18,"expected":1.1,"ratio":16.4,"rank":24},{"word":"substrate","label":"substrate","observed":22,"expected":3.8,"ratio":5.8,"rank":30},{"word":"seam","label":"seam","observed":16,"expected":2.4,"ratio":6.7,"rank":28}],"words":[{"word":"nuanced","source":"cuanced.csv","baseline":17.8,"recent":71.4,"increasePct":301.4,"multiplier":4.01,"latest":63.0,"latestMonth":"2026-04","annual":[[2004,1.6],[2005,0.0],[2006,0.4],[2007,2.3],[2008,4.8],[2009,5.6],[2010,7.2],[2011,9.8],[2012,11.6],[2013,13.3],[2014,18.1],[2015,24.4],[2016,22.4],[2017,25.9],[2018,28.3],[2019,30.2],[2020,32.5],[2021,24.4],[2022,37.5],[2023,55.3]],"recentSeries":[["2024-01",93.0],["2024-02",93.7],["2024-03",95.7],["2024-04",88.3],["2024-05",72.0],["2024-06",57.3],["2024-07",49.3],["2024-08",62.0],["2024-09",77.0],["2024-10",91.0],["2024-11",88.7],["2024-12",79.7],["2025-01",73.7],["2025-02",72.7],["2025-03",77.3],["2025-04",73.3],["2025-05",67.0],["2025-06",57.0],["2025-07",53.3],["2025-08",61.0],["2025-09",70.0],["2025-10",73.3],["2025-11",66.0],["2025-12",59.0],["2026-01",59.0],["2026-02",62.0],["2026-03",64.3],["2026-04",64.0]],"coding":{"word":"nuanced","label":"nuanced / nuance","observed":36,"expected":1.1,"ratio":33.6,"rank":9}},{"word":"snark","source":"snark.csv","baseline":22.8,"recent":86.3,"increasePct":278.9,"multiplier":3.79,"latest":90.0,"latestMonth":"2026-04","annual":[[2004,19.7],[2005,20.8],[2006,27.8],[2007,21.0],[2008,17.3],[2009,18.8],[2010,17.8],[2011,23.3],[2012,24.4],[2013,22.6],[2014,22.4],[2015,20.4],[2016,18.8],[2017,17.2],[2018,16.6],[2019,23.1],[2020,23.6],[2021,22.3],[2022,29.8],[2023,48.2]],"recentSeries":[["2024-01",65.5],["2024-02",65.0],["2024-03",64.7],["2024-04",66.0],["2024-05",77.0],["2024-06",86.0],["2024-07",93.0],["2024-08",89.7],["2024-09",87.7],["2024-10",87.0],["2024-11",88.3],["2024-12",92.7],["2025-01",96.3],["2025-02",99.3],["2025-03",95.0],["2025-04",91.0],["2025-05",90.3],["2025-06",94.7],["2025-07",97.3],["2025-08",91.3],["2025-09",85.3],["2025-10",81.0],["2025-11",82.7],["2025-12",85.7],["2026-01",89.3],["2026-02",91.7],["2026-03",91.3],["2026-04",91.0]],"coding":{"word":"snark","label":"snark","observed":17,"expected":0.4,"ratio":43.7,"rank":5}},{"word":"intentionally","source":"intentionally.csv","baseline":23.1,"recent":66.9,"increasePct":189.4,"multiplier":2.89,"latest":92.0,"latestMonth":"2026-04","annual":[[2004,9.6],[2005,9.9],[2006,9.3],[2007,9.8],[2008,11.0],[2009,15.7],[2010,14.8],[2011,17.2],[2012,18.8],[2013,19.8],[2014,21.7],[2015,24.5],[2016,27.3],[2017,29.1],[2018,30.7],[2019,30.8],[2020,35.7],[2021,34.9],[2022,44.1],[2023,47.8]],"recentSeries":[["2024-01",51.0],["2024-02",54.0],["2024-03",57.7],["2024-04",56.0],["2024-05",51.7],["2024-06",46.7],["2024-07",47.0],["2024-08",52.0],["2024-09",59.7],["2024-10",62.3],["2024-11",59.7],["2024-12",57.3],["2025-01",60.3],["2025-02",64.3],["2025-03",66.0],["2025-04",64.0],["2025-05",62.3],["2025-06",60.0],["2025-07",60.7],["2025-08",67.0],["2025-09",79.0],["2025-10",84.7],["2025-11",84.7],["2025-12",85.0],["2026-01",91.7],["2026-02",98.0],["2026-03",97.0],["2026-04",95.5]],"coding":{"word":"intentionally","label":"intentionally","observed":112,"expected":5.8,"ratio":19.5,"rank":22}},{"word":"unrelated","source":"unrelated.csv","baseline":21.7,"recent":50.8,"increasePct":134.1,"multiplier":2.34,"latest":88.0,"latestMonth":"2026-04","annual":[[2004,13.2],[2005,13.6],[2006,13.3],[2007,13.4],[2008,14.2],[2009,33.9],[2010,31.6],[2011,22.5],[2012,19.6],[2013,19.1],[2014,18.6],[2015,19.6],[2016,19.8],[2017,22.0],[2018,22.7],[2019,22.7],[2020,25.5],[2021,22.9],[2022,32.0],[2023,34.2]],"recentSeries":[["2024-01",42.0],["2024-02",43.3],["2024-03",48.0],["2024-04",44.0],["2024-05",39.0],["2024-06",31.0],["2024-07",28.3],["2024-08",33.7],["2024-09",42.3],["2024-10",48.7],["2024-11",46.3],["2024-12",42.7],["2025-01",45.0],["2025-02",49.3],["2025-03",54.7],["2025-04",51.0],["2025-05",46.7],["2025-06",41.0],["2025-07",39.7],["2025-08",45.3],["2025-09",52.0],["2025-10",59.0],["2025-11",58.3],["2025-12",59.0],["2026-01",68.0],["2026-02",83.0],["2026-03",91.7],["2026-04",94.0]],"coding":{"word":"unrelated","label":"unrelated","observed":118,"expected":5.5,"ratio":21.5,"rank":18}},{"word":"churn","source":"churn.csv","baseline":19.0,"recent":38.0,"increasePct":99.8,"multiplier":2.0,"latest":60.0,"latestMonth":"2026-04","annual":[[2004,14.1],[2005,12.5],[2006,12.2],[2007,12.2],[2008,12.0],[2009,12.2],[2010,12.3],[2011,14.8],[2012,14.8],[2013,15.5],[2014,18.2],[2015,21.1],[2016,23.9],[2017,26.0],[2018,25.6],[2019,25.7],[2020,25.8],[2021,25.4],[2022,28.1],[2023,28.6]],"recentSeries":[["2024-01",29.0],["2024-02",29.3],["2024-03",29.7],["2024-04",30.3],["2024-05",30.7],["2024-06",30.7],["2024-07",30.0],["2024-08",29.0],["2024-09",28.7],["2024-10",28.3],["2024-11",28.0],["2024-12",27.3],["2025-01",29.0],["2025-02",30.3],["2025-03",31.0],["2025-04",30.3],["2025-05",32.3],["2025-06",40.7],["2025-07",43.7],["2025-08",42.3],["2025-09",35.7],["2025-10",34.7],["2025-11",36.7],["2025-12",44.0],["2026-01",65.3],["2026-02",76.3],["2026-03",77.3],["2026-04",66.0]],"coding":{"word":"churn","label":"churn","observed":74,"expected":1.0,"ratio":72.6,"rank":2}},{"word":"silently","source":"silently.csv","baseline":37.9,"recent":67.6,"increasePct":78.3,"multiplier":1.78,"latest":86.0,"latestMonth":"2026-04","annual":[[2004,32.3],[2005,34.3],[2006,30.8],[2007,32.9],[2008,31.8],[2009,33.4],[2010,35.8],[2011,34.6],[2012,37.4],[2013,39.4],[2014,40.2],[2015,43.8],[2016,39.3],[2017,40.7],[2018,39.0],[2019,38.1],[2020,39.5],[2021,34.3],[2022,48.4],[2023,53.0]],"recentSeries":[["2024-01",61.5],["2024-02",61.0],["2024-03",62.0],["2024-04",59.7],["2024-05",56.0],["2024-06",52.3],["2024-07",52.0],["2024-08",56.3],["2024-09",60.3],["2024-10",61.3],["2024-11",60.7],["2024-12",60.0],["2025-01",62.3],["2025-02",64.7],["2025-03",66.3],["2025-04",64.7],["2025-05",61.0],["2025-06",60.0],["2025-07",62.0],["2025-08",70.3],["2025-09",75.7],["2025-10",79.0],["2025-11",79.0],["2025-12",80.3],["2026-01",87.3],["2026-02",93.7],["2026-03",95.0],["2026-04",93.0]],"coding":{"word":"silently","label":"silently","observed":141,"expected":3.3,"ratio":42.6,"rank":6}},{"word":"substrate","source":"substrate.csv","baseline":29.8,"recent":51.8,"increasePct":73.5,"multiplier":1.74,"latest":88.0,"latestMonth":"2026-04","annual":[[2004,26.8],[2005,25.6],[2006,22.8],[2007,21.7],[2008,21.8],[2009,24.3],[2010,24.3],[2011,26.8],[2012,27.2],[2013,27.9],[2014,29.1],[2015,31.1],[2016,30.5],[2017,31.8],[2018,33.1],[2019,32.7],[2020,37.8],[2021,34.1],[2022,43.3],[2023,44.4]],"recentSeries":[["2024-01",45.0],["2024-02",45.0],["2024-03",45.7],["2024-04",40.3],["2024-05",35.3],["2024-06",31.0],["2024-07",30.0],["2024-08",38.3],["2024-09",50.7],["2024-10",56.7],["2024-11",51.7],["2024-12",43.0],["2025-01",42.7],["2025-02",44.3],["2025-03",46.0],["2025-04",42.0],["2025-05",38.7],["2025-06",39.7],["2025-07",40.7],["2025-08",49.0],["2025-09",57.3],["2025-10",65.7],["2025-11",65.0],["2025-12",64.3],["2026-01",76.0],["2026-02",86.7],["2026-03",92.7],["2026-04",89.0]],"coding":{"word":"substrate","label":"substrate","observed":22,"expected":3.8,"ratio":5.8,"rank":30}},{"word":"seam","source":"time_series_US_20040101-0100_20260505-1018.csv","baseline":31.5,"recent":54.0,"increasePct":71.4,"multiplier":1.71,"latest":100.0,"latestMonth":"2026-04","annual":[[2004,22.5],[2005,22.6],[2006,24.0],[2007,27.5],[2008,29.8],[2009,29.9],[2010,28.0],[2011,27.9],[2012,26.1],[2013,27.8],[2014,29.1],[2015,30.8],[2016,33.2],[2017,34.6],[2018,36.6],[2019,36.7],[2020,38.4],[2021,37.9],[2022,42.1],[2023,43.6]],"recentSeries":[["2024-01",44.7],["2024-02",44.7],["2024-03",49.0],["2024-04",49.0],["2024-05",49.3],["2024-06",47.3],["2024-07",47.7],["2024-08",48.3],["2024-09",48.0],["2024-10",48.7],["2024-11",49.0],["2024-12",48.7],["2025-01",48.3],["2025-02",48.3],["2025-03",50.3],["2025-04",51.7],["2025-05",54.3],["2025-06",55.7],["2025-07",58.3],["2025-08",61.3],["2025-09",60.3],["2025-10",60.0],["2025-11",58.0],["2025-12",58.7],["2026-01",59.3],["2026-02",63.0],["2026-03",68.7],["2026-04",81.3]],"coding":{"word":"seam","label":"seam","observed":16,"expected":2.4,"ratio":6.7,"rank":28}},{"word":"cadence","source":"cadence.csv","baseline":49.4,"recent":78.6,"increasePct":59.1,"multiplier":1.59,"latest":93.0,"latestMonth":"2026-04","annual":[[2004,48.5],[2005,44.9],[2006,44.6],[2007,43.3],[2008,43.0],[2009,41.8],[2010,39.1],[2011,40.2],[2012,49.6],[2013,52.8],[2014,52.9],[2015,52.8],[2016,49.0],[2017,46.2],[2018,47.1],[2019,57.8],[2020,51.9],[2021,49.0],[2022,60.8],[2023,73.3]],"recentSeries":[["2024-01",77.5],["2024-02",76.7],["2024-03",76.3],["2024-04",75.0],["2024-05",74.7],["2024-06",74.7],["2024-07",75.3],["2024-08",76.0],["2024-09",75.3],["2024-10",71.0],["2024-11",67.7],["2024-12",68.3],["2025-01",71.7],["2025-02",74.0],["2025-03",73.0],["2025-04",72.7],["2025-05",74.0],["2025-06",81.0],["2025-07",84.3],["2025-08",85.0],["2025-09",81.7],["2025-10",83.0],["2025-11",82.3],["2025-12",82.0],["2026-01",84.7],["2026-02",92.3],["2026-03",96.0],["2026-04",96.5]],"coding":{"word":"cadence","label":"cadence","observed":26,"expected":1.1,"ratio":22.6,"rank":16}},{"word":"capability","source":"capability.csv","baseline":25.8,"recent":40.5,"increasePct":57.1,"multiplier":1.57,"latest":69.0,"latestMonth":"2026-04","annual":[[2004,36.3],[2005,33.3],[2006,29.6],[2007,26.8],[2008,26.8],[2009,27.8],[2010,27.4],[2011,27.3],[2012,25.3],[2013,23.7],[2014,23.9],[2015,24.9],[2016,22.7],[2017,22.3],[2018,21.5],[2019,20.8],[2020,22.9],[2021,19.9],[2022,25.9],[2023,26.4]],"recentSeries":[["2024-01",30.5],["2024-02",30.0],["2024-03",31.7],["2024-04",29.0],["2024-05",27.3],["2024-06",24.3],["2024-07",23.0],["2024-08",24.7],["2024-09",27.7],["2024-10",29.7],["2024-11",28.3],["2024-12",27.3],["2025-01",29.3],["2025-02",32.0],["2025-03",33.0],["2025-04",32.0],["2025-05",33.7],["2025-06",37.7],["2025-07",40.3],["2025-08",42.3],["2025-09",42.0],["2025-10",46.0],["2025-11",49.0],["2025-12",55.7],["2026-01",72.0],["2026-02",87.7],["2026-03",89.7],["2026-04",84.5]],"coding":{"word":"capability","label":"capability","observed":134,"expected":10.2,"ratio":13.2,"rank":26}},{"word":"coherent","source":"coherent.csv","baseline":26.0,"recent":40.3,"increasePct":55.0,"multiplier":1.55,"latest":74.0,"latestMonth":"2026-04","annual":[[2004,34.7],[2005,32.4],[2006,27.2],[2007,23.7],[2008,21.8],[2009,21.8],[2010,22.5],[2011,23.8],[2012,23.1],[2013,24.3],[2014,26.0],[2015,27.9],[2016,27.3],[2017,28.2],[2018,26.5],[2019,24.8],[2020,24.8],[2021,22.2],[2022,27.0],[2023,29.8]],"recentSeries":[["2024-01",34.0],["2024-02",34.3],["2024-03",35.7],["2024-04",33.7],["2024-05",31.3],["2024-06",28.0],["2024-07",27.7],["2024-08",31.3],["2024-09",34.0],["2024-10",35.0],["2024-11",31.3],["2024-12",30.7],["2025-01",32.7],["2025-02",34.3],["2025-03",35.3],["2025-04",33.0],["2025-05",31.0],["2025-06",30.7],["2025-07",33.0],["2025-08",37.3],["2025-09",39.3],["2025-10",40.0],["2025-11",41.3],["2025-12",48.7],["2026-01",60.3],["2026-02",79.0],["2026-03",83.0],["2026-04",87.0]],"coding":{"word":"coherent","label":"coherent","observed":41,"expected":3.7,"ratio":11.0,"rank":27}},{"word":"plumbing","source":"plumbing.csv","baseline":44.5,"recent":65.7,"increasePct":47.5,"multiplier":1.48,"latest":95.0,"latestMonth":"2026-04","annual":[[2004,34.7],[2005,35.2],[2006,38.8],[2007,39.9],[2008,38.9],[2009,37.1],[2010,36.5],[2011,39.9],[2012,38.4],[2013,39.9],[2014,42.8],[2015,44.8],[2016,47.4],[2017,49.9],[2018,51.7],[2019,52.7],[2020,52.3],[2021,60.1],[2022,56.6],[2023,52.8]],"recentSeries":[["2024-01",57.0],["2024-02",56.3],["2024-03",54.3],["2024-04",55.7],["2024-05",57.0],["2024-06",58.0],["2024-07",58.7],["2024-08",56.0],["2024-09",54.3],["2024-10",52.0],["2024-11",52.3],["2024-12",54.0],["2025-01",57.3],["2025-02",60.0],["2025-03",61.0],["2025-04",60.3],["2025-05",65.3],["2025-06",78.0],["2025-07",82.7],["2025-08",82.0],["2025-09",73.7],["2025-10",73.0],["2025-11",72.3],["2025-12",72.0],["2026-01",75.3],["2026-02",80.0],["2026-03",87.0],["2026-04",90.0]],"coding":{"word":"plumbing","label":"plumbing","observed":66,"expected":3.4,"ratio":19.5,"rank":21}},{"word":"ambiguity","source":"ambiguity.csv","baseline":36.2,"recent":47.5,"increasePct":31.1,"multiplier":1.31,"latest":69.0,"latestMonth":"2026-04","annual":[[2004,21.5],[2005,23.4],[2006,23.2],[2007,24.8],[2008,26.4],[2009,30.8],[2010,32.4],[2011,37.9],[2012,40.9],[2013,43.5],[2014,48.6],[2015,48.9],[2016,43.8],[2017,42.2],[2018,40.8],[2019,39.4],[2020,37.4],[2021,34.7],[2022,42.8],[2023,41.5]],"recentSeries":[["2024-01",46.5],["2024-02",46.0],["2024-03",48.0],["2024-04",43.0],["2024-05",38.0],["2024-06",32.3],["2024-07",31.7],["2024-08",37.3],["2024-09",43.0],["2024-10",44.7],["2024-11",41.0],["2024-12",39.0],["2025-01",41.3],["2025-02",44.3],["2025-03",45.3],["2025-04",43.7],["2025-05",40.3],["2025-06",38.0],["2025-07",36.0],["2025-08",41.7],["2025-09",45.3],["2025-10",50.0],["2025-11",49.0],["2025-12",55.7],["2026-01",72.0],["2026-02",82.7],["2026-03",83.3],["2026-04",75.0]],"coding":{"word":"ambiguity","label":"ambiguity","observed":48,"expected":2.0,"ratio":23.6,"rank":14}},{"word":"caveat","source":"caveat.csv","baseline":19.7,"recent":25.6,"increasePct":29.9,"multiplier":1.3,"latest":50.0,"latestMonth":"2026-04","annual":[[2004,15.2],[2005,17.3],[2006,16.6],[2007,17.1],[2008,17.9],[2009,18.8],[2010,20.4],[2011,23.6],[2012,22.3],[2013,22.1],[2014,23.1],[2015,23.0],[2016,19.3],[2017,19.5],[2018,20.5],[2019,19.5],[2020,19.6],[2021,18.8],[2022,20.4],[2023,19.8]],"recentSeries":[["2024-01",20.0],["2024-02",19.3],["2024-03",19.3],["2024-04",18.7],["2024-05",19.0],["2024-06",46.0],["2024-07",46.3],["2024-08",46.3],["2024-09",19.7],["2024-10",19.0],["2024-11",18.3],["2024-12",18.0],["2025-01",20.0],["2025-02",20.7],["2025-03",22.3],["2025-04",27.3],["2025-05",29.3],["2025-06",29.7],["2025-07",24.3],["2025-08",24.0],["2025-09",24.0],["2025-10",23.0],["2025-11",21.3],["2025-12",20.7],["2026-01",22.0],["2026-02",24.3],["2026-03",33.3],["2026-04",38.0]],"coding":{"word":"caveat","label":"caveat","observed":97,"expected":1.2,"ratio":79.0,"rank":1}},{"word":"opaque","source":"opaque.csv","baseline":46.8,"recent":59.8,"increasePct":27.9,"multiplier":1.28,"latest":100.0,"latestMonth":"2026-04","annual":[[2004,39.0],[2005,37.9],[2006,37.3],[2007,38.1],[2008,41.5],[2009,41.7],[2010,40.9],[2011,46.4],[2012,46.6],[2013,47.1],[2014,51.2],[2015,51.8],[2016,51.3],[2017,52.7],[2018,52.0],[2019,51.5],[2020,53.0],[2021,44.6],[2022,54.7],[2023,56.3]],"recentSeries":[["2024-01",58.5],["2024-02",57.7],["2024-03",57.7],["2024-04",55.3],["2024-05",51.0],["2024-06",45.3],["2024-07",42.0],["2024-08",46.3],["2024-09",55.0],["2024-10",61.3],["2024-11",63.7],["2024-12",61.7],["2025-01",61.7],["2025-02",60.7],["2025-03",61.0],["2025-04",57.3],["2025-05",52.3],["2025-06",47.7],["2025-07",48.0],["2025-08",52.7],["2025-09",59.7],["2025-10",65.0],["2025-11",66.3],["2025-12",64.7],["2026-01",69.3],["2026-02",74.3],["2026-03",86.7],["2026-04",89.0]],"coding":{"word":"opaque","label":"opaque","observed":30,"expected":2.0,"ratio":14.7,"rank":25}},{"word":"thesis","source":"thesis.csv","baseline":31.3,"recent":38.3,"increasePct":22.5,"multiplier":1.22,"latest":58.0,"latestMonth":"2026-04","annual":[[2004,31.6],[2005,30.4],[2006,27.3],[2007,27.0],[2008,30.8],[2009,34.2],[2010,35.6],[2011,35.4],[2012,34.4],[2013,33.5],[2014,34.5],[2015,34.8],[2016,32.9],[2017,32.0],[2018,30.7],[2019,29.5],[2020,27.3],[2021,21.0],[2022,30.6],[2023,32.3]],"recentSeries":[["2024-01",38.0],["2024-02",37.7],["2024-03",39.7],["2024-04",34.7],["2024-05",27.7],["2024-06",19.0],["2024-07",16.0],["2024-08",24.0],["2024-09",32.7],["2024-10",37.3],["2024-11",34.0],["2024-12",30.7],["2025-01",32.3],["2025-02",33.7],["2025-03",35.3],["2025-04",31.3],["2025-05",25.3],["2025-06",20.7],["2025-07",21.0],["2025-08",29.0],["2025-09",36.0],["2025-10",41.3],["2025-11",46.3],["2025-12",58.0],["2026-01",77.0],["2026-02",80.7],["2026-03",74.7],["2026-04",62.0]],"coding":{"word":"thesis","label":"thesis","observed":65,"expected":9.8,"ratio":6.7,"rank":29}},{"word":"framing","source":"framing.csv","baseline":34.9,"recent":41.9,"increasePct":20.1,"multiplier":1.2,"latest":77.0,"latestMonth":"2026-04","annual":[[2004,45.8],[2005,43.8],[2006,41.1],[2007,36.5],[2008,35.7],[2009,39.2],[2010,32.1],[2011,30.8],[2012,28.3],[2013,28.8],[2014,29.4],[2015,29.2],[2016,30.6],[2017,31.4],[2018,31.9],[2019,32.5],[2020,34.9],[2021,41.0],[2022,37.7],[2023,37.1]],"recentSeries":[["2024-01",38.0],["2024-02",38.3],["2024-03",38.7],["2024-04",37.7],["2024-05",36.3],["2024-06",35.3],["2024-07",35.0],["2024-08",35.7],["2024-09",36.7],["2024-10",37.7],["2024-11",37.7],["2024-12",37.7],["2025-01",38.0],["2025-02",39.0],["2025-03",39.7],["2025-04",39.3],["2025-05",39.3],["2025-06",39.7],["2025-07",41.0],["2025-08",42.0],["2025-09",43.0],["2025-10",44.0],["2025-11",44.7],["2025-12",45.3],["2026-01",48.3],["2026-02",52.3],["2026-03",62.7],["2026-04",67.0]],"coding":{"word":"framing","label":"framing","observed":82,"expected":3.3,"ratio":24.8,"rank":12}}]};
  const SVG_NS = "http://www.w3.org/2000/svg";
  let instanceCounter = 0;

  function injectStyles() {
    if (document.getElementById("llm-word-trends-styles")) return;
    const style = document.createElement("style");
    style.id = "llm-word-trends-styles";
    style.textContent = `
      .llm-word-trends {
        --trend-panel: var(--table-background-color);
        --trend-soft: var(--code-background-color);
        margin: 34px -14px;
        padding: 18px;
        border: 1px solid var(--border-color);
        border-radius: 7px;
        background: var(--trend-panel);
        box-shadow: 0 1px 10px var(--pre-shadow);
      }

      .llm-word-trends * { box-sizing: border-box; }

      .llm-word-trends__head {
        display: grid;
        grid-template-columns: minmax(180px, 260px) 1fr;
        gap: 18px;
        align-items: end;
        margin-bottom: 14px;
      }

      .llm-word-trends__label {
        display: block;
        color: var(--faded-color);
        font: 700 12px/1.3 'Ubuntu Mono', 'Consolas', monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .llm-word-trends__select {
        display: block;
        width: 100%;
        margin-top: 6px;
        padding: 7px 30px 7px 10px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--background-color);
        color: var(--text-color);
        font: inherit;
      }

      .llm-word-trends__intro {
        margin: 0;
        color: var(--faded-color);
        font-size: 14px;
        line-height: 1.55;
      }

      .llm-word-trends__stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 14px;
      }

      .llm-word-trends__stat {
        min-width: 0;
        padding: 10px 11px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--background-color);
      }

      .llm-word-trends__stat-label {
        display: block;
        margin-bottom: 4px;
        color: var(--faded-color);
        font: 700 11px/1.2 'Ubuntu Mono', 'Consolas', monospace;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .llm-word-trends__stat-value {
        display: block;
        color: var(--header-color);
        font-family: 'Lora', serif;
        font-size: clamp(21px, 3.6vw, 32px);
        line-height: 1.05;
      }

      .llm-word-trends__stat-value--accent { color: var(--secondary-color); }

      .llm-word-trends__chart {
        overflow: hidden;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--background-color);
      }

      .llm-word-trends svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .llm-word-trends svg text {
        fill: var(--faded-color);
        font: 12px/1.2 'Ubuntu Mono', 'Consolas', monospace;
      }

      .llm-word-trends .trend-bg-history { fill: var(--code-background-color); opacity: 0.58; }
      .llm-word-trends .trend-bg-recent { fill: var(--table-background-color); opacity: 0.72; }
      .llm-word-trends .trend-grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.46; }
      .llm-word-trends .trend-axis { stroke: var(--border-color); stroke-width: 1.2; }
      .llm-word-trends .trend-break { stroke: var(--faded-color); stroke-width: 1.5; fill: none; opacity: 0.8; }
      .llm-word-trends .trend-line { fill: none; stroke: var(--primary-color); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
      .llm-word-trends .trend-line--connector { stroke-dasharray: 4 5; opacity: 0.55; }
      .llm-word-trends .trend-dot { fill: var(--primary-color); stroke: var(--background-color); stroke-width: 2; }
      .llm-word-trends .trend-mean { stroke: var(--secondary-color); stroke-width: 1.6; stroke-dasharray: 6 5; }
      .llm-word-trends .trend-recent-mean { stroke: var(--primary-color); stroke-width: 1.5; stroke-dasharray: 3 5; opacity: 0.68; }
      .llm-word-trends .trend-label-strong { fill: var(--text-color); }
      .llm-word-trends .trend-label-accent { fill: var(--secondary-color); }
      .llm-word-trends .trend-label-primary { fill: var(--primary-color); }

      .llm-word-trends__caption {
        margin: 10px 2px 0;
        color: var(--faded-color);
        font-size: 13px;
        line-height: 1.5;
      }

      @media (max-width: 820px) {
        .llm-word-trends__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 720px) {
        .llm-word-trends { margin-left: 0; margin-right: 0; padding: 12px; }
        .llm-word-trends__head { grid-template-columns: 1fr; gap: 10px; }
        .llm-word-trends__stats { grid-template-columns: 1fr; }
        .llm-word-trends svg text { font-size: 13px; }
      }

    `;
    document.head.appendChild(style);
  }

  function svgEl(name, attrs, text) {
    const el = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value !== null && value !== undefined) el.setAttribute(key, String(value));
      }
    }
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function formatMean(value) {
    return value.toFixed(1);
  }

  function formatPct(value) {
    return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
  }

  function formatRatio(value) {
    return `${value.toFixed(1)}×`;
  }

  function formatMonth(ym) {
    const [year, month] = ym.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));
    return date.toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function monthToDecimal(ym) {
    const [year, month] = ym.split("-").map(Number);
    return year + (month - 1) / 12;
  }

  function makePath(points, xScale, yScale) {
    return points.map((point, idx) => `${idx ? "L" : "M"}${xScale(point.t).toFixed(1)} ${yScale(point.v).toFixed(1)}`).join(" ");
  }

  function line(svg, x1, y1, x2, y2, className) {
    svg.appendChild(svgEl("line", { x1, y1, x2, y2, class: className }));
  }

  function renderChart(wordData, titleId, descId) {
    const width = 760;
    const height = 360;
    const left = 50;
    const right = 24;
    const top = 26;
    const bottom = 48;
    const plotTop = top;
    const plotBottom = height - bottom;
    const plotHeight = plotBottom - plotTop;
    const plotWidth = width - left - right;
    const gap = 30;
    const historyWidth = Math.round(plotWidth * 0.42);
    const historyStart = left;
    const historyEnd = historyStart + historyWidth;
    const recentStart = historyEnd + gap;
    const recentEnd = width - right;
    const axisY = plotBottom;
    const latestDecimal = monthToDecimal(DATA.sourceRange[1]);

    const historyPoints = wordData.annual.map(([year, value]) => ({ t: year + 0.5, v: value }));
    const recentPoints = wordData.recentSeries.map(([ym, value]) => ({ t: monthToDecimal(ym), v: value }));

    const xHistory = (t) => historyStart + ((t - 2004) / 20) * historyWidth;
    const xRecent = (t) => recentStart + ((t - 2024) / Math.max(0.01, latestDecimal - 2024)) * (recentEnd - recentStart);
    const y = (value) => plotBottom - (Math.max(0, Math.min(100, value)) / 100) * plotHeight;

    const svg = svgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-labelledby": `${titleId} ${descId}`,
    });

    svg.appendChild(svgEl("title", { id: titleId }, `${wordData.word} trend`));
    svg.appendChild(svgEl("desc", { id: descId }, `${wordData.word} averaged Google Trends interest. The historical period from 2004 to 2023 is compressed and annualized; the period since 2024 is expanded and smoothed with a three month moving average.`));

    svg.appendChild(svgEl("rect", { x: historyStart, y: plotTop, width: historyWidth, height: plotHeight, class: "trend-bg-history" }));
    svg.appendChild(svgEl("rect", { x: recentStart, y: plotTop, width: recentEnd - recentStart, height: plotHeight, class: "trend-bg-recent" }));

    for (const tick of [0, 25, 50, 75, 100]) {
      const ty = y(tick);
      line(svg, historyStart, ty, historyEnd, ty, "trend-grid");
      line(svg, recentStart, ty, recentEnd, ty, "trend-grid");
      svg.appendChild(svgEl("text", { x: left - 9, y: ty + 4, "text-anchor": "end" }, String(tick)));
    }

    line(svg, historyStart, axisY, historyEnd, axisY, "trend-axis");
    line(svg, recentStart, axisY, recentEnd, axisY, "trend-axis");
    line(svg, historyStart, plotTop, historyStart, plotBottom, "trend-axis");

    const meanY = y(wordData.baseline);
    const recentMeanY = y(wordData.recent);
    line(svg, historyStart, meanY, historyEnd, meanY, "trend-mean");
    line(svg, recentStart, meanY, recentEnd, meanY, "trend-mean");
    line(svg, recentStart, recentMeanY, recentEnd, recentMeanY, "trend-recent-mean");

    svg.appendChild(svgEl("path", { d: makePath(historyPoints, xHistory, y), class: "trend-line" }));
    svg.appendChild(svgEl("path", { d: makePath(recentPoints, xRecent, y), class: "trend-line" }));

    if (historyPoints.length && recentPoints.length) {
      const lastHistory = historyPoints[historyPoints.length - 1];
      const firstRecent = recentPoints[0];
      svg.appendChild(svgEl("path", {
        d: `M${xHistory(lastHistory.t).toFixed(1)} ${y(lastHistory.v).toFixed(1)}L${xRecent(firstRecent.t).toFixed(1)} ${y(firstRecent.v).toFixed(1)}`,
        class: "trend-line trend-line--connector",
      }));
    }

    for (const [year, value] of wordData.annual.filter(([year]) => year % 5 === 0)) {
      svg.appendChild(svgEl("circle", { cx: xHistory(year + 0.5), cy: y(value), r: 3, class: "trend-dot", opacity: 0.72 }));
    }
    if (recentPoints.length) {
      const last = recentPoints[recentPoints.length - 1];
      svg.appendChild(svgEl("circle", { cx: xRecent(last.t), cy: y(last.v), r: 4.5, class: "trend-dot" }));
    }

    const breakX = historyEnd + gap / 2;
    svg.appendChild(svgEl("path", { d: `M${breakX - 8} ${axisY - 7}l8 14M${breakX + 2} ${axisY - 7}l8 14`, class: "trend-break" }));
    svg.appendChild(svgEl("path", { d: `M${breakX - 8} ${plotTop + 3}l8 14M${breakX + 2} ${plotTop + 3}l8 14`, class: "trend-break", opacity: 0.45 }));

    svg.appendChild(svgEl("text", { x: historyStart, y: axisY + 24, "text-anchor": "middle" }, "2004"));
    svg.appendChild(svgEl("text", { x: xHistory(2014.5), y: axisY + 24, "text-anchor": "middle" }, "2014"));
    svg.appendChild(svgEl("text", { x: historyEnd, y: axisY + 24, "text-anchor": "middle" }, "2023"));
    svg.appendChild(svgEl("text", { x: recentStart, y: axisY + 24, "text-anchor": "middle", class: "trend-label-strong" }, "2024"));
    svg.appendChild(svgEl("text", { x: recentEnd, y: axisY + 24, "text-anchor": "end" }, formatMonth(DATA.sourceRange[1])));

    svg.appendChild(svgEl("text", { x: historyStart + 8, y: plotTop + 17, class: "trend-label-strong" }, "2004–2023 annual means"));
    svg.appendChild(svgEl("text", { x: recentStart + 8, y: plotTop + 17, class: "trend-label-strong" }, "2024–now, 3‑month average"));
    svg.appendChild(svgEl("text", { x: recentEnd - 5, y: meanY - 7, "text-anchor": "end", class: "trend-label-accent" }, `historic mean ${formatMean(wordData.baseline)}`));
    svg.appendChild(svgEl("text", { x: recentEnd - 5, y: recentMeanY + 16, "text-anchor": "end", class: "trend-label-primary" }, `recent mean ${formatMean(wordData.recent)}`));

    return svg;
  }

  function init(container) {
    if (container.dataset.llmWordTrendsInitialized === "true") return;
    container.dataset.llmWordTrendsInitialized = "true";
    container.classList.add("llm-word-trends");

    const id = ++instanceCounter;
    const selectId = `llm-word-trends-select-${id}`;
    const titleId = `llm-word-trends-title-${id}`;
    const descId = `llm-word-trends-desc-${id}`;

    container.textContent = "";

    const head = document.createElement("div");
    head.className = "llm-word-trends__head";

    const label = document.createElement("label");
    label.className = "llm-word-trends__label";
    label.setAttribute("for", selectId);
    label.appendChild(document.createTextNode("Select word"));

    const select = document.createElement("select");
    select.className = "llm-word-trends__select";
    select.id = selectId;
    for (const word of DATA.words) {
      const option = document.createElement("option");
      option.value = word.word;
      option.textContent = `${word.word} (${formatPct(word.increasePct)}, ${formatRatio(word.coding.ratio)} coding)`;
      select.appendChild(option);
    }
    label.appendChild(select);

    const intro = document.createElement("p");
    intro.className = "llm-word-trends__intro";
    intro.textContent = "Google Trends values are normalized per word. The selector shows both search-interest increase and how far the word diverged from wordfreq in coding-agent sessions.";

    head.appendChild(label);
    head.appendChild(intro);

    const stats = document.createElement("div");
    stats.className = "llm-word-trends__stats";
    stats.setAttribute("aria-live", "polite");

    const statNodes = [
      makeStat("2004–2023 mean"),
      makeStat("2024–now mean"),
      makeStat("trends increase", true),
      makeStat("coding / wordfreq", true),
    ];
    for (const stat of statNodes) stats.appendChild(stat.node);

    const chart = document.createElement("div");
    chart.className = "llm-word-trends__chart";

    const caption = document.createElement("p");
    caption.className = "llm-word-trends__caption";
    caption.textContent = `Trend increase is the mean from ${DATA.recentRange[0]} to ${DATA.recentRange[1]} divided by the pre-2024 mean. Coding divergence is observed count divided by the count expected from wordfreq.`;

    container.appendChild(head);
    container.appendChild(stats);
    container.appendChild(chart);
    container.appendChild(caption);

    function renderSelected() {
      const selected = DATA.words.find((item) => item.word === select.value) || DATA.words[0];
      statNodes[0].value.textContent = formatMean(selected.baseline);
      statNodes[1].value.textContent = formatMean(selected.recent);
      statNodes[2].value.textContent = formatRatio(selected.multiplier);
      statNodes[3].value.textContent = formatRatio(selected.coding.ratio);
      chart.textContent = "";
      chart.appendChild(renderChart(selected, titleId, descId));
    }

    select.addEventListener("change", renderSelected);
    select.value = DATA.words[0].word;
    renderSelected();
  }

  function makeStat(labelText, accent) {
    const node = document.createElement("div");
    node.className = "llm-word-trends__stat";
    const label = document.createElement("span");
    label.className = "llm-word-trends__stat-label";
    label.textContent = labelText;
    const value = document.createElement("span");
    value.className = `llm-word-trends__stat-value${accent ? " llm-word-trends__stat-value--accent" : ""}`;
    value.textContent = "—";
    node.appendChild(label);
    node.appendChild(value);
    return { node, value };
  }

  function initAll(scope) {
    injectStyles();
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll("[data-llm-word-trends]").forEach(init);
  }

  window.LLMWordTrendsInit = initAll;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAll(document));
  } else {
    initAll(document);
  }

  document.addEventListener("htmx:afterSwap", (event) => initAll(event.target));
})();
