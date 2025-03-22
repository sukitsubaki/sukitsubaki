const fs = require("fs");
const fetch = require("node-fetch");

// Fetch contribution stats from API
async function fetchStats() {
  try {
    const response = await fetch(process.env.API_URL);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

// Format numbers with comma separators
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Main function to update README
async function updateReadme() {
  try {
    // Read the README file
    const readme = fs.readFileSync('README.md', 'utf8');
    
    // Fetch stats
    const stats = await fetchStats();
    
    // Format the values for contribution stats
    const formattedContribution = {
      commits: formatNumber(stats.commits),
      issuesCreated: formatNumber(stats.issuesCreated),
      issueContrib: formatNumber(stats.issueContributions),
      prCreated: formatNumber(stats.pullRequestsCreated),
      prComments: formatNumber(stats.pullRequestComments || 0),
      prReviews: formatNumber(stats.pullRequestReviews),
      discussions: formatNumber(stats.discussions + stats.discussionComments)
    };
    
    // Calculate sum of all contributions
    const totalContributions = 
      parseInt(stats.commits) + 
      parseInt(stats.issuesCreated) + 
      parseInt(stats.issueContributions) + 
      parseInt(stats.pullRequestsCreated) + 
      parseInt(stats.pullRequestComments || 0) + 
      parseInt(stats.pullRequestReviews) + 
      (parseInt(stats.discussions) + parseInt(stats.discussionComments));
    
    // Find the position of the contribution_stats section with a more specific pattern
    const startPattern = /^\s*self\.contribution_stats\s*=\s*\{/m;
    const startMatch = readme.match(startPattern);
    
    if (!startMatch) {
      throw new Error("Could not find the contribution_stats section in README.md");
    }
    
    // Get the position of the match
    const startPosition = startMatch.index;
    
    // Find the closing bracket for this section
    // Count the opening and closing brackets to find the correct closing one
    let openBrackets = 1;
    let endPosition = startPosition + startMatch[0].length;
    
    while (openBrackets > 0 && endPosition < readme.length) {
      if (readme[endPosition] === '{') {
        openBrackets++;
      } else if (readme[endPosition] === '}') {
        openBrackets--;
      }
      endPosition++;
    }
    
    if (openBrackets !== 0) {
      throw new Error("Could not find the closing bracket for contribution_stats section");
    }
    
    // Get content before and after the match
    const beforeContent = readme.substring(0, startPosition);
    const afterContent = readme.substring(endPosition);
    
    // Create the formatted contribution stats block
    const contributionStatsContent = `        self.contribution_stats = { # sum: ${formatNumber(totalContributions)}
            "Commits"       : ${formattedContribution.commits},
            "Issues": {
                "Created"   : ${formattedContribution.issuesCreated},
                "Contrib"   : ${formattedContribution.issueContrib},
            },
            "PR": { # pull requests
                "Created"   : ${formattedContribution.prCreated},
                "Commented" : ${formattedContribution.prComments},
                "Reviewed"  : ${formattedContribution.prReviews},
            },
            "Discussions"  : ${formattedContribution.discussions},
        }`;
    
    // Create updated README
    const updatedReadme = beforeContent + contributionStatsContent + afterContent;
    
    // Write the updated README
    fs.writeFileSync('README.md', updatedReadme);
    
    console.log('README updated successfully!');
  } catch (error) {
    console.error('Failed to update README:', error);
    process.exit(1);
  }
}

// Run the update
updateReadme();
