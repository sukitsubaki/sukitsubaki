const fs = require("fs");
const path = require("path");
const stats = JSON.parse(fs.readFileSync("stats.json", "utf8"));
let readme = fs.readFileSync("README.md", "utf8");

// Configuration from environment variables
const topCount = parseInt(process.env.TOP_LANGUAGES) || 6;

// Dynamic weights based on language type
const getLanguageWeights = (language) => {
  // Language-specific weighting configuration
  const weightConfig = {
    // Programming languages - balanced weights
    "PHP": { sizeWeight: 0.5, countWeight: 0.5 },
    "JavaScript": { sizeWeight: 0.5, countWeight: 0.5 },
    "TypeScript": { sizeWeight: 0.5, countWeight: 0.5 },
    "Python": { sizeWeight: 0.525, countWeight: 0.475 },
    "Ruby": { sizeWeight: 0.5, countWeight: 0.5 },
    "Java": { sizeWeight: 0.5, countWeight: 0.5 },
    "C#": { sizeWeight: 0.5, countWeight: 0.5 },
    "Swift": { sizeWeight: 0.5, countWeight: 0.5 },
    "Go": { sizeWeight: 0.5, countWeight: 0.5 },
    "Rust": { sizeWeight: 0.5, countWeight: 0.5 },
    "Kotlin": { sizeWeight: 0.5, countWeight: 0.5 },
    "Dart": { sizeWeight: 0.5, countWeight: 0.5 },
    
    // Markup & style languages - higher weight on size
    "HTML": { sizeWeight: 0.6, countWeight: 0.4 },
    "CSS": { sizeWeight: 0.6, countWeight: 0.4 },
    "SCSS": { sizeWeight: 0.6, countWeight: 0.4 },
    "Less": { sizeWeight: 0.6, countWeight: 0.4 },
    "XML": { sizeWeight: 0.6, countWeight: 0.4 },
    
    // Configuration & data languages - even higher weight on size
    "JSON": { sizeWeight: 0.7, countWeight: 0.3 },
    "YAML": { sizeWeight: 0.7, countWeight: 0.3 },
    "Markdown": { sizeWeight: 0.7, countWeight: 0.3 },
    
    // Shell scripts - emphasis on file count
    "Shell": { sizeWeight: 0.3, countWeight: 0.7 },
    
    // Default weights for unlisted languages
    "default": { sizeWeight: 0.6, countWeight: 0.4 }
  };
  
  return weightConfig[language] || weightConfig.default;
};

// Initialize language data structure
const languages = {};

// Track totals
let totalBytes = 0;
let totalFiles = 0;

// Parse stats data
Object.entries(stats.languages).forEach(([lang, data]) => {
  // Initialize language entry
  if (!languages[lang]) {
    languages[lang] = {
      name: lang,
      size: 0,
      count: 0,
      score: 0,
      weights: getLanguageWeights(lang)
    };
  }
  
  // Add byte count and file count
  languages[lang].size = data.bytes;
  languages[lang].count = parseInt(data.fileCount) || 1; // Use file count if available
  
  // Track totals
  totalBytes += data.bytes;
  totalFiles += parseInt(data.fileCount) || 1;
});

// Function to format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Calculate weighted scores
Object.keys(languages).forEach(lang => {
  const { sizeWeight, countWeight } = languages[lang].weights;
  
  // Apply dynamic weighting based on language type
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

// Replace content in README with added file count and size information
let updatedReadme = readme.replace(
  languageStatsPattern, 
  `$1 # ${totalFiles} files, ${formatFileSize(totalBytes)}, dynamic weighting\n${formattedLanguageStats}\n$2`
);

// Write updated README
fs.writeFileSync("README.md", updatedReadme);

console.log("Language stats in README successfully updated with dynamic weighting!");
