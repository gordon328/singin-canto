const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const G = require("../gesture.js");
test("下拉超过 1/3 高度 → 关闭弹层", () => { assert.equal(G.dragDismissDecision(210, 600, 0), true); });
test("矮弹层也按 1/3 高度算", () => { assert.equal(G.dragDismissDecision(110, 300, 0), true); });
test("下拉不够且慢 → 弹回", () => { assert.equal(G.dragDismissDecision(190, 600, 0.2), false); });
test("下拉快速甩 → 关闭", () => { assert.equal(G.dragDismissDecision(40, 600, 0.9), true); });
test("轻轻一碰就算快也不关", () => { assert.equal(G.dragDismissDecision(10, 600, 2), false); });

test("橡皮筋：往上拖得越多跟得越少，永远小于手指移动", () => {
  const a = G.rubberBand(50, 600), b = G.rubberBand(200, 600);
  assert.ok(a > 0 && a < 50 && b < 200 && b > a);
  assert.ok(G.rubberBand(100000, 600) < 600);
  assert.equal(G.rubberBand(0, 600), 0);
});

test("弹簧：从起点出发，结束时停在目标，中间冲过头一点", () => {
  assert.equal(G.springOffset(100, 0, 0), 100);
  assert.ok(Math.abs(G.springOffset(100, 0, G.SPRING.DUR)) < 0.5);
  let min = Infinity; for (let t = 0; t <= G.SPRING.DUR; t += 5) min = Math.min(min, G.springOffset(100, 0, t));
  assert.ok(min < -2 && min > -15, "冲过头 " + min);
});
test("弹簧：松手时往外甩的速度会让它先多走一点再回来", () => {
  assert.ok(G.springOffset(100, 1, 30) > G.springOffset(100, 0, 30) + 10);
  assert.ok(Math.abs(G.springOffset(100, 1, G.SPRING.DUR * 1.5)) < 1);
});
test("CSS 里的 --spring 和 GESTURE.springLinear() 一致", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.ok(html.includes("--spring:" + G.springLinear() + ";"));
  assert.ok(html.includes("--dur-spring:" + G.SPRING.DUR + "ms;"));
});
