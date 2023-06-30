import fs from 'fs';
import { fetchWithProxy, waitForAnyResponse } from './tools.js';
const proxyRegex = /(\d+\.){3}\d+:\d+/g;
const textLinks = [
    'https://spys.me/proxy.txt',
    'https://www.proxy-list.download/api/v1/get?type=http',
    'https://www.proxyscan.io/api/proxy?type=http,https&limit=20&uptime=30&format=txt',
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
    'https://openproxy.space/list/http',
    'https://free-proxy-list.net/',
    'https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt',
    'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
];
const fetchText = async (url, tries = 3) => {
    try {
        return fetch(url)
            .then((res) => res.text())
            .catch(() => fetchText(url, tries++));
    }
    catch (error) {
        return fetchText(url, tries++);
    }
};
const getProxyList = async () => {
    const proxyList = (await Promise.all(textLinks.map((link) => {
        return fetchText(link);
    })))
        .flatMap((sting) => {
        const proxies = sting.match(proxyRegex);
        if (proxies)
            return proxies;
        return [];
    })
        .flat();
    const date = new Date();
    const currentDate = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    const getFromCheckerProxy = async (tries = 0) => {
        if (tries > 3)
            return [];
        try {
            const resp = await fetch(`https://checkerproxy.net/api/archive/${currentDate}`);
            const json = (await resp.json());
            return json.flatMap((proxy) => {
                // allow only http and https
                if (proxy.type !== 1 && proxy.type !== 2)
                    return [];
                return proxy.addr;
            });
        }
        catch (error) {
            getFromCheckerProxy(tries++);
        }
        return [];
    };
    const filteredProxyList = [...new Set([...proxyList, ...(await getFromCheckerProxy())])];
    return filteredProxyList.map((proxy, i) => {
        const [host, port] = proxy.split(':');
        return { host, port: Number(port), index: i, failedCount: 0, successCount: 0 };
    });
};
export async function getWorkingProxies() {
    if (fs.existsSync(`./data/test.json`)) {
        return JSON.parse(fs.readFileSync(`./data/test.json`, 'utf8')).workingProxies;
    }
    const MAX_REQUESTS = 500;
    const url = `https://example.com/`;
    const proxyList = await getProxyList();
    const proxyMap = new Map(proxyList.map((proxy) => [proxy.index, proxy]));
    const numberOfProxies = Object.keys(proxyList).length;
    let workingProxies = [];
    let responses = [];
    let currentlyInQueue = 0;
    while (proxyMap.size > 0 && currentlyInQueue < MAX_REQUESTS) {
        currentlyInQueue++;
        const [index, proxy] = proxyMap.entries().next().value;
        proxyMap.delete(index);
        const promise = fetchWithProxy(url, proxy, 0);
        responses.push(promise);
        if (currentlyInQueue === MAX_REQUESTS) {
            const index = await waitForAnyResponse(responses);
            responses = responses.filter((_, i) => i !== index);
            currentlyInQueue--;
        }
        promise.then(async (response) => {
            const numberOfWorking = Object.keys(workingProxies).length;
            process.stdout.write(`  ${numberOfWorking} out of ${numberOfProxies} proxies are working.            \r`);
            if (response.status === 'success') {
                if (response.text?.includes(`This domain is for use in illustrative examples in documents.`)) {
                    workingProxies.push(response.proxy);
                }
                // didn't get expected that means we are not adding proxy back to list
            }
            else {
                if (response.proxy.failedCount >= 2)
                    return;
                proxyMap.set(response.proxy.index, { ...response.proxy, failedCount: response.proxy.failedCount + 1 });
            }
        });
    }
    console.log('Waiting for last tests to complete');
    await Promise.all(responses);
    for (let i = 0; i < workingProxies.length; i++) {
        workingProxies[i].failedCount = 0;
        workingProxies[i].index = i;
    }
    console.log('Found', Object.keys(workingProxies).length, 'working proxies');
    // fs.writeFileSync(`./data/test.json`, JSON.stringify({ workingProxies }, undefined, 1))
    fs.writeFileSync(`./data/test.json`, JSON.stringify({ workingProxies }, undefined, 1));
    return workingProxies;
}
// getWorkingProxies()
