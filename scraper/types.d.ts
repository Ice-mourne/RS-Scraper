export type Categories = {
    [key: string]: {
        id: number;
        name: string;
    };
};
export type Item = {
    id: number;
    name: string;
    memberItem: boolean;
    category: string;
};
export type Items = {
    [key: string]: Item;
};
export type TradeData = {
    [key: string]: {
        current: number;
        average: number;
        traded: number;
    };
};
export type TradeDataMin = {
    [key: string]: {
        c: number;
        a: number;
        t: number;
    };
};
export type ProxyObject = {
    host: string;
    port: number;
    index: number;
    failedCount: number;
    successCount: number;
};
export type FetchResult = {
    text?: string;
    proxy: ProxyObject;
    status: 'success' | 'failed';
    itemId?: number;
};
