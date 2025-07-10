import axios, { AxiosInstance } from 'axios';

interface DatadogConfig {
  apiKey: string;
  appKey: string;
  site: string;
}

export class DatadogClient {
  private client: AxiosInstance;
  private apiKey: string;
  private appKey: string;

  constructor(config: DatadogConfig) {
    this.apiKey = config.apiKey;
    this.appKey = config.appKey;
    
    this.client = axios.create({
      baseURL: `https://api.${config.site}/api/v1`,
      headers: {
        'DD-API-KEY': config.apiKey,
        'DD-APPLICATION-KEY': config.appKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async getAlerts(params: any) {
    try {
      const response = await this.client.get('/monitor/search', {
        params: {
          query: 'status:("Alert" OR "Warn" OR "No Data")',
          page_size: params.limit || 10,
          sort: '-status,name',
        },
      });

      const alerts = response.data.monitors.filter((monitor: any) => {
        if (params.priority && monitor.priority !== params.priority) {
          return false;
        }
        if (params.tags && params.tags.length > 0) {
          const hasAllTags = params.tags.every((tag: string) =>
            monitor.tags.includes(tag)
          );
          if (!hasAllTags) return false;
        }
        return true;
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: alerts.length,
            alerts: alerts.map((alert: any) => ({
              id: alert.id,
              name: alert.name,
              status: alert.overall_state,
              priority: alert.priority,
              tags: alert.tags,
              message: alert.message,
              created: alert.created,
              modified: alert.modified,
            })),
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get alerts: ${error}`);
    }
  }

  async getAlertDetails(params: any) {
    try {
      const response = await this.client.get(`/monitor/${params.alertId}`);
      const monitor = response.data;

      const stateHistory = await this.client.get(`/monitor/${params.alertId}/state/history`, {
        params: {
          from_ts: Math.floor(Date.now() / 1000) - 86400,
          to_ts: Math.floor(Date.now() / 1000),
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            monitor,
            stateHistory: stateHistory.data,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get alert details: ${error}`);
    }
  }

  async getMetrics(params: any) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const from = params.from ? this.parseTime(params.from) : now - 3600;
      const to = params.to ? this.parseTime(params.to) : now;

      const response = await this.client.get('/query', {
        params: {
          query: params.query,
          from,
          to,
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get metrics: ${error}`);
    }
  }

  async getLogs(params: any) {
    try {
      const now = new Date();
      const from = params.from ? new Date(params.from) : new Date(now.getTime() - 3600000);
      const to = params.to ? new Date(params.to) : now;

      const logsClient = axios.create({
        baseURL: `https://api.${this.client.defaults.baseURL?.split('.')[1]}/api/v2`,
        headers: this.client.defaults.headers,
      });

      const response = await logsClient.post('/logs/events/search', {
        filter: {
          query: params.query,
          from: from.toISOString(),
          to: to.toISOString(),
        },
        page: {
          limit: params.limit || 100,
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: response.data.data.length,
            logs: response.data.data,
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get logs: ${error}`);
    }
  }

  async getMonitors(params: any) {
    try {
      const queryParts = [];
      if (params.name) {
        queryParts.push(`name:"${params.name}"`);
      }
      if (params.tags && params.tags.length > 0) {
        queryParts.push(params.tags.map((tag: string) => `tag:"${tag}"`).join(' '));
      }
      if (params.monitorTags && params.monitorTags.length > 0) {
        queryParts.push(params.monitorTags.map((tag: string) => `monitor_tag:"${tag}"`).join(' '));
      }

      const response = await this.client.get('/monitor/search', {
        params: {
          query: queryParts.join(' '),
        },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count: response.data.monitors.length,
            monitors: response.data.monitors.map((monitor: any) => ({
              id: monitor.id,
              name: monitor.name,
              type: monitor.type,
              status: monitor.overall_state,
              tags: monitor.tags,
              created: monitor.created,
              modified: monitor.modified,
            })),
          }, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get monitors: ${error}`);
    }
  }

  async getMonitorDetails(params: any) {
    try {
      const response = await this.client.get(`/monitor/${params.monitorId}`);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to get monitor details: ${error}`);
    }
  }

  async analyzeAlert(params: any) {
    try {
      const alertDetails = await this.getAlertDetails({ alertId: params.alertId });
      const alertData = JSON.parse(alertDetails.content[0].text);
      
      const analysis: any = {
        alert: {
          id: alertData.monitor.id,
          name: alertData.monitor.name,
          status: alertData.monitor.overall_state,
          message: alertData.monitor.message,
          query: alertData.monitor.query,
        },
        stateHistory: alertData.stateHistory,
      };

      if (params.includeMetrics && alertData.monitor.query) {
        const metricMatch = alertData.monitor.query.match(/\{([^}]+)\}/);
        if (metricMatch) {
          const metricQuery = metricMatch[0];
          const metricsResult = await this.getMetrics({
            query: metricQuery,
            from: '-1h',
          });
          analysis.relatedMetrics = JSON.parse(metricsResult.content[0].text);
        }
      }

      if (params.includeLogs) {
        const tags = alertData.monitor.tags || [];
        const logQuery = tags.map((tag: string) => `@${tag.split(':')[0]}:${tag.split(':')[1]}`).join(' OR ');
        
        if (logQuery) {
          const logsResult = await this.getLogs({
            query: logQuery,
            from: '-1h',
            limit: 50,
          });
          analysis.relatedLogs = JSON.parse(logsResult.content[0].text);
        }
      }

      analysis.potentialCauses = this.analyzePotentialCauses(alertData);
      analysis.suggestedActions = this.suggestActions(alertData);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        }],
      };
    } catch (error) {
      throw new Error(`Failed to analyze alert: ${error}`);
    }
  }

  private parseTime(timeStr: string): number {
    if (timeStr.startsWith('-')) {
      const match = timeStr.match(/^-(\d+)([mhd])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        const now = Math.floor(Date.now() / 1000);
        
        switch (unit) {
          case 'm':
            return now - (value * 60);
          case 'h':
            return now - (value * 3600);
          case 'd':
            return now - (value * 86400);
        }
      }
    }
    
    return Math.floor(new Date(timeStr).getTime() / 1000);
  }

  private analyzePotentialCauses(alertData: any): string[] {
    const causes = [];
    const query = alertData.monitor.query.toLowerCase();
    
    if (query.includes('cpu')) {
      causes.push('High CPU usage detected - possible resource-intensive processes or insufficient compute resources');
    }
    if (query.includes('memory')) {
      causes.push('Memory issues detected - possible memory leaks or insufficient memory allocation');
    }
    if (query.includes('error') || query.includes('exception')) {
      causes.push('Application errors detected - check application logs for stack traces');
    }
    if (query.includes('latency') || query.includes('response')) {
      causes.push('Performance degradation detected - possible network issues or backend slowness');
    }
    if (query.includes('disk') || query.includes('storage')) {
      causes.push('Storage issues detected - possible disk space shortage or I/O bottlenecks');
    }
    
    if (causes.length === 0) {
      causes.push('Monitor threshold exceeded - review the monitor query and recent metric trends');
    }
    
    return causes;
  }

  private suggestActions(alertData: any): string[] {
    const actions = [];
    const query = alertData.monitor.query.toLowerCase();
    
    if (query.includes('cpu')) {
      actions.push('1. Identify top CPU-consuming processes');
      actions.push('2. Consider scaling up compute resources');
      actions.push('3. Optimize application code for CPU efficiency');
    }
    if (query.includes('memory')) {
      actions.push('1. Check for memory leaks in the application');
      actions.push('2. Increase memory allocation if needed');
      actions.push('3. Review and optimize memory-intensive operations');
    }
    if (query.includes('error') || query.includes('exception')) {
      actions.push('1. Review application logs for detailed error messages');
      actions.push('2. Check recent deployments for potential issues');
      actions.push('3. Implement or improve error handling');
    }
    if (query.includes('latency') || query.includes('response')) {
      actions.push('1. Check network connectivity and latency');
      actions.push('2. Review database query performance');
      actions.push('3. Consider implementing caching strategies');
    }
    if (query.includes('disk') || query.includes('storage')) {
      actions.push('1. Clean up unnecessary files and logs');
      actions.push('2. Increase disk space allocation');
      actions.push('3. Implement log rotation policies');
    }
    
    if (actions.length === 0) {
      actions.push('1. Review the monitor configuration and thresholds');
      actions.push('2. Analyze metric trends over a longer time period');
      actions.push('3. Correlate with other monitors and logs');
    }
    
    return actions;
  }
}