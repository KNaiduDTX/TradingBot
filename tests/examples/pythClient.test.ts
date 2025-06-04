import { MockFactoryBuilder } from '../utils/mockFactory';
import { TypeSafeMockSystem } from '../utils/typeSafeMocks';
import { MockMetricsCollector } from '../utils/mockMetrics';
import { MockDebugger } from '../utils/mockDebugger';
import { TypeSafeStateMachine } from '../utils/mockStateMachine';

// Define the PythClient interface
interface PythClient {
  getPriceAccount(): Promise<{
    getPriceNoOlderThan(age: number): number;
    getConfidenceNoOlderThan(age: number): number;
    price: number;
    confidence: number;
    status: number;
  }>;
}

// Create type guard for PythClient
const isPythClient = (value: unknown): value is PythClient => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'getPriceAccount' in value &&
    typeof (value as PythClient).getPriceAccount === 'function'
  );
};

type PythClientWithStateMachine = PythClient & {
  stateMachine: TypeSafeStateMachine<PythClient, 'error' | 'success'>;
};

describe('PythClient Mock Example', () => {
  let mockSystem: TypeSafeMockSystem;
  let pythClientFactory: ReturnType<typeof MockFactoryBuilder.create<PythClient>>;

  beforeEach(() => {
    // Initialize mock system
    mockSystem = TypeSafeMockSystem.getInstance();
    mockSystem.registerType('PythClient', isPythClient);

    // Create factory
    pythClientFactory = MockFactoryBuilder.create(isPythClient)
      .withMetrics()
      .withStateMachine<'error' | 'success'>();

    // Enable debug mode
    MockDebugger.enableDebugMode();
  });

  afterEach(() => {
    MockMetricsCollector.clearMetrics();
    MockDebugger.clearDebugHistory();
    MockDebugger.disableDebugMode();
  });

  it('should create a type-safe mock with metrics and state machine', async () => {
    // Create mock client
    const factory = pythClientFactory.build();
    const mockClient = factory.create({
      getPriceAccount: async () => ({
        getPriceNoOlderThan: (age: number) => 1.0,
        getConfidenceNoOlderThan: (age: number) => 0.1,
        price: 1.0,
        confidence: 0.1,
        status: 1
      })
    }) as PythClientWithStateMachine;

    // Use state machine
    mockClient.stateMachine
      .addTransition('error', (state) => ({
        ...state,
        getPriceAccount: jest.fn().mockRejectedValue(new Error('Network error'))
      }))
      .addTransition('success', (state) => ({
        ...state,
        getPriceAccount: jest.fn().mockResolvedValue({
          getPriceNoOlderThan: jest.fn().mockReturnValue(2.0),
          getConfidenceNoOlderThan: jest.fn().mockReturnValue(0.2),
          price: 2.0,
          confidence: 0.2,
          status: 1
        })
      }));

    // Test initial state
    const initialPrice = await mockClient.getPriceAccount();
    expect(initialPrice.price).toBe(1.0);

    // Test error state
    mockClient.stateMachine.transition('error');
    await expect(mockClient.getPriceAccount()).rejects.toThrow('Network error');

    // Test success state
    mockClient.stateMachine.transition('success');
    const successPrice = await mockClient.getPriceAccount();
    expect(successPrice.price).toBe(2.0);

    // Check metrics
    const metrics = MockMetricsCollector.getMetrics(mockClient.toString());
    expect(metrics).toBeDefined();
    expect(metrics?.calls).toBeGreaterThan(0);

    // Check debug history
    const debugHistory = MockDebugger.getDebugHistory(mockClient.toString());
    expect(debugHistory.length).toBeGreaterThan(0);
  });

  it('should validate mock types', () => {
    const factory = pythClientFactory.build();
    const invalidClient = {
      getPriceAccount: 'not a function'
    };

    expect(factory.validate(invalidClient)).toBe(false);
    expect(factory.validate({
      getPriceAccount: jest.fn()
    })).toBe(true);
  });

  it('should extend mock factory with additional properties', () => {
    interface ExtendedPythClient extends PythClient {
      additionalMethod(): string;
    }

    const factory = pythClientFactory.build();
    const extendedFactory = factory.extend<ExtendedPythClient>({
      additionalMethod: () => 'test'
    });

    const extendedClient = extendedFactory.create();
    expect(extendedClient.additionalMethod()).toBe('test');
    expect(extendedClient.getPriceAccount).toBeDefined();
  });
}); 