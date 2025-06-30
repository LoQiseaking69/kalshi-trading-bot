# Kalshi Trading Bot - Deployment Guide

## Quick Start Deployment

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Python 3.8+
- Node.js 16+
- 4GB+ RAM
- Stable internet connection

### 1. System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install python3 python3-pip python3-venv nodejs npm git curl supervisor nginx -y

# Verify installations
python3 --version
node --version
```

### 2. Application Setup
```bash
# Clone repository
git clone https://github.com/your-username/kalshi-trading-bot.git
cd kalshi-trading-bot

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
cd telegram_ui
npm install
cd ..
```

### 3. Configuration
```bash
# Copy environment template
cp telegram_ui/.env.example .env

# Edit configuration (replace with your actual values)
nano .env
```

Required environment variables:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id
KALSHI_API_KEY=your_kalshi_api_key
BANKROLL=1000
```

### 4. Start Services
```bash
# Start bot interface
cd telegram_ui
node bot_interface.js &

# Start Telegram bot
node telegram_bot.js &

# Start Python trading bot (optional - can be controlled via Telegram)
cd ../src
python3 main.py &
```

### 5. Test Installation
```bash
# Check if services are running
curl http://localhost:3001/health

# Send /start to your Telegram bot
```

## Production Deployment

### Using Supervisor (Recommended)

1. **Create supervisor configuration:**
```bash
sudo nano /etc/supervisor/conf.d/kalshi-bot.conf
```

```ini
[program:kalshi-bot-interface]
command=/usr/bin/node bot_interface.js
directory=/home/ubuntu/kalshi-trading-bot/telegram_ui
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/kalshi-bot/interface.err.log
stdout_logfile=/var/log/kalshi-bot/interface.out.log
environment=NODE_ENV=production

[program:kalshi-telegram-bot]
command=/usr/bin/node telegram_bot.js
directory=/home/ubuntu/kalshi-trading-bot/telegram_ui
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/kalshi-bot/telegram.err.log
stdout_logfile=/var/log/kalshi-bot/telegram.out.log
environment=NODE_ENV=production
```

2. **Create log directory:**
```bash
sudo mkdir -p /var/log/kalshi-bot
sudo chown ubuntu:ubuntu /var/log/kalshi-bot
```

3. **Start services:**
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

### Using Docker

1. **Create Dockerfile:**
```dockerfile
FROM node:16-alpine

# Install Python
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files
COPY telegram_ui/package*.json telegram_ui/
COPY requirements.txt .

# Install dependencies
RUN cd telegram_ui && npm install --production
RUN pip3 install -r requirements.txt

# Copy application
COPY . .

EXPOSE 3001

CMD ["node", "telegram_ui/bot_interface.js"]
```

2. **Create docker-compose.yml:**
```yaml
version: '3.8'
services:
  kalshi-bot:
    build: .
    ports:
      - "3001:3001"
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - KALSHI_API_KEY=${KALSHI_API_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

3. **Deploy:**
```bash
docker-compose up -d
```

### Using PM2

1. **Install PM2:**
```bash
npm install -g pm2
```

2. **Create ecosystem file:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'kalshi-bot-interface',
      script: 'bot_interface.js',
      cwd: './telegram_ui',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'kalshi-telegram-bot',
      script: 'telegram_bot.js',
      cwd: './telegram_ui',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

3. **Start services:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Security Configuration

### 1. Firewall Setup
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS (if using reverse proxy)
sudo ufw allow 80
sudo ufw allow 443

# Allow bot interface (local only)
sudo ufw allow from 127.0.0.1 to any port 3001
```

### 2. SSL/TLS Setup (Optional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Environment Security
```bash
# Secure .env file
chmod 600 .env
chown ubuntu:ubuntu .env

# Create secure backup
cp .env .env.backup
chmod 600 .env.backup
```

## Monitoring Setup

### 1. Log Monitoring
```bash
# Install logrotate configuration
sudo nano /etc/logrotate.d/kalshi-bot
```

```
/var/log/kalshi-bot/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        supervisorctl restart kalshi-bot-interface kalshi-telegram-bot
    endscript
}
```

### 2. Health Monitoring Script
```bash
#!/bin/bash
# health_check.sh

# Check if services are running
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Bot interface is down, restarting..."
    supervisorctl restart kalshi-bot-interface
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "Memory usage is high: ${MEMORY_USAGE}%"
fi
```

### 3. Cron Job Setup
```bash
# Add to crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * /home/ubuntu/kalshi-trading-bot/health_check.sh >> /var/log/kalshi-bot/health.log 2>&1
```

## Backup and Recovery

### 1. Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/kalshi-bot-config-$DATE.tar.gz .env src/config.py

# Backup logs (last 7 days)
find /var/log/kalshi-bot -name "*.log" -mtime -7 -exec tar -czf $BACKUP_DIR/kalshi-bot-logs-$DATE.tar.gz {} +

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 2. Recovery Procedure
```bash
# Stop services
sudo supervisorctl stop all

# Restore configuration
tar -xzf backup/kalshi-bot-config-YYYYMMDD_HHMMSS.tar.gz

# Restart services
sudo supervisorctl start all

# Verify functionality
curl http://localhost:3001/health
```

## Performance Optimization

### 1. System Optimization
```bash
# Increase file descriptor limits
echo "ubuntu soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "ubuntu hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize network settings
echo "net.core.somaxconn = 65536" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2. Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### 3. Database Optimization (if using)
```bash
# PostgreSQL optimization
sudo nano /etc/postgresql/12/main/postgresql.conf

# Add these settings:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB
```

## Troubleshooting

### Common Issues

1. **Port 3001 already in use:**
```bash
# Find process using port
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>
```

2. **Permission denied errors:**
```bash
# Fix file permissions
chmod +x telegram_ui/*.js
chown -R ubuntu:ubuntu /home/ubuntu/kalshi-trading-bot
```

3. **Module not found errors:**
```bash
# Reinstall dependencies
cd telegram_ui
rm -rf node_modules package-lock.json
npm install
```

4. **Python import errors:**
```bash
# Activate virtual environment
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

### Log Analysis
```bash
# View real-time logs
tail -f /var/log/kalshi-bot/interface.out.log

# Search for errors
grep -i error /var/log/kalshi-bot/*.log

# Check system logs
journalctl -u supervisor -f
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check log files for errors
   - Verify backup completion
   - Monitor system resources

2. **Monthly:**
   - Update dependencies
   - Review performance metrics
   - Clean old log files

3. **Quarterly:**
   - Security audit
   - Performance optimization review
   - Disaster recovery testing

### Update Procedure
```bash
# Stop services
sudo supervisorctl stop all

# Backup current version
cp -r kalshi-trading-bot kalshi-trading-bot.backup

# Pull updates
git pull origin main

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt

cd telegram_ui
npm install
cd ..

# Restart services
sudo supervisorctl start all

# Verify functionality
curl http://localhost:3001/health
```

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review log files for error messages
3. Verify all configuration parameters
4. Test individual components separately
5. Contact support with specific error messages and log excerpts

Remember to never share your API keys or sensitive configuration in support requests.

