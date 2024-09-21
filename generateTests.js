const simpleGit = require('simple-git');
const axios = require('axios');
const fs = require('fs');

// Initialize Git
const git = simpleGit();

// OpenAI API Key (set your API key in your environment or directly here)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'e4cd3b12d94b409abad6042d907dcb2f'; 
const OPENAI_API_URL = 'https://code-guardians.openai.azure.com/openai/deployments/code-guardians-gpt-4o/chat/completions?api-version=2024-06-01';

// Function to get staged files
async function getStagedFiles() {
  const statusSummary = await git.status();
  return statusSummary.staged;
}

// Function to get git diff of a file
async function getDiff(file) {
  const diff = await git.diff(['--staged', file]);
  return diff;
}

// Function to call OpenAI API for Jest test case generation
async function generateJestTestCases(diff) {
  const prompt = `Generate Jest test cases for the following code changes in JavaScript. Make sure to create meaningful test cases using the Jest framework. you only need to pure testcases logic that i candirectly save in test_case file. no other workds that can cause compiler error.`;
  
  try {
    const response = await axios.post(OPENAI_API_URL, {
      "messages": [
        { "role": "system", "content": `${prompt}` },
        { "role": "user", "content": `${diff}` }
      ]
    }, {
      headers: {
        'api-key': OPENAI_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content; // Adjusted to properly extract the result
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message);
    throw error;
  }
}

// Main function to generate Jest test cases for all staged files
async function main() {
  try {
    const stagedFiles = await getStagedFiles();

    if (stagedFiles.length === 0) {
      console.log('No files staged for commit.');
      return;
    }

    for (const file of stagedFiles) {
      console.log(`Generating Jest test cases for changes in: ${file}`);

      const diff = await getDiff(file);
      console.log(`Diff for ${file}:\n${diff}`);

      const testCases = await generateJestTestCases(diff);

      // Save test cases to a test file or print them
      const testFileName = `jestTestCases_${file.replace(/\//g, '_')}.test.js`;
      fs.writeFileSync(testFileName, testCases);
      console.log(`Jest test cases saved to: ${testFileName}`);
    }
  } catch (error) {
    console.error('Error generating Jest test cases:', error.message);
  }
}

main();
