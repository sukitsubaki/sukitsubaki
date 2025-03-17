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
      prReviews: formatNumber(stats.pullRequestReviews),
      discussions: formatNumber(stats.discussions + stats.discussionComments)
    };
    
    // Create the formatted contribution stats block
    const contributionStatsContent = `        self.contribution_stats = { # updated ${new Date().toISOString().split('T')[0]}
            "Commits"       : ${formattedContribution.commits},
            "Issues": {
                "Created"   : ${formattedContribution.issuesCreated},
                "Contrib"   : ${formattedContribution.issueContrib},
            },
            "PR": {
                "Created"   : ${formattedContribution.prCreated},
                "Review"    : ${formattedContribution.prReviews},
            },
            "Discussions"   : ${formattedContribution.discussions},
        }`;
    
    // Define the pattern to find the contribution stats section
    const contributionStatsPattern = /(self\.contribution_stats = \{)[\s\S]*?(        \})/;
    
    // Replace the content
    const updatedReadme = readme.replace(
      contributionStatsPattern,
      contributionStatsContent
    );
    
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
