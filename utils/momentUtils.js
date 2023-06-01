const moment = require('moment');

function getFormattedRelativeTime(timestamp) {
    const blockTimeRelative = moment.unix(timestamp).fromNow();
    return blockTimeRelative;
}

module.exports = {
    getFormattedRelativeTime,
};
