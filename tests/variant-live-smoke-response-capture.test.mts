import assert from 'node:assert/strict';
import test from 'node:test';
import { captureLocalApiResponse, type ApiDiagnostic } from '../e2e/variant-live-smoke-response-capture';

test('variant smoke response capture tolerates a detached Playwright response', () => {
  const apiResponses: ApiDiagnostic[] = [];
  const detachedResponseErrors: string[] = [];
  const detachedResponse = {
    request: () => {
      throw new Error('request() must not be read after a detached response');
    },
    status: () => {
      throw new Error('status() must not be read after a detached response');
    },
    url: () => {
      throw new Error('Object with guid response@deadbeef was not bound in the connection');
    },
  };

  assert.doesNotThrow(() => {
    captureLocalApiResponse(detachedResponse, new Map(), apiResponses, detachedResponseErrors);
  });
  assert.deepEqual(apiResponses, []);
  assert.deepEqual(detachedResponseErrors, [
    'Object with guid response@deadbeef was not bound in the connection',
  ]);
});

test('variant smoke response capture retains normal local API status diagnostics', () => {
  const request = {};
  const apiResponses: ApiDiagnostic[] = [];
  const detachedResponseErrors: string[] = [];

  captureLocalApiResponse(
    {
      request: () => request,
      status: () => 401,
      url: () => 'http://127.0.0.1:4173/api/bootstrap?compact=1',
    },
    new Map([[request, { method: 'GET', resourceType: 'fetch' }]]),
    apiResponses,
    detachedResponseErrors,
  );

  assert.deepEqual(apiResponses, [{
    method: 'GET',
    path: '/api/bootstrap',
    resourceType: 'fetch',
    status: 401,
    url: 'http://127.0.0.1:4173/api/bootstrap?compact=1',
  }]);
  assert.deepEqual(detachedResponseErrors, []);
});
