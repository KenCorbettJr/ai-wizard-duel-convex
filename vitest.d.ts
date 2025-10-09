/// <reference types="vitest/globals" />

declare module "vitest" {
  interface Assertion<T = unknown> {
    toBe(expected: T): void;
    toEqual(expected: T): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeInstanceOf(expected: unknown): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
    toMatch(expected: string | RegExp): void;
    toMatchObject(expected: unknown): void;
    toThrow(expected?: unknown): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeNaN(): void;
    toHaveProperty(keyPath: string, value?: unknown): void;
    toStrictEqual(expected: T): void;
    toBeInTheDocument(): void;
    toHaveClass(...classNames: string[]): void;
    toHaveAttribute(attr: string, value?: unknown): void;
    toHaveTextContent(text: string | RegExp): void;
    toBeVisible(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toBeChecked(): void;
    toHaveValue(value: unknown): void;
    toHaveFocus(): void;
    toBeInvalid(): void;
    toBeValid(): void;
    toBeRequired(): void;
    toHaveStyle(css: string | object): void;
    toHaveDisplayValue(value: string | string[]): void;
    toBeEmptyDOMElement(): void;
    toContainElement(element: HTMLElement | null): void;
    toContainHTML(htmlText: string): void;
    toHaveAccessibleDescription(
      expectedAccessibleDescription?: string | RegExp
    ): void;
    toHaveAccessibleName(expectedAccessibleName?: string | RegExp): void;
    toHaveErrorMessage(expectedErrorMessage?: string | RegExp): void;
  }
}
