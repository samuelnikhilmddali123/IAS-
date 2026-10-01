$Signature = @"
[DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
public static extern int SetThreadExecutionState(int esFlags);
"@

$Kernel32 = Add-Type -MemberDefinition $Signature -Name 'Kernel32' -Namespace 'Win32' -PassThru
[void]$Kernel32::SetThreadExecutionState([int]0x80000041)
Write-Output "SUCCESS: KeepAwake SetThreadExecutionState activated."
