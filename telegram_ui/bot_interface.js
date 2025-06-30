const express = require('express');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

class BotInterface {
    constructor(pythonBotPath, port = 3001) {
        this.pythonBotPath = pythonBotPath;
        this.port = port;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.pythonProcess = null;
        this.clients = new Set();
        
        this.setupExpress();
        this.setupWebSocket();
    }

    setupExpress() {
        this.app.use(express.json());
        
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                pythonBot: this.pythonProcess ? 'running' : 'stopped'
            });
        });

        // Bot status endpoint
        this.app.get('/api/status', (req, res) => {
            res.json({
                trading: this.pythonProcess !== null,
                lastUpdate: new Date().toISOString(),
                uptime: this.getUptime(),
                apiConnected: true,
                activeStrategies: ['News Sentiment', 'Statistical Arbitrage', 'Volatility Analysis'],
                tradesCount: this.getTradesCount()
            });
        });

        // Positions endpoint
        this.app.get('/api/positions', (req, res) => {
            // In a real implementation, this would query the Python bot's database
            res.json([
                {
                    eventName: 'Presidential Election 2024',
                    eventId: 'PRES2024',
                    quantity: 100,
                    entryPrice: 0.65,
                    currentPrice: 0.72,
                    pnl: 7.00,
                    timestamp: new Date().toISOString()
                },
                {
                    eventName: 'Fed Rate Decision',
                    eventId: 'FED_RATE_DEC',
                    quantity: 50,
                    entryPrice: 0.45,
                    currentPrice: 0.41,
                    pnl: -2.00,
                    timestamp: new Date().toISOString()
                }
            ]);
        });

        // Balance endpoint
        this.app.get('/api/balance', (req, res) => {
            res.json({
                available: 1250.75,
                totalEquity: 1348.25,
                unrealizedPnL: 5.00,
                todayPnL: 15.30,
                timestamp: new Date().toISOString()
            });
        });

        // Performance metrics endpoint
        this.app.get('/api/performance', (req, res) => {
            res.json({
                totalReturn: 12.5,
                sharpeRatio: 1.8,
                maxDrawdown: 3.2,
                winRate: 68.5,
                totalTrades: 156,
                avgTrade: 2.45,
                bestTrade: 25.80,
                worstTrade: -8.20,
                timestamp: new Date().toISOString()
            });
        });

        // Start trading endpoint
        this.app.post('/api/start-trading', (req, res) => {
            try {
                this.startPythonBot();
                res.json({ success: true, message: 'Trading started successfully' });
                this.broadcastToClients({ type: 'trading_started', timestamp: new Date().toISOString() });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Stop trading endpoint
        this.app.post('/api/stop-trading', (req, res) => {
            try {
                this.stopPythonBot();
                res.json({ success: true, message: 'Trading stopped successfully' });
                this.broadcastToClients({ type: 'trading_stopped', timestamp: new Date().toISOString() });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Configuration endpoint
        this.app.get('/api/config', (req, res) => {
            res.json({
                maxPositionSize: 0.10,
                stopLoss: 0.05,
                newsSentimentThreshold: 0.6,
                statArbitrageThreshold: 0.05,
                volatilityThreshold: 0.1,
                tradeInterval: 60
            });
        });

        // Update configuration endpoint
        this.app.post('/api/config', (req, res) => {
            const config = req.body;
            // In a real implementation, this would update the Python bot's configuration
            console.log('Updating configuration:', config);
            res.json({ success: true, message: 'Configuration updated successfully' });
            this.broadcastToClients({ type: 'config_updated', config, timestamp: new Date().toISOString() });
        });
    }

    setupWebSocket() {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`Bot interface server running on port ${this.port}`);
        });

        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws) => {
            console.log('New WebSocket client connected');
            this.clients.add(ws);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                console.log('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            // Send initial status
            ws.send(JSON.stringify({
                type: 'status',
                data: {
                    trading: this.pythonProcess !== null,
                    timestamp: new Date().toISOString()
                }
            }));
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                // Client wants to subscribe to updates
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    timestamp: new Date().toISOString()
                }));
                break;
            case 'get_status':
                ws.send(JSON.stringify({
                    type: 'status',
                    data: {
                        trading: this.pythonProcess !== null,
                        timestamp: new Date().toISOString()
                    }
                }));
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    startPythonBot() {
        if (this.pythonProcess) {
            console.log('Python bot is already running');
            return;
        }

        console.log('Starting Python bot...');
        this.pythonProcess = spawn('python3', [this.pythonBotPath], {
            cwd: path.dirname(this.pythonBotPath),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('Python bot output:', output);
            this.broadcastToClients({
                type: 'bot_output',
                data: output,
                timestamp: new Date().toISOString()
            });
        });

        this.pythonProcess.stderr.on('data', (data) => {
            const error = data.toString();
            console.error('Python bot error:', error);
            this.broadcastToClients({
                type: 'bot_error',
                data: error,
                timestamp: new Date().toISOString()
            });
        });

        this.pythonProcess.on('close', (code) => {
            console.log(`Python bot exited with code ${code}`);
            this.pythonProcess = null;
            this.broadcastToClients({
                type: 'bot_stopped',
                code,
                timestamp: new Date().toISOString()
            });
        });

        this.startTime = new Date();
    }

    stopPythonBot() {
        if (!this.pythonProcess) {
            console.log('Python bot is not running');
            return;
        }

        console.log('Stopping Python bot...');
        this.pythonProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if it doesn't stop gracefully
        setTimeout(() => {
            if (this.pythonProcess) {
                console.log('Force killing Python bot...');
                this.pythonProcess.kill('SIGKILL');
            }
        }, 5000);
    }

    getUptime() {
        if (!this.startTime) return '0s';
        const uptime = Date.now() - this.startTime.getTime();
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getTradesCount() {
        // In a real implementation, this would query the database
        return Math.floor(Math.random() * 50) + 10;
    }

    // Method to simulate trade notifications
    simulateTradeNotification() {
        const trades = [
            { eventName: 'Election Outcome', action: 'buy', quantity: 50, price: 0.65, strategy: 'News Sentiment' },
            { eventName: 'Weather Event', action: 'sell', quantity: 25, price: 0.41, strategy: 'Volatility Analysis' },
            { eventName: 'Sports Outcome', action: 'buy', quantity: 100, price: 0.72, strategy: 'Statistical Arbitrage' }
        ];
        
        const trade = trades[Math.floor(Math.random() * trades.length)];
        this.broadcastToClients({
            type: 'trade_executed',
            data: trade,
            timestamp: new Date().toISOString()
        });
    }

    close() {
        this.stopPythonBot();
        if (this.server) {
            this.server.close();
        }
        if (this.wss) {
            this.wss.close();
        }
    }
}

module.exports = BotInterface;

// Example usage
if (require.main === module) {
    const pythonBotPath = process.env.PYTHON_BOT_PATH || path.join(__dirname, '../src/main.py');
    const port = process.env.INTERFACE_PORT || 3001;
    
    const botInterface = new BotInterface(pythonBotPath, port);
    
    // Simulate trade notifications every 30 seconds for demo purposes
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance
            botInterface.simulateTradeNotification();
        }
    }, 30000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('Shutting down bot interface...');
        botInterface.close();
        process.exit(0);
    });
}

