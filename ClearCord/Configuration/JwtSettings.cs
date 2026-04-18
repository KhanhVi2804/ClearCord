namespace ClearCord.Configuration;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "ClearCord";
    public string Audience { get; set; } = "ClearCord.Client";
    public string SecretKey { get; set; } = "ClearCord-Super-Secret-Key-Replace-In-Production-2026";
    public int ExpiryMinutes { get; set; } = 180;
    public string ClientAppBaseUrl { get; set; } = "http://localhost:3000";
}
