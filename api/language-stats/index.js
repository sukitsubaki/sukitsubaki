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
  
  // count files per language
  const languageFileCount = {};
  let totalFiles = 0;
  
  // filter out forks
  const relevantRepos = repos.filter(repo => !repo.fork);
  
  // extension to language mapping
  const extensionToLanguage = {
    // Programming languages
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.php': 'PHP',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.java': 'Java',
    '.go': 'Go',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C',
    '.hpp': 'C++',
    '.cs': 'C#',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.rs': 'Rust',
    '.dart': 'Dart',
    '.sh': 'Shell',
    '.html': 'HTML',
    '.htm': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'SCSS',
    '.less': 'Less',
    '.vue': 'Vue',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.sql': 'SQL',
    '.xml': 'XML'
  };
  
  // Language-specific weighting configuration
  const getLanguageWeights = (language) => {
    const weightConfig = {
      // Programming languages - balanced weights
      "PHP": { sizeWeight: 0.5, countWeight: 0.5 },
      "JavaScript": { sizeWeight: 0.5, countWeight: 0.5 },
      "TypeScript": { sizeWeight: 0.5, countWeight: 0.5 },
      "Python": { sizeWeight: 0.5, countWeight: 0.5 },
      "Ruby": { sizeWeight: 0.5, countWeight: 0.5 },
      "Java": { sizeWeight: 0.5, countWeight: 0.5 },
      "C#": { sizeWeight: 0.5, countWeight: 0.5 },
      "Swift": { sizeWeight: 0.5, countWeight: 0.5 },
      "Go": { sizeWeight: 0.5, countWeight: 0.5 },
      "Rust": { sizeWeight: 0.5, countWeight: 0.5 },
      "Kotlin": { sizeWeight: 0.5, countWeight: 0.5 },
      "Dart": { sizeWeight: 0.5, countWeight: 0.5 },
      "C": { sizeWeight: 0.5, countWeight: 0.5 },
      "C++": { sizeWeight: 0.5, countWeight: 0.5 },
      
      // Markup & style languages - higher weight on size
      "HTML": { sizeWeight: 0.7, countWeight: 0.3 },
      "CSS": { sizeWeight: 0.7, countWeight: 0.3 },
      "SCSS": { sizeWeight: 0.7, countWeight: 0.3 },
      "Less": { sizeWeight: 0.7, countWeight: 0.3 },
      "XML": { sizeWeight: 0.7, countWeight: 0.3 },
      "Vue": { sizeWeight: 0.6, countWeight: 0.4 },
      
      // Configuration & data languages - even higher weight on size
      "JSON": { sizeWeight: 0.8, countWeight: 0.2 },
      "YAML": { sizeWeight: 0.8, countWeight: 0.2 },
      "Markdown": { sizeWeight: 0.8, countWeight: 0.2 },
      "SQL": { sizeWeight: 0.7, countWeight: 0.3 },
      
      // Shell scripts - emphasis on file count
      "Shell": { sizeWeight: 0.3, countWeight: 0.7 },
      
      // Default weights for unlisted languages
      "default": { sizeWeight: 0.6, countWeight: 0.4 }
    };
    
    return weightConfig[language] || weightConfig.default;
  };
  
  // iterate all repositories
  for (const repo of relevantRepos) {
    // Get language bytes
    const langResponse = await fetch(repo.languages_url, { headers });
    
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
    
    // Now get files and count them by language
    try {
      // Get all files in the repository
      const contentResponse = await fetch(`https://api.github.com/repos/${username}/${repo.name}/git/trees/HEAD?recursive=1`, { headers });
      
      if (!contentResponse.ok) {
        console.warn(`Warning: Could not fetch files for ${repo.name}: ${contentResponse.status}`);
        continue;
      }
      
      const content = await contentResponse.json();
      
      // Filter only files (not directories)
      const files = content.tree.filter(item => item.type === 'blob');
      
      // Count files by language
      for (const file of files) {
        // Get file extension
        const path = file.path;
        const lastDotIndex = path.lastIndexOf('.');
        if (lastDotIndex === -1) continue; // Skip files without extension
        
        const extension = path.substring(lastDotIndex).toLowerCase();
        const language = extensionToLanguage[extension];
        
        // Only count if we know the language and it exists in our byte calculation
        if (language && Object.keys(languageBytes).includes(language)) {
          languageFileCount[language] = (languageFileCount[language] || 0) + 1;
          totalFiles++;
        }
      }
    } catch (error) {
      console.error(`Error fetching files for ${repo.name}:`, error);
      // Continue with next repository
    }
  }
  
  // calculate percentage for bytes
  const bytesPercentages = {};
  for (const [language, bytes] of Object.entries(languageBytes)) {
    bytesPercentages[language] = (bytes / totalBytes) * 100;
  }
  
  // calculate percentage for files
  const filePercentages = {};
  for (const [language, count] of Object.entries(languageFileCount)) {
    filePercentages[language] = (count / totalFiles) * 100;
  }
  
  // combine metrics with dynamic weighting
  const combinedPercentages = {};
  const allLanguages = new Set([...Object.keys(languageBytes), ...Object.keys(languageFileCount)]);
  
  for (const language of allLanguages) {
    const bytePercent = bytesPercentages[language] || 0;
    const filePercent = filePercentages[language] || 0;
    const weights = getLanguageWeights(language);
    
    combinedPercentages[language] = (bytePercent * weights.sizeWeight) + (filePercent * weights.countWeight);
  }
  
  // sort percentage results
  const languagePercentages = Object.entries(combinedPercentages)
    .map(([language, percentage]) => ({
      language,
      bytes: languageBytes[language] || 0,
      fileCount: languageFileCount[language] || 0,
      bytesPercentage: (bytesPercentages[language] || 0).toFixed(2),
      filePercentage: (filePercentages[language] || 0).toFixed(2),
      percentage: percentage.toFixed(2),
      weights: getLanguageWeights(language)
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  
  // format results
  const results = {
    username,
    totalRepos: relevantRepos.length,
    totalBytes,
    totalFiles,
    languages: {}
  };
  
  languagePercentages.forEach(item => {
    results.languages[item.language] = {
      bytes: item.bytes,
      fileCount: item.fileCount || 0,
      bytesPercentage: `${item.bytesPercentage}%`,
      filePercentage: `${item.filePercentage}%`,
      percentage: `${item.percentage}%`,
      sizeWeight: item.weights.sizeWeight,
      countWeight: item.weights.countWeight
    };
  });
  
  return results;
}