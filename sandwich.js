const sha256 = require('crypto-js/sha256');

function sandwich(hash) {
    const output = []
    // 0: Delicous
    switch (hash.charAt(0)) {
        case '0':
        case '1':
            output.push('delicious');
    }

    // 1: Inedible
    switch (hash.charAt(1)) {
        case '0':
        case '1':
            output.push('inedible');
    }

    // 2: Inverse
    switch (hash.charAt(2)) {
        case '0':
        case '1':
            output.push('inverse');
    }

    // 3: Fractal
    switch (hash.charAt(3)) {
        case '0':
        case '1':
            output.push('fractal');
    }

    // 4: Multi-decker
    switch (hash.charAt(4)) {
        case '0':
            output.push('multi-decker');
            break;
        case '1':
            output.push('single-decker');
            break;
        case '2':
            output.push('double-decker');
            break;
        case '3':
            output.push('triple-decker');
            break;
    }

    // 5: Type
    switch (hash.charAt(5)) {
        case '0':
        case '1':
            output.push('toast');
            break;
        case '2':
        case '3':
            output.push('sandwich');
            break;
        case '4':
        case '5':
            output.push('taco');
            break;
        case '6':
        case '7':
            output.push('sushi');
            break;
        case '8':
        case '9':
            output.push('quiche');
            break;
        case 'a':
        case 'b':
            output.push('calzone');
            break;
        default:
            return false;
    }

    // 6: Embedded
    switch (hash.charAt(6)) {
        case '0':
        case '1': {
            const inner = sandwich(hash.substring(6));
            if (inner) {
                output.push('embedded in a');
                output.push(inner);
            }
        }
    }

    return output.join(' ');
}

function command(chatClient, channel, input) {
    const normal = input.replace(/ /g, '').toLowerCase();
    const hash = sha256(normal).toString();

    const result = sandwich(hash);
    if (result) {
        chatClient.say(channel, `Yes, ${input} is a ${result}`);
    } else {
        chatClient.say(channel, `No, ${input} is not a sandwich`);
    }
}

module.exports = { command };