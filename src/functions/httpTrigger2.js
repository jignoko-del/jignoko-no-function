const { app } = require('@azure/functions');
const { WebClient } = require('@slack/web-api');

async function slack(slack_api_token,channel,oldest) {
    try {
        
        // slackクラアントを作成
        const client = new WebClient(slack_api_token);

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
        const thread = await client.conversations.replies({
            channel: channel,
            ts: ts_oldest,
            oldest: oldest,
            latest: latest,
            limit: 999
        });

        const messages = thread.messages

        // 日時フォーマットの設定 (日本時間)
        const df = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: 'Asia/Tokyo'
        });

        // Unixタイムスタンプ(秒またはミリ秒)を変換
        const formatDate = (ts) => {
            let ts_fix = ts.split('.')[0]
            const date = new Date(parseInt(ts_fix) * (ts_fix.toString().length <= 10 ? 1000 : 1));
                return df.format(date);
        };

        const start_time = formatDate(messages[0].ts);
        const end_time = formatDate(messages[messages.length - 1].ts);
  
        const post = messages[0]; // 起点（最初の投稿）
        const replies = messages.slice(1); // それ以降の返信群

        // 構造化テキストの組み立て
        let output = `# Slack会話概要\n\n`

        output += `* 基本情報\n`;
        output += `Slackチャンネル：${channel}\n`;
        output += `開始日時：${start_time}\n`;
        output += `終了日時：${end_time}\n\n`;

        output += `* 投稿履歴\n`;
        output += `[${formatDate(post.ts)}] ${post.user}:${post.text}\n\n`;

        output += `* 返信履歴\n`;
        if (replies.length === 0) {
            output += `返信なし\n`;
        } else {
            replies.forEach(r => {
                output += `[${formatDate(r.ts)}] ${r.user}：${r.text}\n`;
            });
        }

        output = output.trim();

        return JSON.stringify({result: "1",ts: ts_oldest,thread: output})

    } catch (error) {
        console.error(error);
    }
}

app.http('httpTrigger2', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        const slack_api_token = request.query.get('slack-api-token')
        const channel = request.query.get('channel')
        const oldest = request.query.get('oldest')

        const res = await slack(slack_api_token,channel,oldest)

        return { body: `${res}` };
    }
});
