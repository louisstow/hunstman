import { Queue } from "../src/Queue";
import { Request } from "../src/Request";

test("Basic queue functions", () => {
  const q = new Queue();
  const r = new Request("test");

  q.enqueue(r);

  expect(q.size()).toBe(q.queue.length);

  const out = q.dequeue();
  if (out) {
    expect(out.request).toBe(r);
    expect(out.index).toBe(0);
    expect(out.free).toBe(false);
  }

  const out2 = q.dequeue();
  expect(out2).toBeNull();

  const emptyQ = Queue.empty();
  expect(emptyQ.size()).toBe(0);
});

test("Buffer queue functions", () => {
  const q = new Queue();
  q.enqueue(new Request("test1"));
  q.enqueue(new Request("test2"));
  q.enqueue(new Request("test3"));
  q.enqueue(new Request("test4"));
  q.enqueue(new Request("test5"));
  q.enqueue(new Request("test6"));
  q.enqueue(new Request("test7"));
  q.enqueue(new Request("test8"));

  const buf = q.buffer(5);
  expect(buf.length).toBe(5);

  const buf2 = q.buffer(5);
  expect(buf2.length).toBe(3);

  const buf3 = q.buffer(5);
  expect(buf3.length).toBe(0);
});
