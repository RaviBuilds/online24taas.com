import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, WP_SQL, haveSql, haveWork, raw } from './helpers.mjs';

function parseSql(sql) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wpsql-'));
  const file = path.join(dir, 't.sql');
  fs.writeFileSync(file, sql);
  const r = spawnSync('python3', [path.join(ROOT, 'migration/parse_wp_sql.py'), file, dir], { encoding: 'utf8' });
  return { r, posts: r.status === 0 ? JSON.parse(fs.readFileSync(path.join(dir, 'raw/wp_posts.json'), 'utf8')) : null };
}

test('parser survives parentheses, semicolons, quotes and Devanagari inside string values', () => {
  const tricky = "it's (a) tricky; \\\"quoted\\\" \\n line, with 'x''y' and मराठी (अ);";
  const sql = `CREATE TABLE \`wp_posts\` (
  \`ID\` bigint(20) unsigned NOT NULL,
  \`post_content\` longtext NOT NULL,
  \`post_title\` text NOT NULL,
  \`menu_order\` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB;
INSERT INTO \`wp_posts\` VALUES (1,'${tricky.replace(/'/g, "\\'")}','एक),(2,''fake row'',3);',0),(2,'second',NULL,-5);
INSERT INTO \`wp_posts\` VALUES (3,'','empty content',7);
`;
  const { r, posts } = parseSql(sql);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(posts.length, 3, 'a "),(" sequence inside a string must not create a phantom row');
  assert.equal(posts[0].post_title, "एक),(2,'fake row',3);");
  assert.match(posts[0].post_content, /मराठी \(अ\);/);
  assert.equal(posts[1].post_title, null);
  assert.equal(posts[1].menu_order, -5);
  assert.deepEqual(posts.map((p) => p.ID), [1, 2, 3]);
});

test('parser aborts loudly on a row with the wrong column count', () => {
  const sql = "CREATE TABLE `wp_posts` (\n  `ID` int(11) NOT NULL,\n  `post_title` text\n) ENGINE=InnoDB;\nINSERT INTO `wp_posts` VALUES (1,'a','extra');\n";
  const { r } = parseSql(sql);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /expected 2/);
});

test('real export: every wp_posts row parsed (independent regex cross-check of IDs)', { skip: !(haveSql && haveWork) }, () => {
  const parsed = raw('wp_posts');
  assert.equal(parsed.length, 2308);
  const sql = fs.readFileSync(WP_SQL, 'utf8');
  // wp_posts tuples all start "(ID,post_author,'YYYY-MM-DD HH:MM:SS','" — count them without the state machine.
  const ids = new Set();
  const start = sql.indexOf('INSERT INTO `wp_posts` VALUES');
  for (const m of sql.slice(start).matchAll(/\((\d+),\d+,'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}','\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',/g)) ids.add(Number(m[1]));
  assert.equal(ids.size, parsed.length, 'regex-found IDs and parsed rows must agree');
  assert.deepEqual([...ids].sort((a, b) => a - b), parsed.map((p) => p.ID).sort((a, b) => a - b));
});

test('real export: non-post tables reconcile', { skip: !haveWork }, () => {
  assert.equal(raw('wp_comments').length, 1082);
  assert.equal(raw('wp_postmeta').length, 5351);
  assert.equal(raw('wp_users').length, 1);
  assert.equal(raw('wp_users')[0].user_pass, '<stripped>', 'password hashes must be stripped at parse time');
});
