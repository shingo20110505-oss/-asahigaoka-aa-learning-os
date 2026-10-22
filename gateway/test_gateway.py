import base64
import io
import json
import unittest
import urllib.error
from email.message import Message
from rise_gateway import main, parse_request, forward, InvalidRequest, ORIGIN, UPSTREAM, NoRedirect

FILE = '01234567-1234-1234-1234-012345678901'


def envelope(path='status', method='GET', headers=None, body=b''):
    return json.dumps({'v': 1, 'path': path, 'method': method,
                       'headers': headers or {}, 'body': base64.b64encode(body).decode()}).encode()


class Reply(io.BytesIO):
    def __init__(self, data=b'{}', status=200, **headers):
        super().__init__(data)
        self.status = status
        self.headers = Message()
        if 'content-type' not in headers:
            headers['content-type'] = 'application/json'
        for name, value in headers.items():
            self.headers[name] = value


class Opener:
    def __init__(self, response=None):
        self.response, self.request = response, None

    def open(self, request, timeout):
        self.request = request
        assert timeout == 18
        return self.response or Reply()


class GatewayTest(unittest.TestCase):
    def run_cgi(self, body=None, origin=ORIGIN, method='POST', opener=None, **env):
        raw = body if body is not None else envelope()
        target = io.BytesIO()
        main({'REQUEST_METHOD': method, 'HTTP_ORIGIN': origin, 'CONTENT_TYPE': 'text/plain;charset=UTF-8',
              'CONTENT_LENGTH': str(len(raw)), **env}, io.BytesIO(raw), target, opener or Opener())
        headers, payload = target.getvalue().split(b'\r\n\r\n', 1)
        return headers.decode(), json.loads(payload)

    def test_fixed_upstream_and_auth_not_url_or_cookie(self):
        token = 'x' * 43
        opener = Opener(Reply(b'{"ok":true}', **{'content-type': 'application/json', 'set-cookie': 'private=1'}))
        result = forward(envelope('login', 'POST', {'authorization': 'Bearer ' + token,
            'content-type': 'application/json'}, b'{"password":"test"}'), opener)
        self.assertEqual(opener.request.full_url, UPSTREAM + 'login')
        self.assertEqual(opener.request.get_header('Origin'), ORIGIN)
        self.assertEqual(opener.request.get_header('User-agent'), 'RISE-Gateway/1.0')
        self.assertEqual(opener.request.get_header('Authorization'), 'Bearer ' + token)
        self.assertEqual(opener.request.get_header('X-rise-transport'), 'pages')
        self.assertNotIn('set-cookie', result['headers'])
        self.assertEqual(base64.b64decode(result['body']), b'{"ok":true}')

    def test_reject_arbitrary_urls_traversal_methods_streams_and_private_routes(self):
        for route in ['https://evil.test', '//evil.test', '../setup', 'events', '_rise/host/hello',
                      'threads/../../setup', 'status?token=secret', 'status\r\nX: y', 'files/' + FILE + '?download=2']:
            with self.subTest(route=route), self.assertRaises(InvalidRequest):
                parse_request(envelope(route))
        for method in ['DELETE', 'OPTIONS', 'PUT', 'PATCH']:
            with self.assertRaises(InvalidRequest):
                parse_request(envelope('status', method))
        self.assertIsNone(NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.test'))

    def test_invalid_headers_and_bodies(self):
        for headers in [{'origin': 'https://evil.test'}, {'cookie': 'foo'}, {'host': 'evil.test'},
                        {'x-rise-relay': 'secret'}, {'authorization': 'Bearer x\r\nHost: evil'},
                        {'upload-offset': '-1'}, {'content-type': 'text/html'}]:
            with self.assertRaises(InvalidRequest):
                parse_request(envelope(headers=headers))
        for raw in [b'[]', b'null', b'{', b'{"v":1,"method":"GET","path":"status","body":"!"}', envelope(body=b'x')]:
            with self.assertRaises(InvalidRequest):
                parse_request(raw)

    def test_origin_and_content_type_are_enforced_before_forwarding(self):
        for origin in ['', 'null', 'https://evil.test', ORIGIN + '.evil.test']:
            headers, result = self.run_cgi(origin=origin)
            self.assertIn('Status: 403', headers)
            self.assertNotIn('Access-Control-Allow-Origin', headers)
        for env in [{'CONTENT_TYPE': 'application/json'}, {'CONTENT_LENGTH': '999999999'},
                    {'CONTENT_LENGTH': '-5'}, {'QUERY_STRING': 'password=x'}, {'PATH_INFO': '/foo'}]:
            headers, result = self.run_cgi(**env)
            self.assertIn('Status: 400', headers)
        headers, result = self.run_cgi()
        self.assertIn('Access-Control-Allow-Origin: ' + ORIGIN, headers)
        self.assertNotIn('Allow-Credentials', headers)
        self.assertIn('Cache-Control: no-store', headers)
        self.assertEqual(result['v'], 1)

    def test_head_and_bounded_binary_ranges(self):
        parse_request(envelope('files/' + FILE, 'HEAD'))
        parse_request(envelope('files/' + FILE, headers={'range': 'bytes=0-1048575'}))
        for headers in [{}, {'range': 'bytes=0-'}, {'range': 'bytes=0-1048576'}, {'range': 'bytes=8-2'}]:
            with self.assertRaises(InvalidRequest):
                parse_request(envelope('files/' + FILE, headers=headers))
        data = bytes(range(256))
        result = forward(envelope('files/' + FILE, headers={'range': 'bytes=0-255'}),
                         Opener(Reply(data, 206, **{'content-range': 'bytes 0-255/256'})))
        self.assertEqual(result['status'], 206)
        self.assertEqual(base64.b64decode(result['body']), data)

    def test_offline_error_has_no_internal_details(self):
        class Failed:
            def open(self, request, timeout):
                raise RuntimeError('private password or path')
        headers, result = self.run_cgi(opener=Failed())
        self.assertIn('Status: 502', headers)
        self.assertEqual(result['code'], 'RISE_UPSTREAM')
        self.assertNotIn('private', str(result))
        headers, result = self.run_cgi(method='GET', origin='')
        self.assertEqual(result, {'gateway': 'RISE', 'version': 1, 'reachable': True})


if __name__ == '__main__':
    unittest.main()
