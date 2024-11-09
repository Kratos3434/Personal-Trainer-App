class Polling {
    static logs = []; // In-memory log storage

    // Add logs
    static addLog(message) {
        Polling.logs.push(message);
    }

    // Fetch logs
    static getLogs(req, res) {
        const currentLogs = Polling.logs;
        Polling.logs = [];

        res.json(currentLogs);
    }

    static clearLogs() {
        Polling.logs = [];
    }
}

module.exports = Polling;
