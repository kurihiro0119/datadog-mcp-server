# datadog-mcp-server

MCP (Model Context Protocol) server for Datadog integration. Monitor metrics, logs, and APM data directly from your AI applications.

## Features

- **Alert Management**: Retrieve and analyze active alerts
- **Metrics Query**: Query Datadog metrics with custom time ranges
- **Log Search**: Search and retrieve logs with filters
- **Monitor Management**: List and get details of monitors
- **Alert Analysis**: Automatic analysis of alerts with potential causes and suggested actions

## Installation

```bash
npm install datadog-mcp-server
```

## Configuration

Set up your Datadog API credentials:

```bash
export DD_API_KEY="your-api-key"
export DD_APP_KEY="your-app-key"
export DD_SITE="datadoghq.com"  # or datadoghq.eu, us3.datadoghq.com, etc.
```

## Usage

### As a CLI tool

```bash
npx datadog-mcp-server
```

### In your MCP client configuration

```json
{
  "mcpServers": {
    "datadog": {
      "command": "npx",
      "args": ["datadog-mcp-server"],
      "env": {
        "DD_API_KEY": "your-api-key",
        "DD_APP_KEY": "your-app-key",
        "DD_SITE": "datadoghq.com"
      }
    }
  }
}
```

## Available Tools

### get_alerts
Retrieve active alerts from Datadog.

Parameters:
- `limit` (number): Number of alerts to retrieve (default: 10)
- `priority` (string): Filter by priority (P1-P5)
- `tags` (array): Filter by tags

### get_alert_details
Get detailed information about a specific alert.

Parameters:
- `alertId` (string, required): The ID of the alert

### get_metrics
Query Datadog metrics.

Parameters:
- `query` (string, required): Datadog metric query
- `from` (string): Start time (ISO 8601 or relative like "-1h")
- `to` (string): End time (ISO 8601 or relative)

### get_logs
Search Datadog logs.

Parameters:
- `query` (string, required): Log search query
- `from` (string): Start time
- `to` (string): End time
- `limit` (number): Number of logs to retrieve (default: 100)

### get_monitors
List Datadog monitors.

Parameters:
- `tags` (array): Filter by tags
- `monitorTags` (array): Filter by monitor tags
- `name` (string): Filter by monitor name

### get_monitor_details
Get details of a specific monitor.

Parameters:
- `monitorId` (string, required): The ID of the monitor

### analyze_alert
Analyze an alert and provide potential root causes and solutions.

Parameters:
- `alertId` (string, required): The ID of the alert to analyze
- `includeMetrics` (boolean): Include related metrics (default: true)
- `includeLogs` (boolean): Include related logs (default: true)

## Example Usage

Once configured, you can use natural language to interact with Datadog:

- "Show me all P1 alerts"
- "Analyze the alert with ID 12345"
- "Get CPU metrics for the last hour"
- "Search logs for errors in the payment service"
- "List all monitors tagged with production"

### Programmatic usage

```javascript
// Query CPU metrics for the last hour
const result = await client.callTool('get_metrics', {
  query: 'avg:system.cpu.user{*}',
  from: 'now-1h',
  to: 'now'
});
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

MIT