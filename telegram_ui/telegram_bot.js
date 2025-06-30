const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

class KalshiTelegramBot {
    constructor(token, pythonBotPath) {
        this.bot = new TelegramBot(token, { polling: true });
        this.pythonBotPath = pythonBotPath;
        this.authorizedUsers = new Set(); // Store authorized user IDs
        this.setupCommands();
        this.setupCallbacks();
    }

    setupCommands() {
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `
🤖 *Kalshi Trading Bot Control Panel*

Welcome to the advanced Kalshi Trading Bot! This bot provides sophisticated quantitative trading strategies for event-based markets.

*Available Commands:*
/status - Get current bot status
/positions - View current positions
/balance - Check account balance
/start_trading - Start automated trading
/stop_trading - Stop automated trading
/settings - Configure bot settings
/performance - View performance metrics
/help - Show this help message

*Quick Actions:*
Use the inline keyboard below for quick access to common functions.
            `;
            
            const options = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 Status', callback_data: 'status' },
                            { text: '💰 Balance', callback_data: 'balance' }
                        ],
                        [
                            { text: '📈 Positions', callback_data: 'positions' },
                            { text: '📊 Performance', callback_data: 'performance' }
                        ],
                        [
                            { text: '▶️ Start Trading', callback_data: 'start_trading' },
                            { text: '⏹️ Stop Trading', callback_data: 'stop_trading' }
                        ],
                        [
                            { text: '⚙️ Settings', callback_data: 'settings' },
                            { text: '❓ Help', callback_data: 'help' }
                        ]
                    ]
                }
            };
            
            this.bot.sendMessage(chatId, welcomeMessage, options);
        });

        // Status command
        this.bot.onText(/\/status/, (msg) => {
            this.handleStatusCommand(msg.chat.id);
        });

        // Positions command
        this.bot.onText(/\/positions/, (msg) => {
            this.handlePositionsCommand(msg.chat.id);
        });

        // Balance command
        this.bot.onText(/\/balance/, (msg) => {
            this.handleBalanceCommand(msg.chat.id);
        });

        // Start trading command
        this.bot.onText(/\/start_trading/, (msg) => {
            this.handleStartTradingCommand(msg.chat.id);
        });

        // Stop trading command
        this.bot.onText(/\/stop_trading/, (msg) => {
            this.handleStopTradingCommand(msg.chat.id);
        });

        // Settings command
        this.bot.onText(/\/settings/, (msg) => {
            this.handleSettingsCommand(msg.chat.id);
        });

        // Performance command
        this.bot.onText(/\/performance/, (msg) => {
            this.handlePerformanceCommand(msg.chat.id);
        });

        // Help command
        this.bot.onText(/\/help/, (msg) => {
            this.handleHelpCommand(msg.chat.id);
        });
    }

    setupCallbacks() {
        this.bot.on('callback_query', (callbackQuery) => {
            const action = callbackQuery.data;
            const msg = callbackQuery.message;
            const chatId = msg.chat.id;

            switch (action) {
                case 'status':
                    this.handleStatusCommand(chatId);
                    break;
                case 'balance':
                    this.handleBalanceCommand(chatId);
                    break;
                case 'positions':
                    this.handlePositionsCommand(chatId);
                    break;
                case 'performance':
                    this.handlePerformanceCommand(chatId);
                    break;
                case 'start_trading':
                    this.handleStartTradingCommand(chatId);
                    break;
                case 'stop_trading':
                    this.handleStopTradingCommand(chatId);
                    break;
                case 'settings':
                    this.handleSettingsCommand(chatId);
                    break;
                case 'help':
                    this.handleHelpCommand(chatId);
                    break;
                default:
                    this.bot.sendMessage(chatId, 'Unknown action.');
            }

            // Answer the callback query
            this.bot.answerCallbackQuery(callbackQuery.id);
        });
    }

    async handleStatusCommand(chatId) {
        try {
            const status = await this.getBotStatus();
            const statusMessage = `
🤖 *Bot Status*

*Trading Status:* ${status.trading ? '🟢 Active' : '🔴 Inactive'}
*Last Update:* ${status.lastUpdate}
*Uptime:* ${status.uptime}
*API Connection:* ${status.apiConnected ? '🟢 Connected' : '🔴 Disconnected'}
*Active Strategies:* ${status.activeStrategies.join(', ')}
*Total Trades Today:* ${status.tradesCount}
            `;
            
            this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error fetching status: ${error.message}`);
        }
    }

    async handlePositionsCommand(chatId) {
        try {
            const positions = await this.getCurrentPositions();
            
            if (positions.length === 0) {
                this.bot.sendMessage(chatId, '📈 *Current Positions*\n\nNo open positions.', { parse_mode: 'Markdown' });
                return;
            }

            let positionsMessage = '📈 *Current Positions*\n\n';
            positions.forEach((position, index) => {
                positionsMessage += `${index + 1}. *${position.eventName}*\n`;
                positionsMessage += `   Position: ${position.quantity} units\n`;
                positionsMessage += `   Entry Price: $${position.entryPrice}\n`;
                positionsMessage += `   Current Price: $${position.currentPrice}\n`;
                positionsMessage += `   P&L: ${position.pnl >= 0 ? '🟢' : '🔴'} $${position.pnl.toFixed(2)}\n\n`;
            });

            this.bot.sendMessage(chatId, positionsMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error fetching positions: ${error.message}`);
        }
    }

    async handleBalanceCommand(chatId) {
        try {
            const balance = await this.getAccountBalance();
            const balanceMessage = `
💰 *Account Balance*

*Available Balance:* $${balance.available.toFixed(2)}
*Total Equity:* $${balance.totalEquity.toFixed(2)}
*Unrealized P&L:* ${balance.unrealizedPnL >= 0 ? '🟢' : '🔴'} $${balance.unrealizedPnL.toFixed(2)}
*Today's P&L:* ${balance.todayPnL >= 0 ? '🟢' : '🔴'} $${balance.todayPnL.toFixed(2)}
            `;
            
            this.bot.sendMessage(chatId, balanceMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error fetching balance: ${error.message}`);
        }
    }

    async handleStartTradingCommand(chatId) {
        try {
            await this.startTrading();
            this.bot.sendMessage(chatId, '▶️ Trading started successfully!');
        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error starting trading: ${error.message}`);
        }
    }

    async handleStopTradingCommand(chatId) {
        try {
            await this.stopTrading();
            this.bot.sendMessage(chatId, '⏹️ Trading stopped successfully!');
        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error stopping trading: ${error.message}`);
        }
    }

    async handleSettingsCommand(chatId) {
        const settingsMessage = `
⚙️ *Bot Settings*

Current configuration:
• Max Position Size: 10% of bankroll
• Stop Loss: 5%
• News Sentiment Threshold: 60%
• Statistical Arbitrage Threshold: 5%
• Volatility Threshold: 10%

Use /config [setting] [value] to modify settings.
Example: /config max_position 15
        `;
        
        this.bot.sendMessage(chatId, settingsMessage, { parse_mode: 'Markdown' });
    }

    async handlePerformanceCommand(chatId) {
        try {
            const performance = await this.getPerformanceMetrics();
            const performanceMessage = `
📊 *Performance Metrics*

*Total Return:* ${performance.totalReturn >= 0 ? '🟢' : '🔴'} ${performance.totalReturn.toFixed(2)}%
*Sharpe Ratio:* ${performance.sharpeRatio.toFixed(2)}
*Max Drawdown:* ${performance.maxDrawdown.toFixed(2)}%
*Win Rate:* ${performance.winRate.toFixed(1)}%
*Total Trades:* ${performance.totalTrades}
*Average Trade:* $${performance.avgTrade.toFixed(2)}
*Best Trade:* $${performance.bestTrade.toFixed(2)}
*Worst Trade:* $${performance.worstTrade.toFixed(2)}
            `;
            
            this.bot.sendMessage(chatId, performanceMessage, { parse_mode: 'Markdown' });
        } catch (error) {
            this.bot.sendMessage(chatId, `❌ Error fetching performance: ${error.message}`);
        }
    }

    handleHelpCommand(chatId) {
        const helpMessage = `
❓ *Help - Kalshi Trading Bot*

*Commands:*
/start - Initialize bot and show main menu
/status - Current bot status and health
/positions - View all open positions
/balance - Account balance and P&L
/start_trading - Begin automated trading
/stop_trading - Halt all trading activities
/settings - View and modify bot configuration
/performance - Detailed performance metrics
/help - Show this help message

*Features:*
• Advanced quantitative strategies
• Real-time market monitoring
• Risk management and position sizing
• News sentiment analysis
• Statistical arbitrage detection
• Volatility-based trading
• Comprehensive logging and alerts

*Support:*
For technical support or questions, contact the development team.
        `;
        
        this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    }

    // Helper methods to interface with the Python bot
    async getBotStatus() {
        // In a real implementation, this would interface with the Python bot
        // For now, return mock data
        return {
            trading: true,
            lastUpdate: new Date().toLocaleString(),
            uptime: '2h 34m',
            apiConnected: true,
            activeStrategies: ['News Sentiment', 'Statistical Arbitrage'],
            tradesCount: 12
        };
    }

    async getCurrentPositions() {
        // Mock data - in real implementation, would fetch from Python bot
        return [
            {
                eventName: 'Election Outcome',
                quantity: 50,
                entryPrice: 0.65,
                currentPrice: 0.72,
                pnl: 3.50
            },
            {
                eventName: 'Weather Event',
                quantity: 25,
                entryPrice: 0.45,
                currentPrice: 0.41,
                pnl: -1.00
            }
        ];
    }

    async getAccountBalance() {
        // Mock data - in real implementation, would fetch from Python bot
        return {
            available: 1250.75,
            totalEquity: 1348.25,
            unrealizedPnL: 2.50,
            todayPnL: 15.30
        };
    }

    async getPerformanceMetrics() {
        // Mock data - in real implementation, would fetch from Python bot
        return {
            totalReturn: 12.5,
            sharpeRatio: 1.8,
            maxDrawdown: 3.2,
            winRate: 68.5,
            totalTrades: 156,
            avgTrade: 2.45,
            bestTrade: 25.80,
            worstTrade: -8.20
        };
    }

    async startTrading() {
        // In real implementation, would send command to Python bot
        console.log('Starting trading...');
    }

    async stopTrading() {
        // In real implementation, would send command to Python bot
        console.log('Stopping trading...');
    }

    // Method to send notifications from the Python bot
    sendNotification(chatId, message, options = {}) {
        this.bot.sendMessage(chatId, message, options);
    }

    // Method to send trade notifications
    sendTradeNotification(chatId, tradeData) {
        const message = `
🔔 *Trade Executed*

*Event:* ${tradeData.eventName}
*Action:* ${tradeData.action.toUpperCase()}
*Quantity:* ${tradeData.quantity} units
*Price:* $${tradeData.price}
*Total Value:* $${(tradeData.quantity * tradeData.price).toFixed(2)}
*Strategy:* ${tradeData.strategy}
*Time:* ${new Date().toLocaleString()}
        `;
        
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Method to send error notifications
    sendErrorNotification(chatId, error) {
        const message = `
❌ *Error Alert*

*Time:* ${new Date().toLocaleString()}
*Error:* ${error}

The bot will attempt to recover automatically. If the issue persists, please check the logs or contact support.
        `;
        
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
}

module.exports = KalshiTelegramBot;

// Example usage
if (require.main === module) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const pythonBotPath = process.env.PYTHON_BOT_PATH || '../src/main.py';
    
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN environment variable is required');
        process.exit(1);
    }
    
    const bot = new KalshiTelegramBot(token, pythonBotPath);
    console.log('Kalshi Telegram Bot started successfully!');
}

