/**
 * Phase 6 graceful shutdown tests (Step 10).
 *
 * registerGracefulShutdown is exercised with a fake HTTP server and a
 * mocked database pool; process.exit is intercepted so Jest survives.
 */
import { EventEmitter } from 'events';

jest.mock('../src/config/db', () => ({
  pool: {
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    query: jest.fn(),
  },
  query: jest.fn(),
  testDbConnection: jest.fn(),
}));

// eslint-disable-next-line import/first
import { registerGracefulShutdown } from '../src/config/shutdown';
// eslint-disable-next-line import/first
import { pool } from '../src/config/db';

class FakeServer extends EventEmitter {
  closeCb: ((cb?: () => void) => void) | null = null;
  closed = false;
  idleClosed = false;
  close(cb: () => void) {
    this.closed = true;
    cb();
  }
  closeIdleConnections() {
    this.idleClosed = true;
  }
}

describe('Phase 6 — graceful shutdown', () => {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

  afterEach(() => {
    exitSpy.mockClear();
    (pool.end as jest.Mock).mockClear();
  });

  afterAll(() => {
    exitSpy.mockRestore();
  });

  it('SIGTERM: stops accepting, closes idle sockets, drains the pool, exits 0', async () => {
    const server = new FakeServer();
    registerGracefulShutdown(server as never);

    process.emit('SIGTERM');
    // Allow the shutdown promise chain to settle.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(server.closed).toBe(true); // 1. no new requests
    expect(server.idleClosed).toBe(true); // 2. idle keep-alive sockets closed
    expect(pool.end).toHaveBeenCalledTimes(1); // 3. database drained
    expect(exitSpy).toHaveBeenCalledWith(0); // 4. clean exit
  });

  it('SIGINT: same sequence as SIGTERM', async () => {
    const server = new FakeServer();
    registerGracefulShutdown(server as never);

    process.emit('SIGINT');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(server.closed).toBe(true);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('pool drain failure exits non-zero (supervisor sees incomplete shutdown)', async () => {
    (pool.end as jest.Mock).mockRejectedValueOnce(new Error('pool stuck'));
    const server = new FakeServer();
    registerGracefulShutdown(server as never);

    process.emit('SIGTERM');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('second signal during shutdown is ignored (no double-run)', async () => {
    const server = new FakeServer();
    registerGracefulShutdown(server as never);

    process.emit('SIGTERM');
    process.emit('SIGTERM'); // must be a no-op
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });
});
