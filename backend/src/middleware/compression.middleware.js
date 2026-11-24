import zlib from 'node:zlib';

/**
 * Native Node.js Gzip Compression Middleware.
 * Automatically compresses response payloads >= 1024 bytes (1 KB)
 * when the client advertises `Accept-Encoding: gzip`.
 *
 * Avoids any external dependencies, completely native.
 */
export function gzipCompression(req, res, next) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) {
        return next();
    }

    const originalSend = res.send.bind(res);

    res.send = function (body) {
        // Only compress 2xx responses
        if (res.statusCode < 200 || res.statusCode >= 300) {
            return originalSend(body);
        }

        // Check if response already has a Content-Encoding
        if (res.getHeader('Content-Encoding')) {
            return originalSend(body);
        }

        let buffer;
        if (typeof body === 'string') {
            buffer = Buffer.from(body, 'utf-8');
        } else if (Buffer.isBuffer(body)) {
            buffer = body;
        } else if (body && typeof body === 'object') {
            buffer = Buffer.from(JSON.stringify(body), 'utf-8');
            if (!res.getHeader('Content-Type')) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
            }
        } else {
            return originalSend(body);
        }

        // Only compress payloads >= 1024 bytes
        if (buffer.length < 1024) {
            return originalSend(body);
        }

        zlib.gzip(buffer, (err, gzipped) => {
            if (err) {
                // If compression fails unexpectedly, send uncompressed buffer safely
                return originalSend(buffer);
            }
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Vary', 'Accept-Encoding');
            res.removeHeader('Content-Length');
            res.setHeader('Content-Length', gzipped.length);
            return res.end(gzipped);
        });
    };

    next();
}
