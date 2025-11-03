import { Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
  
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
        success: true,
        data,
        message: message || 'Operação realizada com sucesso'
    };
}
  
export function createErrorResponse(error: string, message?: string): ApiResponse {
    return {
        success: false,
        error,
        message: message || 'Erro na operação'
    };
}

export function handleResponse(res: Response, statusCode: number, data: any): Response {
    return res.status(statusCode).json(data);
}