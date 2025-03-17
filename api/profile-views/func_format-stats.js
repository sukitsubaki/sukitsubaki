const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");

// Fetch profile views from API
async function fetchStats() {
  try {
    const response = await fetch(process.env.API_URL);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching profile views:', error);
    throw error;
  }
}

// Format numbers with comma separators
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Update counter file to maintain state between runs
async function updateCounter(stats) {
  const username = stats.username;
  const counterDir = path.join('api', 'profile-views');
  const counterFile = path.join(counterDir, 'profile-views.json');
  
  // Ensure directory exists
  if (!fs.existsSync(counterDir)) {
    fs.mkdirSync(counterDir, { recursive: true });
  }
  
  // Prepare counter data
  const counterData = {
    allTimeViews: stats.allTimeViews,
    lastUpdated: stats.lastUpdated,
    lastDailyViews: stats.lastDailyViews,
    timestamp: stats.timestamp
  };
  
  // Write counter file
  fs.writeFileSync(counterFile, JSON.stringify(counterData, null, 2));
  console.log(`Counter file updated: ${stats.allTimeViews} all-time views`);
  
  return counterData;
}

// Main function to update README
async function updateReadme() {
  try {
    // Read the README file
    const readme = fs.readFileSync('README.md', 'utf8');
    
    // Fetch stats
    const stats = await fetchStats();
    
    // Update the persistent counter file
    await updateCounter(stats);
    
    // Format the profile views value
    const formattedViews = formatNumber(stats.allTimeViews);
    
    // Find the profile_views line to update
    const profileViewsPattern = /self\.profile_views\s*=\s*\d+/;
    const profileViewsMatch = readme.match(profileViewsPattern);
    
    if (!profileViewsMatch) {
      throw new Error("Could not find the profile_views variable in README.md");
    }
    
    // Create the updated profile views line
    const updatedProfileViewsLine = `self.profile_views = ${formattedViews} # unique`;
    
    // Replace the original line with the updated one
    const updatedReadme = readme.replace(profileViewsPattern, updatedProfileViewsLine);
    
    // Write the updated README
    fs.writeFileSync('README.md', updatedReadme);
    
    console.log('README updated successfully with profile views:', formattedViews);
  } catch (error) {
    console.error('Failed to update README with profile views:', error);
    process.exit(1);
  }
}

// Run the update
updateReadme();
