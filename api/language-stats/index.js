const fetch = require('node-fetch');
module.exports = async (req, res) => {
  // Set CORS headers
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
    throw new Error(`GitHub API Error: ${reposResponse.status} ${reposResponse.statusText}`);
  }
  
  const repos = await reposResponse.json();
  
  // count bytes
  const languageBytes = {};
  let totalBytes = 0;
  
  // For tracking file estimates
  const languageFileEstimates = {};
  let totalFileEstimates = 0;
  
  // Average bytes per file by language (rough estimates)
  const avgBytesPerFile = {
    'JavaScript': 3000,
    'TypeScript': 2800,
    'PHP': 4000,
    'Python': 2500,
    'HTML': 5000,
    'CSS': 3500,
    'Java': 4500,
    'C#': 4000,
    'C++': 3500,
    'Ruby': 2000,
    'Go': 3000,
    'Rust': 3500,
    'Shell': 1000,
    // Default for other languages
    'default': 3500
  };
  
  // iterate all repositories
  for (const repo of repos) {
    // Skip forks
    if (repo.fork) continue;
    
    const langResponse = await fetch(repo.languages_url, { headers });
    
    if (!langResponse.ok) {
      console.warn(`Warning: Could not fetch languages for ${repo.name}: ${langResponse.status}`);
      continue;
    }
    
    const languages = await langResponse.json();
    
    // add bytes for each language
    for (const [language, bytes] of Object.entries(languages)) {
      // sum up bytes
      languageBytes[language] = (languageBytes[language] || 0) + bytes;
      totalBytes += bytes;
      
      // Estimate file count based on average file size
      const avgBytes = avgBytesPerFile[language] || avgBytesPerFile['default'];
      const estimatedFiles = Math.ceil(bytes / avgBytes);
      languageFileEstimates[language] = (languageFileEstimates[language] || 0) + estimatedFiles;
      totalFileEstimates += estimatedFiles;
    }
  }
  
  // calculate percentage for bytes
  const bytesPercentages = {};
  for (const [language, bytes] of Object.entries(languageBytes)) {
    bytesPercentages[language] = (bytes / totalBytes) * 100;
  }
  
  // calculate percentage for estimated files
  const filePercentages = {};
  for (const [language, count] of Object.entries(languageFileEstimates)) {
    filePercentages[language] = (count / totalFileEstimates) * 100;
  }
  
  // combine both metrics with 50-50 weighting
  const combinedPercentages = {};
  for (const language of Object.keys(languageBytes)) {
    combinedPercentages[language] = 
      (bytesPercentages[language] * 0.5) + 
      (filePercentages[language] * 0.5);
  }
  
  // sort percentage results
  const languagePercentages = Object.entries(combinedPercentages)
    .map(([language, percentage]) => ({
      language,
      bytes: languageBytes[language],
      estimatedFiles: languageFileEstimates[language],
      bytesPercentage: bytesPercentages[language].toFixed(2),
      filePercentage: filePercentages[language].toFixed(2),
      percentage: percentage.toFixed(2)
    }))
    .sort((a, b) => b.percentage - a.percentage);
  
  // format results
  const results = {
    username,
    totalRepos: repos.filter(repo => !repo.fork).length,
    totalBytes,
    totalEstimatedFiles: totalFileEstimates,
    note: "File counts are estimated based on typical file sizes per language",
    languages: {}
  };
  
  languagePercentages.forEach(item => {
    results.languages[item.language] = {
      bytes: item.bytes,
      estimatedFiles: item.estimatedFiles,
      bytesPercentage: `${item.bytesPercentage}%`,
      filePercentage: `${item.filePercentage}%`,
      percentage: `${item.percentage}%`
    };
  });
  
  return results;
}
