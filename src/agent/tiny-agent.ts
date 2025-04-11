// agent/tinyAgent.ts
import { Agent, Observation, Task, AgentMemory } from './types';

export class TinyAgent implements Agent {
  private memory: AgentMemory = {
    logs: [],
    knowledge: {},
  };

  observe(): Observation {
    // Example: scrape document title
    const title = document.title;
    return { type: 'pageTitle', payload: title };
  }

  plan(observation: Observation): Task {
    if (observation.type === 'pageTitle') {
      return { description: `Log the page title: ${observation.payload}` };
    }
    return { description: 'No-op' };
  }

  act(task: Task): void {
    console.log('Agent Acting:', task.description);
    this.remember(task.description);
  }

  remember(log: string): void {
    this.memory.logs.push(log);
    // optionally store to localStorage or IndexedDB
  }
}