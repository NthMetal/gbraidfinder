import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class ConfigService implements OnModuleInit {
    private readonly configFile = 'config/config.json';
    public config: {
        twittertokens: string[],
        redpandaBrokers: string[],
        raidmetadata: { 
            level:  string,
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
    };

    constructor() {
        this.config = this.loadConfig();
        console.log('loaded config', this.config);
    }
    
    onModuleInit() {
        /**
         * Watch config file for changes
         */
        fs.watch(this.configFile, event => {
            if (event === 'change') {
                this.config = this.loadConfig();
                console.log('loaded new config', this.config);
            }
        });
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
            return {};
        }
    }

}
