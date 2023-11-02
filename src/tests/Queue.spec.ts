import { Queue, QueueItemState } from "../Queue";
import { Request } from "../Request";

describe("Queue", () => {
  test("Basic queue functions", () => {
    const q = new Queue();
    const r = new Request("test");

    q.enqueue(r);

    expect(q.size()).toBe(q.queue.length);

    const out = q.reserveFirstReadyItem();
    if (out) {
      expect(out.request).toBe(r);
      expect(out.index).toBe(0);
      expect(out.state).toBe(QueueItemState.IN_USE);
    }

    q.forEach((item, index) => {
      expect(item).toBe(out);
      expect(index).toBe(0);
    });

    const out2 = q.reserveFirstReadyItem();
    expect(out2).toBeNull();

    const emptyQ = Queue.empty();
    expect(emptyQ.size()).toBe(0);
  });

  test("Buffer queue functions", () => {
    const q = new Queue();
    for (let i = 1; i <= 8; ++i) {
      q.enqueue(new Request(`test${i}`));
    }

    const buf = q.buffer(5);
    expect(buf.length).toBe(5);
    expect(q.countRemainingItems()).toBe(8);

    const buf2 = q.buffer(5);
    expect(buf2.length).toBe(3);

    const buf3 = q.buffer(5);
    expect(buf3.length).toBe(0);
  });

  test("Queue state", () => {
    const q = new Queue();
    const N = 8;
    for (let i = 1; i <= N; ++i) {
      q.enqueue(new Request(`test${i}`));
    }

    const item = q.reserveFirstReadyItem();

    if (!item) {
      throw "Should not be null";
    }

    item.state = QueueItemState.FINISHED;

    expect(q.countFinishedItems()).toBe(1);
    expect(q.countRemainingItems()).toBe(N - 1);
  });

  test("Queue serialization and deserialization", () => {
    const q = new Queue();
    q.enqueue(new Request("test1"));

    const serial = JSON.stringify(q.serialize());
    expect(serial).toBe(
      '[{"index":0,"request":{"url":"test1","headers":{},"meta":{},"method":"GET","responseType":"text"}}]'
    );

    const deserial = [
      {
        index: 99,
        request: {
          url: "test2",
          headers: {},
          meta: {},
          method: "POST",
          response: { status: 200, statusText: "OK", headers: {}, raw: "" },
        },
      },
    ];

    const q2 = Queue.deserialize(deserial);
    const item = q2.queue[0];

    expect(item.index).toBe(99);
    expect(item.request.url).toBe("test2");
    expect(item.request.method).toBe("POST");
    expect(item.request?.response?.status).toBe(200);
    expect(item.request?.response?.request).toBe(item.request);
  });
});
