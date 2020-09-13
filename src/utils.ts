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

  data.queue.forEach((item) => {
    if (item.request.response && !item.request.response.data) {
      item.request.response.data = item.request.response.raw;
    }

    spider._processResponseMiddleware(item);
    if (item.request.response) {
      spider.results[item.index] = item.request.response;
    }
  });

  return {
    run(): Promise<Response[]> {
      spider.state = SpiderState.DONE;

      data.queue.forEach((item) => {
        spider.emit(SpiderEvents.RESPONSE, item.request.response, item);
        spider.emit(SpiderEvents.REQUEST_DONE, item);
      });

      spider.emit(SpiderEvents.DONE, spider.results);
      return Promise.resolve(spider.results);
    },
  };
};

export { cache };
