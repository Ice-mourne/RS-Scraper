import { Items, TradeData, ProxyObject, FetchResult, Item } from './types.js';
export declare const timeConverter: (startTime: number, endTime: number) => string;
type FileTypes = {
    proxy: {
        bestProxyList: string[];
        brokenProxyList: string[];
    };
    items: Items;
    prices: {
        [key: string]: TradeData;
    };
};
export declare const readFile: <T extends keyof FileTypes>(fileName: T) => FileTypes[T];
export declare const writeFile: <T extends keyof FileTypes>(fileName: T, data: FileTypes[T]) => void;
export declare const fetchWithProxy: (url: string, proxy: ProxyObject, itemId: number) => Promise<FetchResult>;
export declare const waitForAnyResponse: <T>(promises: Promise<T>[]) => Promise<number>;
export declare class PriceScrapingTools {
    constructor(proxies: ProxyObject[], items: Items, maxRequests: number);
    private proxies;
    items: Map<string, Item>;
    readonly maxRequests: number;
    private totalNumberOfItems;
    private totalNumberOfProxies;
    activeRequests: Promise<FetchResult>[];
    private successFailList;
    private waitForAnyResponse;
    private readFile;
    private writeFile;
    /**
     * Did request fail or succeed used to show percentage
     */
    private addRequestStatus;
    /**
     ** Add new promise if max number of requests is reached
     ** wait for any request to finish before adding new one
     */
    addPromise(promise: Promise<FetchResult>): Promise<void>;
    getRandomProxy(): Promise<ProxyObject>;
    getItem(): [string, Item];
    handleSuccessfulRequest(itemId: number, newTradeData: TradeData, proxyIndex: number): void;
    handleFailedRequest(proxyIndex: number, removeProxy: boolean): void;
    private progressBars;
    private itemBar;
    private proxyBar;
    private initializeBars;
    stopProgressBars(): void;
}
export {};
