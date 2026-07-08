const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function importExistingVideos() {
  const dir = path.join(__dirname, 'recordings');
  if (!fs.existsSync(dir)) {
    console.log('Recordings directory does not exist. Nothing to import.');
    process.exit(0);
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    console.log('No existing WebM recordings found in recordings directory.');
    process.exit(0);
  }

  console.log(`Found ${files.length} WebM recordings. Importing to PostgreSQL...`);

  for (const file of files) {
    const interviewId = path.basename(file, '.webm');
    const filePath = path.join(dir, file);
    try {
      const buffer = fs.readFileSync(filePath);
      console.log(`Importing video for interview: ${interviewId} (${buffer.length} bytes)...`);
      
      const res = await pool.query(
        'UPDATE interviews SET video_data = $1 WHERE id = $2',
        [buffer, interviewId]
      );
      
      if (res.rowCount > 0) {
        console.log(`Successfully imported and saved video for ${interviewId} to PostgreSQL database.`);
      } else {
        console.log(`Warning: Interview ID "${interviewId}" not found in database. Video not linked.`);
      }
    } catch (err) {
      console.error(`Failed to import video for ${interviewId}:`, err.message);
    }
  }

  console.log('Video import completed.');
  process.exit(0);
}

importExistingVideos();
