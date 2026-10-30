#!/usr/bin/env python3
"""
Robust, read-only parser for a mysqldump-style WordPress SQL export.

Design (replaces scripts/parse_wp_sql.py, which lost rows):
  * Column names come from each table's CREATE TABLE statement, so rows are dicts,
    never positionally-guessed lists.
  * A single character state machine walks every `INSERT INTO `t` VALUES (...),(...);`
    statement. String state is tracked, so `(`, `)`, `;` and `,` inside content never
    split rows.
  * Every parsed row is checked against the column count. Any mismatch aborts the run.
  * Statement/row counts per table are written to raw/_counts.json for reconciliation.
  * The SQL file is only ever opened for reading.

Usage: parse_wp_sql.py <sql_path> <out_dir>
Output: <out_dir>/raw/<table>.json  (only tables in WANTED), <out_dir>/raw/_counts.json
"""
import json
import os
import re
import sys

WANTED = {
    "wp_posts", "wp_postmeta", "wp_terms", "wp_term_taxonomy", "wp_term_relationships",
    "wp_termmeta", "wp_users", "wp_comments", "wp_commentmeta", "wp_options",
    "wp_yoast_indexable", "wp_yoast_seo_links",
}
# wp_users/wp_usermeta carry password hashes. We parse users but strip hash fields.
SENSITIVE_COLS = {"wp_users": {"user_pass", "user_activation_key"}}
# wp_options: only keep an allowlist (the table can contain SMTP/API secrets).
OPTION_ALLOW = re.compile(
    r"^(siteurl|home|blogname|blogdescription|admin_email_is_redacted|template|stylesheet|"
    r"current_theme|active_plugins|permalink_structure|category_base|tag_base|"
    r"page_on_front|page_for_posts|show_on_front|posts_per_page|timezone_string|gmt_offset|"
    r"date_format|time_format|WPLANG|blog_public|default_comment_status|comment_moderation|"
    r"comment_registration|require_name_email|sidebars_widgets|nav_menu_options|"
    r"theme_mods_.*|widget_.*|wpseo.*|wpcf7.*|jetpack_active_modules|"
    r"mtm_.*|ihaf_.*|wpcode_.*|site_icon|custom_logo|uploads_use_yearmonth_folders)$"
)


def read_sql(path):
    with open(path, "r", encoding="utf-8", errors="strict") as fh:
        return fh.read()


def create_table_columns(sql):
    cols = {}
    for m in re.finditer(r"CREATE TABLE `([^`]+)` \((.*?)\n\) ENGINE", sql, re.S):
        table, body = m.group(1), m.group(2)
        names = []
        for line in body.split("\n"):
            line = line.strip()
            mm = re.match(r"`([^`]+)` ", line)
            if mm:
                names.append(mm.group(1))
        cols[table] = names
    return cols


ESC = {"n": "\n", "r": "\r", "t": "\t", "0": "\x00", "Z": "\x1a", "b": "\b"}


def parse_inserts(sql, table):
    """Yield (statement_index, row_values_list) for every INSERT INTO `table`."""
    marker = "INSERT INTO `%s` VALUES" % table
    pos = 0
    stmt_idx = 0
    n = len(sql)
    while True:
        start = sql.find(marker, pos)
        if start < 0:
            return
        i = start + len(marker)
        # walk tuples until the terminating ';' that is outside any string
        while i < n:
            c = sql[i]
            if c in " \t\r\n,":
                i += 1
                continue
            if c == ";":
                i += 1
                break
            if c != "(":
                raise ValueError("unexpected %r at %d in %s" % (c, i, table))
            i += 1
            row = []
            while True:
                while sql[i] in " \t\r\n":
                    i += 1
                c = sql[i]
                if c == "'":
                    i += 1
                    buf = []
                    seg = i
                    while True:
                        c = sql[i]
                        if c == "\\":
                            buf.append(sql[seg:i])
                            nx = sql[i + 1]
                            buf.append(ESC.get(nx, nx))
                            i += 2
                            seg = i
                        elif c == "'":
                            if sql[i + 1] == "'":
                                buf.append(sql[seg:i])
                                buf.append("'")
                                i += 2
                                seg = i
                            else:
                                buf.append(sql[seg:i])
                                i += 1
                                break
                        else:
                            i += 1
                    row.append("".join(buf))
                elif sql.startswith("NULL", i):
                    row.append(None)
                    i += 4
                elif sql.startswith("0x", i):
                    j = i + 2
                    while sql[j] in "0123456789abcdefABCDEF":
                        j += 1
                    row.append(sql[i:j])
                    i = j
                else:
                    j = i
                    while sql[j] not in ",)":
                        j += 1
                    tok = sql[i:j].strip()
                    try:
                        row.append(int(tok))
                    except ValueError:
                        try:
                            row.append(float(tok))
                        except ValueError:
                            row.append(tok)
                    i = j
                c = sql[i]
                if c == ",":
                    i += 1
                    continue
                if c == ")":
                    i += 1
                    break
                raise ValueError("bad delimiter %r at %d in %s" % (c, i, table))
            yield stmt_idx, row
        stmt_idx += 1
        pos = i


def main():
    sql_path, out_dir = sys.argv[1], sys.argv[2]
    sql = read_sql(sql_path)
    cols = create_table_columns(sql)
    raw_dir = os.path.join(out_dir, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    counts = {}
    for table in sorted(WANTED):
        if table not in cols:
            counts[table] = {"statements": 0, "rows": 0, "note": "no CREATE TABLE"}
            continue
        names = cols[table]
        rows = []
        stmts = set()
        for sidx, vals in parse_inserts(sql, table):
            if len(vals) != len(names):
                raise SystemExit("%s: row has %d values, expected %d" % (table, len(vals), len(names)))
            d = dict(zip(names, vals))
            for sc in SENSITIVE_COLS.get(table, ()):  # drop secrets at the source
                if sc in d:
                    d[sc] = "<stripped>"
            if table == "wp_options" and not OPTION_ALLOW.match(d["option_name"]):
                continue
            rows.append(d)
            stmts.add(sidx)
        counts[table] = {"statements": len(stmts), "rows": len(rows), "columns": len(names)}
        with open(os.path.join(raw_dir, table + ".json"), "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False)
    # independent cross-check of wp_posts row count: count "INSERT INTO `wp_posts`" statements
    counts["_crosscheck"] = {
        "wp_posts_insert_statements": sql.count("INSERT INTO `wp_posts` VALUES"),
    }
    with open(os.path.join(raw_dir, "_counts.json"), "w", encoding="utf-8") as fh:
        json.dump(counts, fh, indent=2)
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
