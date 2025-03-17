const fs = require("fs");
const fetch = require("node-fetch");

// Fetch activity stats from API
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

// Main function to update README
async function updateReadme() {
  try {
    // Read the README file
    const readme = fs.readFileSync('README.md', 'utf8');
    
    // Fetch stats
    const stats = await fetchStats();
    
    // Find the position of the activity_stats section
    const startPattern = /^\s*self\.activity_stats\s*=\s*\{/m;
    const startMatch = readme.match(startPattern);
    
    if (!startMatch) {
      throw new Error("Could not find the activity_stats section in README.md");
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
      throw new Error("Could not find the closing bracket for activity_stats section");
    }
    
    // Get content before and after the match
    const beforeContent = readme.substring(0, startPosition);
    const afterContent = readme.substring(endPosition);
    
    // Create the formatted activity stats block
    const activityStatsContent = `        self.activity_stats = {
            "longest_commit_streak" : ${stats.longestCommitStreak}, # days
            "preferred_coding_hour" : ${stats.preferredCodingHour},
            "total_days_active"     : ${stats.totalDaysActive},
        }`;
    
    // Create updated README
    const updatedReadme = beforeContent + activityStatsContent + afterContent;
    
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
