param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataDir = Join-Path $Root "data"
$LogFile = Join-Path $DataDir "error_logs.json"

function Ensure-LogFile {
  if (!(Test-Path $DataDir)) { New-Item -ItemType Directory -Force -Path $DataDir | Out-Null }
  if (!(Test-Path $LogFile)) { Set-Content -LiteralPath $LogFile -Encoding UTF8 -Value "[]" }
}

function Read-Logs {
  Ensure-LogFile
  $raw = Get-Content -Raw -LiteralPath $LogFile
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
  $parsed = $raw | ConvertFrom-Json
  if ($null -eq $parsed) { return @() }
  return @($parsed)
}

function Write-JsonResponse($Response, $Payload, [int]$StatusCode = 200) {
  $json = $Payload | ConvertTo-Json -Depth 12
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "text/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".png" { "image/png"; break }
    default { "application/octet-stream" }
  }
}

function Serve-Static($Response, [string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -eq "/") { $Path = "/frontend/index.html" }
  $relative = [Uri]::UnescapeDataString($Path.TrimStart("/")).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $target = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))
  $rootFull = [System.IO.Path]::GetFullPath($Root)

  if (!$target.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-JsonResponse $Response @{ error = "Forbidden" } 403
    return
  }

  if (!(Test-Path -LiteralPath $target -PathType Leaf)) {
    Write-JsonResponse $Response @{ error = "Not found" } 404
    return
  }

  $bytes = [System.IO.File]::ReadAllBytes($target)
  $Response.StatusCode = 200
  $Response.ContentType = Get-ContentType $target
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

Ensure-LogFile
$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Pinyin Pal MVP running at $prefix"
Write-Host "Writing pronunciation logs to $LogFile"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.AbsolutePath

    try {
      if ($request.HttpMethod -eq "GET" -and $path -eq "/api/health") {
        Write-JsonResponse $response @{ ok = $true; app = "Pinyin Pal" }
        continue
      }

      if ($request.HttpMethod -eq "GET" -and $path -eq "/api/attempts") {
        $logs = Read-Logs
        $sessionId = $request.QueryString["session_id"]
        if (![string]::IsNullOrWhiteSpace($sessionId)) {
          $logs = @($logs | Where-Object { $_.session_id -eq $sessionId })
        }
        Write-JsonResponse $response @{ attempts = $logs }
        continue
      }

      if ($request.HttpMethod -eq "POST" -and $path -eq "/api/attempts") {
        $reader = [System.IO.StreamReader]::new($request.InputStream, [System.Text.Encoding]::UTF8)
        $body = $reader.ReadToEnd()
        $payload = $body | ConvertFrom-Json
        $required = @("session_id", "target_pinyin", "user_input", "is_correct", "error_type", "module_id")
        $missing = @($required | Where-Object { -not $payload.PSObject.Properties[$_] })
        if ($missing.Count -gt 0) {
          Write-JsonResponse $response @{ error = "Missing required fields"; fields = $missing } 400
          continue
        }

        $payload | Add-Member -NotePropertyName id -NotePropertyValue ([guid]::NewGuid().ToString()) -Force
        $payload | Add-Member -NotePropertyName created_at -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString("o")) -Force
        $logs = Read-Logs
        $logs = @($logs) + $payload
        $logs | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $LogFile -Encoding UTF8
        Write-JsonResponse $response @{ attempt = $payload } 201
        continue
      }

      Serve-Static $response $path
    } catch {
      Write-JsonResponse $response @{ error = $_.Exception.Message } 500
    }
  }
} finally {
  $listener.Stop()
}

