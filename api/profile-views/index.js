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
    // Set username
    const username = req.query.username || 'sukitsubaki';
    
    // Check GitHub token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ 
        error: 'GitHub token missing. Required for API access.' 
      });
    }
    
    // Fetch profile views
    const views = await fetchProfileViews(username, token);
    return res.json(views);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

/**
 * Fetches profile view statistics with alltime counter
 * @param {string} username - GitHub username
 * @param {string} token - GitHub personal access token
 * @returns {Object} Formatted profile view statistics
 */
async function fetchProfileViews(username, token) {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  // Fetch the profile repository (username/username)
  const repoName = `${username}/${username}`;
  
  try {
    // Get views from the GitHub API (last 14 days)
    const viewsResponse = await fetch(
      `https://api.github.com/repos/${repoName}/traffic/views`,
      { headers }
    );
    
    if (!viewsResponse.ok) {
      if (viewsResponse.status === 403) {
        throw new Error('GitHub token lacks permission to access traffic data. Need "repo" scope');
      }
      throw new Error(`GitHub API Error: ${viewsResponse.status} ${viewsResponse.statusText}`);
    }

    const viewsData = await viewsResponse.json();
    
    // Get today's new views
    const todaysViews = viewsData.count || 0;
    const uniqueViews = viewsData.uniques || 0;
    
    // Fetch the current stored counter
    let allTimeViews = 0;
    let lastUpdated = '';
    let lastDailyViews = 0;
    
    try {
      // Try to get the counter file from the repository
      const counterResponse = await fetch(
        `https://raw.githubusercontent.com/${repoName}/main/.github/profile-views-alltime.json`,
        { headers }
      );
      
      if (counterResponse.ok) {
        const counterData = await counterResponse.json();
        allTimeViews = counterData.allTimeViews || 0;
        lastUpdated = counterData.lastUpdated || '';
        lastDailyViews = counterData.lastDailyViews || 0;
      }
    } catch (error) {
      console.warn('Could not fetch alltime counter, will create a new one:', error.message);
    }
    
    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate the new alltime views
    // If this is a new day, add today's views
    // If it's the same day as last update, use the higher value
    if (lastUpdated !== today) {
      allTimeViews += todaysViews;
      lastDailyViews = todaysViews;
    } else if (todaysViews > lastDailyViews) {
      // If we have more views today than last recorded, add the difference
      allTimeViews += (todaysViews - lastDailyViews);
      lastDailyViews = todaysViews;
    }
    
    return {
      username,
      todaysViews,
      uniqueViews,
      allTimeViews,
      lastUpdated: today,
      lastDailyViews,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching profile views:', error);
    throw error;
  }
}
