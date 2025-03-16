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
    { headers, timeout: 10000 }
  );
  
  if (!reposResponse.ok) {
    throw new Error(`GitHub API Error: ${reposResponse.status} ${reposResponse.statusText}`);
  }
  
  const repos = await reposResponse.json();
  
  // count bytes
  const languageBytes = {};
  let totalBytes = 0;
  
  // filter out forks
  const relevantRepos = repos.filter(repo => !repo.fork);
  
  // First, just collect the language bytes - this is more reliable
  for (const repo of relevantRepos) {
    try {
      const langResponse = await fetch(repo.languages_url, { 
        headers, 
        timeout: 5000 
      });
      
      if (!langResponse.ok) {
        console.warn(`Warning: Could not fetch languages for ${repo.name}: ${langResponse.status}`);
        continue;
      }
      
      const languages = await langResponse.json();
      
      // add bytes for each language
      for (const [language, bytes] of Object.entries(languages)) {
        languageBytes[language] = (languageBytes[language] || 0) + bytes;
        totalBytes += bytes;
      }
    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error.message);
    }
  }
  
  // Now try to estimate file counts based on typical code size per language
  // This avoids the expensive tree fetching that can cause timeouts
  const languageFileCount = {};
  let totalFiles = 0;
  
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
  
  // Estimate file counts based on bytes
  for (const [language, bytes] of Object.entries(languageBytes)) {
    const avgBytes = avgBytesPerFile[language] || avgBytesPerFile['default'];
    const estimatedFiles = Math.ceil(bytes / avgBytes);
    languageFileCount[language] = estimatedFiles;
    totalFiles += estimatedFiles;
  }
  
  // Calculate percentage for bytes
  const bytesPercentages = {};
  for (const [language, bytes] of Object.entries(languageBytes)) {
    bytesPercentages[language] = (bytes / totalBytes) * 100;
  }
  
  // Calculate percentage for files
  const filePercentages = {};
  for (const [language, count] of Object.entries(languageFileCount)) {
    filePercentages[language] = (count / totalFiles) * 100;
  }
  
  // Combine both metrics with 50-50 weighting
  const combinedPercentages = {};
  
  for (const language of Object.keys(languageBytes)) {
    const bytePercent = bytesPercentages[language];
    const filePercent = filePercentages[language];
    combinedPercentages[language] = (bytePercent * 0.5) + (filePercent * 0.5);
  }
  
  // Sort percentage results
  const languagePercentages = Object.entries(combinedPercentages)
    .map(([language, percentage]) => ({
      language,
      bytes: languageBytes[language],
      fileCount: languageFileCount[language],
      bytesPercentage: bytesPercentages[language].toFixed(2),
      filePercentage: filePercentages[language].toFixed(2),
      percentage: percentage.toFixed(2)
    }))
    .sort((a, b) => b.percentage - a.percentage);
  
  // Format results
  const results = {
    username,
    totalRepos: relevantRepos.length,
    totalBytes,
    totalFiles,
    languages: {},
    note: "File counts are estimated based on typical file sizes per language"
  };
  
  languagePercentages.forEach(item => {
    results.languages[item.language] = {
      bytes: item.bytes,
      fileCount: item.fileCount,
      bytesPercentage: `${item.bytesPercentage}%`,
      filePercentage: `${item.filePercentage}%`,
      percentage: `${item.percentage}%`
    };
  });
  
  return results;
}
