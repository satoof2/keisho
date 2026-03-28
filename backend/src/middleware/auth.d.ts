import { type Request, type Response, type NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        address: string;
    };
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map