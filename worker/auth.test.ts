import {describe,it,expect} from 'vitest';
import handler from './index';
const env={DEPLOY_ENV:'production',DEV_AUTH_BYPASS:'true',ACCESS_TEAM_DOMAIN:'',ACCESS_AUD:'',ALLOWED_EMAIL:'person@example.com'};
describe('Access boundary',()=>{
 it('rejects missing JWT even when an email header is forged',async()=>{
  const response=await handler.fetch(new Request('https://revision.example.com/api/health',{headers:{'Cf-Access-Authenticated-User-Email':'person@example.com'}}),env as never);
  expect(response.status).toBe(403);
 });
 it('cannot activate bypass in production on localhost',async()=>{
  const response=await handler.fetch(new Request('http://localhost:8787/api/health'),env as never);
  expect(response.status).toBe(403);
 });
 it('permits an explicitly configured local development request',async()=>{
  const response=await handler.fetch(new Request('http://localhost:8787/api/health'),{...env,DEPLOY_ENV:'development'} as never);
  expect(response.status).toBe(200);
 });
});
