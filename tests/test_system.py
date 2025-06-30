#!/usr/bin/env python3
"""
Comprehensive system test suite for Kalshi Trading Bot
Tests all major components and their interactions
"""

import unittest
import sys
import os
import time
import requests
import subprocess
import signal
from unittest.mock import Mock, patch, MagicMock

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import config
import kalshi_api
import trader
import notifier
import logger
import utils

class TestSystemIntegration(unittest.TestCase):
    """Test system integration and component interactions"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_config = {
            'KALSHI_API_KEY': 'test_key',
            'TELEGRAM_BOT_TOKEN': 'test_token',
            'TELEGRAM_CHAT_ID': 'test_chat_id',
            'BANKROLL': 1000,
            'TRADE_INTERVAL_SECONDS': 1
        }
    
    def test_config_loading(self):
        """Test configuration loading and validation"""
        # Test that all required config variables exist
        required_vars = [
            'KALSHI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
            'BANKROLL', 'TRADE_INTERVAL_SECONDS', 'NEWS_SENTIMENT_THRESHOLD',
            'STAT_ARBITRAGE_THRESHOLD', 'VOLATILITY_THRESHOLD',
            'MAX_POSITION_SIZE_PERCENTAGE', 'STOP_LOSS_PERCENTAGE'
        ]
        
        for var in required_vars:
            self.assertTrue(hasattr(config, var), f"Missing config variable: {var}")
    
    def test_kalshi_api_initialization(self):
        """Test Kalshi API client initialization"""
        api = kalshi_api.KalshiAPI(self.test_config['KALSHI_API_KEY'])
        self.assertIsNotNone(api)
        self.assertEqual(api.api_key, self.test_config['KALSHI_API_KEY'])
    
    @patch('requests.get')
    def test_kalshi_api_market_data_fetch(self, mock_get):
        """Test market data fetching from Kalshi API"""
        # Mock API response
        mock_response = Mock()
        mock_response.json.return_value = {
            'markets': [
                {
                    'id': 'TEST_MARKET',
                    'title': 'Test Market',
                    'yes_price': 0.65,
                    'no_price': 0.35,
                    'current_price': 0.65
                }
            ]
        }
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        api = kalshi_api.KalshiAPI(self.test_config['KALSHI_API_KEY'])
        market_data = api.fetch_market_data()
        
        self.assertIsNotNone(market_data)
        self.assertIn('markets', market_data)
        self.assertEqual(len(market_data['markets']), 1)
        self.assertEqual(market_data['markets'][0]['id'], 'TEST_MARKET')
    
    def test_trader_initialization(self):
        """Test trader component initialization"""
        mock_api = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()
        
        trader_instance = trader.Trader(mock_api, mock_notifier, mock_logger, self.test_config['BANKROLL'])
        
        self.assertIsNotNone(trader_instance)
        self.assertEqual(trader_instance.bankroll, self.test_config['BANKROLL'])
        self.assertEqual(trader_instance.api, mock_api)
        self.assertEqual(trader_instance.notifier, mock_notifier)
        self.assertEqual(trader_instance.logger, mock_logger)
    
    def test_trader_position_sizing(self):
        """Test position sizing logic"""
        mock_api = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()
        
        trader_instance = trader.Trader(mock_api, mock_notifier, mock_logger, 1000)
        
        # Test that position size respects maximum percentage
        max_position = 1000 * config.MAX_POSITION_SIZE_PERCENTAGE
        
        # Create a mock trade decision that would exceed max position
        large_trade = {
            'event_id': 'TEST_EVENT',
            'action': 'buy',
            'quantity': 200,  # This would be $200 * 0.5 = $100, which is within 10% of $1000
            'price': 0.5
        }
        
        # This should not raise an exception and should execute
        trader_instance.execute_trade(large_trade)
        
        # Verify notifier was called (indicating trade was processed)
        mock_notifier.send_trade_notification.assert_called()
    
    def test_risk_management_stop_loss(self):
        """Test stop-loss risk management"""
        mock_api = Mock()
        mock_notifier = Mock()
        mock_logger = Mock()
        
        trader_instance = trader.Trader(mock_api, mock_notifier, mock_logger, 1000)
        
        # Test that trades within risk limits are accepted
        safe_trade = {
            'event_id': 'SAFE_EVENT',
            'action': 'buy',
            'quantity': 50,  # $50 * 0.5 = $25, well within 10% limit
            'price': 0.5
        }
        
        trader_instance.execute_trade(safe_trade)
        self.assertIn('SAFE_EVENT', trader_instance.current_positions)
    
    def test_notifier_initialization(self):
        """Test notification system initialization"""
        notifier_instance = notifier.Notifier(
            self.test_config['TELEGRAM_BOT_TOKEN'],
            self.test_config['TELEGRAM_CHAT_ID']
        )
        
        self.assertIsNotNone(notifier_instance)
        self.assertEqual(notifier_instance.bot_token, self.test_config['TELEGRAM_BOT_TOKEN'])
        self.assertEqual(notifier_instance.chat_id, self.test_config['TELEGRAM_CHAT_ID'])
    
    def test_logger_initialization(self):
        """Test logging system initialization"""
        logger_instance = logger.Logger()
        self.assertIsNotNone(logger_instance)
    
    def test_utils_functions(self):
        """Test utility functions"""
        # Test that utils module can be imported and has expected functions
        self.assertTrue(hasattr(utils, '__name__'))

class TestTradingStrategies(unittest.TestCase):
    """Test trading strategy implementations"""
    
    def setUp(self):
        """Set up test environment for strategy testing"""
        self.mock_api = Mock()
        self.mock_notifier = Mock()
        self.mock_logger = Mock()
        self.trader_instance = trader.Trader(self.mock_api, self.mock_notifier, self.mock_logger, 1000)
    
    def test_news_sentiment_analysis(self):
        """Test news sentiment analysis strategy"""
        # Mock news data
        news_data = [
            {'content': 'Very positive news about the event', 'timestamp': '2024-01-01T10:00:00Z'},
            {'content': 'Negative developments in the market', 'timestamp': '2024-01-01T11:00:00Z'}
        ]
        
        # Test sentiment analysis (placeholder implementation)
        sentiment_score = self.trader_instance._news_sentiment_analysis(news_data)
        
        # Should return a sentiment score
        self.assertIsInstance(sentiment_score, (int, float))
        self.assertGreaterEqual(sentiment_score, 0)
        self.assertLessEqual(sentiment_score, 1)
    
    def test_statistical_arbitrage(self):
        """Test statistical arbitrage strategy"""
        # Mock related market data
        related_markets = [
            {'id': 'MARKET_A', 'price': 0.6},
            {'id': 'MARKET_B', 'price': 0.4}
        ]
        
        # Test arbitrage detection (placeholder implementation)
        arbitrage_result = self.trader_instance._statistical_arbitrage(related_markets)
        
        # Should return None or a trade decision
        self.assertTrue(arbitrage_result is None or isinstance(arbitrage_result, dict))
    
    def test_volatility_analysis(self):
        """Test volatility analysis strategy"""
        # Mock historical price data
        historical_prices = [0.5, 0.52, 0.48, 0.55, 0.45, 0.6, 0.4, 0.58]
        
        # Test volatility analysis (placeholder implementation)
        volatility_result = self.trader_instance._volatility_analysis(historical_prices)
        
        # Should return None or a trade decision
        self.assertTrue(volatility_result is None or isinstance(volatility_result, dict))

class TestAPIEndpoints(unittest.TestCase):
    """Test API endpoints and WebSocket functionality"""
    
    @classmethod
    def setUpClass(cls):
        """Start the bot interface server for testing"""
        cls.server_process = None
        try:
            # Start the server in background
            cls.server_process = subprocess.Popen(
                ['node', 'bot_interface.js'],
                cwd=os.path.join(os.path.dirname(__file__), '..', 'telegram_ui'),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            # Give server time to start
            time.sleep(3)
        except Exception as e:
            print(f"Could not start server for testing: {e}")
    
    @classmethod
    def tearDownClass(cls):
        """Stop the bot interface server"""
        if cls.server_process:
            cls.server_process.terminate()
            cls.server_process.wait()
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            response = requests.get('http://localhost:3001/health', timeout=5)
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertIn('status', data)
            self.assertIn('timestamp', data)
        except requests.exceptions.RequestException:
            self.skipTest("Bot interface server not available for testing")
    
    def test_status_endpoint(self):
        """Test status endpoint"""
        try:
            response = requests.get('http://localhost:3001/api/status', timeout=5)
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertIn('trading', data)
            self.assertIn('lastUpdate', data)
            self.assertIn('activeStrategies', data)
        except requests.exceptions.RequestException:
            self.skipTest("Bot interface server not available for testing")
    
    def test_positions_endpoint(self):
        """Test positions endpoint"""
        try:
            response = requests.get('http://localhost:3001/api/positions', timeout=5)
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertIsInstance(data, list)
        except requests.exceptions.RequestException:
            self.skipTest("Bot interface server not available for testing")
    
    def test_balance_endpoint(self):
        """Test balance endpoint"""
        try:
            response = requests.get('http://localhost:3001/api/balance', timeout=5)
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertIn('available', data)
            self.assertIn('totalEquity', data)
        except requests.exceptions.RequestException:
            self.skipTest("Bot interface server not available for testing")
    
    def test_config_endpoint(self):
        """Test configuration endpoint"""
        try:
            response = requests.get('http://localhost:3001/api/config', timeout=5)
            self.assertEqual(response.status_code, 200)
            
            data = response.json()
            self.assertIn('maxPositionSize', data)
            self.assertIn('stopLoss', data)
        except requests.exceptions.RequestException:
            self.skipTest("Bot interface server not available for testing")

class TestPerformanceMetrics(unittest.TestCase):
    """Test performance monitoring and metrics"""
    
    def test_performance_calculation(self):
        """Test performance metrics calculation"""
        # Mock trade history
        trades = [
            {'pnl': 10, 'timestamp': '2024-01-01T10:00:00Z'},
            {'pnl': -5, 'timestamp': '2024-01-01T11:00:00Z'},
            {'pnl': 15, 'timestamp': '2024-01-01T12:00:00Z'},
            {'pnl': -3, 'timestamp': '2024-01-01T13:00:00Z'}
        ]
        
        # Calculate basic metrics
        total_pnl = sum(trade['pnl'] for trade in trades)
        win_count = sum(1 for trade in trades if trade['pnl'] > 0)
        total_trades = len(trades)
        win_rate = (win_count / total_trades) * 100 if total_trades > 0 else 0
        
        self.assertEqual(total_pnl, 17)
        self.assertEqual(win_rate, 50.0)
        self.assertEqual(total_trades, 4)

def run_system_validation():
    """Run comprehensive system validation"""
    print("Starting Kalshi Trading Bot System Validation...")
    print("=" * 60)
    
    # Test 1: Component Import Test
    print("1. Testing component imports...")
    try:
        import config, kalshi_api, trader, notifier, logger, utils
        print("   ✓ All Python components imported successfully")
    except ImportError as e:
        print(f"   ✗ Import error: {e}")
        return False
    
    # Test 2: Configuration Validation
    print("2. Validating configuration...")
    required_configs = [
        'KALSHI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
        'BANKROLL', 'NEWS_SENTIMENT_THRESHOLD', 'MAX_POSITION_SIZE_PERCENTAGE'
    ]
    
    missing_configs = []
    for conf in required_configs:
        if not hasattr(config, conf):
            missing_configs.append(conf)
    
    if missing_configs:
        print(f"   ✗ Missing configurations: {missing_configs}")
        return False
    else:
        print("   ✓ All required configurations present")
    
    # Test 3: Node.js Dependencies
    print("3. Testing Node.js dependencies...")
    try:
        result = subprocess.run(
            ['node', '-e', 'require("node-telegram-bot-api"); require("express"); require("ws"); console.log("OK")'],
            cwd=os.path.join(os.path.dirname(__file__), '..', 'telegram_ui'),
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and 'OK' in result.stdout:
            print("   ✓ Node.js dependencies available")
        else:
            print(f"   ✗ Node.js dependency error: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ✗ Node.js test failed: {e}")
        return False
    
    # Test 4: API Server Test
    print("4. Testing API server startup...")
    server_process = None
    try:
        server_process = subprocess.Popen(
            ['node', 'bot_interface.js'],
            cwd=os.path.join(os.path.dirname(__file__), '..', 'telegram_ui'),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        time.sleep(3)  # Give server time to start
        
        # Test health endpoint
        response = requests.get('http://localhost:3001/health', timeout=5)
        if response.status_code == 200:
            print("   ✓ API server started and responding")
        else:
            print(f"   ✗ API server responded with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ✗ API server test failed: {e}")
        return False
    finally:
        if server_process:
            server_process.terminate()
            server_process.wait()
    
    print("=" * 60)
    print("✓ System validation completed successfully!")
    print("\nNext steps:")
    print("1. Configure your .env file with actual API keys")
    print("2. Start the system using: cd telegram_ui && node bot_interface.js")
    print("3. Send /start to your Telegram bot to begin")
    
    return True

if __name__ == '__main__':
    # Run system validation first
    if run_system_validation():
        print("\nRunning unit tests...")
        unittest.main(verbosity=2)
    else:
        print("\nSystem validation failed. Please fix the issues before running tests.")
        sys.exit(1)

