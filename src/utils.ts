import fs from "fs";
import { Spider, SpiderEvents, SpiderState } from "./Spider";
import { Response } from "./Response";
import { QueueItem, Queue } from "./Queue";

const loadCache = (key: string): Queue | null => {
  try {
    const data = JSON.parse(fs.readFileSync(`.${key}.cache`).toString());
    const out = Queue.deserialize(data);

    return out;
  } catch (err) {
    return null;
  }
};

const saveCache = (key: string, queue: Queue) => {
  const d = JSON.stringify(queue.serialize());
  fs.writeFileSync(`.${key}.cache`, d);
};

const cache = (
  spider: Spider,
  skip?: boolean
): { run: (r?: any) => Promise<Response[]> } | Spider => {
  if (skip === true) {
    return spider;
  }

  const data = loadCache(spider.name);

  if (!data) {
    spider.once(SpiderEvents.DONE, () => {
      saveCache(spider.name, spider.queue);
    });

    return spider;
  }

  spider.queue = data;

  return {
    async run(): Promise<Response[]> {
      spider.state = SpiderState.DONE;

      for (let i = 0; i < data.queue.length; ++i) {
        const item = data.queue[i];
        if (item.request.response && !item.request.response.data) {
          item.request.response.data = item.request.response.raw;
        }

        // @ts-ignore
        await spider.runResponseMiddleware(item);

        if (item.request.response) {
          spider.results[item.index] = item.request.response;
        }

        spider.emit(SpiderEvents.RESPONSE, item.request.response, item);
        spider.emit(SpiderEvents.REQUEST_DONE, item);
      }

      spider.emit(SpiderEvents.DONE, spider.results);
      return spider.results;
    },
  };
};

export { cache };
