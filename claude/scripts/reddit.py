"""Read Reddit for research: subreddit listings, keyword search, full threads with comments. Plain text, token-cheap.

Source: the public Arctic Shift archive (https://github.com/ArthurHeitmann/arctic_shift), no login, honest User-Agent,
polite pacing. reddit.com itself returns 403 to scripts and the browser tools refuse it. If REDDIT_CLIENT_ID and
REDDIT_CLIENT_SECRET are set (a free "script" app at https://www.reddit.com/prefs/apps), the official API is used
instead: live scores, real search, top-of-week. Read-only, app-only OAuth, no password.

  python reddit.py top ClaudeCode --days 7 --n 20        busiest posts in the window
  python reddit.py search ClaudeCode "plugin,mcp" --days 14
  python reddit.py thread 1xkgtxl --n 60                  post + comments (id or any reddit URL)
  add --json to get raw records instead of text
"""
import argparse, base64, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

UA = 'windows:research-reader:0.1 (personal research; low volume)'
ARCTIC = 'https://arctic-shift.photon-reddit.com/api'
CID, CSECRET = os.environ.get('REDDIT_CLIENT_ID'), os.environ.get('REDDIT_CLIENT_SECRET')
_token = None


def fetch(url, headers=None, data=None):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                out = json.load(r)
            time.sleep(1.2)
            return out
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                sys.exit(f'{e.code} from {url.split("?")[0]}: check REDDIT_CLIENT_ID/SECRET' if CID else f'{e.code} from {url}')
            err = e
        except Exception as e:
            err = e
        print(f'  retry {attempt + 1}: {err}', file=sys.stderr)
        time.sleep(8 * (attempt + 1))
    sys.exit(f'gave up on {url}')


def arctic(path, **params):
    j = fetch(f'{ARCTIC}/{path}?{urllib.parse.urlencode(params)}')
    if j.get('error'):
        print(f'  archive: {j["error"]}', file=sys.stderr)
    return j.get('data') or []


def official(path, **params):
    global _token
    if not _token:
        auth = base64.b64encode(f'{CID}:{CSECRET}'.encode()).decode()
        _token = fetch('https://www.reddit.com/api/v1/access_token', {'Authorization': f'Basic {auth}'},
                       b'grant_type=client_credentials')['access_token']
    return fetch(f'https://oauth.reddit.com{path}?{urllib.parse.urlencode({**params, "raw_json": 1})}',
                 {'Authorization': f'bearer {_token}'})


def window(sub, days, max_pages):
    """All posts in r/sub from the last `days` days, oldest first (archive)."""
    after = int(time.time() - days * 86400)
    posts = []
    for _ in range(max_pages):
        page = arctic('posts/search', subreddit=sub, after=after, limit=100, sort='asc')
        if not page:
            break
        posts += page
        after = int(page[-1]['created_utc'])
        if len(page) < 100:
            break
    return posts


def post_line(p):
    day = datetime.fromtimestamp(p['created_utc'], timezone.utc).strftime('%m-%d')
    return f"{p['id']}  {p.get('score', 0):>5}^ {p.get('num_comments', 0):>4}c  {day}  {p['title'][:110]}"


def show_posts(posts, n, as_json):
    posts = sorted(posts, key=lambda p: (p.get('score', 0) + 2 * p.get('num_comments', 0)), reverse=True)[:n]
    if as_json:
        return print(json.dumps(posts, ensure_ascii=False))
    for p in posts:
        print(post_line(p))
    print(f'({len(posts)} shown; read one with: python reddit.py thread <id>)')


def cmd_top(a):
    if CID:
        posts = [c['data'] for c in official(f'/r/{a.sub}/top', t='week' if a.days <= 7 else 'month', limit=100)['data']['children']]
    else:
        posts = window(a.sub, a.days, a.max_pages)
        print(f'archive: {len(posts)} posts in {a.days} days (scores can lag the live site)', file=sys.stderr)
    show_posts(posts, a.n, a.json)


def cmd_search(a):
    kws = [k.strip() for k in a.keywords.split(',') if k.strip()]
    if CID:
        q = ' OR '.join(f'"{k}"' for k in kws)
        posts = [c['data'] for c in official(f'/r/{a.sub}/search', q=q, restrict_sr=1, sort='relevance',
                                             t='week' if a.days <= 7 else 'month' if a.days <= 31 else 'year', limit=100)['data']['children']]
    else:  # archive keyword search times out on big subreddits, so page the window and filter here
        rx = re.compile('|'.join(re.escape(k) for k in kws), re.I)
        posts = [p for p in window(a.sub, a.days, a.max_pages) if rx.search(p['title'] + ' ' + (p.get('selftext') or ''))]
    show_posts(posts, a.n, a.json)


def walk(children, depth, out):
    for c in children:
        if c.get('kind') != 't1':
            continue
        d = c['data']
        out.append((depth, d))
        r = d.get('replies')
        if isinstance(r, dict):
            walk(r['data']['children'], depth + 1, out)


def cmd_thread(a):
    m = re.search(r'comments/([a-z0-9]+)', a.id)
    pid = m.group(1) if m else a.id.removeprefix('t3_')
    if CID:
        listing = official(f'/comments/{pid}', limit=500, depth=8, sort='top')
        post, tree = listing[0]['data']['children'][0]['data'], listing[1]['data']['children']
    else:
        found = arctic('posts/ids', ids=pid)
        if not found:
            sys.exit(f'post {pid} not in the archive')
        post, tree = found[0], arctic('comments/tree', link_id=pid, limit=2000)
    flat = []
    walk(tree, 0, flat)
    if a.json:
        return print(json.dumps({'post': post, 'comments': [d for _, d in flat]}, ensure_ascii=False))
    print(post_line(post))
    print(f"r/{post['subreddit']}  u/{post.get('author')}  https://reddit.com{post.get('permalink', '')}")
    body = (post.get('selftext') or post.get('url') or '').strip()
    print(body[:a.body * 4], '\n')
    # keep each thread in order, but drop low-score branches first when trimming to --n
    keep = {id(d) for _, d in sorted(flat, key=lambda x: x[1].get('score', 0), reverse=True)[:a.n]}
    for depth, d in flat:
        if id(d) in keep and d.get('author') != 'AutoModerator':
            text = re.sub(r'\s+', ' ', d.get('body', ''))[:a.body]
            print(f"{'  ' * depth}- [{d.get('score', 0)}] u/{d.get('author')}: {text}")
    print(f'\n({min(a.n, len(flat))} of {len(flat)} comments shown)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    for name, fn in (('top', cmd_top), ('search', cmd_search), ('thread', cmd_thread)):
        p = sp.add_parser(name)
        p.set_defaults(fn=fn)
        if name == 'thread':
            p.add_argument('id')
            p.add_argument('--n', type=int, default=80, help='max comments')
            p.add_argument('--body', type=int, default=500, help='chars per comment')
        else:
            p.add_argument('sub')
            if name == 'search':
                p.add_argument('keywords', help='comma-separated, case-insensitive')
            p.add_argument('--days', type=int, default=7)
            p.add_argument('--n', type=int, default=25)
            p.add_argument('--max-pages', type=int, default=60, help='100 posts per page (archive)')
        p.add_argument('--json', action='store_true')
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding='utf-8')
    a.fn(a)


if __name__ == '__main__':
    main()
