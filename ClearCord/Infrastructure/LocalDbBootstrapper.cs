using System.Diagnostics;
using System.Threading;
using Microsoft.Data.SqlClient;

namespace ClearCord.Infrastructure;

[DebuggerNonUserCode]
[DebuggerStepThrough]
internal static class LocalDbBootstrapper
{
    private const string LocalDbPrefix = "(localdb)\\";

    public static void EnsureStarted(string? connectionString)
    {
        if (!OperatingSystem.IsWindows() || string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        var sqlConnectionBuilder = new SqlConnectionStringBuilder(connectionString);
        var dataSource = sqlConnectionBuilder.DataSource?.Trim();
        if (string.IsNullOrWhiteSpace(dataSource) || !dataSource.StartsWith(LocalDbPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var instanceName = dataSource[LocalDbPrefix.Length..].Trim();
        if (string.IsNullOrWhiteSpace(instanceName))
        {
            return;
        }

        var info = RunSqllocaldb($"info \"{instanceName}\"", allowFailure: true);
        if (info.ExitCode != 0 && !InstanceMissing(info.Output))
        {
            throw BuildException(instanceName, "inspect", info.Output);
        }

        if (info.ExitCode == 0 && IsRunning(info.Output) && HasPipeName(info.Output))
        {
            return;
        }

        if (InstanceMissing(info.Output))
        {
            var create = RunSqllocaldb($"create \"{instanceName}\"", allowFailure: true);
            if (create.ExitCode != 0)
            {
                throw BuildException(instanceName, "create", create.Output);
            }
        }

        var start = RunSqllocaldb($"start \"{instanceName}\"", allowFailure: true);
        if (start.ExitCode != 0 && !AlreadyRunning(start.Output))
        {
            throw BuildException(instanceName, "start", start.Output);
        }

        WaitForRunningState(instanceName);
        WaitUntilReady(connectionString, instanceName);
    }

    private static (int ExitCode, string Output) RunSqllocaldb(string arguments, bool allowFailure)
    {
        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "sqllocaldb",
                    Arguments = arguments,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var output = $"{process.StandardOutput.ReadToEnd()}{process.StandardError.ReadToEnd()}".Trim();
            process.WaitForExit();
            return (process.ExitCode, output);
        }
        catch (Exception) when (allowFailure)
        {
            return (-1, "The sqllocaldb command is unavailable.");
        }
    }

    private static bool InstanceMissing(string output)
    {
        return output.Contains("does not exist", StringComparison.OrdinalIgnoreCase)
            || output.Contains("not exist", StringComparison.OrdinalIgnoreCase);
    }

    private static bool AlreadyRunning(string output)
    {
        return output.Contains("already started", StringComparison.OrdinalIgnoreCase)
            || output.Contains("already running", StringComparison.OrdinalIgnoreCase);
    }

    private static void WaitForRunningState(string instanceName)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var info = RunSqllocaldb($"info \"{instanceName}\"", allowFailure: true);
            if (info.ExitCode == 0 && IsRunning(info.Output) && HasPipeName(info.Output))
            {
                Thread.Sleep(1500);
                return;
            }

            Thread.Sleep(1000);
        }
    }

    private static void WaitUntilReady(string connectionString, string instanceName)
    {
        var builder = new SqlConnectionStringBuilder(connectionString)
        {
            InitialCatalog = "master",
            ConnectTimeout = 2
        };

        SqlException? lastException = null;

        for (var attempt = 0; attempt < 10; attempt++)
        {
            try
            {
                using var connection = new SqlConnection(builder.ConnectionString);
                connection.Open();

                using var command = connection.CreateCommand();
                command.CommandText = "SELECT 1";
                command.ExecuteScalar();
                return;
            }
            catch (SqlException exception) when (IsRetryableStartupFailure(exception))
            {
                lastException = exception;
                Thread.Sleep(1000);
            }
        }

        throw new InvalidOperationException(
            $"ClearCord started SQL Server LocalDB instance '{instanceName}', but it never became ready to accept connections. " +
            "Try restarting the machine or repairing SQL Server Express LocalDB.",
            lastException);
    }

    private static bool IsRetryableStartupFailure(SqlException exception)
    {
        return exception.Number is 50 or 53 or 233 or 4060 or -2;
    }

    private static bool IsRunning(string output)
    {
        return output.Contains("Running", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasPipeName(string output)
    {
        return output.Contains("Instance pipe name:", StringComparison.OrdinalIgnoreCase)
            && !output.Contains("Instance pipe name: np:\\\\.\\pipe\\LOCALDB#SHUTDOWN", StringComparison.OrdinalIgnoreCase);
    }

    private static InvalidOperationException BuildException(string instanceName, string action, string output)
    {
        var details = string.IsNullOrWhiteSpace(output) ? "No additional details were returned." : output;
        return new InvalidOperationException(
            $"ClearCord could not {action} SQL Server LocalDB instance '{instanceName}'. " +
            "Install or repair SQL Server Express LocalDB, then try again. " +
            $"sqllocaldb output: {details}");
    }
}
