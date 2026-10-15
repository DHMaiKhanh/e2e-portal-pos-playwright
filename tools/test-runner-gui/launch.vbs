' Starts the Test Runner GUI as a desktop window with no console window.
' Closing the window stops the server. Server output goes to
' reports/gui-runs/server.log for troubleshooting.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
sh.CurrentDirectory = root
If Not fso.FolderExists(root & "\reports\gui-runs") Then
  If Not fso.FolderExists(root & "\reports") Then fso.CreateFolder(root & "\reports")
  fso.CreateFolder(root & "\reports\gui-runs")
End If
sh.Environment("Process")("GUI_APP") = "1"
sh.Run "cmd /c node tools\test-runner-gui\server.mjs > reports\gui-runs\server.log 2>&1", 0, False
