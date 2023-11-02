import { Setting, Settings } from "./Settings";
import { Queue, QueueItem } from "./Queue";

export enum EngineState {
  WAITING,
  RUNNING,
  PAUSED,
  CANCELLED,
}

export type Handler = (item: QueueItem, localIndex: number) => Promise<void>;

export const DEFAULT_MAX_REQUESTS = 50;

class Engine {
  queue: Queue;
  state: EngineState = EngineState.WAITING;
  handleItem: Handler;
  maxConcurrentRequests: number = 1;

  pausePromise?: Promise<void>;
  pauseResolver?: () => void;

  constructor({
    queue,
    settings,
    handleItem,
  }: {
    queue: Queue;
    settings: Settings;
    handleItem: Handler;
  }) {
    this.queue = queue;
    this.maxConcurrentRequests = settings.get<number>(
      Setting.MAX_CONCURRENT_REQUESTS,
      DEFAULT_MAX_REQUESTS
    );

    this.handleItem = handleItem;
  }

  reset() {
    this.state = EngineState.WAITING;
  }

  pause() {
    if (this.isPaused() || this.isCancelled()) {
      return false;
    }

    this.state = EngineState.PAUSED;
    this.pausePromise = new Promise((resolve) => {
      this.pauseResolver = () => resolve();
    });

    return true;
  }

  resume() {
    if (!this.isPaused()) {
      return false;
    }

    this.state = EngineState.RUNNING;

    if (this.pauseResolver) {
      this.pauseResolver();
      return true;
    }

    return false;
  }

  cancel() {
    this.state = EngineState.CANCELLED;
  }

  isRunning() {
    return this.state === EngineState.RUNNING;
  }

  isWaiting() {
    return this.state === EngineState.WAITING;
  }

  isPaused() {
    return this.state === EngineState.PAUSED;
  }

  isCancelled() {
    return this.state === EngineState.CANCELLED;
  }

  setQueue(queue: Queue) {
    this.queue = queue;
  }

  async run() {
    this.state = EngineState.RUNNING;
    await this.execute();
    this.state = EngineState.WAITING;
  }

  async executeFromItem(item: QueueItem, localIndex: number) {
    await this.handleItem(item, localIndex);

    while (this.queue.countRemainingItems() > 0) {
      if (
        this.state === EngineState.CANCELLED ||
        this.state === EngineState.PAUSED
      ) {
        break;
      }

      const nextItem = this.queue.reserveFirstReadyItem();
      if (!nextItem) {
        break;
      }

      await this.handleItem(nextItem, localIndex);
    }
  }

  async execute() {
    while (this.queue.countRemainingItems() > 0) {
      if (this.state === EngineState.CANCELLED) {
        break;
      }

      if (this.state === EngineState.PAUSED) {
        if (!this.pausePromise) {
          throw new Error("Pause has not been correctly set");
        }

        await this.pausePromise;
      }

      const inUse = this.queue.countInUse();
      const items = this.queue.buffer(this.maxConcurrentRequests - inUse);

      await Promise.all(items.map((item, i) => this.executeFromItem(item, i)));
    }
  }
}

export { Engine };
