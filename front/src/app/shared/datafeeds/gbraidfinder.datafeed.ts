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

@Injectable({
    providedIn: 'root'
})
export class GBRaidfinderDatafeed implements IBasicDataFeed {

    temp_resolutions: ResolutionString[] = [
        '1s' as ResolutionString,
        '3s' as ResolutionString,
        '5s' as ResolutionString,
        '15s' as ResolutionString,
        '30s' as ResolutionString,
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

    constructor() { }

    public onReady(callback: OnReadyCallback) {
        console.log('chart is ready');
        const config: DatafeedConfiguration = {
            exchanges: [],
            supported_resolutions: this.temp_resolutions,
            currency_codes: [ 'USD' ],
            supports_marks: true,
            supports_time: true,
            supports_timescale_marks: true,
            symbols_types: [
                { name: 'ALL', value: '' },
                { name: 'USD', value: 'USD' },
                { name: 'USDT', value: 'USDT' },
                { name: 'USDC', value: 'USDC' },
                { name: 'DAI', value: 'DAI' },
                { name: 'PAX', value: 'PAX' }
                // { name: 'Spot', value: 'spot' },
                // { name: 'Swap', value: 'swap' },
                // { name: 'Future', value: 'future' }
            ]
        }
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
        callback(config)
    }

    public searchSymbols(
        userInput: string,
        exchange: string,
        symbolType: string,
        onResult: SearchSymbolsCallback
    ) {
        console.log('the user searched for: ', userInput, exchange, symbolType);
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
        console.log('resolving symbol: ', symbolName);
        // setTimeout(() => {
        //     const split = symbolName.split('-');
        //     const symbolInfo: LibrarySymbolInfo = {
        //         name: symbolName,
        //         full_name: symbolName,
        //         description: symbolName,
        //         type: split[1],
        //         session: '24x7',
        //         exchange: split[0],
        //         listed_exchange: split[0],
        //         timezone: 'Etc/UTC',
        //         format: 'price',
        //         pricescale: 1000,
        //         minmov: 1,
        //         supported_resolutions: this.temp_resolutions,
        //         has_intraday: true,
        //         has_seconds: true,
        //         has_weekly_and_monthly: true,
        //         has_ticks: true,
        //         has_daily: true
        //     };
        //     onResolve(symbolInfo);
        // });
    }

    public getBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: ResolutionString,
        periodParams: PeriodParams,
        onResult: HistoryCallback,
        onError: ErrorCallback
    ) {
        console.log('getting bars.....')
        console.log('subscribing to ', symbolInfo);
        console.log('with resolution: ', resolution);
        console.log('period params: ', periodParams);
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
        console.log('subscribing to ', symbolInfo);
        console.log('with resolution: ', resolution);
        console.log('listener guid: ', listenerGuid);
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

}
