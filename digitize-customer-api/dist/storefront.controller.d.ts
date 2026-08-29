import { StorefrontService } from './storefront.service';
export declare class StorefrontController {
    private readonly storefront;
    constructor(storefront: StorefrontService);
    context(): Promise<{
        name: string;
        slug: string;
    }>;
    products(): Promise<import("pg").QueryResultRow[]>;
    product(productId: string): Promise<any>;
    register(body: {
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
    login(body: {
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
    me(token?: string): Promise<{
        id: string;
        email: string;
        name: string;
    }>;
    order(token: string | undefined, body: {
        items: Array<{
            productId: string;
            quantity: number;
        }>;
        shippingAddress?: Record<string, unknown>;
    }): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        status: string;
    }>;
}
