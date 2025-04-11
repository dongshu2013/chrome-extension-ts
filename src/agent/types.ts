// agent/types.ts
export interface Observation {
    type: string;
    payload: any;
  }
  
  export interface Task {
    description: string;
    payload?: any;
  }
  
  export interface AgentMemory {
    logs: string[];
    knowledge: Record<string, any>;
  }
  
  export interface Agent {
    observe(): Observation;
    plan(observation: Observation): Task;
    act(task: Task): void;
    remember(log: string): void;
  }