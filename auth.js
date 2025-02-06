import http from 'http';
import { promises as fs } from 'fs';
import { URL } from 'url';
import * as dotenv from 'dotenv';
import open from 'open';
import { google } from 'googleapis';
import { log, style } from './log.js';

dotenv.config();

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events'
];

const PORT = process.env.APP_PORT || 3333;

async function createTemporaryServer() {
    const successHtml = await fs.readFile('success.html', 'utf8');

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                const url = new URL(req.url, `http://localhost:${PORT}`);
                const code = url.searchParams.get('code');

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(successHtml);
                    resolve(code);
                    setTimeout(() => server.close(), 1000);
                }
            } catch (error) {
                log.error('Error handling request:', error);
                reject(error);
            }
        });

        server.listen(PORT, () => {
            log.info(`Authorization server listening on ${style.cyan(`http://localhost:${PORT}`)}`);
        });
    });
}

async function getRefreshToken() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        log.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env file');
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `http://localhost:${PORT}`
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    log.title('Google Calendar API Authorization');

    log.step(1, 'Opening browser for authorization...');
    await open(authUrl);

    try {
        log.step(2, 'Waiting for authorization...');
        const code = await createTemporaryServer();

        log.step(3, 'Exchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);

        if (tokens.refresh_token) {
            let envContent = await fs.readFile('.env', 'utf8').catch(() => '');

            if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
                envContent = envContent.replace(
                    /GOOGLE_REFRESH_TOKEN=.*/,
                    `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`
                );
            } else {
                envContent += `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`;
            }

            await fs.writeFile('.env', envContent);

            log.title(style.green('🎉 Authorization Successful!'));
            log.success('Refresh token has been saved to .env file');
            log.info('You can now run the server with:', style.cyan('npm start'));
        } else {
            log.title(style.yellow('⚠️  Authorization Warning'));
            log.warn('No refresh token received');
            log.info('Please remove the app from:', style.underline('https://myaccount.google.com/permissions'));
            log.info('Then run this script again');
        }
    } catch (error) {
        log.title(style.red('❌ Authorization Error'));
        log.error(error.message);

        if (error.message.includes('invalid_grant')) {
            log.info('The authorization code may have expired. Please try again.');
        }
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    log.error('Unhandled promise rejection:', error);
    process.exit(1);
});

// Start the authorization process
getRefreshToken().catch((error) => {
    log.error('Fatal error:', error);
    process.exit(1);
});