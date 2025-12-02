const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(process.env.DATABASE_URL || './email-tracking.db');

// Create table
db.run(`
    CREATE TABLE IF NOT EXISTS email_opens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT,
        recipient TEXT,
        ip TEXT,
        user_agent TEXT,
        referer TEXT,
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Main tracking endpoint
app.get('/track.gif', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const referer = req.headers['referer'] || 'Direct';
    const emailId = req.query.id || 'unknown';
    const recipient = req.query.to || 'unknown@example.com';
    
    console.log(`📧 Email opened: ${emailId}`);
    console.log(`📍 IP: ${ip}`);
    console.log(`📱 User Agent: ${userAgent.substring(0, 50)}...`);
    
    // Save to database
    db.run(
        `INSERT INTO email_opens (email_id, recipient, ip, user_agent, referer) 
         VALUES (?, ?, ?, ?, ?)`,
        [emailId, recipient, ip, userAgent, referer]
    );
    
    // 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': gif.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    
    res.end(gif);
});

// Dashboard
app.get('/dashboard', (req, res) => {
    db.all('SELECT * FROM email_opens ORDER BY opened_at DESC LIMIT 100', [], (err, rows) => {
        if (err) {
            res.status(500).send('Database error');
            return;
        }
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Email Tracker Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #4CAF50; color: white; }
                .ip { font-family: monospace; background: #f1f1f1; padding: 2px 5px; }
            </style>
        </head>
        <body>
            <h1>📊 Email Tracker Dashboard</h1>
            <p>Total opens: ${rows.length}</p>
            <table>
                <tr>
                    <th>Time</th>
                    <th>Email ID</th>
                    <th>IP Address</th>
                    <th>Device</th>
                </tr>
        `;
        
        rows.forEach(row => {
            const isMobile = (row.user_agent || '').includes('Mobile');
            html += `
                <tr>
                    <td>${row.opened_at}</td>
                    <td>${row.email_id}</td>
                    <td><span class="ip">${row.ip}</span></td>
                    <td>${isMobile ? '📱 Mobile' : '💻 Desktop'}</td>
                </tr>
            `;
        });
        
        html += `
            </table>
            <script>
                // Auto-refresh every 30 seconds
                setTimeout(() => location.reload(), 30000);
            </script>
        </body>
        </html>
        `;
        
        res.send(html);
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

// Homepage
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Email Tracker</title></head>
    <body style="text-align: center; padding: 50px;">
        <h1>🚀 Email Tracker Service</h1>
        <p>Your email tracking pixel service is running!</p>
        <p><a href="/dashboard">Go to Dashboard</a></p>
        <p>Use this URL in your emails:</p>
        <code style="background: #eee; padding: 10px; display: block; max-width: 600px; margin: 20px auto;">
            https://YOUR-RENDER-URL.onrender.com/track.gif?id=EMAIL_ID&to=RECIPIENT_EMAIL
        </code>
    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
