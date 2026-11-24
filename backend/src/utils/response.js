export function sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({ success: true, data });
}
export function sendError(res, message, statusCode = 500) {
    const safeMessage = statusCode >= 500
        ? 'Internal server error'
        : statusCode === 400
            ? 'Request validation failed'
            : message;
    res.status(statusCode).json({
        success: false,
        error: {
            code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
            message: safeMessage,
        },
    });
}
export function sendPaginated(res, data, total, page, limit) {
    res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    });
}
//# sourceMappingURL=response.js.map