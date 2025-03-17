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
 * Fetches profile view statistics using GitHub's REST API
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
    
    // Sum up the views
    const totalViews = viewsData.count || 0;
    const uniqueViews = viewsData.uniques || 0;
    
    // Get tracker data if available (custom tracker in repo, optional)
    let trackerViews = 0;
    try {
      const trackerResponse = await fetch(
        `https://raw.githubusercontent.com/${repoName}/main/.github/profile-views-counter.json`,
        { headers }
      );
      
      if (trackerResponse.ok) {
        const trackerData = await trackerResponse.json();
        trackerViews = trackerData.count || 0;
      }
    } catch (error) {
      // Ignore errors when fetching the tracker, it's optional
      console.warn('Could not fetch profile view tracker data:', error.message);
    }
    
    // Use the higher value between GitHub traffic and custom tracker
    const totalProfileViews = Math.max(totalViews, trackerViews);
    
    return {
      username,
      totalViews: totalProfileViews,
      uniqueViews,
      period: 'last 14 days',
      trackerViews,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching profile views:', error);
    throw error;
  }
}
