import fs from "fs";
import path from "path";

import { Spider, SpiderEvents } from "./Spider";
import { Response } from "./Response";
import { QueueItem, Queue } from "./Queue";
import { Setting, Settings } from "./Settings";

const DEFAULT_CACHE_PATH = "__fixtures__";

const loadCache = (key: string, settings: Settings): Queue | null => {
  try {
    const cachePath = settings.get(Setting.CACHE_PATH, DEFAULT_CACHE_PATH);
    const data = JSON.parse(
      fs.readFileSync(path.join(cachePath, `.${key}.cache`)).toString()
    );
    const out = Queue.deserialize(data);

    return out;
  } catch (err) {
    console.warn(`Could not load from cache: ${key}`);
    return null;
  }
};

const saveCache = (key: string, queue: Queue, settings: Settings) => {
  const cachePath = settings.get(Setting.CACHE_PATH, DEFAULT_CACHE_PATH);

  try {
    const d = JSON.stringify(queue.serialize());
    fs.writeFileSync(path.join(cachePath, `.${key}.cache`), d);
  } catch (err) {
    console.warn(`Could not save to cache: ${key}`);
  }
};

const cache = (
  spider: Spider,
  skip?: boolean
): { run: (r?: any) => Promise<Response[]> } | Spider => {
  if (skip === true) {
    return spider;
  }

  const data = loadCache(spider.name, spider.settings);

  if (!data) {
    spider.once(SpiderEvents.DONE, async () => {
      saveCache(spider.name, spider.queue, spider.settings);
    });

    return spider;
  }

  spider.queue = data;

  return {
    async run(): Promise<Response[]> {
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
