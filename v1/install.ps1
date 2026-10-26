<#
.SYNOPSIS
  Links Claude Code's user-level agents and manager skill to this repository.

.DESCRIPTION
  Creates two directory junctions, so every project on this machine sees the shared definitions:

    ~/.claude/agents          -> <this repo>/claude/agents
    ~/.claude/skills/manager  -> <this repo>/claude/skills/manager

  Idempotent: a junction that already points at the right folder is left as it is. It never replaces a real
  directory or a file, and never re-points a link that points elsewhere: it reports the conflict, changes
  nothing (not even the other link) and exits 1.
  A junction needs no administrator rights. To undo, remove the junction only (the folder it points at stays):
  `cmd /c rmdir "%USERPROFILE%\.claude\agents"`.

.PARAMETER Check
  Only report what exists and what the script would do. Changes nothing.

.PARAMETER ClaudeHome
  The folder that holds Claude Code's user-level settings (default ~/.claude). Only for testing the script.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\code\agent-workflow\install.ps1 -Check
#>
[CmdletBinding()]
param(
  [switch]$Check,
  # Where Claude Code keeps its user-level settings; another folder only for testing this script.
  [string]$ClaudeHome = (Join-Path $HOME '.claude')
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot

$links = @(
  @{ Link = (Join-Path $ClaudeHome 'agents'); Target = (Join-Path $repoRoot 'claude\agents') },
  @{ Link = (Join-Path $ClaudeHome 'skills\manager'); Target = (Join-Path $repoRoot 'claude\skills\manager') }
)

function Get-FullPath([string]$path) {
  return [System.IO.Path]::GetFullPath($path).TrimEnd('\')
}

# What is at $link today, and what to do about it: ok | create | conflict.
function Get-LinkPlan([string]$link, [string]$target) {
  if (-not (Test-Path -LiteralPath $target -PathType Container)) {
    return @{ Action = 'conflict'; Reason = "the target folder $target does not exist" }
  }
  $item = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
  if ($null -eq $item) {
    return @{ Action = 'create'; Reason = "nothing at $link yet" }
  }
  if ($item.LinkType -in @('Junction', 'SymbolicLink')) {
    $current = @($item.Target)[0]
    if ($current -and ((Get-FullPath $current) -ieq (Get-FullPath $target))) {
      return @{ Action = 'ok'; Reason = "$link is already a $($item.LinkType) to $target" }
    }
    return @{ Action = 'conflict'; Reason = "$link is a $($item.LinkType) to $current, not to $target" }
  }
  if ($item.PSIsContainer) {
    return @{ Action = 'conflict'; Reason = "$link is a real directory; move it away by hand first (never replaced by this script)" }
  }
  return @{ Action = 'conflict'; Reason = "$link is a file; move it away by hand first" }
}

# Plan every link first: one conflict means nothing is changed.
$plans = foreach ($entry in $links) {
  $plan = Get-LinkPlan $entry.Link $entry.Target
  @{ Link = $entry.Link; Target = $entry.Target; Action = $plan.Action; Reason = $plan.Reason }
}
$conflicts = @($plans | Where-Object { $_.Action -eq 'conflict' }).Count

foreach ($plan in $plans) {
  switch ($plan.Action) {
    'ok' {
      Write-Output "ok        $($plan.Reason)"
    }
    'conflict' {
      Write-Output "conflict  $($plan.Reason)"
    }
    'create' {
      if ($Check -or $conflicts -gt 0) {
        Write-Output "would     create a junction $($plan.Link) -> $($plan.Target) ($($plan.Reason))"
      } else {
        $parent = Split-Path -Parent $plan.Link
        if (-not (Test-Path -LiteralPath $parent)) {
          New-Item -ItemType Directory -Path $parent | Out-Null
          Write-Output "created   the folder $parent"
        }
        New-Item -ItemType Junction -Path $plan.Link -Target $plan.Target | Out-Null
        Write-Output "created   a junction $($plan.Link) -> $($plan.Target)"
      }
    }
  }
}

if ($Check) {
  Write-Output 'check only: nothing was changed.'
} elseif ($conflicts -gt 0) {
  Write-Output 'nothing was changed: resolve the conflicts above, then run it again.'
}
if ($conflicts -gt 0) {
  exit 1
}
exit 0
