import request from 'supertest';
import app from '../src/server.js';
import db from '../src/db.js';

describe('SIEM Indexer & M3 Approval API', () => {
  // Test health check
  it('GET /health should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  // Test security mode endpoint
  it('GET /api/security/mode should return mode and signer status', async () => {
    const res = await request(app).get('/api/security/mode');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('mode');
    expect(res.body).toHaveProperty('signerConfigured');
  });

  // Test logs endpoint
  it('GET /api/logs should return an array of events', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  // Test approvals workflow
  let testApprovalId = null;

  it('POST /api/approvals should create a pending approval request', async () => {
    const res = await request(app)
      .post('/api/approvals')
      .send({
        requester: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        tokenId: 1,
        riskScore: 76,
        riskLevel: "HIGH",
        reason: "Off-hours transfer + Unknown Device"
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('requestId');
    expect(res.body.status).toEqual('PENDING');
    testApprovalId = res.body.id;
  });

  it('GET /api/approvals should list all approval requests including the created one', async () => {
    const res = await request(app).get('/api/approvals');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    const created = res.body.find(r => r.id === testApprovalId);
    expect(created).toBeDefined();
    expect(created.status).toEqual('PENDING');
  });

  it('PATCH /api/approvals/:id should approve request and attach signature', async () => {
    const res = await request(app)
      .patch(`/api/approvals/${testApprovalId}`)
      .send({
        status: 'APPROVED',
        approvedBy: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('APPROVED');
    expect(res.body).toHaveProperty('signature');
  });

  it('PATCH /api/approvals/:id with invalid status should return 400', async () => {
    const res = await request(app)
      .patch(`/api/approvals/${testApprovalId}`)
      .send({ status: 'INVALID_STATUS' });
    expect(res.statusCode).toEqual(400);
  });

  it('PATCH /api/approvals/:id/execute should mark approval as EXECUTED', async () => {
    const res = await request(app)
      .patch(`/api/approvals/${testApprovalId}/execute`)
      .send({});

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('EXECUTED');
  });
});
