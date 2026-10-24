# RISE finite HTTP gateway

The RISE UI stays on GitHub Pages. Browsers POST to
`https://aiworknavi.blog/rise-chat/`; the server forwards only the allowlisted
RISE API operations to the existing PC relay. The PC connector is unchanged.
No PHP, WordPress plugin, WordPress database, or company website is involved.

Browser transport uses `text/plain` JSON POST envelopes without CORS preflight,
cross-site cookies, service-worker dependencies, or persistent SSE. Responses
are polled every 1.5 seconds while generating, and every 10 seconds while idle.
Media uploads retain resumable 1 MiB chunks. Downloads use 1 MiB HTTP ranges;
the browser assembles a Blob for playback, so very large files still depend on
available browser memory. No total file-size limit is added by this gateway.

Image uploads preserve the original bytes. The browser prepares fingerprints
locally when images are attached, then sends at most two files concurrently on
Send. Completed attachments can be reused within the same login; account
changes invalidate that cache. The PC connector returns upload acknowledgments
in a single bounded host response (64 KiB maximum), replacing separate headers,
body and end calls. Older relay versions retain the original response fallback.
The gateway's domains, body limits, authentication and 1 MiB chunks are unchanged.

## Installation

Keep `rise_gateway.py` and its Python runtime outside the web root in a private
directory. Use a maintained Python 3 runtime with working HTTPS certificates.
The initial deployment uses Astral CPython 3.14.9, release 20261021,
`x86_64-unknown-linux-gnu-install_only`, verified SHA256:
`dfa4c5a40c47f338f41658017be550c72247c391e6bfb1fa4da03ebc8451abdf`.
The host's default Python and PHP configuration are not changed.

Create only the `rise-chat` directory under the AIworknavi web root. Put a
mode-755 `index.cgi` launcher there, with LF line endings:

```sh
#!/bin/sh
exec /absolute/private/python/bin/python3 -I /absolute/private/rise_gateway.py
```

The directory's own `.htaccess` (644) is:

```apache
Options +ExecCGI -Indexes -MultiViews
AddHandler cgi-script .cgi
DirectoryIndex index.cgi
LimitRequestBody 4210688
```

Do not modify parent `.htaccess`, DNS, WordPress, or any other domain. Run
`python3 -m unittest discover -s gateway -p 'test_*.py'` before replacing the
private Python source. To disable the gateway, remove only its `index.cgi`
launcher; revert `src/chat-target.mjs` and the Pages change if needed.

## Boundaries and verification

- Exact Pages Origin required before forwarding. No wildcard or credentials CORS.
- Fixed HTTPS destination; redirects, arbitrary URLs, cookies, PC host routes,
  setup routes, filesystem paths, and event streams cannot be forwarded.
- Browser authentication and CSRF stay enforced by the PC. They travel in POST
  bodies, never URLs. Request bodies and responses are not written to disk.
- Input and individual responses are bounded; CGI upstream timeout is 18s.
- Gateway reachability: `GET /rise-chat/` returns a small JSON health response.
  This alone does not prove the PC or the school network can connect.
- Before publishing the Pages config, check login, guest separation, logout,
  generation polling, binary upload, and ranged download through the real gate.
- A school iPad still needs a final real-device check; a PC test cannot prove
  the school's proxy permits the new path.
