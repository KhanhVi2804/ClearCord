namespace ClearCord.Configuration;

public sealed class ClearAiSettings
{
    public const string SectionName = "ClearAi";

    public string Provider { get; set; } = "builtin";

    public string Model { get; set; } = "gpt-4.1-mini";

    public string BaseUrl { get; set; } = "https://api.openai.com/v1";

    public string? ApiKey { get; set; }

    public string AssistantName { get; set; } = "Clear";
}
