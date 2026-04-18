using ClearCord.Enums;
using System.ComponentModel.DataAnnotations;

namespace ClearCord.DTOs;

public sealed record CreateCategoryRequest(
    [param: Required, MaxLength(60)] string Name,
    int Position);

public sealed record UpdateCategoryRequest(
    [param: Required, MaxLength(60)] string Name,
    int Position);

public sealed record CreateChannelRequest(
    [param: Required, MaxLength(60)] string Name,
    ChannelType Type,
    Guid? CategoryId,
    [param: MaxLength(120)] string? Topic,
    int Position);

public sealed record UpdateChannelRequest(
    [param: Required, MaxLength(60)] string Name,
    Guid? CategoryId,
    [param: MaxLength(120)] string? Topic,
    int Position);

public sealed record ChannelCategoryDto(
    Guid Id,
    string Name,
    int Position);

public sealed record ChannelDto(
    Guid Id,
    Guid ServerId,
    Guid? CategoryId,
    string Name,
    string? Topic,
    ChannelType Type,
    int Position);
