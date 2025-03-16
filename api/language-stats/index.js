name: Update Language Stats

on:
  schedule:
    - cron: '0 * * * *'  # Runs every hour
  workflow_dispatch:  # Allows manual triggering

permissions:
  contents: write

jobs:
  update-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Update README with Language Stats
        run: |
          # Configuration
          SHOW_OTHERS="false"  # Set to "true" to show "Other" category, "false" to rescale top 6 to 100%
          TOP_LANGUAGES=6      # Show top 6 languages
          
          # Fetch the API and save results
          curl -s "https://sukitsubaki-.vercel.app/language-stats" > stats.json
          
          # Generate the new README with language statistics
          node -e '
            const fs = require("fs");
            const stats = JSON.parse(fs.readFileSync("stats.json", "utf8"));
            let readme = fs.readFileSync("README.md", "utf8");
            
            // Get configuration from environment variables
            const showOthers = process.env.SHOW_OTHERS === "true";
            const topCount = parseInt(process.env.TOP_LANGUAGES) || 6;
            
            // Create the language stats section
            let langSection = "## My Programming Languages\n\n";
            
            // Get the language entries and sort by percentage
            const langEntries = Object.entries(stats.languages)
              .map(([lang, data]) => ({
                language: lang,
                percentage: parseFloat(data.percentage.replace("%", ""))
              }))
              .sort((a, b) => b.percentage - a.percentage);
            
            // Get the top languages
            const topLanguages = langEntries.slice(0, topCount);
            
            // Calculate sum of top language percentages
            const topSum = topLanguages.reduce((sum, lang) => sum + lang.percentage, 0);
            
            // Calculate the "Other" percentage if needed
            const otherPercentage = 100 - topSum;
            
            // Function to format percentage
            const formatPercentage = (pct) => pct.toFixed(2) + "%";
            
            if (showOthers) {
              // Show top languages with original percentages
              topLanguages.forEach(lang => {
                langSection += `- ${lang.language}: ${formatPercentage(lang.percentage)}\n`;
              });
              
              // Add "Other" category if there are more languages
              if (langEntries.length > topCount && otherPercentage > 0) {
                langSection += `- Other: ${formatPercentage(otherPercentage)}\n`;
              }
            } else {
              // Rescale percentages to total 100%
              topLanguages.forEach(lang => {
                const scaledPercentage = (lang.percentage / topSum) * 100;
                langSection += `- ${lang.language}: ${formatPercentage(scaledPercentage)}\n`;
              });
            }
            
            // Add a note about the calculation method
            if (showOthers) {
              langSection += "\n*Statistics based on all repositories with 50/50 weighting between bytes and file count.*";
            } else {
              langSection += "\n*Top 6 languages rescaled to 100%. Based on all repositories with 50/50 weighting between bytes and file count.*";
            }
            
            // Replace existing section or append to the end
            const startMarker = "<!-- START_LANGUAGE_STATS -->";
            const endMarker = "<!-- END_LANGUAGE_STATS -->";
            
            if (readme.includes(startMarker) && readme.includes(endMarker)) {
              // Replace existing section
              const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "g");
              readme = readme.replace(regex, `${startMarker}\n${langSection}\n${endMarker}`);
            } else {
              // Append at the end
              readme += `\n\n${startMarker}\n${langSection}\n${endMarker}`;
            }
            
            fs.writeFileSync("README.md", readme);
          ' SHOW_OTHERS="$SHOW_OTHERS" TOP_LANGUAGES="$TOP_LANGUAGES"
          
      - name: Commit changes
        run: |
          git config --global user.name "GitHub Action"
          git config --global user.email "action@github.com"
          git add README.md
          git diff --quiet && git diff --staged --quiet || git commit -m "Update language stats in README"
          git push
