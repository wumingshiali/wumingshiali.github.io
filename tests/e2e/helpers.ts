import type { Page } from "@playwright/test";

/**
 * 把浏览器内 Date 固定到指定日期（无参 new Date() / Date.now() 均返回该日），
 * 让「日期命中」类用例可确定性地测试（不依赖真实运行日期）。
 */
export async function mockDate(
  page: Page,
  year: number,
  month: number,
  day: number,
) {
  await page.addInitScript(
    ({ y, m, d }) => {
      const RealDate = Date;
      class MockDate extends RealDate {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) super(y, m, d);
          else super(...args);
        }
        static now() {
          return new RealDate(y, m, d).getTime();
        }
      }
      (window as unknown as { Date: typeof Date }).Date = MockDate;
    },
    { y: year, m: month, d: day },
  );
}
