# Enhanced Type-Safe Mocking System

This directory contains a comprehensive type-safe mocking system for TypeScript and Jest, designed to address common issues with type preservation and provide advanced features for testing.

## Features

### 1. Type-Safe Mocking
- Preserves TypeScript type information
- Runtime type validation
- Type guard utilities
- Branded types for better type inference

### 2. State Management
- Type-safe state transitions
- State history tracking
- Transition guards
- Event-based state changes

### 3. Performance Monitoring
- Execution time tracking
- Call counting
- Error tracking
- Metrics collection

### 4. Debugging Support
- Source map integration
- Stack trace capture
- State history
- Debug mode toggle

## Usage

### Basic Mock Creation

```typescript
import { MockFactoryBuilder } from './utils/mockFactory';

interface MyInterface {
  method(): string;
}

const isMyInterface = (value: unknown): value is MyInterface => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'method' in value &&
    typeof (value as MyInterface).method === 'function'
  );
};

const factory = MockFactoryBuilder.create(isMyInterface)
  .withMetrics()
  .withStateMachine<'error' | 'success'>()
  .build();

const mock = factory.create({
  method: () => 'test'
});
```

### State Machine Usage

```typescript
const mock = factory.create({
  method: () => 'initial'
}) as MyInterfaceWithStateMachine;

mock.stateMachine
  .addTransition('error', (state) => ({
    ...state,
    method: () => { throw new Error('Test error'); }
  }))
  .addTransition('success', (state) => ({
    ...state,
    method: () => 'success'
  }));

// Use state machine
mock.stateMachine.transition('error');
expect(() => mock.method()).toThrow('Test error');

mock.stateMachine.transition('success');
expect(mock.method()).toBe('success');
```

### Metrics Collection

```typescript
import { MockMetricsCollector } from './utils/mockMetrics';

// Get metrics for a mock
const metrics = MockMetricsCollector.getMetrics(mock.toString());
console.log('Calls:', metrics?.calls);
console.log('Average execution time:', metrics?.averageExecutionTime);
console.log('Errors:', metrics?.errors);
```

### Debugging

```typescript
import { MockDebugger } from './utils/mockDebugger';

// Enable debug mode
MockDebugger.enableDebugMode();

// Get debug history
const debugHistory = MockDebugger.getDebugHistory(mock.toString());
console.log('Debug history:', debugHistory);

// Disable debug mode
MockDebugger.disableDebugMode();
```

## Best Practices

1. **Type Guards**
   - Always provide type guards for your interfaces
   - Use strict type checking in guards
   - Consider edge cases in validation

2. **State Management**
   - Define clear state transitions
   - Use transition guards for complex logic
   - Keep state history for debugging

3. **Performance**
   - Monitor mock execution times
   - Clear metrics between tests
   - Use caching for frequently used mocks

4. **Debugging**
   - Enable debug mode only when needed
   - Clear debug history between tests
   - Use source maps for better debugging

## Example

See `tests/examples/pythClient.test.ts` for a complete example of the mocking system in action.

## Contributing

When adding new features or fixing bugs:

1. Add type definitions in `tests/utils/types.ts`
2. Implement core functionality in appropriate utility files
3. Add tests in `tests/examples/`
4. Update this README with new features or changes 