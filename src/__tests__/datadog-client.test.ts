import { DatadogClient } from '../datadog-client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DatadogClient', () => {
  let client: DatadogClient;

  beforeEach(() => {
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      defaults: {
        baseURL: 'https://api.datadoghq.com/api/v1',
        headers: {},
      },
    } as any);

    client = new DatadogClient({
      apiKey: 'test-api-key',
      appKey: 'test-app-key',
      site: 'datadoghq.com',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAlerts', () => {
    it('should fetch and filter alerts correctly', async () => {
      const mockMonitors = {
        monitors: [
          {
            id: 1,
            name: 'Test Alert 1',
            overall_state: 'Alert',
            priority: 'P1',
            tags: ['env:prod', 'service:api'],
            message: 'High CPU usage',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
          {
            id: 2,
            name: 'Test Alert 2',
            overall_state: 'Warn',
            priority: 'P2',
            tags: ['env:staging'],
            message: 'Memory warning',
            created: '2024-01-01',
            modified: '2024-01-02',
          },
        ],
      };

      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: mockMonitors });

      const result = await client.getAlerts({ limit: 10, priority: 'P1' });
      const content = JSON.parse(result.content[0].text);

      expect(content.count).toBe(1);
      expect(content.alerts[0].name).toBe('Test Alert 1');
      expect(mockClient.get).toHaveBeenCalledWith('/monitor/search', {
        params: {
          query: 'status:("Alert" OR "Warn" OR "No Data")',
          page_size: 10,
          sort: '-status,name',
        },
      });
    });
  });

  describe('analyzeAlert', () => {
    it('should analyze alert and provide insights', async () => {
      const mockMonitor = {
        id: 1,
        name: 'High CPU Alert',
        overall_state: 'Alert',
        message: 'CPU usage is too high',
        query: 'avg(last_5m):avg:system.cpu.user{host:server1} > 90',
        tags: ['env:prod'],
      };

      const mockStateHistory = {
        history: [
          { timestamp: 1234567890, state: 'Alert' },
          { timestamp: 1234567880, state: 'OK' },
        ],
      };

      const mockClient = (client as any).client;
      mockClient.get
        .mockResolvedValueOnce({ data: mockMonitor })
        .mockResolvedValueOnce({ data: mockStateHistory })
        .mockResolvedValueOnce({ data: { series: [] } });

      const result = await client.analyzeAlert({ 
        alertId: '1',
        includeMetrics: true,
        includeLogs: false,
      });
      const analysis = JSON.parse(result.content[0].text);

      expect(analysis.alert.name).toBe('High CPU Alert');
      expect(analysis.potentialCauses).toContain(
        'High CPU usage detected - possible resource-intensive processes or insufficient compute resources'
      );
      expect(analysis.suggestedActions).toContain('1. Identify top CPU-consuming processes');
    });
  });

  describe('parseTime', () => {
    it('should parse relative time strings correctly', async () => {
      const now = Math.floor(Date.now() / 1000);
      
      const mockClient = (client as any).client;
      mockClient.get.mockResolvedValue({ data: { series: [] } });

      await client.getMetrics({ query: 'test.metric', from: '-1h' });

      const callArgs = mockClient.get.mock.calls[0][1];
      expect(callArgs.params.from).toBeCloseTo(now - 3600, -1);
    });
  });
});