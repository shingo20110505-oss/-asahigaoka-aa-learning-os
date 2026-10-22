"""Finite, fixed-destination CGI transport for the RISE Pages application.

This file lives outside the web root. No WordPress bootstrap, database, secrets,
request logs, arbitrary URL forwarding, or persistent browser streams.
"""
import base64
import binascii
import json
import os
import re
import sys
import urllib.error
import urllib.request

ORIGIN = 'https://shingo20110505-oss.github.io'
UPSTREAM = 'https://rise-pc-chat.shingo-20110505.workers.dev/api/'
MAX_INPUT = 4 * 1024 * 1024 + 16384
MAX_BODY = 3 * 1024 * 1024
MAX_RESPONSE = 16 * 1024 * 1024
MEDIA_CHUNK = 1024 * 1024
UUID = r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}'
ROUTES = {
    'GET': rf'(?:status|session|threads|threads/{UUID}|files/{UUID}(?:\?download=1)?)',
    'HEAD': rf'files/{UUID}(?:\?download=1)?',
    'DELETE': rf'threads/{UUID}',
    'POST': rf'(?:login|logout|recovery|threads|threads/{UUID}/(?:messages|cancel)|uploads|uploads/{UUID}/complete)',
    'PATCH': rf'uploads/{UUID}',
}
RESPONSE_HEADERS = ('content-type', 'content-length', 'content-range',
                    'accept-ranges', 'content-disposition')


class InvalidRequest(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def parse_request(raw):
    try:
        value = json.loads(raw)
        if not isinstance(value, dict) or value.get('v') != 1:
            raise InvalidRequest()
        method, route = value.get('method'), value.get('path')
        if not isinstance(method, str) or not isinstance(route, str):
            raise InvalidRequest()
        if method not in ROUTES or not re.fullmatch(ROUTES[method], route):
            raise InvalidRequest()
        supplied = value.get('headers', {})
        if not isinstance(supplied, dict):
            raise InvalidRequest()
        headers = {'Origin': ORIGIN, 'X-Rise-Transport': 'pages', 'User-Agent': 'RISE-Gateway/1.0'}
        patterns = {
            'authorization': r'Bearer [A-Za-z0-9_-]{43,128}',
            'x-rise-csrf': r'[A-Za-z0-9_-]{43,128}',
            'upload-offset': r'[0-9]{1,16}',
            'content-type': r'(?:application/json|application/octet-stream)(?:; charset=utf-8)?',
            'range': r'bytes=[0-9]{1,16}-[0-9]{1,16}',
            'accept': r'(?:application/json|\*/\*)',
        }
        for name, text in supplied.items():
            if name not in patterns or not isinstance(text, str) or not re.fullmatch(patterns[name], text):
                raise InvalidRequest()
            headers[name] = text
        encoded = value.get('body', '')
        if not isinstance(encoded, str) or len(encoded) > (MAX_BODY + 2) // 3 * 4:
            raise InvalidRequest()
        body = base64.b64decode(encoded, validate=True)
        if len(body) > MAX_BODY or (method in ('GET', 'HEAD') and body):
            raise InvalidRequest()
        if route.startswith('files/') and method == 'GET':
            match = re.fullmatch(r'bytes=(\d+)-(\d+)', headers.get('range', ''))
            if not match:
                raise InvalidRequest()
            start, end = map(int, match.groups())
            if end < start or end - start + 1 > MEDIA_CHUNK:
                raise InvalidRequest()
        return method, route, headers, body
    except (ValueError, TypeError, binascii.Error, UnicodeError) as error:
        raise InvalidRequest() from error


def forward(raw, opener=None):
    method, route, headers, body = parse_request(raw)
    request = urllib.request.Request(UPSTREAM + route,
        data=None if method in ('GET', 'HEAD') else body, headers=headers, method=method)
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        response = opener.open(request, timeout=18)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        if 300 <= response.status < 400:
            raise InvalidRequest()
        if not route.startswith('files/') and 'application/json' not in response.headers.get('content-type', ''):
            raise RuntimeError('Upstream did not return API data')
        limit = MEDIA_CHUNK if route.startswith('files/') and method == 'GET' else MAX_RESPONSE
        data = response.read(limit + 1)
        if len(data) > limit:
            raise InvalidRequest()
        return {'v': 1, 'status': response.status,
                'headers': {name: response.headers[name] for name in RESPONSE_HEADERS if name in response.headers},
                'body': base64.b64encode(data).decode('ascii')}


def main(environ=None, source=None, target=None, opener=None):
    env, source, target = environ or os.environ, source or sys.stdin.buffer, target or sys.stdout.buffer
    origin = env.get('HTTP_ORIGIN', '')
    status, result = 200, None
    try:
        if env.get('QUERY_STRING') or env.get('PATH_INFO'):
            raise InvalidRequest()
        if env.get('REQUEST_METHOD') == 'GET' and not origin:
            result = {'gateway': 'RISE', 'version': 1, 'reachable': True}
        elif origin != ORIGIN:
            status, result = 403, {'error': 'この接続元は許可されていません', 'code': 'RISE_ORIGIN'}
        elif env.get('REQUEST_METHOD') != 'POST' or env.get('CONTENT_TYPE', '').split(';')[0].lower() != 'text/plain':
            raise InvalidRequest()
        else:
            length = int(env.get('CONTENT_LENGTH', '0'))
            if length < 1 or length > MAX_INPUT:
                raise InvalidRequest()
            raw = source.read(length)
            if len(raw) != length:
                raise InvalidRequest()
            result = forward(raw, opener=opener)
    except (InvalidRequest, ValueError):
        status, result = 400, {'error': '通信データを確認してください', 'code': 'RISE_REQUEST'}
    except Exception:
        # Do not include credentials, upstream URLs, or tracebacks in public errors.
        status, result = 502, {'error': 'AIworknaviからPCに接続できません。PCのRISEを確認してください。', 'code': 'RISE_UPSTREAM'}
    data = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    headers = [f'Status: {status}', 'Content-Type: application/json; charset=utf-8',
               f'Content-Length: {len(data)}', 'Cache-Control: no-store, private',
               'X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer',
               "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'", 'Vary: Origin']
    if origin == ORIGIN:
        headers.append('Access-Control-Allow-Origin: ' + ORIGIN)
    target.write(('\r\n'.join(headers) + '\r\n\r\n').encode('ascii') + data)


if __name__ == '__main__':
    main()
