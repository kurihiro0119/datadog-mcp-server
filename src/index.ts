#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { DatadogClient } from './datadog-client.js';
import { tools } from './tools.js';

dotenv.config();

const server = new Server(
  {
    name: 'datadog-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const datadogClient = new DatadogClient({
  apiKey: process.env.DD_API_KEY!,
  appKey: process.env.DD_APP_KEY!,
  site: process.env.DD_SITE || 'datadoghq.com',
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_alerts':
        return await datadogClient.getAlerts(args);
      
      case 'get_alert_details':
        return await datadogClient.getAlertDetails(args);
      
      case 'get_metrics':
        return await datadogClient.getMetrics(args);
      
      case 'get_logs':
        return await datadogClient.getLogs(args);
      
      case 'get_monitors':
        return await datadogClient.getMonitors(args);
      
      case 'get_monitor_details':
        return await datadogClient.getMonitorDetails(args);
      
      case 'analyze_alert':
        return await datadogClient.analyzeAlert(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Datadog MCP server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});