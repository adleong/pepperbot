async function dashboard(apiClient, db) {
    const results = [];
    const { rows } = await db.query('SELECT channel FROM mini_vanilla');
    for (row of rows) {
        const channel = row.channel;
        const { rows: rs } = await db.query('select done, count(1) from minirequests where channel = $1 group by done', [channel]);
        let result = { channel, queue: 0, complete: 0, live: '' };
        for (r of rs) {
            if (r.done) {
                result.complete = r.count;
            } else {
                result.queue = r.count;
            }
        }
        const stream = await apiClient.streams.getStreamByUserName(channel).then(stream => {
            if (stream) {
                if (stream.gameName == 'Spin Rhythm XD') {
                    result.live = `🟢 (${stream.viewers})`;
                } else {
                    result.live = `🟡 (${stream.viewers})`;
                }
            } else {
                result.live = '🔴';
            }
        },
            error => {
                console.log(error);
                result.live = '⚠️';
                result.details = error;
            });
        results.push(result);
    }
    return results;
}

module.exports = { dashboard };
