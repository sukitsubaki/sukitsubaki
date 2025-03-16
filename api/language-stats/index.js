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
    
    // Set a timeout for the entire function
    const functionTimeout = setTimeout(() => {
      res.status(500).json({ error: 'Function timeout exceeded. Try again later.' });
    }, 25000); // 25 seconds timeout (Vercel limits are 30s in hobby plan)
    
    const stats = await getLanguageStats(username, token);
    
    // Clear the timeout if we completed successfully
    clearTimeout(functionTimeout);
    
    return res.json(stats);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// Helper function for fetching with timeout
async function fetchWithTimeout(url, options, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getLanguageStats(username, token) {
  const headers = { Authorization: `token ${token}` };
  
  // check all repositories (public and private)
  try {
    const reposResponse = await fetchWithTimeout(
      `https://api.github.com/user/repos?per_page=100&affiliation=owner`,
      { headers },
      8000 // 8 second timeout for repo list
    );
    
    if (!reposResponse.ok) {
      throw new Error(`GitHub API Error: ${reposResponse.status} ${reposResponse.statusText}`);
    }
    
    const repos = await reposResponse.json();
    
    // count bytes
    const languageBytes = {};
    let totalBytes = 0;
    
    // Count actual files by language
    const languageFileCount = {};
    let totalFiles = 0;
    
    // Language detection by file extension
    const extensionToLanguage = {
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
    
    // First get all language bytes (this is reliable and quick)
    const relevantRepos = repos.filter(repo => !repo.fork);
    
    // Keep track of analyzed repos for user feedback
    const analyzedRepos = [];
    const skippedRepos = [];
    
    for (const repo of relevantRepos) {
      try {
        // Get language bytes
        const langResponse = await fetchWithTimeout(
          repo.languages_url,
          { headers },
          5000
        );
        
        if (!langResponse.ok) {
          console.warn(`Warning: Could not fetch languages for ${repo.name}: ${langResponse.status}`);
          skippedRepos.push({ name: repo.name, reason: `API error: ${langResponse.status}` });
          continue;
        }
        
        const languages = await langResponse.json();
        
        // add bytes for each language
        for (const [language, bytes] of Object.entries(languages)) {
          languageBytes[language] = (languageBytes[language] || 0) + bytes;
          totalBytes += bytes;
        }
        
        // Skip large repositories (GitHub truncates tree results for repos > 1000 files)
        if (repo.size > 50000) { // Size in KB
          skippedRepos.push({ name: repo.name, reason: "Repository too large" });
          continue;
        }
        
        // Now get files and count by extension
        // Try to get the default branch first
        const defaultBranch = repo.default_branch || 'main';
        
        const treeResponse = await fetchWithTimeout(
          `https://api.github.com/repos/${repo.owner.login}/${repo.name}/git/trees/${defaultBranch}?recursive=1`,
          { headers },
          7000 // 7 second timeout for tree fetch
        );
        
        // Handle case where tree can't be fetched
        if (!treeResponse.ok) {
          skippedRepos.push({ 
            name: repo.name, 
            reason: `Tree API error: ${treeResponse.status}` 
          });
          continue;
        }
        
        const treeData = await treeResponse.json();
        
        // Check if GitHub truncated the results
        if (treeData.truncated) {
          skippedRepos.push({ 
            name: repo.name, 
            reason: "Tree results truncated by GitHub" 
          });
          continue;
        }
        
        // Process files in this repo
        const files = treeData.tree.filter(item => item.type === 'blob');
        
        // Count files by language
        for (const file of files) {
          const path = file.path;
          const lastDotIndex = path.lastIndexOf('.');
          
          // Skip files without extensions
          if (lastDotIndex === -1) continue;
          
          const extension = path.substring(lastDotIndex).toLowerCase();
          const language = extensionToLanguage[extension];
          
          // Only count if we can map to a language that's in our bytes calculation
          if (language && Object.keys(languageBytes).includes(language)) {
            languageFileCount[language] = (languageFileCount[language] || 0) + 1;
            totalFiles++;
          }
        }
        
        // Mark this repo as successfully analyzed
        analyzedRepos.push(repo.name);
        
      } catch (error) {
        // Log error but continue with other repos
        console.error(`Error processing repo ${repo.name}:`, error.message);
        skippedRepos.push({ name: repo.name, reason: error.message });
      }
    }
    
    // Check if we have file counts - if not, we can't do the 50/50 weighting
    if (totalFiles === 0) {
      // Just use bytes for percentages
      const percentages = {};
      for (const [language, bytes] of Object.entries(languageBytes)) {
        percentages[language] = (bytes / totalBytes * 100).toFixed(2);
      }
      
      // Sort and format results
      const sortedLanguages = Object.entries(percentages)
        .map(([language, percentage]) => ({
          language,
          bytes: languageBytes[language],
          percentage
        }))
        .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
      
      // Format results
      const results = {
        username,
        totalRepos: relevantRepos.length,
        analyzedRepos: analyzedRepos.length,
        skippedRepos: skippedRepos.length,
        totalBytes,
        note: "Could not count files, using bytes only for percentages",
        languages: {}
      };
      
      sortedLanguages.forEach(item => {
        results.languages[item.language] = {
          bytes: item.bytes,
          percentage: `${item.percentage}%`
        };
      });
      
      return results;
    }
    
    // If we got here, we have file counts, so use the 50/50 weighting
    
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
    
    // combine both metrics with 50-50 weighting
    const combinedPercentages = {};
    
    // Use both language lists to ensure we include languages that might be in one list but not the other
    const allLanguages = new Set([...Object.keys(languageBytes), ...Object.keys(languageFileCount)]);
    
    for (const language of allLanguages) {
      const bytePercent = bytesPercentages[language] || 0;
      const filePercent = filePercentages[language] || 0;
      combinedPercentages[language] = (bytePercent * 0.5) + (filePercent * 0.5);
    }
    
    // sort percentage results
    const languagePercentages = Object.entries(combinedPercentages)
      .map(([language, percentage]) => ({
        language,
        bytes: languageBytes[language] || 0,
        fileCount: languageFileCount[language] || 0,
        bytesPercentage: (bytesPercentages[language] || 0).toFixed(2),
        filePercentage: (filePercentages[language] || 0).toFixed(2),
        percentage: percentage.toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    
    // format results
    const results = {
      username,
      totalRepos: relevantRepos.length,
      analyzedRepos: analyzedRepos.length,
      skippedRepos: skippedRepos.length,
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
        percentage: `${item.percentage}%`
      };
    });
    
    return results;
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}
