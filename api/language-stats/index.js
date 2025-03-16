const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // CORS-Header setzen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // set username
    const username = req.query.username || 'sukitsubaki';
    
    // check GitHub token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ 
        error: 'Token missing, no access to private repositories.' 
      });
    }
    
    const stats = await getLanguageStats(username, token);
    return res.json(stats);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

async function getLanguageStats(username, token) {
  const headers = { Authorization: `token ${token}` };
  
  // check all repositories (public and private)
  const reposResponse = await fetch(
    `https://api.github.com/user/repos?per_page=100&affiliation=owner`,
    { headers }
  );
  
  if (!reposResponse.ok) {
    throw new Error(`GitHub API Fehler: ${reposResponse.status} ${reposResponse.statusText}`);
  }
  
  const repos = await reposResponse.json();
  
  // count bytes
  const languageBytes = {};
  let totalBytes = 0;
  
  // count in how many repositories a language is used
  const languageRepoCount = {};
  
  // iterate all repositories
  for (const repo of repos) {
    // Überspringe Forks
    if (repo.fork) continue;
    
    const langResponse = await fetch(repo.languages_url, { headers });
    
    if (!langResponse.ok) {
      console.warn(`Warnung: Konnte Sprachen für ${repo.name} nicht abrufen: ${langResponse.status}`);
      continue;
    }
    
    const languages = await langResponse.json();
    
    // add bytes for each language
    for (const [language, bytes] of Object.entries(languages)) {
      // sum up
      languageBytes[language] = (languageBytes[language] || 0) + bytes;
      totalBytes += bytes;
      
      // increase repository counter
      languageRepoCount[language] = (languageRepoCount[language] || 0) + 1;
    }
  }
  
  // calculate percentage for bytes
  const bytesPercentages = {};
  for (const [language, bytes] of Object.entries(languageBytes)) {
    bytesPercentages[language] = (bytes / totalBytes) * 100;
  }
  
  // calculate percentage for repositories
  const totalReposCounted = Object.values(languageRepoCount).reduce((sum, count) => sum + count, 0);
  const repoPercentages = {};
  for (const [language, count] of Object.entries(languageRepoCount)) {
    repoPercentages[language] = (count / totalReposCounted) * 100;
  }
  
  // combine both metrics with 50-50 weighting
  const combinedPercentages = {};
  for (const language of Object.keys(languageBytes)) {
    combinedPercentages[language] = 
      (bytesPercentages[language] * 0.5) + 
      (repoPercentages[language] * 0.5);
  }
  
  // sort percentage results
  const languagePercentages = Object.entries(combinedPercentages)
    .map(([language, percentage]) => ({
      language,
      bytes: languageBytes[language],
      repoCount: languageRepoCount[language],
      bytesPercentage: bytesPercentages[language].toFixed(2),
      repoPercentage: repoPercentages[language].toFixed(2),
      percentage: percentage.toFixed(2)
    }))
    .sort((a, b) => b.percentage - a.percentage);
  
  // format results
  const results = {
    username,
    totalRepos: repos.filter(repo => !repo.fork).length,
    totalBytes,
    languages: {}
  };
  
  languagePercentages.forEach(item => {
    results.languages[item.language] = {
      bytes: item.bytes,
      repoCount: item.repoCount,
      bytesPercentage: `${item.bytesPercentage}%`,
      repoPercentage: `${item.repoPercentage}%`,
      percentage: `${item.percentage}%`
    };
  });
  
  return results;
}
