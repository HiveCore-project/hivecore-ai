// Stable boundary: no alternate paid API or automatic fallback is configured.
export { WorkersAIProvider, type RoleProvider } from "./ai";
export class DisabledProvider {
  readonly name = "disabled";
  async investigate(): Promise<never> {
    throw new Error("AI execution is disabled until explicitly approved.");
  }
}
