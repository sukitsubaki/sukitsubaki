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
    
    // Fetch activity stats
    const stats = await fetchActivityStats(username, token);
    return res.json(stats);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

/**
 * Fetches activity statistics using GitHub's GraphQL API
 * @param {string} username - GitHub username
 * @param {string} token - GitHub personal access token
 * @returns {Object} Formatted activity statistics
 */
async function fetchActivityStats(username, token) {
  // GraphQL query to fetch contribution calendar and commit times
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
        }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          nodes {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100) {
                    nodes {
                      committedDate
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // Headers for GraphQL request
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Make GraphQL request
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: { username } })
  });

  // Parse response
  const result = await response.json();
  
  // Handle errors
  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    throw new Error(result.errors[0].message);
  }
  
  // Extract user data
  const user = result.data.user;
  
  // Calculate total days active manually by counting days with contributions
  const contributionDays = user.contributionsCollection.contributionCalendar.weeks
    .flatMap(week => week.contributionDays);
  
  const totalDaysActive = contributionDays.filter(day => day.contributionCount > 0).length;
  
  // Get preferred coding hour
  const commitTimes = [];
  user.repositories.nodes.forEach(repo => {
    if (!repo.defaultBranchRef || !repo.defaultBranchRef.target.history) return;
    
    repo.defaultBranchRef.target.history.nodes.forEach(commit => {
      if (commit.committedDate) {
        const date = new Date(commit.committedDate);
        commitTimes.push(date.getHours());
      }
    });
  });
  
  // Find the most common commit hour
  const hourCounts = {};
  let maxCount = 0;
  let preferredHour = 0;
  
  commitTimes.forEach(hour => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    if (hourCounts[hour] > maxCount) {
      maxCount = hourCounts[hour];
      preferredHour = hour;
    }
  });
  
  // Calculate longest commit streak
  const sortedDays = [...contributionDays].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let prevDate = null;
  
  sortedDays.forEach(day => {
    if (day.contributionCount > 0) {
      const currentDate = new Date(day.date);
      
      // Check if this is a consecutive day
      if (prevDate) {
        const dayDiff = Math.floor((currentDate - prevDate) / (24 * 60 * 60 * 1000));
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      // Update longest streak if needed
      longestStreak = Math.max(longestStreak, currentStreak);
      prevDate = currentDate;
    }
  });

  // Format final statistics
  return {
    username,
    longestCommitStreak: longestStreak,
    preferredCodingHour: preferredHour,
    totalDaysActive: totalDaysActive
  };
}
