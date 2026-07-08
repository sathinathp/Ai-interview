const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function dumpVideo() {
  const interviewId = 'int-j7l90m55y';
  try {
    const res = await pool.query('SELECT video_data FROM interviews WHERE id = $1', [interviewId]);
    if (res.rowCount === 0 || !res.rows[0].video_data) {
      console.log(`Video for ${interviewId} not found in database.`);
      process.exit(1);
    }
    const buffer = res.rows[0].video_data;
    const outputPath = path.join(__dirname, 'test_candidate.webm');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Successfully dumped ${buffer.length} bytes to ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to dump video:', err.message);
    process.exit(1);
  }
}

dumpVideo();
