export function getRoutedTargetAgent(
  routingRules: Array<{ channel: string; targetAgent: string | null }>,
) {
  return (
    routingRules.find((rule) => rule.channel === "agent_poll" && rule.targetAgent)?.targetAgent ??
    routingRules.find(
      (rule) =>
        ["agent_endpoint", "agent_run"].includes(rule.channel) && rule.targetAgent,
    )?.targetAgent ??
    routingRules.find((rule) => rule.channel !== "telegram" && rule.targetAgent)?.targetAgent ??
    null
  )
}
