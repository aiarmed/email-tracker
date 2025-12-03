const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Store data in memory (for simple demo)
let emailOpens = [];

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
    const ua = userAgent || '';
    const result = {
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        osVersion: 'Unknown',
        deviceType: 'Desktop',
        deviceModel: 'Unknown',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isBot: false
    };

    try {
        // Detect bots
        const botRegex = /bot|crawler|spider|scrap|facebookexternalhit|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|ia_archiver/i;
        if (botRegex.test(ua)) {
            result.isBot = true;
            return result;
        }

        // Browser detection
        if (ua.includes('Chrome') && !ua.includes('Edg')) {
            const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
            result.browser = 'Chrome';
            result.browserVersion = chromeMatch ? chromeMatch[1] : 'Unknown';
        } else if (ua.includes('Firefox')) {
            const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
            result.browser = 'Firefox';
            result.browserVersion = firefoxMatch ? firefoxMatch[1] : 'Unknown';
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            const safariMatch = ua.match(/Version\/([\d.]+)/);
            result.browser = 'Safari';
            result.browserVersion = safariMatch ? safariMatch[1] : 'Unknown';
        } else if (ua.includes('Edg')) {
            const edgeMatch = ua.match(/Edg\/([\d.]+)/);
            result.browser = 'Edge';
            result.browserVersion = edgeMatch ? edgeMatch[1] : 'Unknown';
        } else if (ua.includes('Opera')) {
            const operaMatch = ua.match(/Opera\/([\d.]+)/);
            result.browser = 'Opera';
            result.browserVersion = operaMatch ? operaMatch[1] : 'Unknown';
        }

        // OS detection
        if (ua.includes('Windows')) {
            result.os = 'Windows';
            const winMatch = ua.match(/Windows NT ([\d.]+)/);
            if (winMatch) {
                const version = winMatch[1];
                if (version === '10.0') result.osVersion = '10/11';
                else if (version === '6.3') result.osVersion = '8.1';
                else if (version === '6.2') result.osVersion = '8';
                else if (version === '6.1') result.osVersion = '7';
                else result.osVersion = version;
            }
        } else if (ua.includes('Mac OS X')) {
            result.os = 'macOS';
            const macMatch = ua.match(/Mac OS X ([\d_]+)/);
            if (macMatch) {
                result.osVersion = macMatch[1].replace(/_/g, '.');
            }
        } else if (ua.includes('Android')) {
            result.os = 'Android';
            const androidMatch = ua.match(/Android ([\d.]+)/);
            result.osVersion = androidMatch ? androidMatch[1] : 'Unknown';
            result.isMobile = true;
            result.isDesktop = false;
            result.deviceType = 'Mobile';
            
            // Android device detection
            if (ua.includes('SM-')) {
                result.deviceModel = 'Samsung Galaxy';
            } else if (ua.includes('Pixel')) {
                result.deviceModel = 'Google Pixel';
            }
        } else if (ua.includes('iPhone') || ua.includes('iPad')) {
            result.os = 'iOS';
            const iosMatch = ua.match(/OS ([\d_]+)/);
            result.osVersion = iosMatch ? iosMatch[1].replace(/_/g, '.') : 'Unknown';
            
            if (ua.includes('iPhone')) {
                result.isMobile = true;
                result.isDesktop = false;
                result.deviceType = 'iPhone';
                result.deviceModel = 'iPhone';
            } else if (ua.includes('iPad')) {
                result.isTablet = true;
                result.isDesktop = false;
                result.deviceType = 'iPad';
                result.deviceModel = 'iPad';
            }
        } else if (ua.includes('Linux')) {
            result.os = 'Linux';
        }

        // Additional device detection
        if (ua.includes('Mobile')) {
            result.isMobile = true;
            result.isDesktop = false;
            result.deviceType = 'Mobile';
        } else if (ua.includes('Tablet') || ua.includes('iPad')) {
            result.isTablet = true;
            result.isDesktop = false;
            result.deviceType = 'Tablet';
        }

    } catch (error) {
        console.error('Error parsing user agent:', error);
    }

    return result;
};

// Helper to get geolocation from IP (using free API)
const getGeoLocation = async (ip) => {
    try {
        // Skip local IPs
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return {
                country: 'Local Network',
                countryCode: 'LOCAL',
                region: 'Local',
                city: 'Local',
                latitude: null,
                longitude: null,
                timezone: null,
                isp: 'Local Network'
            };
        }

        // Try ipapi.co first (free, 1000 requests/day)
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        if (response.ok) {
            const data = await response.json();
            return {
                country: data.country_name || 'Unknown',
                countryCode: data.country_code || 'XX',
                region: data.region || 'Unknown',
                city: data.city || 'Unknown',
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                timezone: data.timezone || null,
                isp: data.org || 'Unknown'
            };
        }
    } catch (error) {
        console.error('Geolocation error:', error);
    }

    return {
        country: 'Unknown',
        countryCode: 'XX',
        region: 'Unknown',
        city: 'Unknown',
        latitude: null,
        longitude: null,
        timezone: null,
        isp: 'Unknown'
    };
};

// Helper to get screen info from headers
const parseScreenInfo = (headers) => {
    const viewport = headers['viewport'] || headers['sec-ch-viewport-width'] || '';
    const dpr = headers['sec-ch-dpr'] || headers['device-pixel-ratio'] || '';
    const prefersColorScheme = headers['sec-ch-prefers-color-scheme'] || '';
    
    return {
        viewportWidth: viewport ? viewport.split(',')[0] : 'Unknown',
        devicePixelRatio: dpr || 'Unknown',
        prefersColorScheme: prefersColorScheme || 'Unknown',
        prefersReducedMotion: headers['sec-ch-prefers-reduced-motion'] || 'Unknown'
    };
};

// Helper to parse accept headers
const parseAcceptHeaders = (headers) => {
    return {
        languages: headers['accept-language'] 
            ? headers['accept-language'].split(',').map(lang => {
                const parts = lang.trim().split(';');
                return {
                    language: parts[0],
                    q: parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0
                };
            })
            : [],
        encodings: headers['accept-encoding'] 
            ? headers['accept-encoding'].split(',').map(enc => enc.trim())
            : [],
        charsets: headers['accept-charset']
            ? headers['accept-charset'].split(',').map(charset => charset.trim())
            : ['utf-8']
    };
};

// Main tracking endpoint
app.get('/track.gif', async (req, res) => {
    // Function to get REAL client IP (not proxy IPs)
    const getClientIp = (req) => {
        // Try different headers in order (most to least reliable)
        const headersToCheck = [
            'x-real-ip',
            'x-client-ip', 
            'cf-connecting-ip',      // CloudFlare
            'fastly-client-ip',      // Fastly CDN
            'x-cluster-client-ip',
            'x-forwarded', 
            'forwarded-for',
            'forwarded'
        ];
        
        // First check standard headers
        for (const header of headersToCheck) {
            if (req.headers[header]) {
                const ip = req.headers[header];
                // Handle comma-separated lists
                if (ip.includes(',')) {
                    return ip.split(',')[0].trim();
                }
                return ip;
            }
        }
        
        // Check x-forwarded-for (common for proxies)
        if (req.headers['x-forwarded-for']) {
            const xForwardedFor = req.headers['x-forwarded-for'];
            const ips = xForwardedFor.split(',');
            return ips[0].trim();
        }
        
        // Try connection/socket IPs
        if (req.connection && req.connection.remoteAddress) {
            return req.connection.remoteAddress;
        }
        if (req.socket && req.socket.remoteAddress) {
            return req.socket.remoteAddress;
        }
        if (req.connection && req.connection.socket && req.connection.socket.remoteAddress) {
            return req.connection.socket.remoteAddress;
        }
        
        return req.ip || 'unknown';
    };
    
    // Get basic info
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const emailId = req.query.id || 'unknown';
    const recipient = req.query.to || 'unknown@example.com';
    const referer = req.headers['referer'] || 'Direct';
    
    // Parse detailed information
    const uaInfo = parseUserAgent(userAgent);
    const acceptInfo = parseAcceptHeaders(req.headers);
    const screenInfo = parseScreenInfo(req.headers);
    const geoInfo = await getGeoLocation(ip);
    
    // Determine connection type
    const connectionType = req.headers['save-data'] === 'on' ? 'Data Saver Mode' : 
                          req.headers['sec-ch-ua-mobile'] === '?1' ? 'Mobile Data' : 
                          req.headers['sec-ch-ua-platform'] ? 'Desktop/LAN' : 'Unknown';
    
    // Check if image loading was prevented
    const imageBlocked = referer === 'Direct' && !req.headers['accept']?.includes('image');
    
    // Create comprehensive log entry
    const logEntry = {
        // Basic info
        id: Date.now(),
        emailId: emailId,
        recipient: recipient,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
        
        // Network & Location
        ip: ip,
        geoLocation: geoInfo,
        connectionType: connectionType,
        proxyDetected: req.headers['via'] ? true : false,
        cdnUsed: req.headers['cf-ray'] ? 'CloudFlare' : 
                req.headers['akamai-origin-hop'] ? 'Akamai' :
                req.headers['x-served-by'] ? 'Other CDN' : 'None',
        
        // Device & Browser
        userAgent: userAgent,
        parsedUA: uaInfo,
        
        // Screen & Display
        screen: screenInfo,
        
        // Language & Encoding
        accept: acceptInfo,
        
        // Headers & Context
        referer: referer,
        host: req.headers['host'],
        origin: req.headers['origin'] || 'None',
        secFetchDest: req.headers['sec-fetch-dest'] || 'None',
        secFetchMode: req.headers['sec-fetch-mode'] || 'None',
        secFetchSite: req.headers['sec-fetch-site'] || 'None',
        
        // Cookies & Storage
        cookiesEnabled: req.headers['cookie'] ? true : false,
        cookieCount: req.headers['cookie'] ? req.headers['cookie'].split(';').length : 0,
        
        // Performance hints
        saveData: req.headers['save-data'] || 'off',
        deviceMemory: req.headers['device-memory'] || 'Unknown',
        
        // Email context
        imageBlocked: imageBlocked,
        pixelType: 'gif',
        
        // Additional query parameters
        campaignId: req.query.campaign || 'None',
        subject: req.query.subject || 'None',
        list: req.query.list || 'None'
    };
    
    // Add to array (keep last 500 only)
    emailOpens.unshift(logEntry);
    if (emailOpens.length > 500) {
        emailOpens = emailOpens.slice(0, 500);
    }
    
    // Enhanced console logging
    console.log('📧 EMAIL OPENED - COMPREHENSIVE DATA');
    console.log('📧 Email ID:', emailId);
    console.log('👤 Recipient:', recipient);
    console.log('📍 IP Address:', ip);
    console.log('🌍 Location:', `${geoInfo.city}, ${geoInfo.country} (${geoInfo.countryCode})`);
    console.log('🖥️ Device:', `${uaInfo.deviceType} - ${uaInfo.os} ${uaInfo.osVersion}`);
    console.log('🌐 Browser:', `${uaInfo.browser} ${uaInfo.browserVersion}`);
    console.log('🔗 Referer:', referer);
    console.log('🗣️ Primary Language:', acceptInfo.languages[0]?.language || 'Unknown');
    console.log('📱 Connection:', connectionType);
    console.log('🕒 Time:', logEntry.time);
    console.log('🎨 Color Scheme:', screenInfo.prefersColorScheme);
    console.log('💾 Save Data:', logEntry.saveData);
    console.log('📊 Total Opens:', emailOpens.length);
    console.log('---');
    
    // Create 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    // Set headers
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': gif.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'X-Tracking-ID': emailId,
        'X-Client-IP': ip,
        'X-Device-Type': uaInfo.deviceType,
        'X-Country': geoInfo.countryCode
    });
    
    res.end(gif);
});

// Enhanced Dashboard
app.get('/dashboard', (req, res) => {
    // Calculate statistics
    const totalOpens = emailOpens.length;
    const uniqueIps = new Set(emailOpens.map(e => e.ip)).size;
    const uniqueEmails = new Set(emailOpens.map(e => e.emailId)).size;
    const uniqueRecipients = new Set(emailOpens.map(e => e.recipient)).size;
    
    // Device statistics
    const deviceTypes = emailOpens.reduce((acc, entry) => {
        const type = entry.parsedUA.deviceType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    
    // Browser statistics
    const browsers = emailOpens.reduce((acc, entry) => {
        const browser = entry.parsedUA.browser;
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
    }, {});
    
    // Country statistics
    const countries = emailOpens.reduce((acc, entry) => {
        const country = entry.geoLocation.countryCode;
        if (country !== 'XX' && country !== 'LOCAL') {
            acc[country] = (acc[country] || 0) + 1;
        }
        return acc;
    }, {});
    
    // Generate HTML
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Email Tracking Dashboard - Comprehensive</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            :root {
                --primary: #667eea;
                --secondary: #764ba2;
                --success: #48bb78;
                --warning: #f6ad55;
                --danger: #f56565;
                --dark: #2d3748;
                --light: #f7fafc;
                --gray: #a0aec0;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                color: var(--dark);
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
            }
            
            .header {
                background: white;
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            h1 {
                color: var(--dark);
                margin: 0 0 10px 0;
                font-size: 2.5em;
            }
            
            .subtitle {
                color: var(--gray);
                margin: 0 0 20px 0;
                font-size: 1.1em;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .stat-card {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-align: center;
            }
            
            .stat-number {
                font-size: 2.2em;
                font-weight: bold;
                color: var(--primary);
                display: block;
                line-height: 1;
            }
            
            .stat-label {
                color: var(--gray);
                font-size: 0.9em;
                margin-top: 5px;
            }
            
            .chart-container {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .chart {
                padding: 15px;
            }
            
            .chart h3 {
                margin-top: 0;
                color: var(--dark);
                font-size: 1.1em;
                margin-bottom: 15px;
            }
            
            .chart-bar {
                background: var(--light);
                border-radius: 5px;
                margin-bottom: 10px;
                overflow: hidden;
            }
            
            .chart-fill {
                background: var(--primary);
                height: 24px;
                border-radius: 5px;
                padding: 0 10px;
                color: white;
                font-size: 0.9em;
                line-height: 24px;
                transition: width 0.3s ease;
            }
            
            .details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .details-card {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .details-card h3 {
                margin-top: 0;
                color: var(--dark);
                border-bottom: 2px solid var(--primary);
                padding-bottom: 10px;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid var(--light);
            }
            
            .detail-label {
                color: var(--gray);
                font-size: 0.9em;
            }
            
            .detail-value {
                font-weight: 500;
                text-align: right;
                font-family: 'SF Mono', Monaco, monospace;
                font-size: 0.9em;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                font-weight: 500;
                margin: 2px;
            }
            
            .badge-mobile { background: #e3f2fd; color: #1976d2; }
            .badge-desktop { background: #e8f5e9; color: #2e7d32; }
            .badge-tablet { background: #fff3e0; color: #f57c00; }
            .badge-chrome { background: #fff8e1; color: #ff8f00; }
            .badge-firefox { background: #f3e5f5; color: #7b1fa2; }
            .badge-safari { background: #e8eaf6; color: #303f9f; }
            
            .table-container {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
            }
            
            th {
                background: var(--primary);
                color: white;
                padding: 15px;
                text-align: left;
                font-weight: 500;
            }
            
            td {
                padding: 12px 15px;
                border-bottom: 1px solid var(--light);
            }
            
            tr:hover {
                background: var(--light);
            }
            
            .flag {
                display: inline-block;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ccc;
                margin-right: 8px;
                vertical-align: middle;
            }
            
            .controls {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            
            .btn-primary {
                background: var(--primary);
                color: white;
            }
            
            .btn-primary:hover {
                background: #5a67d8;
            }
            
            .btn-secondary {
                background: var(--light);
                color: var(--dark);
                border: 1px solid var(--gray);
            }
            
            .btn-secondary:hover {
                background: #e2e8f0;
            }
            
            .export-buttons {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .export-btn {
                background: var(--success);
                color: white;
                padding: 8px 16px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 0.9em;
            }
            
            @media (max-width: 768px) {
                .container { padding: 10px; }
                .header { padding: 20px; }
                h1 { font-size: 1.8em; }
                th, td { padding: 8px 10px; }
                .stats-grid { grid-template-columns: repeat(2, 1fr); }
            }
            
            .tooltip {
                position: relative;
                display: inline-block;
            }
            
            .tooltip .tooltiptext {
                visibility: hidden;
                width: 200px;
                background-color: var(--dark);
                color: white;
                text-align: center;
                border-radius: 6px;
                padding: 8px;
                position: absolute;
                z-index: 1;
                bottom: 125%;
                left: 50%;
                margin-left: -100px;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 0.8em;
                font-weight: normal;
            }
            
            .tooltip:hover .tooltiptext {
                visibility: visible;
                opacity: 1;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Email Tracking Dashboard</h1>
                <p class="subtitle">Comprehensive analytics for your email campaigns</p>
                
                <div class="controls">
                    <button class="btn btn-primary" onclick="location.reload()">🔄 Refresh</button>
                    <button class="btn btn-secondary" onclick="clearData()">🗑️ Clear Data</button>
                    <button class="btn btn-secondary" onclick="exportJSON()">📥 Export JSON</button>
                    <button class="btn btn-secondary" onclick="exportCSV()">📊 Export CSV</button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${totalOpens}</span>
                    <span class="stat-label">Total Opens</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${uniqueIps}</span>
                    <span class="stat-label">Unique IPs</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${uniqueEmails}</span>
                    <span class="stat-label">Tracked Emails</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${uniqueRecipients}</span>
                    <span class="stat-label">Unique Recipients</span>
                </div>
            </div>
            
            <div class="chart-container">
                <div class="chart">
                    <h3>Device Distribution</h3>
                    ${Object.entries(deviceTypes).map(([device, count]) => {
                        const percentage = totalOpens > 0 ? ((count / totalOpens) * 100).toFixed(1) : 0;
                        return `
                        <div class="chart-bar">
                            <div class="chart-fill" style="width: ${percentage}%">
                                ${device}: ${count} (${percentage}%)
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="chart">
                    <h3>Browser Distribution</h3>
                    ${Object.entries(browsers).map(([browser, count]) => {
                        const percentage = totalOpens > 0 ? ((count / totalOpens) * 100).toFixed(1) : 0;
                        const badgeClass = `badge-${browser.toLowerCase()}`;
                        return `
                        <div class="chart-bar">
                            <div class="chart-fill" style="width: ${percentage}%">
                                <span class="badge ${badgeClass}">${browser}</span>: ${count} (${percentage}%)
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="details-grid">
                <div class="details-card">
                    <h3>📈 Top Performers</h3>
                    ${(() => {
                        const emailCounts = emailOpens.reduce((acc, entry) => {
                            acc[entry.emailId] = (acc[entry.emailId] || 0) + 1;
                            return acc;
                        }, {});
                        
                        return Object.entries(emailCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([emailId, count]) => `
                                <div class="detail-item">
                                    <span class="detail-label">${emailId}</span>
                                    <span class="detail-value">${count} opens</span>
                                </div>
                            `).join('');
                    })()}
                </div>
                
                <div class="details-card">
                    <h3>🌍 Top Locations</h3>
                    ${Object.entries(countries)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([country, count]) => `
                            <div class="detail-item">
                                <span class="detail-label">
                                    <span class="flag"></span>
                                    ${country}
                                </span>
                                <span class="detail-value">${count} opens</span>
                            </div>
                        `).join('')}
                </div>
                
                <div class="details-card">
                    <h3>📱 Platform Insights</h3>
                    <div class="detail-item">
                        <span class="detail-label">Mobile Opens</span>
                        <span class="detail-value">${emailOpens.filter(e => e.parsedUA.isMobile).length}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Desktop Opens</span>
                        <span class="detail-value">${emailOpens.filter(e => e.parsedUA.isDesktop).length}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tablet Opens</span>
                        <span class="detail-value">${emailOpens.filter(e => e.parsedUA.isTablet).length}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Bot Detection</span>
                        <span class="detail-value">${emailOpens.filter(e => e.parsedUA.isBot).length}</span>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <h3 style="margin-top: 0;">📋 Recent Email Opens</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Email ID</th>
                            <th>Recipient</th>
                            <th>Location</th>
                            <th>Device & Browser</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${emailOpens.slice(0, 20).map(entry => {
                            const deviceBadge = entry.parsedUA.isMobile 
                                ? '<span class="badge badge-mobile">📱 Mobile</span>'
                                : entry.parsedUA.isTablet
                                ? '<span class="badge badge-tablet">📟 Tablet</span>'
                                : '<span class="badge badge-desktop">💻 Desktop</span>';
                            
                            const browserBadge = entry.parsedUA.browser === 'Chrome'
                                ? '<span class="badge badge-chrome">Chrome</span>'
                                : entry.parsedUA.browser === 'Firefox'
                                ? '<span class="badge badge-firefox">Firefox</span>'
                                : entry.parsedUA.browser === 'Safari'
                                ? '<span class="badge badge-safari">Safari</span>'
                                : `<span class="badge">${entry.parsedUA.browser}</span>`;
                            
                            return `
                            <tr>
                                <td>${entry.time}</td>
                                <td><strong>${entry.emailId}</strong></td>
                                <td>${entry.recipient}</td>
                                <td>
                                    <div class="tooltip">
                                        ${entry.geoLocation.countryCode}
                                        <span class="tooltiptext">
                                            ${entry.geoLocation.city}, ${entry.geoLocation.country}<br>
                                            ISP: ${entry.geoLocation.isp}<br>
                                            Timezone: ${entry.geoLocation.timezone || 'Unknown'}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    ${deviceBadge}
                                    ${browserBadge}
                                </td>
                                <td>
                                    <div class="tooltip">
                                        🔍 View
                                        <span class="tooltiptext">
                                            IP: ${entry.ip}<br>
                                            OS: ${entry.parsedUA.os} ${entry.parsedUA.osVersion}<br>
                                            Language: ${entry.accept.languages[0]?.language || 'Unknown'}<br>
                                            Referer: ${entry.referer || 'Direct'}<br>
                                            User Agent: ${entry.userAgent.substring(0, 80)}...
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                        
                        ${emailOpens.length === 0 ? `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                No email opens recorded yet. Send a test email to see data here!
                            </td>
                        </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
            
            <div class="details-card">
                <h3>🛠️ How to Use</h3>
                <p>Add this tracking pixel to your emails:</p>
                <code style="background: #f1f1f1; padding: 10px; border-radius: 5px; display: block; margin: 10px 0;">
                    &lt;img src="YOUR-URL/track.gif?id=EMAIL_ID&to=RECIPIENT_EMAIL&campaign=ID&subject=TITLE" 
                         width="1" height="1" style="display:none" alt=""&gt;
                </code>
                <p><strong>Optional Parameters:</strong></p>
                <ul>
                    <li><code>campaign</code>: Campaign identifier</li>
                    <li><code>subject</code>: Email subject line</li>
                    <li><code>list</code>: Mailing list name</li>
                </ul>
            </div>
        </div>
        
        <script>
            function clearData() {
                if (confirm('Are you sure you want to clear all tracking data?')) {
                    fetch('/clear-data', { method: 'POST' })
                        .then(() => location.reload());
                }
            }
            
            function exportJSON() {
                fetch('/export/json')
                    .then(response => response.json())
                    .then(data => {
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'email-tracking-data.json';
                        a.click();
                        window.URL.revokeObjectURL(url);
                    });
            }
            
            function exportCSV() {
                fetch('/export/csv')
                    .then(response => response.text())
                    .then(csv => {
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'email-tracking-data.csv';
                        a.click();
                        window.URL.revokeObjectURL(url);
                    });
            }
            
            // Auto-refresh every 60 seconds
            setTimeout(() => location.reload(), 60000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// Add data management endpoints
app.post('/clear-data', (req, res) => {
    emailOpens = [];
    res.json({ success: true, message: 'Data cleared' });
});

app.get('/export/json', (req, res) => {
    res.json({
        metadata: {
            exportedAt: new Date().toISOString(),
            totalEntries: emailOpens.length
        },
        data: emailOpens
    });
});

app.get('/export/csv', (req, res) => {
    // Create CSV header
    let csv = 'Timestamp,EmailID,Recipient,IP,Country,City,DeviceType,Browser,OS,Referer,UserAgent\n';
    
    // Add data rows
    emailOpens.forEach(entry => {
        const row = [
            entry.timestamp,
            `"${entry.emailId}"`,
            `"${entry.recipient}"`,
            `"${entry.ip}"`,
            `"${entry.geoLocation.country}"`,
            `"${entry.geoLocation.city}"`,
            `"${entry.parsedUA.deviceType}"`,
            `"${entry.parsedUA.browser}"`,
            `"${entry.parsedUA.os}"`,
            `"${entry.referer}"`,
            `"${entry.userAgent.replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=email-tracking-data.csv');
    res.send(csv);
});

// Simple homepage
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'email-tracker',
        version: '2.0',
        timestamp: new Date().toISOString(),
        statistics: {
            totalOpens: emailOpens.length,
            uniqueIPs: new Set(emailOpens.map(e => e.ip)).size,
            uniqueEmails: new Set(emailOpens.map(e => e.emailId)).size,
            lastHour: emailOpens.filter(e => new Date(e.timestamp) > new Date(Date.now() - 3600000)).length
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Email tracker running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
    console.log(`📈 Track Pixel: http://localhost:${PORT}/track.gif?id=test&to=test@example.com`);
});
