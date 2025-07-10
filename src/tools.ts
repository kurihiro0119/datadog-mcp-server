export const tools = [
  {
    name: 'get_alerts',
    description: 'Get active alerts from Datadog',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of alerts to retrieve',
          default: 10,
        },
        priority: {
          type: 'string',
          description: 'Filter by priority (P1, P2, P3, P4, P5)',
          enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
      },
    },
  },
  {
    name: 'get_alert_details',
    description: 'Get detailed information about a specific alert',
    inputSchema: {
      type: 'object',
      properties: {
        alertId: {
          type: 'string',
          description: 'The ID of the alert',
        },
      },
      required: ['alertId'],
    },
  },
  {
    name: 'get_metrics',
    description: 'Query Datadog metrics',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Datadog metric query',
        },
        from: {
          type: 'string',
          description: 'Start time (ISO 8601 or relative time)',
        },
        to: {
          type: 'string',
          description: 'End time (ISO 8601 or relative time)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_logs',
    description: 'Query Datadog logs',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Log search query',
        },
        from: {
          type: 'string',
          description: 'Start time (ISO 8601 or relative time)',
        },
        to: {
          type: 'string',
          description: 'End time (ISO 8601 or relative time)',
        },
        limit: {
          type: 'number',
          description: 'Number of logs to retrieve',
          default: 100,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_monitors',
    description: 'List Datadog monitors',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
        monitorTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by monitor tags',
        },
        name: {
          type: 'string',
          description: 'Filter by monitor name',
        },
      },
    },
  },
  {
    name: 'get_monitor_details',
    description: 'Get details of a specific monitor',
    inputSchema: {
      type: 'object',
      properties: {
        monitorId: {
          type: 'string',
          description: 'The ID of the monitor',
        },
      },
      required: ['monitorId'],
    },
  },
  {
    name: 'analyze_alert',
    description: 'Analyze an alert and provide potential root causes and solutions',
    inputSchema: {
      type: 'object',
      properties: {
        alertId: {
          type: 'string',
          description: 'The ID of the alert to analyze',
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include related metrics in analysis',
          default: true,
        },
        includeLogs: {
          type: 'boolean',
          description: 'Include related logs in analysis',
          default: true,
        },
      },
      required: ['alertId'],
    },
  },
];