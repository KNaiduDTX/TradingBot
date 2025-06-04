import { TypeGuard } from './types';
import { TypeSafeStateMachine } from './mockStateMachine';
import { MockMetricsCollector } from './mockMetrics';
import { MockDebugger } from './mockDebugger';

type MockFactory<T> = {
  create: (options?: Partial<T>) => T;
  validate: (value: unknown) => value is T;
  extend: <U extends T>(extension: Partial<U>) => MockFactory<U>;
  withMetrics: () => MockFactory<T>;
  withStateMachine: <E extends string>() => MockFactory<T & { stateMachine: TypeSafeStateMachine<T, E> }>;
};

class MockFactoryBuilder<T> {
  private typeGuard: TypeGuard<T>;
  private metricsEnabled: boolean = false;
  private stateMachineEnabled: boolean = false;

  constructor(typeGuard: TypeGuard<T>) {
    this.typeGuard = typeGuard;
  }

  static create<T>(typeGuard: TypeGuard<T>): MockFactoryBuilder<T> {
    return new MockFactoryBuilder<T>(typeGuard);
  }

  withMetrics(): this {
    this.metricsEnabled = true;
    return this;
  }

  withStateMachine<E extends string>(): this {
    this.stateMachineEnabled = true;
    return this;
  }

  build(): MockFactory<T> {
    return {
      create: (options = {}) => {
        const mock = {
          ...options
        } as T;

        if (this.metricsEnabled) {
          MockMetricsCollector.startTracking(mock.toString());
        }

        if (this.stateMachineEnabled) {
          (mock as any).stateMachine = new TypeSafeStateMachine<T, string>(mock);
        }

        return mock;
      },
      validate: this.typeGuard,
      extend: <U extends T>(extension: Partial<U>) => {
        return MockFactoryBuilder.create<U>(this.typeGuard as TypeGuard<U>)
          .withMetrics()
          .withStateMachine()
          .build();
      },
      withMetrics: () => {
        this.metricsEnabled = true;
        return this.build();
      },
      withStateMachine: <E extends string>() => {
        this.stateMachineEnabled = true;
        return this.build() as MockFactory<T & { stateMachine: TypeSafeStateMachine<T, E> }>;
      }
    };
  }
}

export { MockFactoryBuilder, MockFactory }; 