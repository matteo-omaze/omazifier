import type { ResolvedBlock } from "./resolve.js";
import type { Market } from "./types.js";

/**
 * A createElement function — React DOM and React Native both expose the SAME
 * React.createElement, so the engine renders on either platform without depending on React.
 */
// Loose on purpose: this is the seam between the framework-agnostic engine and a platform's
// React.createElement (whose typed overloads won't match a strict signature).
export type CreateElement = (component: any, props?: any, ...children: any[]) => unknown;

/**
 * Turn resolved blocks into platform elements. Each block component receives a uniform
 * `{ config, data, market }` prop contract — `market` (locale/currency/timezone/id) is passed
 * explicitly so market-aware blocks don't have to piggyback on their data payload.
 */
export function renderBlocks(
  blocks: ResolvedBlock[],
  createElement: CreateElement,
  market: Market,
): unknown[] {
  return blocks.map((b, i) =>
    createElement(b.component, {
      key: `${b.blockId}-${i}`,
      config: b.config,
      data: b.data,
      market,
    }),
  );
}
