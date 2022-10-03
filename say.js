let listener = null;

function listen(res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Connection', 'keep-alive');
    listener = res;
}

function say(msg) {
    if (listener) {
        listener.write(JSON.stringify({"say": msg}));
        listener.write("\n");
    };
}

// Keep the connection alive
setInterval(() => {
    if (listener) {
        listener.write(JSON.stringify({}));
        listener.write("\n");
    };
}, 20000);


module.exports = {
    listen,
    say
}
