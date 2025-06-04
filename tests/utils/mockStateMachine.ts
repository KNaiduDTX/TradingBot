type StateTransition<T, E extends string> = {
  type: E;
  handler: (state: T) => T;
  guard?: (state: T) => boolean;
};

class TypeSafeStateMachine<T, E extends string> {
  private state: T;
  private transitions: Map<E, StateTransition<T, E>>;
  private history: Array<{ state: T; event: E; timestamp: number }>;

  constructor(initialState: T) {
    this.state = initialState;
    this.transitions = new Map();
    this.history = [];
  }

  addTransition(
    event: E,
    handler: (state: T) => T,
    guard?: (state: T) => boolean
  ): this {
    this.transitions.set(event, { type: event, handler, guard });
    return this;
  }

  transition(event: E): T {
    const transition = this.transitions.get(event);
    if (!transition) {
      throw new Error(`Invalid transition: ${event}`);
    }

    if (transition.guard && !transition.guard(this.state)) {
      throw new Error(`Transition guard failed for event: ${event}`);
    }

    this.state = transition.handler(this.state);
    this.history.push({
      state: this.state,
      event,
      timestamp: Date.now()
    });

    return this.state;
  }

  getCurrentState(): T {
    return this.state;
  }

  getHistory(): typeof this.history {
    return this.history;
  }
}

export { TypeSafeStateMachine, StateTransition }; 