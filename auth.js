import http from 'http';
import { promises as fs } from 'fs';
import { URL } from 'url';
import * as dotenv from 'dotenv';
import open from 'open';
import { google } from 'googleapis';

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
                    // Send a nice HTML response
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(successHtml);

                    // Resolve the promise with the authorization code
                    resolve(code);

                    // Close the server after a short delay
                    setTimeout(() => server.close(), 1000);
                }
            } catch (error) {
                console.error('Error handling request:', error);
                reject(error);
            }
        });

        server.listen(PORT, () => {
            console.log(`\nAuthorization server listening on http://localhost:${PORT}`);
        });
    });
}

async function getRefreshToken() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env file');
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `http://localhost:${PORT}`  // Update redirect URI to match our server
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'  // Force consent screen to ensure refresh token
    });

    console.log('\nOpening browser for authorization...');
    await open(authUrl); // Automatically open the browser

    try {
        console.log('Waiting for authorization...');
        const code = await createTemporaryServer();

        console.log('\nExchanging code for tokens...');
        const { tokens } = await oauth2Client.getToken(code);

        if (tokens.refresh_token) {
            let envContent = await fs.readFile('.env', 'utf8').catch(() => '');

            // Update or add GOOGLE_REFRESH_TOKEN
            if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
                envContent = envContent.replace(
                    /GOOGLE_REFRESH_TOKEN=.*/,
                    `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`
                );
            } else {
                envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
            }

            await fs.writeFile('.env', envContent);

            console.log('\n✅ Success! Refresh token has been saved to .env file');
            console.log('\nYou can now run the server with: npm start');
        } else {
            console.error('\n⚠️  No refresh token received. Try removing the app from:');
            console.error('https://myaccount.google.com/permissions');
            console.error('Then run this script again.');
        }
    } catch (error) {
        console.error('\n❌ Error getting tokens:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.error('\nThe authorization code may have expired. Please try again.');
        }
        process.exit(1);
    }
}

// Add this to handle any uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

getRefreshToken().catch(console.error);