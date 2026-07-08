import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`
      INSERT INTO boards (author, "boardName", size, letters, date, theme, subtheme)
      VALUES ('HaPaX', '1', 4, 'TAUAURIFSQASTSRL', ${date}, 'Rare Letters', 'Q')
    `;
    console.log('Successfully added board');
  } catch (error) {
    console.log(error);
  }
}

main();
