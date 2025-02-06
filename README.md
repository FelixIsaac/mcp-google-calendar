# MCP Google Calendar Server 

A Model Context Protocol (MCP) server implementation that enables AI assistants like Claude to create and manage Google Calendar events through a standardized interface.

## Features 

- Create calendar events with title, description, start/end times 
- Support for adding event attendees 
- OAuth2 authentication with Google Calendar API 
- Full MCP protocol implementation 
- Comprehensive debug logging
- Configurable timezone support
- ISO date validation

## Prerequisites 

- Node.js v18 or later 
- Google Cloud Console project with Calendar API enabled 
- OAuth2 credentials (Client ID and Client Secret) 

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Desktop app" as application type
   - Note down the Client ID and Client Secret

## Installation

1. Clone the repository: 
```bash
git clone https://github.com/your-username/mcp-google-calendar.git
cd mcp-google-calendar
```

2. Install dependencies: 
```bash
npm install
```

3. Set up environment variables: 
```bash
# Create .env file
cp .env.example .env

# Add your credentials to .env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
TIMEZONE=Singapore/Singapore  # Optional, defaults to Singapore/Singapore
```

4. Get your refresh token: 
```bash
npm run auth
```
- When prompted, visit the authorization URL in your browser
- Login with your Google account and grant permissions
- Copy the code from the redirect URL
- Paste the code back into the terminal
- Save the provided refresh token

5. Update your .env file with the refresh token:
```bash
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

## Usage 

Start the MCP server:
```bash
npm start
```

The server will run on stdio, allowing AI assistants to interact with it through the Model Context Protocol.

## Event Creation Format

Events can be created with the following parameters:

```javascript
{
  "summary": "Meeting Title",
  "description": "Meeting description",
  "start_time": "2025-02-06T15:00:00Z",  // ISO format
  "end_time": "2025-02-06T16:00:00Z",    // ISO format
  "attendees": ["email@example.com"]      // Optional
}
```

## Troubleshooting

- If you see authentication errors, ensure your OAuth credentials are correct
- For "invalid_grant" errors, try regenerating your refresh token
- Check debug logs in the console for detailed error information

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Regularly rotate your OAuth credentials for security
- Monitor your Google Cloud Console for any unauthorized usage