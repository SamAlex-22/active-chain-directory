import request from 'supertest';
import app from '../src/server.js';
import db from '../src/db.js';

describe('SIEM Indexer API', () => {
  // Test health check
  it('GET /health should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  // Test logs endpoint
  it('GET /api/logs should return an array of events', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });
});
