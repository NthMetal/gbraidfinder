import * as needle from 'needle';

interface Rule {
    id: string,
    value: string,
    tag: string
}

export interface Tweet {
    data: {
        attachments: { media_keys: string[] },
        author_id: string,
        edit_history_tweet_ids: string[],
        id: string,
        text: string,
        source: string,
        created_at: string
    },
    includes: { 
        media: {
            media_key: string,
            type: string,
            url: string
        }[],
        users: {
            id: string,
            name: string,
            profile_image_url: string,
            username: string,
            verified: boolean
        }[] },
    matching_rules: { id: string, tag: 'EN' | 'JP' }[]
}

export class Twitter {
    private readonly rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
    private readonly streamURL = 'https://api.twitter.com/2/tweets/search/stream';
    private readonly tweetsURL = "https://api.twitter.com/2/tweets?ids=";
    private readonly token = undefined;
    private retryAttempt = 0;

    // "参加者募集！", ":参戦ID", "I need backup!", ":Battle ID"
    private readonly rules = [
        {
            'value': '"参加者募集！" ":参戦ID"',
            'tag': 'JP'
        },
        {
            'value': '"I need backup!" ":Battle ID"',
            'tag': 'EN'
        }
    ];
    public readonly callback: (data) => void = undefined;
    public readonly errorCallback: (error) => void = undefined;

    constructor(token: string, callback?: (data: Tweet) => void, errorCallback?: (error) => void) {
        if (token) this.token = token;
        this.callback = callback ?? ((data) => { console.log(data) });
        this.errorCallback = errorCallback ?? ((error) => { console.log(error) });
        this.init();
    }

    async init() {
        // Open a realtime stream of Tweets, filtered according to rules
        // https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/quick-start

        // this sets up two rules - the value is the search terms to match on, and the tag is an identifier that
        // will be applied to the Tweets return to show which rule they matched
        // with a standard project with Basic Access, you can add up to 25 concurrent rules to your stream, and
        // each rule can be up to 512 characters long


        // // Gets the complete list of rules currently applied to the stream
        // const currentRules = await this.getAllRules();
        // // Delete all rules. Comment the line below if you want to keep your existing rules.
        // await this.deleteAllRules(currentRules.data);

        // // Add rules to the stream. Comment the line below if you don't want to add new rules.
        // await this.setRules();

        this.streamConnect();
    }

    private streamConnect(): NodeJS.ReadableStream {

        const params = {
            'expansions': 'attachments.media_keys,author_id',
            'user.fields': 'username,profile_image_url,url,verified',
            'media.fields': 'url,preview_image_url',
            'tweet.fields': 'source,created_at'
        }
        const parsedParams = Object.entries(params).reduce((acc, param) => acc+=`${param[0]}=${param[1]}&`, '')
        const streamURLWithParams = this.streamURL + '?' + parsedParams.slice(0, -1)
        console.log(streamURLWithParams);
        const stream = needle.get(streamURLWithParams, {
            headers: {
                "User-Agent": "v2FilterStreamJS",
                "Authorization": `Bearer ${this.token}`
            },
            timeout: 20000
        });

        stream.on('data', data => {
            try {
                const json = JSON.parse(data);
                if (this.callback) this.callback(json as Tweet);
                // A successful connection resets retry count.
                this.retryAttempt = 0;
            } catch (e) {
                if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
                    console.log(data.detail);
                    console.log(JSON.stringify(data));
                    process.exit(1)
                } else {
                    // Keep alive signal received. Do nothing.
                }
            }
        }).on('err', error => {
            if (error.code !== 'ECONNRESET') {
                console.log(error.code);
                process.exit(1);
            } else {
                // This reconnection logic will attempt to reconnect when a disconnection is detected.
                // To avoid rate limits, this logic implements exponential backoff, so the wait time
                // will increase if the client cannot reconnect to the stream. 
                setTimeout(() => {
                    console.warn("A connection error occurred. Reconnecting...")
                    this.retryAttempt++;
                    this.streamConnect();
                }, 2 ** this.retryAttempt)
            }
        });

        return stream;

    }

    private async getAllRules(): Promise<{
        meta: { sent: string, result_count: number },
        data: Rule[]
    }> {
        const response = await needle('get', this.rulesURL, {
            headers: {
                "authorization": `Bearer ${this.token}`
            }
        })

        if (response.statusCode !== 200) {
            console.log("Error:", response.statusMessage, response.statusCode)
            throw new Error(response.body);
        }

        return (response.body);
    }

    private async deleteAllRules(rules: Rule[]): Promise<{
        meta: {
            sent: string,
            summary: { deleted: number, not_deleted: number }
        }
    }> {
        if (!Array.isArray(rules)) {
            return null;
        }

        const ids = rules.map(rule => rule.id);

        const data = {
            "delete": {
                "ids": ids
            }
        }

        const response = await needle('post', this.rulesURL, data, {
            headers: {
                "content-type": "application/json",
                "authorization": `Bearer ${this.token}`
            }
        })

        if (response.statusCode !== 200) {
            throw new Error(response.body);
        }

        return (response.body);

    }

    /**
     * Once rules are set, they don't have to be set again
     * @returns 
     */
    private async setRules(): Promise<{
        data: Rule[],
        meta: {
            sent: string,
            summary: { created: number, not_created: number, valid: number, invalid: number }
        }
    }> {
        const data = {
            "add": this.rules
        }

        const response = await needle('post', this.rulesURL, data, {
            headers: {
                "content-type": "application/json",
                "authorization": `Bearer ${this.token}`
            }
        })

        if (response.statusCode !== 201) {
            throw new Error(response.body);
        }

        return (response.body);

    }

    public async getTweet(tweetId: string) {

        // These are the parameters for the API request
        // specify Tweet IDs to fetch, and any additional fields that are required
        // by default, only the Tweet ID and text are returned
        const params = {
            "ids": tweetId, // Edit Tweet IDs to look up
            "tweet.fields": "attachments,author_id", // Edit optional query parameters here
            "user.fields": "created_at" // Edit optional query parameters here
        }

        // this is the HTTP header that adds bearer token authentication
        const res = await needle('get', this.tweetsURL, params, {
            headers: {
                "User-Agent": "v2TweetLookupJS",
                "authorization": `Bearer ${this.token}`
            }
        })

        if (res.body) {
            return res.body;
        } else {
            throw new Error('Unsuccessful request');
        }
    }


}