let listeners = [];

function listen(res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Connection', 'keep-alive');
    listeners.push(res);
}

function say(msg) {
    listeners.forEach(function(res) {
        res.write(JSON.stringify(msg));
        res.write("\n");
    });
}

module.exports = {
    listen,
    say
}