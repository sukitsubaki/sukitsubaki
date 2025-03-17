// API entry point for direct API calls
// Routes are mainly handled by vercel.json config

module.exports = (req, res) => {
  // Set CORS headers for API access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Return API information and endpoints
  res.json({
    name: "SukiTsubaki GitHub Stats API",
    version: "1.0.0",
    description: "API for fetching and displaying GitHub profile statistics",
    endpoints: [
      {
        path: "/language-stats",
        description: "Analyzes repositories and returns statistics about programming languages used"
      },
      {
        path: "/contribution-stats",
        description: "Retrieves contribution activities on GitHub (commits, PRs, issues, etc.)"
      },
      {
        path: "/activity-stats",
        description: "Provides data about activity patterns like commit streaks and preferred coding hours"
      },
      {
        path: "/profile-views",
        description: "Tracks profile view count statistics"
      }
    ],
    documentation: "https://sukitsubaki.vercel.app",
    source: "https://github.com/sukitsubaki/sukitsubaki"
  });
};
