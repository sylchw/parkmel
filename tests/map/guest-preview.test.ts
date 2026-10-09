import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import GuestPreview,{boundedGuestRemaining} from "../../src/components/map/GuestPreview";
describe("guest preview boundary",()=>{
 it("fails closed on malformed or excessive server allowance",()=>{
  for(const value of [NaN,Infinity,-1,120001,1.5]) expect(boundedGuestRemaining(value)).toBe(0);
  expect(boundedGuestRemaining(120000)).toBe(120000);
 });
 it("makes expired content inert and keeps sign-in outside it",()=>{
  const html=renderToStaticMarkup(createElement(GuestPreview,{initialRemainingMs:0,heartbeat:async()=>0,signInHref:"/auth/sign-in"}));
  expect(html).toContain('inert=""');expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("Guest preview ended");expect(html).toMatch(/<\/div><a href="\/auth\/sign-in">Sign in/);
 });
 it("shows a bounded active preview",()=>{
  const html=renderToStaticMarkup(createElement(GuestPreview,{initialRemainingMs:2000,heartbeat:async()=>2000,signInHref:"/auth/sign-in"}));
  expect(html).toContain("2 seconds remaining");expect(html).not.toContain('inert=""');
 });
});
