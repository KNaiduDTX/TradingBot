import { TypeGuard } from './types';

type Branded<T, B extends string> = T & { __brand: B };

type MockFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Parameters<T>[];
    instances: any[];
    invocationCallOrder: number[];
    results: { type: 'return' | 'throw'; value: any }[];
  };
} & Branded<jest.Mock, 'TypeSafeMock'>;

class TypeSafeMockSystem {
  private static instance: TypeSafeMockSystem;
  private typeRegistry: Map<string, TypeGuard<any>>;
  private mockCache: WeakMap<object, any>;

  private constructor() {
    this.typeRegistry = new Map();
    this.mockCache = new WeakMap();
  }

  static getInstance(): TypeSafeMockSystem {
    if (!this.instance) {
      this.instance = new TypeSafeMockSystem();
    }
    return this.instance;
  }

  registerType<T>(name: string, guard: TypeGuard<T>): void {
    this.typeRegistry.set(name, guard);
  }

  createMock<T extends (...args: any[]) => any>(
    implementation: T,
    typeName: string
  ): MockFunction<T> {
    const guard = this.typeRegistry.get(typeName);
    if (!guard) {
      throw new Error(`No type guard registered for ${typeName}`);
    }

    const mock = jest.fn(implementation) as unknown as MockFunction<T>;
    Object.defineProperty(mock, '__brand', {
      value: 'TypeSafeMock',
      enumerable: false
    });

    return mock;
  }

  getCachedMock<T>(key: object): T | undefined {
    return this.mockCache.get(key) as T;
  }

  setCachedMock<T>(key: object, mock: T): void {
    this.mockCache.set(key, mock);
  }
}

export { TypeSafeMockSystem, MockFunction, Branded }; 