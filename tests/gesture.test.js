const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("../gesture.js");
test("下拉超过阈值 → 关闭弹层", () => { assert.equal(G.dragDismissDecision(150, 600, 0), true); });
test("矮弹层按 30% 高度算", () => { assert.equal(G.dragDismissDecision(100, 300, 0), true); });
test("下拉不够且慢 → 弹回", () => { assert.equal(G.dragDismissDecision(60, 600, 0.2), false); });
test("下拉快速甩 → 关闭", () => { assert.equal(G.dragDismissDecision(40, 600, 0.9), true); });
