const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto(process.env.SMOKE_URL || "http://127.0.0.1:8080");
  await page.getByText("우리 강아지", { exact: true }).waitFor();
  await page.getByRole("button", { name: "밥 주기", exact: true }).click();
  await page.getByText("냠냠! 맛있어요").waitFor();
  await page.getByRole("button", { name: "쓰다듬기", exact: true }).click();
  await page.getByText("쓰담쓰담, 기분 좋아요 ♥").waitFor();
  await page.getByRole("button", { name: "재우기", exact: true }).click();
  await page.getByText("새근새근… 쉬는 중이에요").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "밥 주기", exact: true })
      .getAttribute("aria-disabled"),
    "true",
  );
  await page.reload();
  await page.getByText("새근새근… 쉬는 중이에요").waitFor();
  await page.getByRole("button", { name: "깨우기", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "강아지 얼굴 사진 선택", exact: true })
    .click();
  await (
    await chooser
  ).setFiles(require("node:path").resolve("assets/icon.png"));
  await page.getByText("얼굴을 맞춰주세요").waitFor();
  await page.getByRole("button", { name: "사진 확대", exact: true }).click();
  await page.getByText("115%", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "이 얼굴로 시작하기", exact: true })
    .click();
  await page.getByText("우리 강아지가 마당에 왔어요!").waitFor();
  await page.reload();
  await page.getByText("우리 강아지", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByText("＋ 내 강아지 사진으로 시작하기", { exact: true })
      .count(),
    0,
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dogame:pet:v1")),
  );
  assert.equal(saved.face.zoom, 1.15);
  assert.ok(saved.face.uri.startsWith("data:"));
  assert.equal(saved.pet.sleeping, false);

  // Failed persistence must not look like a successful photo replacement.
  const failedChooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "강아지 얼굴 사진 선택", exact: true })
    .click();
  await (
    await failedChooser
  ).setFiles(require("node:path").resolve("assets/icon.png"));
  await page.getByText("얼굴을 맞춰주세요").waitFor();
  await page.evaluate(() => {
    window.originalStorageSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "dogame:pet:v1")
        throw new DOMException("Test storage full", "QuotaExceededError");
      return window.originalStorageSetItem.call(this, key, value);
    };
  });
  await page
    .getByRole("button", { name: "이 얼굴로 시작하기", exact: true })
    .click();
  await page.getByRole("dialog")
    .getByText(
      "사진을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.",
      { exact: true },
    )
    .waitFor();
  assert.equal(await page.getByText("얼굴을 맞춰주세요").count(), 1);
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("dogame:pet:v1")).face.zoom,
    ),
    1.15,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalStorageSetItem;
  });
  await page.getByRole("button", { name: "취소", exact: true }).click();

  // A minute in the foreground changes needs; time in the background must not.
  await page.clock.fastForward(60000);
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("dogame:pet:v1")).pet.energy < 79,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const beforeHidden = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dogame:pet:v1")).pet,
  );
  await page.clock.fastForward(3600000);
  const afterHidden = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dogame:pet:v1")).pet,
  );
  assert.deepEqual(afterHidden, beforeHidden);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(5000);
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("dogame:pet:v1")).pet.energy < 78,
  );
  const afterResume = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dogame:pet:v1")).pet,
  );
  assert.ok(
    beforeHidden.energy - afterResume.energy < 1,
    "background duration must not drain energy on resume",
  );
  await page.evaluate(() => localStorage.removeItem("dogame:pet:v1"));
  await page.reload();
  await page.getByText("우리 강아지", { exact: true }).waitFor();
  await page.screenshot({ path: ".expo/browser-smoke.png" });
  for (const size of [
    { width: 375, height: 667 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size);
    const button = await page
      .getByRole("button", { name: "재우기", exact: true })
      .boundingBox();
    assert.ok(
      button && button.y >= 0 && button.y + button.height <= size.height,
      "care buttons must fit on compact screens",
    );
  }

  assert.deepEqual(errors, []);
  console.log(
    "PASS: care actions, sleep locking, reload persistence, photo selection/zoom/save/reload, photo save failure recovery, foreground decay, background pause/resume, compact screens, no runtime errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
