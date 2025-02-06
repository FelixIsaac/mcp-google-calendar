import * as dotenv from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { google } from 'googleapis';
import { log, style } from './log.js';

dotenv.config();

// Define the create_event tool
const CREATE_EVENT_TOOL = {
    name: "create_event",
    description: "Create a calendar event with specified details",
    inputSchema: {
        type: "object",
        properties: {
            summary: {
                type: "string",
                description: "Event title"
            },
            start_time: {
                type: "string",
                description: "Start time (ISO format)"
            },
            end_time: {
                type: "string",
                description: "End time (ISO format)"
            },
            description: {
                type: "string",
                description: "Event description"
            },
            attendees: {
                type: "array",
                items: { type: "string" },
                description: "List of attendee emails"
            }
        },
        required: ["summary", "start_time", "end_time"]
    }
};

// Server implementation
const server = new Server({
    name: "mcp_calendar",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});

log.debug('Server initialized');

// Check for required environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const TIMEZONE = process.env.TIMEZONE || 'Asia/Singapore';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    log.error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required");
    process.exit(1);
}

if (!GOOGLE_REFRESH_TOKEN) {
    log.error("GOOGLE_REFRESH_TOKEN environment variable is required");
    process.exit(1);
}

function isValidISODate(dateStr) {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date) && dateStr.includes('T');
}

// Calendar event creation function
async function createCalendarEvent(args) {
    if (!isValidISODate(args.start_time) || !isValidISODate(args.end_time)) {
        throw new Error('Invalid date format. Please use ISO format (e.g., "2025-02-06T15:00:00Z")');
    }
    log.debug('Creating calendar event with args:', args);

    try {
        log.debug('Creating OAuth2 client');
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            'http://localhost'
        );
        log.debug('OAuth2 client created');

        log.debug('Setting credentials');
        oauth2Client.setCredentials({
            refresh_token: GOOGLE_REFRESH_TOKEN,
            token_uri: "https://oauth2.googleapis.com/token"
        });
        log.debug('Credentials set');

        log.debug('Creating calendar service');
        const calendar = google.calendar({
            version: 'v3',
            auth: oauth2Client
        });
        log.debug('Calendar service created');

        const event = {
            summary: args.summary,
            description: args.description,
            start: {
                dateTime: args.start_time,
                timeZone: TIMEZONE,
            },
            end: {
                dateTime: args.end_time,
                timeZone: TIMEZONE,
            }
        };

        log.debug('Event object created:', event);

        if (args.attendees) {
            event.attendees = args.attendees.map(email => ({ email }));
            log.debug('Attendees added:', event.attendees);
        }

        log.debug('Attempting to insert event');
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });
        log.debug('Event insert response:', response.data);
        return `Event created: ${response.data.htmlLink}`;
    } catch (error) {
        log.debug('ERROR OCCURRED:');
        log.debug('Error name:', error.name);
        log.debug('Error message:', error.message);
        log.debug('Error stack:', error.stack);
        throw new Error(`Failed to create event: ${error.message}`);
    }
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [CREATE_EVENT_TOOL]  // Return tools directly in the handler
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    log.debug('Call tool request received:', request);

    try {
        const { name, arguments: args } = request.params;
        if (!args) {
            throw new Error("No arguments provided");
        }

        switch (name) {
            case "create_event": {
                log.debug('Handling create_event request');
                const result = await createCalendarEvent(args);
                log.debug('Event creation successful:', result);
                return {
                    content: [{ type: "text", text: result }],
                    isError: false,
                };
            }
            default:
                log.debug('Unknown tool requested:', name);
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    } catch (error) {
        log.debug('Error in call tool handler:', error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});

// Server startup function
async function runServer() {
    log.debug('Starting server');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log.debug('Server connected to transport');
    log.info(style.cyan("Calendar MCP Server running on stdio"));
}

// Start the server
runServer().catch((error) => {
    log.debug('Fatal server error:', error);
    log.error("Fatal error running server:", error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    log.error('Unhandled promise rejection:', error);
    process.exit(1);
});