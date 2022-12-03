import { Injectable, OnModuleInit } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import * as fs from 'fs';

type Config = {
    twittertokens: string[],
    dburl: string,
    redpandaBrokers: string[],
    raidmetadata: {
        level: string,
        element: string,
        tweet_name_alt: string[],
        tweet_name_en: string,
        tweet_name_jp: string,
        quest_name_en: string,
        quest_name_jp: string,
        quest_id: string,
        impossible: number,
        difficulty: string,
        stage_id: string,
        thumbnail_image: string
    }[]
}

@Injectable()
export class ConfigService implements OnModuleInit {
    private readonly configFile = 'config/config.json';
    public configBehaviorSubject: BehaviorSubject<Config>;
    public config: Config;

    constructor() {
        this.config = this.loadConfig();
        this.configBehaviorSubject = new BehaviorSubject(this.config);
        console.log('loaded config', this.config);
    }

    onModuleInit() {
        /**
         * Poll config file for changes every 30mins
         */
        setInterval(() => {
            console.log('polling config for changes');
            const loadedConfig = this.loadConfig();
            if (loadedConfig) {
                this.config = loadedConfig;
                this.configBehaviorSubject.next(this.config);
            }
        }, 1000 * 60 * 30);
    }

    /**
     * Reads config json sync from file.
     * Returns result
     */
    private loadConfig() {
        try {
            const config = fs.readFileSync(this.configFile);
            return JSON.parse(config.toString());
        } catch (error) {
            return undefined;
        }
    }

}
