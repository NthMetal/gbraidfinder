import { Injectable } from "@angular/core";
import {
    Bar,
    DatafeedConfiguration,
    ErrorCallback,
    HistoryCallback,
    IBasicDataFeed,
    LibrarySymbolInfo,
    OnReadyCallback,
    PeriodParams,
    ResolutionString,
    ResolveCallback,
    SearchSymbolResultItem,
    SearchSymbolsCallback,
    SubscribeBarsCallback,
    SymbolResolveExtension,
} from "src/assets/tv/charting_library";
import { MetadataService } from "../services/metadata.service";

@Injectable({
    providedIn: 'root'
})
export class GBRaidfinderDatafeed implements IBasicDataFeed {

    temp_resolutions: ResolutionString[] = [
        '1' as ResolutionString,
        '3' as ResolutionString,
        '5' as ResolutionString,
        '15' as ResolutionString,
        '30' as ResolutionString,
        '60' as ResolutionString,
        '69' as ResolutionString,
        '120' as ResolutionString,
        '240' as ResolutionString,
        '360' as ResolutionString,
        '480' as ResolutionString,
        '720' as ResolutionString,
        '1D' as ResolutionString,
        '2D' as ResolutionString,
        '3D' as ResolutionString,
        '4D' as ResolutionString,
        '1W' as ResolutionString,
        '1M' as ResolutionString
    ];
    availableSymbols: string[] = [];

    subscribedPairs: { [pair: string]: string[] } = {};

    lastSubscribedPair: string;
    
    allRaidsItem = {
        difficulty: "-1",
        element: "",
        impossible: -1,
        level: "-1",
        quest_id: "all",
        quest_name_en: "All Raids",
        quest_name_jp: "全て 討伐戦",
        stage_id: "all",
        thumbnail_image: "normal_hard",
        tweet_name_alt: [],
        tweet_name_en: "All Raids",
        tweet_name_jp: "全て 討伐戦"
    };

    subscribedSymbols: Set<string> = new Set<string>();
    subscribedSymbolValues: { [symbol: string]: number } = {};
    subscriptionInterval: any;
    resetInterval: any;

    constructor(protected metadataService: MetadataService,) { }

    public onReady(callback: OnReadyCallback) {
        // console.log('chart is ready');
        const config: DatafeedConfiguration = {
            exchanges: [],
            supported_resolutions: this.temp_resolutions,
            currency_codes: [
                {
                    id: 'all',
                    code: 'all',
                    logoUrl: '/assets/thumb/300441.png',
                    description: 'all'
                }
            ],
            supports_marks: true,
            supports_time: true,
            supports_timescale_marks: true,
            symbols_types: [
                // { name: 'ALL', value: '' },
                { name: 'Count', value: 'COUNT' },
                { name: 'HP', value: 'HP' },
                { name: 'Players', value: 'PLAYERS' },
                { name: 'TimeLeft', value: 'TIMELEFT' },
                // { name: 'PAX', value: 'PAX' }
                // { name: 'Spot', value: 'spot' },
                // { name: 'Swap', value: 'swap' },
                // { name: 'Future', value: 'future' }
            ]
        }
        // class: {}
        // count: 0
        // hpSum: 0
        // playerSum: 0
        // timeLeftSum: 0
        // timestamp: "2022-12-14T23:00:11.000Z"
        // updateCount: 0
        setTimeout(() => {
            this.metadataService.getRaidMetadata().subscribe(metadata => {
                if (config.exchanges) config.exchanges.push({ value: '', name: 'Any', desc: 'Search any coin.' });
                callback(config);
            });
        });
        // const pair = 'BTCUSD';
        // this.socketIoService.subscribePair(pair);
        // this.socketIoService.getTrades().subscribe(trades => {
        //     console.log('got trades...', trades);
        // });
        // this.exchangeService.getAllInfo().subscribe(result => {
        //     // config.exchanges.push(...result.exchanges.map(name => (
        //     //     { value: name, name, desc: name }
        //     // )));
        //     // const baseCoins = [...new Set(result.products.map(product => product.split('-')[0]))];
        //     config.exchanges.push({ value: '', name: 'Any', desc: 'Search any coin.' });
        //     // config.exchanges.push(...baseCoins.map(baseCoin => (
        //     //     { value: baseCoin, name: baseCoin, desc: baseCoin }
        //     // )));
        //     this.settingsService.updateExchanges(result.exchanges.map(exchange => ({
        //         id: exchange,
        //         enabled: true
        //     })));
        //     this.availableSymbols = result.products;
        //     callback(config)
        // });
        // callback(config);
    }

    public searchSymbols(
        userInput: string,
        exchange: string,
        symbolType: string,
        onResult: SearchSymbolsCallback
    ) {
        // console.log('the user searched for: ', userInput, exchange, symbolType);
        this.metadataService.getRaidMetadata().subscribe(metadata => {
            const matchingRaids = [this.allRaidsItem, ...metadata].filter((raid: any) => JSON.stringify(raid).toLowerCase().includes(userInput.toLowerCase()));
            setTimeout(() => {
                onResult(matchingRaids.map((raid: any) => ({
                    symbol: raid.quest_id,
                    full_name: raid.quest_name_en,
                    description: raid.tweet_name_en,
                    exchange: raid.element,
                    ticker: raid.quest_id + ':' + symbolType.toUpperCase(),
                    type: symbolType,
                } as SearchSymbolResultItem)))
            });
        });
        // setTimeout(() => {
        //     // console.log(document.getElementsByClassName('symbolTitle-ZzQNZGNo'));
        //     const iframe = document.getElementsByTagName('iframe')[0];
        //     if (!iframe) return;
        //     const idocument = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        //     if (!idocument) return;
        //     const elements = idocument.getElementsByClassName('symbolTitle-ZzQNZGNo');
        //     // <div class="symbolTitle-ZzQNZGNo noDescription-ZzQNZGNo" data-name="list-item-title">all</div>
        //     for (let i=0;i<elements.length;i++) {
        //         const element = elements[i];
        //         const elementParent = element.parentElement;
        //         if (!elementParent || elementParent.children.length > 1) return; 
        //         const raidID = element.innerHTML;
        //         if (raidID.length > 7 || raidID === 'all') continue;
        //         element.innerHTML = `<img src="../../../assets/thumb/${raidID}.png" height="40px"/>`;
        //         console.log(raidID)
        //     }
        //     console.log(elements);
        // });
        // {
        //     "difficulty": "1",
        //     "element": "wind",
        //     "impossible": 1,
        //     "level": "20",
        //     "quest_id": "300041",
        //     "quest_name_en": "Tiamat Showdown",
        //     "quest_name_jp": "ティアマト討伐戦",
        //     "stage_id": "11011",
        //     "thumbnail_image": "normal_hard",
        //     "tweet_name_alt": [],
        //     "tweet_name_en": "Lvl 30 Tiamat",
        //     "tweet_name_jp": "Lv30 ティアマト"
        // }
        // const matchingSymbols = this.availableSymbols
        //     .filter(symbol => symbol.startsWith(exchange))
        //     .filter(symbol => symbol.endsWith(symbolType))
        //     .filter(symbol => symbol.includes(userInput.toUpperCase()));
        // setTimeout(() => {
        //     onResult(matchingSymbols.map(symbol => ({
        //         symbol,
        //         full_name: symbol,
        //         description: symbol,
        //         exchange: symbol,
        //         ticker: symbol,
        //         type: symbol,
        //     } as SearchSymbolResultItem)))
        // });
    }

    public resolveSymbol(
        symbolName: string,
        onResolve: ResolveCallback,
        onError: ErrorCallback,
        extension?: SymbolResolveExtension
    ) {
        // console.log('BBBBBBBBBBBBBBBBB resolving symbol: ', symbolName, extension);
        const [ raidQuestId, statType ] = symbolName.split(':');
        this.metadataService.getRaidMetadata().subscribe(metadata => {
            let raid = [this.allRaidsItem, ...metadata].find(raid => raid.quest_id === raidQuestId.toLowerCase());
            setTimeout(() => {
                if (!raid) return onError('idksomething');
                // if (!raid) return onError('cannot find: ' + symbolName);
                // console.log('LOOKING FORSSSSSSSSSSSSSSSSSSSSS:', symbolName);
                const symbolInfo: LibrarySymbolInfo = {
                    name: raid.quest_name_en,
                    full_name: raid.quest_id,
                    description: raid.quest_name_en,
                    type: statType,
                    session: '24x7',
                    exchange: statType,
                    listed_exchange: raid.quest_id,
                    timezone: 'Etc/UTC',
                    format: 'price',
                    pricescale: 1000,
                    minmov: 1,
                    supported_resolutions: this.temp_resolutions,
                    has_intraday: true,
                    has_seconds: true,
                    has_weekly_and_monthly: true,
                    has_ticks: true,
                    has_daily: true,
                    currency_code: 'all',
                    ticker: raid.quest_id + ':' + statType.toUpperCase()
                };
                onResolve(symbolInfo);
            });
        });
        // {
        //     "difficulty": "1",
        //     "element": "wind",
        //     "impossible": 1,
        //     "level": "20",
        //     "quest_id": "300041",
        //     "quest_name_en": "Tiamat Showdown",
        //     "quest_name_jp": "ティアマト討伐戦",
        //     "stage_id": "11011",
        //     "thumbnail_image": "normal_hard",
        //     "tweet_name_alt": [],
        //     "tweet_name_en": "Lvl 30 Tiamat",
        //     "tweet_name_jp": "Lv30 ティアマト"
        // }
    }

    public async getBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString,
        periodParams: PeriodParams,
        onResult: HistoryCallback,
        onError: ErrorCallback
    ) {
        // console.log('AAAAAAAAAAAAA getting bars.....')
        // console.log('AAAAAAAAAAAAA subscribing to ', symbolInfo);
        // console.log('AAAAAAAAAAAAA with resolution: ', resolution);
        // console.log('AAAAAAAAAAAAA period params: ', periodParams);

        const data = await this.metadataService.getHistoricalStats(symbolInfo.listed_exchange, new Date(periodParams.from * 1000), new Date(periodParams.to * 1000), periodParams.countBack);
        onResult(
            data.map((item: any) => {

                const stat = this.getStatFromData(symbolInfo.type, item);
                // { name: 'Count', value: 'COUNT' },
                // { name: 'HP', value: 'HP' },
                // { name: 'Players', value: 'PLAYERS' },
                // { name: 'TimeLeft', value: 'TIMELEFT' },
                
                return {
                    time: new Date(item.timestamp).getTime(),
                    open: stat,
                    high: stat,
                    low: stat,
                    close: stat,
                    volume: item.updateCount
                }
            })
        )
        // this.workerService.getHistoricalData(
        //     symbolInfo.name,
        //     periodParams.countBack,
        //     periodParams.firstDataRequest,
        //     periodParams.from,
        //     periodParams.to,
        //     resolution
        // ).subscribe(trades => {
        //     console.log('got bars: ', trades);
        //     if(!trades.length) return onResult([], { noData: true });
        //     const bars = trades.map(trade => ({
        //         time: trade[0],
        //         open: +trade[1],
        //         close: +trade[2],
        //         high: trade[3],
        //         low: trade[4],
        //         volume: trade[5]
        //     }));

        //     // onResult([], { noData: true });
        //     onResult(bars);
        // })
    }

    public subscribeBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString,
        onTick: SubscribeBarsCallback,
        listenerGuid: string,
        onResetCacheNeededCallback: () => void
    ) {
        // console.log('subscribing to ', symbolInfo);
        // console.log('with resolution: ', resolution);
        // console.log('listener guid: ', listenerGuid);
        // if (this.subscriptionInterval) clearInterval(this.subscriptionInterval);
        // if (symbolInfo.ticker) {
        //     this.subscribedSymbols.add(symbolInfo.ticker);
        //     this.subscribedSymbolValues[symbolInfo.ticker] = 0;
        // }
        // this.subscriptionInterval = setInterval(async () => {
        //     // const random = Math.floor(Math.random() * 10000);
        //     const data = await this.metadataService.getHistoricalStats(symbolInfo.full_name, new Date(new Date().getTime() - (1000 * 60 * 1.5)), new Date(), 1);
        //     if (!data.length) return;
        //     const stat = this.getStatFromData(symbolInfo.exchange, data[0])
        //     if (symbolInfo.ticker) {
        //         this.subscribedSymbolValues[symbolInfo.ticker] += stat;
        //         onTick({
        //             time: new Date().getTime(),
        //             open: this.subscribedSymbolValues[symbolInfo.ticker],
        //             high: this.subscribedSymbolValues[symbolInfo.ticker],
        //             low: this.subscribedSymbolValues[symbolInfo.ticker],
        //             close: this.subscribedSymbolValues[symbolInfo.ticker],
        //             volume: data[0].updateCount
        //         });
        //     }
        // }, 1000 * 60);

        // if (this.resetInterval) clearInterval(this.resetInterval);
        // const resolutionMap = {
        //     '1': 1000 * 60 * 1,
        //     '3': 1000 * 60 * 3,
        //     '5': 1000 * 60 * 5,
        //     '15': 1000 * 60 * 15,
        //     '30': 1000 * 60 * 30,
        //     '60': 1000 * 60 * 60,
        //     '69': 1000 * 60 * 69,
        //     '120': 1000 * 60 * 120,
        //     '240': 1000 * 60 * 240,
        //     '360': 1000 * 60 * 360,
        //     '480': 1000 * 60 * 480,
        //     '720': 1000 * 60 * 720,
        //     '1D': 1000 * 60 * 60 * 24 * 1,
        //     '2D': 1000 * 60 * 60 * 24 * 2,
        //     '3D': 1000 * 60 * 60 * 24 * 3,
        //     '4D': 1000 * 60 * 60 * 24 * 4,
        //     '1W': 1000 * 60 * 60 * 24 * 7,
        //     '1M': 1000 * 60 * 60 * 24 * 30,
        // };
        // const parsedResolutionString = resolutionMap[resolution as keyof typeof resolutionMap]
        // this.resetInterval = setInterval(() => {
        //     this.subscribedSymbolValues = {};
        // }, parsedResolutionString);
        // Object.keys(this.subscribedPairs).forEach(pair => {
        //     if (pair !== symbolInfo.name) {
        //         this.subscribedPairs[pair] = undefined;
        //         this.socketIoService.unsubscribePair(pair);
        //     }
        // });
        // if (this.subscribedPairs[symbolInfo.name]) {
        //     this.subscribedPairs[symbolInfo.name].push(listenerGuid);
        // } else {
        //     this.subscribedPairs[symbolInfo.name] = [listenerGuid];
        // }
        // this.socketIoService.subscribePair(symbolInfo.name);
        // this.socketIoService.getTrades().subscribe(trades => {
        //     // console.log('got trades...', trades);
        //     if (trades && trades.length) {
        //         const tradeBar = this.getBarFromTrades(trades);
        //         onTick(tradeBar);
        //     }

        // });
    }

    public unsubscribeBars(listenerGuid: string) {
        // // listenerGuiD format example: BTCUSD_#_1
        // const pair = listenerGuid.split('_')[0];
        // if (this?.subscribedPairs[pair]?.length === 0) this.socketIoService.unsubscribePair(pair);
    }

    private getStatFromData(stat: string, data: any): number {
        let statRet = data.count;
        switch (stat) {
            case 'COUNT':
                statRet = data.count;
                break;
            case 'HP':
                statRet = data.updateCount === 0 ? 0 : data.hpSum / data.updateCount;
                break;
            case 'PLAYERS':
                statRet = data.updateCount === 0 ? 0 : data.playerSum / data.updateCount;;
                break;
            case 'TIMELEFT':
                statRet = data.updateCount === 0 ? 0 : data.timeLeftSum / data.updateCount;;
                break;
            default:
                statRet = data.count;
        }
        return statRet;
    }

}
