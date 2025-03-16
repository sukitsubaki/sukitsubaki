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
    throw new Error(`GitHub API error: ${reposResponse.status} ${reposResponse.statusText}`);
  }
  
  const repos = await reposResponse.json();
  
  // count bytes
  const languageBytes = {};
  let totalBytes = 0;
  
  // iterate all repositories
  for (const repo of repos) {

    // skip forks
    if (repo.fork) continue;
    
    const langResponse = await fetch(repo.languages_url, { headers });
    
    if (!langResponse.ok) {
      console.warn(`Warning: Could not get languages for ${repo.name}: ${langResponse.status}`);
      continue;
    }
    
    const languages = await langResponse.json();
    
    // add bytes for each language
    for (const [language, bytes] of Object.entries(languages)) {
      languageBytes[language] = (languageBytes[language] || 0) + bytes;
      totalBytes += bytes;
    }
  }
  
  // convert bytes in percentage and sort
  const languagePercentages = Object.entries(languageBytes)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: (bytes / totalBytes * 100).toFixed(2)
    }))
    .sort((a, b) => b.bytes - a.bytes);
  
  // format results
  const results = {
    username,
    totalRepos: repos.length,
    totalBytes,
    languages: {}
  };
  
  languagePercentages.forEach(item => {
    results.languages[item.language] = {
      bytes: item.bytes,
      percentage: `${item.percentage}%`
    };
  });
  
  return results;
}
