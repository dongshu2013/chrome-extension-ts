const { zip } = require('zip-a-folder');
const path = require('path');
const fs = require('fs');
const packageJson = require('../package.json');

async function createZip() {
  const distPath = path.resolve(__dirname, '../dist');
  const zipPath = path.resolve(__dirname, `../buzz-reply-helper-v${packageJson.version}.zip`);
  
  console.log(`Creating zip file: ${zipPath}`);
  
  try {
    // Make sure the dist directory exists
    if (!fs.existsSync(distPath)) {
      console.error('Error: dist directory does not exist. Run "npm run build" first.');
      process.exit(1);
    }
    
    // Create the zip file
    await zip(distPath, zipPath);
    
    console.log(`Successfully created: ${zipPath}`);
  } catch (error) {
    console.error('Error creating zip file:', error);
    process.exit(1);
  }
}

createZip(); 