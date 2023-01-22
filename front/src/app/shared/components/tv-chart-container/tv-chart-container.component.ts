import { Component, Input, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import {
    widget,
    IChartingLibraryWidget,
    ChartingLibraryWidgetOptions,
    LanguageCode,
    ResolutionString,
} from 'src/assets/tv/charting_library';
import { GBRaidfinderDatafeed } from '../../datafeeds/gbraidfinder.datafeed';

@Component({
    selector: 'app-tv-chart-container',
    templateUrl: './tv-chart-container.component.html',
    styleUrls: ['./tv-chart-container.component.less']
})
export class TvChartContainerComponent implements OnInit, OnDestroy {
    private _symbol: ChartingLibraryWidgetOptions['symbol'] = 'ALL:COUNT';
    private _interval: ChartingLibraryWidgetOptions['interval'] = '1h' as ResolutionString;
    // BEWARE: no trailing slash is expected in feed URL
    private _datafeedUrl = 'https://demo_feed.tradingview.com';
    private _libraryPath: ChartingLibraryWidgetOptions['library_path'] = '/assets/tv/charting_library/';
    private _chartsStorageUrl: ChartingLibraryWidgetOptions['charts_storage_url'] = 'https://saveload.tradingview.com';
    private _chartsStorageApiVersion: ChartingLibraryWidgetOptions['charts_storage_api_version'] = '1.1';
    private _clientId: ChartingLibraryWidgetOptions['client_id'] = 'tradingview.com';
    private _userId: ChartingLibraryWidgetOptions['user_id'] = 'public_user_id';
    private _fullscreen: ChartingLibraryWidgetOptions['fullscreen'] = false;
    private _autosize: ChartingLibraryWidgetOptions['autosize'] = true;
    private _containerId = 'tv_chart_container';
    private _tvWidget: IChartingLibraryWidget | null = null;

    @Input()
    set symbol(symbol: ChartingLibraryWidgetOptions['symbol']) {
        this._symbol = symbol || this._symbol;
    }

    @Input()
    set interval(interval: ChartingLibraryWidgetOptions['interval']) {
        this._interval = interval || this._interval;
    }

    @Input()
    set datafeedUrl(datafeedUrl: string) {
        this._datafeedUrl = datafeedUrl || this._datafeedUrl;
    }

    @Input()
    set libraryPath(libraryPath: ChartingLibraryWidgetOptions['library_path']) {
        this._libraryPath = libraryPath || this._libraryPath;
    }

    @Input()
    set chartsStorageUrl(chartsStorageUrl: ChartingLibraryWidgetOptions['charts_storage_url']) {
        this._chartsStorageUrl = chartsStorageUrl || this._chartsStorageUrl;
    }

    @Input()
    set chartsStorageApiVersion(chartsStorageApiVersion: ChartingLibraryWidgetOptions['charts_storage_api_version']) {
        this._chartsStorageApiVersion = chartsStorageApiVersion || this._chartsStorageApiVersion;
    }

    @Input()
    set clientId(clientId: ChartingLibraryWidgetOptions['client_id']) {
        this._clientId = clientId || this._clientId;
    }

    @Input()
    set userId(userId: ChartingLibraryWidgetOptions['user_id']) {
        this._userId = userId || this._userId;
    }

    @Input()
    set fullscreen(fullscreen: ChartingLibraryWidgetOptions['fullscreen']) {
        this._fullscreen = fullscreen || this._fullscreen;
    }

    @Input()
    set autosize(autosize: ChartingLibraryWidgetOptions['autosize']) {
        this._autosize = autosize || this._autosize;
    }

    @Input()
    set containerId(containerId: ChartingLibraryWidgetOptions['container_id']) {
        this._containerId = containerId || this._containerId;
    }

    constructor(
        private gBRaidfinderDatafeed: GBRaidfinderDatafeed,
        private router: Router,
        private zone: NgZone
    ) {}

    ngOnInit() {
        function getLanguageFromURL(): LanguageCode | null {
            const regex = new RegExp('[\\?&]lang=([^&#]*)');
            const results = regex.exec(location.search);

            return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' ')) as LanguageCode;
        }

        const widgetOptions: ChartingLibraryWidgetOptions = {
            symbol: this._symbol,
            // datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(this._datafeedUrl),
            datafeed: this.gBRaidfinderDatafeed,
            interval: this._interval,
            library_path: this._libraryPath,
            locale: getLanguageFromURL() || 'en',
            disabled_features: [],
            enabled_features: ['study_templates', 'seconds_resolution', 'use_localstorage_for_settings'],
            charts_storage_url: this._chartsStorageUrl,
            charts_storage_api_version: this._chartsStorageApiVersion,
            client_id: this._clientId,
            user_id: this._userId,
            fullscreen: this._fullscreen,
            autosize: this._autosize,
            container: this._containerId,
            // debug: true
        };

        const defaultSettings = {
            "style": 2
        }
        
        if (!localStorage.getItem('tradingview.chartproperties.mainSeriesProperties')) {
            localStorage.setItem('tradingview.chartproperties.mainSeriesProperties', JSON.stringify(defaultSettings));
        }
        if (!localStorage.getItem('tradingview.chart.lastUsedStyle')) {
            localStorage.setItem('tradingview.chart.lastUsedStyle', '2');
        }

        const tvWidget = new widget(widgetOptions);
        this._tvWidget = tvWidget;
        
        tvWidget.onChartReady(() => {
            tvWidget.headerReady().then(() => {
                const button = tvWidget.createButton();
                button.setAttribute('title', 'Back To Raid Finder');
                button.classList.add('apply-common-tooltip');
                button.addEventListener('click', () => {
                    this.zone.run(() => {
                        this.router.navigate(['/home']);
                    });
                });
                button.innerHTML = '<div id="header-toolbar-properties" data-role="button" class="iconButton-pzOKvpP8 button-2YcRd2gv button-2Vpz_LXc apply-common-tooltip isInteractive-2Vpz_LXc"><span class="icon-2Vpz_LXc"><img alt="gbraidfinder logo" src="../../../icons/favicon-32x32.png"></img></span></div>';
            });
        });
    }

    ngOnDestroy() {
        if (this._tvWidget !== null) {
            this._tvWidget.remove();
            this._tvWidget = null;
        }
    }
}
