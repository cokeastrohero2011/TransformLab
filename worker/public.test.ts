import {describe,it,expect} from 'vitest';
import handler from './index';

describe('public access',()=>{
 it('allows a health request without credentials',async()=>{
  const response=await handler.fetch(new Request('https://revision.example.com/api/health'),{} as never);
  expect(response.status).toBe(200);
 });
 it('still rejects cross-origin mutations',async()=>{
  const response=await handler.fetch(new Request('https://revision.example.com/api/progress/reset',{method:'POST',headers:{origin:'https://other.example.com','x-transformlab-request':'1','content-type':'application/json'},body:'{"confirm":"RESET"}'}),{} as never);
  expect(response.status).toBe(403);
 });
});
