import {describe,it,expect} from "vitest";
import {displayPeriod,displayTime} from "../../src/domain/parking/display-time";
describe("review time display",()=>{
 it("shows readable hours and minutes",()=>{expect(displayTime(480)).toBe("8am");expect(displayTime(1080)).toBe("6pm");expect(displayTime(735)).toBe("12:15pm");});
 it("distinguishes all day and exclusive midnight",()=>{expect(displayPeriod({dayOfWeek:1,startTime:0,endTime:1440})).toBe("Monday · All day");expect(displayPeriod({dayOfWeek:6,startTime:1320,endTime:1440})).toBe("Saturday · 10pm–midnight");});
});
