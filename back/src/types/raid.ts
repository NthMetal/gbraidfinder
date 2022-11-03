
export interface Raid {
    twitterUser: {
        name: string,
        imgUrl: string,
        username: string,
        verified: boolean
    },
    locale: 'EN' | 'JP',
    message: string,
    battleKey: string,
    quest_id: string,
    created_at: string,
}