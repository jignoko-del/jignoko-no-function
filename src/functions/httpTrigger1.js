const { app } = require('@azure/functions');
const { webclient } = require('@slack/web-api');

async function slack(slack_api_token,channel,oldest) {
    try {
        
        // slackクラアントを作成
        const client = new webclient(slack_api_token);

        //latest を設定 
        const latest = Math.floor(Date.now() / 1000) - 5;

        // conversations.history で会話履歴を取得
        const history = await client.conversations.history({
            channel: channel,
            oldest: oldest,
            latest: latest,
            limit: 999
        });

        // 会話履歴が0件の場合、処理終了
        if (!history.messages || history.messages.length === 0) {
            return JSON.stringify({ result: "0" });
        }

        // 一番古い会話のTSを取得
        const ts_oldest = history.messages[history.messages.length - 1].ts;

        // conversations.replies でスレッドを取得
        const threads = await client.conversations.replies({
            channel: channel,
            ts: ts_oldest,
            oldest: oldest,
            latest: latest,
            limit: 999
        });

        return JSON.stringify({result: "1",ts: ts_oldest,threads: threads.messages})

    } catch (error) {
        console.error(error);
    }
}

app.http('httpTrigger1', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        const slack_api_token = request.query.get('slack-api-token')
        const channel = request.query.get('channel')
        const oldest = request.query.get('oldest')

        const res = await slack(slack_api_token,channel,oldest)

        return res;
    }
});
