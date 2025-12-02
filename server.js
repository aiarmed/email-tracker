const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Store data in memory (for simple demo)
let emailOpens = [];

// Main tracking endpoint
app.get('/track.gif', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const emailId = req.query.id || 'unknown';
    const recipient = req.query.to || 'unknown@example.com';
    
    // Create log entry
    const logEntry = {
        id: Date.now(),
        emailId: emailId,
        recipient: recipient,
        ip: ip,
        userAgent: userAgent.substring(0, 50), // First 50 chars
        time: new Date().toLocaleString()
    };
    
    // Add to array (keep last 100 only)
    emailOpens.unshift(logEntry);
    if (emailOpens.length > 100) {
        emailOpens = emailOpens.slice(0, 100);
    }
    
    // Log to console (you'll see this in Render logs)
    console.log('📧 EMAIL OPENED!');
    console.log('Email ID:', emailId);
    console.log('Recipient:', recipient);
    console.log('IP Address:', ip);
    console.log('Time:', logEntry.time);
    console.log('---');
    
    // Create 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': gif.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    
    res.end(gif);
});

// Dashboard - View all tracking data
app.get('/dashboard', (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Tracking Dashboard</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                margin: 0;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 {
                color: #333;
                border-bottom: 3px solid #667eea;
                padding-bottom: 10px;
                margin-top: 0;
            }
            .stats {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-around;
                flex-wrap: wrap;
            }
            .stat-box {
                text-align: center;
                padding: 15px;
            }
            .stat-number {
                font-size: 2.5em;
                font-weight: bold;
                color: #667eea;
                display: block;
            }
            .stat-label {
                color: #666;
                font-size: 0.9em;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th {
                background: #667eea;
                color: white;
                padding: 15px;
                text-align: left;
            }
            td {
                padding: 12px 15px;
                border-bottom: 1px solid #ddd;
            }
            tr:hover {
                background: #f9f9f9;
            }
            .ip-address {
                font-family: monospace;
                background: #f1f1f1;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 0.9em;
            }
            .mobile-badge {
                background: #e3f2fd;
                color: #1976d2;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 0.8em;
            }
            .desktop-badge {
                background: #e8f5e9;
                color: #2e7d32;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 0.8em;
            }
            .how-to-use {
                background: #e8f5e9;
                padding: 20px;
                border-radius: 10px;
                margin-top: 30px;
            }
            code {
                background: #333;
                color: white;
                padding: 15px;
                display: block;
                border-radius: 5px;
                margin: 10px 0;
                font-family: monospace;
                overflow-x: auto;
            }
            @media (max-width: 768px) {
                .container { padding: 15px; }
                table { font-size: 0.9em; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Email Tracking Dashboard</h1>
            
            <div class="stats">
                <div class="stat-box">
                    <span class="stat-number">${emailOpens.length}</span>
                    <span class="stat-label">Total Opens</span>
                </div>
                <div class="stat-box">
                    <span class="stat-number">${new Set(emailOpens.map(e => e.ip)).size}</span>
                    <span class="stat-label">Unique IPs</span>
                </div>
                <div class="stat-box">
                    <span class="stat-number">${new Set(emailOpens.map(e => e.emailId)).size}</span>
                    <span class="stat-label">Tracked Emails</span>
                </div>
            </div>
            
            <h2>Recent Email Opens</h2>
            
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Email ID</th>
                        <th>Recipient</th>
                        <th>IP Address</th>
                        <th>Device</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Add table rows
    emailOpens.forEach(entry => {
        const isMobile = entry.userAgent.includes('Mobile') || entry.userAgent.includes('Android');
        const deviceBadge = isMobile 
            ? '<span class="mobile-badge">📱 Mobile</span>' 
            : '<span class="desktop-badge">💻 Desktop</span>';
        
        html += `
                    <tr>
                        <td>${entry.time}</td>
                        <td><strong>${entry.emailId}</strong></td>
                        <td>${entry.recipient}</td>
                        <td><span class="ip-address">${entry.ip}</span></td>
                        <td>${deviceBadge}</td>
                    </tr>
        `;
    });
    
    if (emailOpens.length === 0) {
        html += `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px;">
                            No email opens recorded yet. Send a test email to see data here!
                        </td>
                    </tr>
        `;
    }
    
    html += `
                </tbody>
            </table>
            
            <div class="how-to-use">
                <h3>🚀 How to Use This Tracker</h3>
                <p>Add this code to your emails:</p>
                <code>
                    &lt;img src="YOUR-RENDER-URL/track.gif?id=EMAIL_ID&to=RECIPIENT_EMAIL" 
                         width="1" height="1" style="display:none"&gt;
                </code>
                <p><strong>Parameters:</strong></p>
                <ul>
                    <li><code>id</code>: Unique identifier for your email (e.g., newsletter-001)</li>
                    <li><code>to</code>: Recipient's email address</li>
                </ul>
                <p><em>Replace "YOUR-RENDER-URL" with your actual Render URL after deployment</em></p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="location.reload()" style="
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                ">🔄 Refresh Data</button>
            </div>
        </div>
        
        <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => {
                location.reload();
            }, 30000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// Simple homepage
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Tracker Service</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .card {
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                max-width: 600px;
                width: 100%;
            }
            h1 {
                color: #333;
                margin-top: 0;
            }
            .endpoint {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
                text-align: left;
            }
            .btn {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px;
                font-weight: bold;
            }
            .btn:hover {
                background: #5a67d8;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🚀 Email Tracker Service</h1>
            <p>Your email tracking pixel service is running!</p>
            
            <div class="endpoint">
                <strong>📊 Dashboard:</strong><br>
                <a href="/dashboard">/dashboard</a>
            </div>
            
            <div class="endpoint">
                <strong>📷 Tracking Pixel:</strong><br>
                <code>/track.gif?id=EMAIL_ID&to=RECIPIENT_EMAIL</code>
            </div>
            
            <div class="endpoint">
                <strong>🩺 Health Check:</strong><br>
                <a href="/health">/health</a>
            </div>
            
            <div style="margin-top: 30px;">
                <a href="/dashboard" class="btn">Go to Dashboard</a>
                <a href="/track.gif?id=demo&to=demo@example.com" class="btn" style="background: #48bb78;">Test Tracking</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Add a tracking pixel to your emails to see when they're opened!
            </p>
        </div>
    </body>
    </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'email-tracker',
        timestamp: new Date().toISOString(),
        opens: emailOpens.length
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Email tracker running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
// Add this endpoint
app.get('/redirect-pixel', (req, res) => {
    const ip = req.ip;
    const emailId = req.query.id || 'unknown';
    
    console.log('📍 IP tracked:', ip, 'Email:', emailId);
    
    // Redirect to your Imgur pixel AFTER logging
    res.redirect('https://imgur.com/a/cAbemc9');
});
