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
    
    // Fetch contribution stats
    const stats = await fetchContributionStats(username, token);
    return res.json(stats);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

/**
 * Fetches contribution statistics using GitHub's GraphQL API
 * @param {string} username - GitHub username
 * @param {string} token - GitHub personal access token
 * @returns {Object} Formatted contribution statistics
 */
async function fetchContributionStats(username, token) {
  // GraphQL query to fetch contributions, stars, and other metrics
  const query = `
    query($username: String!) {
      user(login: $username) {
        name
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          restrictedContributionsCount
          totalRepositoryContributions
        }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          totalCount
          nodes {
            stargazerCount
            forkCount
          }
        }
        pullRequests(first: 1) {
          totalCount
        }
        issues(first: 1) {
          totalCount
        }
        issueComments(first: 1) {
          totalCount
        }
        repositoryDiscussions(first: 1) {
          totalCount
        }
        repositoryDiscussionComments(first: 1) {
          totalCount
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
  
  // Calculate total stars and forks
  let totalStars = 0;
  let totalForks = 0;
  
  user.repositories.nodes.forEach(repo => {
    totalStars += repo.stargazerCount;
    totalForks += repo.forkCount;
  });
  
  // Get total comments, issue contributions, and discussion comments
  const totalIssueComments = user.issueComments ? user.issueComments.totalCount : 0;
  const totalDiscussions = user.repositoryDiscussions ? user.repositoryDiscussions.totalCount : 0;
  const totalDiscussionComments = user.repositoryDiscussionComments ? user.repositoryDiscussionComments.totalCount : 0;
  
  // We'll count all comments as part of issue contributions
  // Since we can't reliably distinguish between PR and issue comments
  const issueContributions = user.contributionsCollection.totalIssueContributions || 0;
  
  // Add all comments to issue contributions total
  const totalIssueContributions = issueContributions + totalIssueComments;
  
  // Combine discussions and comments
  const totalDiscussionsAndComments = totalDiscussions + totalDiscussionComments;

  // Create contribution summary
  const contribs = user.contributionsCollection;
  
  // Combine pull requests and reviews
  const totalPullRequestsAndReviews = user.pullRequests.totalCount + contribs.totalPullRequestReviewContributions;
  
  // Calculate total contributions
  const totalContributions = 
    contribs.totalCommitContributions +
    totalIssueContributions + // Use our adjusted value that includes all comments
    contribs.totalPullRequestContributions +
    contribs.totalPullRequestReviewContributions +
    contribs.totalRepositoryContributions +
    totalDiscussions +
    totalDiscussionComments;

  // Format final statistics
  return {
    username,
    name: user.name,
    totalContributions,
    commits: contribs.totalCommitContributions,
    issuesCreated: user.issues.totalCount,
    issueContributions: totalIssueContributions, // Including all comments
    pullRequestsCreated: user.pullRequests.totalCount,
    pullRequestContributions: contribs.totalPullRequestContributions,
    // pullRequestComments field removed
    pullRequestReviews: contribs.totalPullRequestReviewContributions,
    pullRequestsAndReviews: totalPullRequestsAndReviews,
    repositoriesCreated: contribs.totalRepositoryContributions,
    repositoriesCount: user.repositories.totalCount,
    discussions: totalDiscussions,
    discussionComments: totalDiscussionComments,
    discussionsAndComments: totalDiscussionsAndComments,
    stars: totalStars,
    forks: totalForks
  };
}
