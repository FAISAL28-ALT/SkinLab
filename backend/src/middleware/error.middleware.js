import { ZodError } from 'zod';
export function errorHandler(err, _req, res, _next) {
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', issues: err.issues.map((e) => ({
                    field: e.path.join('.'), message: e.message,
                })) },
        });
        return;
    }
    // Prisma foreign key / constraint errors
    if ('code' in err) {
        const prismaError = err;
        if (prismaError.code === 'P2002') {
            res.status(409).json({
                success: false,
                error: { code: 'CONFLICT', message: 'A record with these details already exists' },
            });
            return;
        }
        if (prismaError.code === 'P2003') {
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_REFERENCE', message: 'A referenced record does not exist' },
            });
            return;
        }
    }
    const status = 'status' in err && typeof err.status === 'number'
        ? err.status : 500;
    if (status >= 500)
        console.error('[Unhandled Error]:', err.name || 'Error');
    res.status(status).json({
        success: false,
        error: { code: status >= 500 ? (err.code ?? 'INTERNAL_ERROR') : (err.code ?? 'BAD_REQUEST'), message: status >= 500 ? 'Internal server error' : err.message },
    });
}
//# sourceMappingURL=error.middleware.js.map
