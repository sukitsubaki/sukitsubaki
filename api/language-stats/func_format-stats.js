const fs = require("fs");
const path = require("path");
const stats = JSON.parse(fs.readFileSync("stats.json", "utf8"));
let readme = fs.readFileSync("README.md", "utf8");

// Configuration from environment variables
const topCount = parseInt(process.env.TOP_LANGUAGES) || 6;

// Weights for calculation
const sizeWeight = 0.6;
const countWeight = 0.4;

// Initialize language data structure
const languages = {};

// Track totals
let totalBytes = 0;

// Parse stats data
Object.entries(stats.languages).forEach(([lang, data]) => {
  // Initialize language entry
  if (!languages[lang]) {
    languages[lang] = {
      name: lang,
      size: 0,
      count: 0,
      score: 0
    };
  }
  
  // Add byte count
  languages[lang].size = data.bytes;
  languages[lang].count = 1; // Minimum count for each language
  
  // Track totals
  totalBytes += data.bytes;
});

// Calculate weighted scores
Object.keys(languages).forEach(lang => {
  languages[lang].score = 
    Math.pow(languages[lang].size, sizeWeight) * 
    Math.pow(languages[lang].count, countWeight);
});

// Sort languages by score and get top languages
const sortedLanguages = Object.values(languages)
  .sort((a, b) => b.score - a.score);
  
const topLanguages = sortedLanguages.slice(0, topCount);

// Calculate total score for percentage calculation
const totalScore = topLanguages.reduce((sum, lang) => sum + lang.score, 0);

// Calculate percentages
topLanguages.forEach(lang => {
  lang.percentage = (lang.score / totalScore) * 100;
});

// Function to create progress bar
const createProgressBar = (percentage) => {
  const barLength = 40; // Total length of progress bar
  const filledLength = Math.round((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;
  
  // Using black blocks and dotted blocks as seen in the screenshot
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
};

// Find the length of the longest language name
const maxNameLength = topLanguages.reduce((max, lang) => 
  Math.max(max, lang.name.length), 0);

// Generate formatted language stats
let languageEntries = [];

topLanguages.forEach((lang) => {
  // Format language name with padding
  const nameField = `"${lang.name}"`;
  
  // Calculate spaces needed for alignment
  const paddingNeeded = maxNameLength + 3 - nameField.length;
  const padding = ' '.repeat(paddingNeeded);
  
  // Progress bar
  const progressBar = createProgressBar(lang.percentage);
  
  // Format percentage
  const percentField = lang.percentage.toFixed(2).padStart(5, ' ');
  
  // Build the formatted line
  languageEntries.push(`            ${nameField}${padding}: "${progressBar}", # ${percentField} %`);
});

// Join entries with line breaks
const formattedLanguageStats = languageEntries.join('\n');

// Define the target patterns to replace in README
const languageStatsPattern = /(self\.language_stats = \{)[\s\S]*?(        \})/;

// Replace content in README
let updatedReadme = readme.replace(
  languageStatsPattern, 
  `$1\n${formattedLanguageStats}\n$2`
);

// Write updated README
fs.writeFileSync("README.md", updatedReadme);

console.log("Language stats in README successfully updated!");
