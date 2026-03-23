import db from '../src/db/database';
import { createTables } from '../src/db/schema';

createTables();
const [,, cmd, arg] = process.argv;

switch (cmd) {
  case 'add': {
    if (!arg) { console.error('Usage: npm run manage-users add "Name"'); process.exit(1); }
    const r = db.prepare('INSERT INTO users (name) VALUES (?)').run(arg);
    console.log(`Added "${arg}" id=${r.lastInsertRowid}`);
    break;
  }
  case 'remove': {
    const id = Number(arg);
    if (!id) { console.error('Usage: npm run manage-users remove <id>'); process.exit(1); }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    console.log(`Removed user id=${id}`);
    break;
  }
  default:
    console.table(db.prepare('SELECT * FROM users ORDER BY id').all());
}
