import { JwtService } from '@nestjs/jwt';
import { QueryResultRow } from 'pg';
export declare class StorefrontService {
    private readonly jwt;
    private readonly database;
    constructor(jwt: JwtService);
    stores(): Promise<{
        id: string;
        name: string;
        slug: string;
    }[]>;
    products(storeSlug: string): Promise<QueryResultRow[]>;
    product(storeSlug: string, productId: string): Promise<any>;
    register(input: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        accessToken: string;
        customer: {
            id: string;
            email: string;
            name: string;
        };
    }>;
    login(input: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        customer: {
            id: string;
            email: string;
            name: string;
        };
    }>;
    account(token?: string): Promise<{
        id: string;
        email: string;
        name: string;
    }>;
    createOrder(token: string | undefined, storeSlug: string, body: {
        items: Array<{
            productId: string;
            quantity: number;
        }>;
        shippingAddress?: Record<string, unknown>;
    }): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        status: string;
    }>;
    private token;
    private verify;
    private query;
}
