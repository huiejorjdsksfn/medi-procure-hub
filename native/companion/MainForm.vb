' ============================================================
' ProcurBosse Companion v4.9 - VB.NET Windows Forms
' EL5 MediProcure | Embu Level 5 Hospital | Kenya
'
' PURPOSE:
'   Native Windows Forms tool for hospital IT staff.
'   Provides a dashboard that connects to Supabase and shows:
'     - Live session counts from user_sessions table
'     - System metrics from system_metrics table (C++ agent data)
'     - Recent user action log
'   Also manages the C++ native agent process.
'
' REQUIREMENTS:
'   .NET 8 (Windows), Windows 10+
'   (Targets win-x64, single-file publish)
'
' BUILD:
'   dotnet publish ProcurBosseCompanion.vbproj
'     --configuration Release
'     --runtime win-x64
'     --self-contained false
'     -p:PublishSingleFile=true
' ============================================================

Imports System
Imports System.Windows.Forms
Imports System.Drawing
Imports System.Net.Http
Imports System.Net.Http.Json
Imports System.Text
Imports System.Text.Json
Imports System.Threading
Imports System.Threading.Tasks
Imports System.Diagnostics
Imports System.IO
Imports System.Reflection

Namespace ProcurBosseCompanion

' ============================================================
' ENTRY POINT
' ============================================================
Module Program
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Application.SetCompatibleTextRenderingDefault(False)
        Application.Run(New MainForm())
    End Sub
End Module

' ============================================================
' THEME - Microsoft Dynamics 365 inspired
' ============================================================
Public Module Theme
    Public ReadOnly Primary     As Color = Color.FromArgb(0, 120, 212)
    Public ReadOnly PrimaryDark As Color = Color.FromArgb(0, 90, 158)
    Public ReadOnly Success     As Color = Color.FromArgb(16, 124, 16)
    Public ReadOnly Warning     As Color = Color.FromArgb(215, 59, 1)
    Public ReadOnly Danger      As Color = Color.FromArgb(164, 38, 44)
    Public ReadOnly BgPage      As Color = Color.FromArgb(243, 245, 248)
    Public ReadOnly BgCard      As Color = Color.White
    Public ReadOnly Border      As Color = Color.FromArgb(218, 220, 224)
    Public ReadOnly TextMain    As Color = Color.FromArgb(31, 31, 31)
    Public ReadOnly TextMuted   As Color = Color.FromArgb(96, 96, 96)
    Public ReadOnly FontMain    As New Font("Segoe UI", 9F)
    Public ReadOnly FontBold    As New Font("Segoe UI Semibold", 9F)
    Public ReadOnly FontTitle   As New Font("Segoe UI", 14F, FontStyle.Regular)
    Public ReadOnly FontMono    As New Font("Consolas", 8.5F)
    Public ReadOnly FontSmall   As New Font("Segoe UI", 8F)
End Module

' ============================================================
' DATA MODELS
' ============================================================
Public Class LiveStats
    Public Property active_now As Integer = 0
    Public Property unique_users_now As Integer = 0
    Public Property sessions_1h As Integer = 0
    Public Property sessions_24h As Integer = 0
End Class

Public Class SystemMetricRow
    Public Property hostname As String = ""
    Public Property cpu_percent As Double = 0
    Public Property ram_percent As Double = 0
    Public Property disk_percent As Double = 0
    Public Property process_count As Integer = 0
    Public Property agent_version As String = ""
    Public Property reported_at As String = ""
End Class

Public Class ActionRow
    Public Property created_at As String = ""
    Public Property action_type As String = ""
    Public Property action As String = ""
    Public Property module As String = ""
End Class

' ============================================================
' MAIN FORM
' ============================================================
Public Class MainForm
    Inherits Form

    ' ---- Supabase config ----
    Private ReadOnly SupabaseUrl  As String = "https://yvjfehnzbzjliizjvuhq.supabase.co"
    Private ReadOnly AnonKey      As String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"
    Private ReadOnly WebAppUrl    As String = "https://procurbosse.edgeone.app"
    Private ReadOnly AppVersion   As String = "4.9.0"

    ' ---- Controls ----
    Private pnlHeader       As Panel
    Private lblTitle        As Label
    Private lblSubtitle     As Label
    Private lblStatus       As Label
    Private tabMain         As TabControl

    ' Dashboard tab
    Private tabDash         As TabPage
    Private pnlStats        As FlowLayoutPanel
    Private lblActiveNow    As Label
    Private lblUniqueUsers  As Label
    Private lblSess1h       As Label
    Private lblSess24h      As Label
    Private dgvMetrics      As DataGridView
    Private btnOpenApp      As Button
    Private btnRefresh      As Button

    ' Agent tab
    Private tabAgent        As TabPage
    Private lblAgentPath    As Label
    Private txtAgentPath    As TextBox
    Private btnBrowseAgent  As Button
    Private btnStartAgent   As Button
    Private btnStopAgent    As Button
    Private lblAgentStatus  As Label
    Private dgvActions      As DataGridView

    ' Log tab
    Private tabLog          As TabPage
    Private lstLog          As ListBox
    Private btnClearLog     As Button

    ' ---- State ----
    Private agentProc       As Process = Nothing
    Private refreshTimer    As System.Windows.Forms.Timer
    Private http            As New HttpClient()
    Private agentExePath    As String = ""

    ' ============================================================
    Sub New()
        Me.Text            = "ProcurBosse Companion v" & AppVersion
        Me.Size            = New Size(900, 620)
        Me.MinimumSize     = New Size(780, 500)
        Me.StartPosition   = FormStartPosition.CenterScreen
        Me.BackColor       = Theme.BgPage
        Me.Font            = Theme.FontMain
        Me.ForeColor       = Theme.TextMain
        Me.Icon            = SystemIcons.Application

        http.DefaultRequestHeaders.Add("apikey", AnonKey)
        http.DefaultRequestHeaders.Add("Authorization", "Bearer " & AnonKey)
        http.Timeout = TimeSpan.FromSeconds(12)

        BuildUI()
        SetupRefreshTimer()
        AppLog("ProcurBosse Companion v" & AppVersion & " started")
        AppLog("Supabase: " & SupabaseUrl)
        RefreshAll()
    End Sub

    ' ============================================================
    ' UI CONSTRUCTION
    ' ============================================================
    Private Sub BuildUI()
        ' --- Header ---
        pnlHeader = New Panel() With {
            .Dock = DockStyle.Top,
            .Height = 60,
            .BackColor = Theme.Primary,
            .Padding = New Padding(16, 8, 16, 8)
        }

        lblTitle = New Label() With {
            .Text = "ProcurBosse Companion",
            .Font = Theme.FontTitle,
            .ForeColor = Color.White,
            .AutoSize = True,
            .Location = New Point(16, 8)
        }

        lblSubtitle = New Label() With {
            .Text = "v" & AppVersion & "  |  EL5 MediProcure  |  Embu Level 5 Hospital  |  Kenya",
            .Font = Theme.FontSmall,
            .ForeColor = Color.FromArgb(200, 228, 252),
            .AutoSize = True,
            .Location = New Point(17, 34)
        }

        lblStatus = New Label() With {
            .Text = "Connecting...",
            .Font = Theme.FontSmall,
            .ForeColor = Color.White,
            .AutoSize = True,
            .Anchor = AnchorStyles.Right Or AnchorStyles.Top,
            .Location = New Point(pnlHeader.Width - 200, 22)
        }

        pnlHeader.Controls.Add(lblTitle)
        pnlHeader.Controls.Add(lblSubtitle)
        pnlHeader.Controls.Add(lblStatus)

        pnlHeader.Resize += Sub(s, e)
            lblStatus.Location = New Point(pnlHeader.Width - lblStatus.Width - 12, 22)
        End Sub

        ' --- Tabs ---
        tabMain = New TabControl() With {
            .Dock = DockStyle.Fill,
            .Padding = New Point(10, 4),
            .Font = Theme.FontMain
        }

        tabDash  = New TabPage("  Dashboard  ")
        tabAgent = New TabPage("  Agent Control  ")
        tabLog   = New TabPage("  Log Console  ")

        BuildDashboardTab()
        BuildAgentTab()
        BuildLogTab()

        tabMain.TabPages.Add(tabDash)
        tabMain.TabPages.Add(tabAgent)
        tabMain.TabPages.Add(tabLog)

        Controls.Add(tabMain)
        Controls.Add(pnlHeader)
    End Sub

    ' ---- Dashboard Tab ----
    Private Sub BuildDashboardTab()
        tabDash.BackColor = Theme.BgPage
        tabDash.Padding = New Padding(8)

        ' Stat cards row
        pnlStats = New FlowLayoutPanel() With {
            .Dock = DockStyle.Top,
            .Height = 90,
            .FlowDirection = FlowDirection.LeftToRight,
            .Padding = New Padding(0, 4, 0, 8),
            .BackColor = Theme.BgPage
        }

        Dim cardDefs = New List(Of (String, String, Color)) From {
            ("Active Now",    "0", Theme.Primary),
            ("Unique Users",  "0", Theme.Success),
            ("Sessions / 1h", "0", Theme.Warning),
            ("Sessions / 24h","0", Theme.Danger)
        }

        Dim valLabels As New List(Of Label)

        For Each def In cardDefs
            Dim card = MakeStatCard(def.Item1, def.Item2, def.Item3)
            Dim valLbl = DirectCast(card.Controls(1), Label)
            valLabels.Add(valLbl)
            pnlStats.Controls.Add(card)
        Next

        lblActiveNow   = valLabels(0)
        lblUniqueUsers = valLabels(1)
        lblSess1h      = valLabels(2)
        lblSess24h     = valLabels(3)

        ' Buttons
        Dim btnRow = New FlowLayoutPanel() With {
            .Dock = DockStyle.Top,
            .Height = 44,
            .FlowDirection = FlowDirection.LeftToRight,
            .Padding = New Padding(0, 4, 0, 4),
            .BackColor = Theme.BgPage
        }

        btnOpenApp = MakeButton("Open Web App", Theme.Primary)
        btnOpenApp.Width = 160
        AddHandler btnOpenApp.Click, Sub(s, e)
            Process.Start(New ProcessStartInfo(WebAppUrl) With {.UseShellExecute = True})
        End Sub

        btnRefresh = MakeButton("Refresh", Theme.BgCard)
        btnRefresh.ForeColor = Theme.Primary
        btnRefresh.Width = 100
        AddHandler btnRefresh.Click, Sub(s, e) RefreshAll()

        btnRow.Controls.Add(btnOpenApp)
        btnRow.Controls.Add(btnRefresh)

        ' System metrics grid
        dgvMetrics = MakeGrid()
        dgvMetrics.Dock = DockStyle.Fill
        dgvMetrics.Columns.Add("host",    "Hostname")
        dgvMetrics.Columns.Add("cpu",     "CPU %")
        dgvMetrics.Columns.Add("ram",     "RAM %")
        dgvMetrics.Columns.Add("disk",    "Disk C: %")
        dgvMetrics.Columns.Add("procs",   "Processes")
        dgvMetrics.Columns.Add("ver",     "Agent")
        dgvMetrics.Columns.Add("seen",    "Last Seen")

        For Each col As DataGridViewColumn In dgvMetrics.Columns
            col.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        Next

        Dim lbl = New Label() With {
            .Text = "System Metrics (from C++ native agent):",
            .Font = Theme.FontBold,
            .Dock = DockStyle.Top,
            .Height = 22,
            .ForeColor = Theme.TextMuted
        }

        Dim wrapper = New Panel() With { .Dock = DockStyle.Fill }
        wrapper.Controls.Add(dgvMetrics)
        wrapper.Controls.Add(lbl)

        tabDash.Controls.Add(wrapper)
        tabDash.Controls.Add(btnRow)
        tabDash.Controls.Add(pnlStats)
    End Sub

    ' ---- Agent Tab ----
    Private Sub BuildAgentTab()
        tabAgent.BackColor = Theme.BgPage
        tabAgent.Padding = New Padding(12)

        Dim layout = New TableLayoutPanel() With {
            .Dock = DockStyle.Top,
            .AutoSize = True,
            .ColumnCount = 1,
            .RowCount = 7,
            .Padding = New Padding(0, 4, 0, 0)
        }

        ' Path row
        Dim pathRow = New FlowLayoutPanel() With {
            .AutoSize = True,
            .FlowDirection = FlowDirection.LeftToRight,
            .Margin = New Padding(0, 0, 0, 8)
        }

        Dim pathLabel = New Label() With {
            .Text = "procurbosse-agent.exe path:",
            .Font = Theme.FontBold,
            .AutoSize = True,
            .Padding = New Padding(0, 6, 8, 0)
        }

        txtAgentPath = New TextBox() With {
            .Width = 380,
            .Font = Theme.FontMain,
            .BackColor = Theme.BgCard,
            .BorderStyle = BorderStyle.FixedSingle
        }

        btnBrowseAgent = MakeButton("Browse...", Theme.BgCard)
        btnBrowseAgent.ForeColor = Theme.Primary
        btnBrowseAgent.Width = 90

        AddHandler btnBrowseAgent.Click, Sub(s, e)
            Using dlg As New OpenFileDialog()
                dlg.Title  = "Select procurbosse-agent.exe"
                dlg.Filter = "Executable (*.exe)|*.exe|All files (*.*)|*.*"
                If dlg.ShowDialog() = DialogResult.OK Then
                    txtAgentPath.Text = dlg.FileName
                    agentExePath      = dlg.FileName
                    AppLog("Agent path set: " & agentExePath)
                End If
            End Using
        End Sub

        pathRow.Controls.Add(pathLabel)
        pathRow.Controls.Add(txtAgentPath)
        pathRow.Controls.Add(btnBrowseAgent)

        ' Agent status
        lblAgentStatus = New Label() With {
            .Text = "Status: Not running",
            .Font = Theme.FontBold,
            .ForeColor = Theme.Danger,
            .AutoSize = True,
            .Margin = New Padding(0, 4, 0, 8)
        }

        ' Control buttons
        Dim ctrlRow = New FlowLayoutPanel() With {
            .AutoSize = True,
            .FlowDirection = FlowDirection.LeftToRight,
            .Margin = New Padding(0, 0, 0, 12)
        }

        btnStartAgent = MakeButton("Start Agent", Theme.Success)
        btnStartAgent.Width = 130

        btnStopAgent = MakeButton("Stop Agent", Theme.Danger)
        btnStopAgent.Width = 130
        btnStopAgent.Enabled = False

        AddHandler btnStartAgent.Click, AddressOf StartAgent
        AddHandler btnStopAgent.Click,  AddressOf StopAgent

        ctrlRow.Controls.Add(btnStartAgent)
        ctrlRow.Controls.Add(btnStopAgent)

        ' Description
        Dim desc = New Label() With {
            .Text = "The C++ native agent runs on the hospital server and reports hardware metrics" & vbCrLf &
                    "(CPU, RAM, Disk, Processes) to Supabase every 30 seconds." & vbCrLf &
                    "This enables real-time system health monitoring in the Admin Panel.",
            .AutoSize = True,
            .ForeColor = Theme.TextMuted,
            .Font = Theme.FontSmall,
            .Margin = New Padding(0, 0, 0, 8)
        }

        layout.Controls.Add(pathRow)
        layout.Controls.Add(lblAgentStatus)
        layout.Controls.Add(ctrlRow)
        layout.Controls.Add(desc)

        ' Recent actions grid
        Dim actLabel = New Label() With {
            .Text = "Recent User Actions (live from Supabase):",
            .Font = Theme.FontBold,
            .Dock = DockStyle.Top,
            .Height = 22,
            .ForeColor = Theme.TextMuted
        }

        dgvActions = MakeGrid()
        dgvActions.Dock = DockStyle.Fill
        dgvActions.Columns.Add("time",   "Time")
        dgvActions.Columns.Add("type",   "Type")
        dgvActions.Columns.Add("action", "Action")
        dgvActions.Columns.Add("module", "Module")

        For Each col As DataGridViewColumn In dgvActions.Columns
            col.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
        Next

        Dim wrapper = New Panel() With { .Dock = DockStyle.Fill }
        wrapper.Controls.Add(dgvActions)
        wrapper.Controls.Add(actLabel)

        tabAgent.Controls.Add(wrapper)
        tabAgent.Controls.Add(layout)
    End Sub

    ' ---- Log Tab ----
    Private Sub BuildLogTab()
        tabLog.BackColor = Color.FromArgb(12, 20, 36)

        lstLog = New ListBox() With {
            .Dock = DockStyle.Fill,
            .Font = Theme.FontMono,
            .BackColor = Color.FromArgb(12, 20, 36),
            .ForeColor = Color.FromArgb(160, 220, 140),
            .BorderStyle = BorderStyle.None,
            .HorizontalScrollbar = True,
            .IntegralHeight = False,
            .SelectionMode = SelectionMode.MultiExtended
        }

        btnClearLog = MakeButton("Clear Log", Theme.Danger)
        btnClearLog.Dock = DockStyle.Bottom
        btnClearLog.Height = 30
        btnClearLog.ForeColor = Color.White
        AddHandler btnClearLog.Click, Sub(s, e)
            lstLog.Items.Clear()
            AppLog("Log cleared")
        End Sub

        tabLog.Controls.Add(lstLog)
        tabLog.Controls.Add(btnClearLog)
    End Sub

    ' ============================================================
    ' HELPER BUILDERS
    ' ============================================================
    Private Function MakeStatCard(title As String, value As String, col As Color) As Panel
        Dim card = New Panel() With {
            .Size = New Size(178, 72),
            .BackColor = Theme.BgCard,
            .Margin = New Padding(0, 0, 10, 0),
            .Padding = New Padding(12, 8, 12, 8)
        }
        card.Paint += Sub(s, e)
            Dim g = e.Graphics
            g.DrawRectangle(New Pen(col, 1), 0, 0, card.Width - 1, card.Height - 1)
            g.FillRectangle(New SolidBrush(Color.FromArgb(30, col)), 0, 0, 4, card.Height)
        End Sub

        Dim lTitle = New Label() With {
            .Text = title,
            .Font = Theme.FontSmall,
            .ForeColor = Color.Gray,
            .AutoSize = True,
            .Location = New Point(12, 8)
        }
        Dim lVal = New Label() With {
            .Text = value,
            .Font = New Font("Segoe UI", 22F),
            .ForeColor = col,
            .AutoSize = True,
            .Location = New Point(12, 28)
        }
        card.Controls.Add(lTitle)
        card.Controls.Add(lVal)
        Return card
    End Function

    Private Function MakeButton(text As String, bg As Color) As Button
        Dim btn = New Button() With {
            .Text = text,
            .BackColor = bg,
            .ForeColor = If(bg = Theme.BgCard, Theme.TextMain, Color.White),
            .FlatStyle = FlatStyle.Flat,
            .Font = Theme.FontBold,
            .Height = 34,
            .Cursor = Cursors.Hand,
            .Margin = New Padding(0, 0, 8, 0)
        }
        btn.FlatAppearance.BorderColor = Color.FromArgb(40, 0, 0, 0)
        btn.FlatAppearance.BorderSize = 1
        Return btn
    End Function

    Private Function MakeGrid() As DataGridView
        Dim g = New DataGridView() With {
            .ReadOnly = True,
            .AllowUserToAddRows = False,
            .AllowUserToDeleteRows = False,
            .AllowUserToResizeRows = False,
            .RowHeadersVisible = False,
            .AutoGenerateColumns = False,
            .BackgroundColor = Theme.BgCard,
            .BorderStyle = BorderStyle.None,
            .GridColor = Theme.Border,
            .Font = Theme.FontMain,
            .RowTemplate = {Height = 28},
            .SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            .MultiSelect = False
        }
        g.DefaultCellStyle.BackColor = Theme.BgCard
        g.DefaultCellStyle.ForeColor = Theme.TextMain
        g.DefaultCellStyle.SelectionBackColor = Color.FromArgb(220, 236, 252)
        g.DefaultCellStyle.SelectionForeColor = Theme.TextMain
        g.ColumnHeadersDefaultCellStyle.BackColor = Theme.BgPage
        g.ColumnHeadersDefaultCellStyle.ForeColor = Theme.TextMuted
        g.ColumnHeadersDefaultCellStyle.Font = Theme.FontBold
        g.ColumnHeadersHeight = 28
        g.EnableHeadersVisualStyles = False
        Return g
    End Function

    ' ============================================================
    ' DATA REFRESH
    ' ============================================================
    Private Sub SetupRefreshTimer()
        refreshTimer = New System.Windows.Forms.Timer() With {.Interval = 25000}
        AddHandler refreshTimer.Tick, Sub(s, e) RefreshAll()
        refreshTimer.Start()
    End Sub

    Private Async Sub RefreshAll()
        Try
            Await Task.WhenAll(RefreshStats(), RefreshMetrics(), RefreshActions())
            UpdateStatus("Connected | " & DateTime.Now.ToString("HH:mm:ss"), Theme.Success)
        Catch ex As Exception
            UpdateStatus("Error: " & ex.Message.Take(60).ToArray(), Theme.Danger)
            AppLog("Refresh error: " & ex.Message)
        End Try
    End Sub

    Private Async Function RefreshStats() As Task
        Try
            Dim url = SupabaseUrl & "/rest/v1/live_session_stats?select=*"
            Dim resp = Await http.GetStringAsync(url)
            Dim doc = JsonDocument.Parse(resp)
            Dim root = doc.RootElement

            Dim active = 0, unique = 0, s1h = 0, s24h = 0
            If root.ValueKind = JsonValueKind.Array AndAlso root.GetArrayLength() > 0 Then
                Dim row = root(0)
                If row.TryGetProperty("active_now",        Nothing) Then active = row.GetProperty("active_now").GetInt32()
                If row.TryGetProperty("unique_users_now",  Nothing) Then unique = row.GetProperty("unique_users_now").GetInt32()
                If row.TryGetProperty("sessions_1h",       Nothing) Then s1h   = row.GetProperty("sessions_1h").GetInt32()
                If row.TryGetProperty("sessions_24h",      Nothing) Then s24h  = row.GetProperty("sessions_24h").GetInt32()
            End If

            SafeInvoke(Sub()
                lblActiveNow.Text   = active.ToString()
                lblUniqueUsers.Text = unique.ToString()
                lblSess1h.Text      = s1h.ToString()
                lblSess24h.Text     = s24h.ToString()
            End Sub)
        Catch ex As Exception
            AppLog("Stats refresh error: " & ex.Message)
        End Try
    End Function

    Private Async Function RefreshMetrics() As Task
        Try
            Dim url = SupabaseUrl & "/rest/v1/latest_system_metrics?select=hostname,cpu_percent,ram_percent,disk_percent,process_count,agent_version,reported_at"
            Dim resp = Await http.GetStringAsync(url)
            Dim doc = JsonDocument.Parse(resp)
            Dim rows As New List(Of SystemMetricRow)

            If doc.RootElement.ValueKind = JsonValueKind.Array Then
                For Each el In doc.RootElement.EnumerateArray()
                    Dim row As New SystemMetricRow()
                    If el.TryGetProperty("hostname",     Nothing) Then row.hostname      = el.GetProperty("hostname").GetString() ?? ""
                    If el.TryGetProperty("cpu_percent",  Nothing) Then row.cpu_percent   = el.GetProperty("cpu_percent").GetDouble()
                    If el.TryGetProperty("ram_percent",  Nothing) Then row.ram_percent   = el.GetProperty("ram_percent").GetDouble()
                    If el.TryGetProperty("disk_percent", Nothing) Then row.disk_percent  = el.GetProperty("disk_percent").GetDouble()
                    If el.TryGetProperty("process_count",Nothing) Then row.process_count = el.GetProperty("process_count").GetInt32()
                    If el.TryGetProperty("agent_version",Nothing) Then row.agent_version = el.GetProperty("agent_version").GetString() ?? ""
                    If el.TryGetProperty("reported_at",  Nothing) Then row.reported_at   = el.GetProperty("reported_at").GetString() ?? ""
                    rows.Add(row)
                Next
            End If

            SafeInvoke(Sub()
                dgvMetrics.Rows.Clear()
                For Each r In rows
                    Dim ts = If(r.reported_at.Length > 0,
                        DateTime.Parse(r.reported_at).ToLocalTime().ToString("HH:mm:ss"), "--")
                    dgvMetrics.Rows.Add(r.hostname, r.cpu_percent.ToString("0.0") & "%",
                        r.ram_percent.ToString("0.0") & "%", r.disk_percent.ToString("0.0") & "%",
                        r.process_count, r.agent_version, ts)
                    ' Colour code high usage
                    Dim ri = dgvMetrics.Rows.Count - 1
                    If r.cpu_percent > 80  Then dgvMetrics.Rows(ri).Cells(1).Style.ForeColor = Theme.Danger
                    If r.ram_percent > 85  Then dgvMetrics.Rows(ri).Cells(2).Style.ForeColor = Theme.Danger
                    If r.disk_percent > 90 Then dgvMetrics.Rows(ri).Cells(3).Style.ForeColor = Theme.Warning
                Next
            End Sub)
        Catch ex As Exception
            AppLog("Metrics refresh error: " & ex.Message)
        End Try
    End Function

    Private Async Function RefreshActions() As Task
        Try
            Dim url = SupabaseUrl & "/rest/v1/user_action_log?select=created_at,action_type,action,module&order=created_at.desc&limit=30"
            Dim resp = Await http.GetStringAsync(url)
            Dim doc = JsonDocument.Parse(resp)
            Dim rows As New List(Of ActionRow)

            If doc.RootElement.ValueKind = JsonValueKind.Array Then
                For Each el In doc.RootElement.EnumerateArray()
                    Dim row As New ActionRow()
                    If el.TryGetProperty("created_at",   Nothing) Then row.created_at  = el.GetProperty("created_at").GetString() ?? ""
                    If el.TryGetProperty("action_type",  Nothing) Then row.action_type = el.GetProperty("action_type").GetString() ?? ""
                    If el.TryGetProperty("action",       Nothing) Then row.action      = el.GetProperty("action").GetString() ?? ""
                    If el.TryGetProperty("module",       Nothing) Then row.module      = el.GetProperty("module").GetString() ?? ""
                    rows.Add(row)
                Next
            End If

            SafeInvoke(Sub()
                dgvActions.Rows.Clear()
                For Each r In rows
                    Dim ts = If(r.created_at.Length > 0,
                        DateTime.Parse(r.created_at).ToLocalTime().ToString("HH:mm:ss"), "--")
                    dgvActions.Rows.Add(ts, r.action_type, r.action, r.module)
                Next
            End Sub)
        Catch ex As Exception
            AppLog("Actions refresh error: " & ex.Message)
        End Try
    End Function

    ' ============================================================
    ' AGENT CONTROL
    ' ============================================================
    Private Sub StartAgent(sender As Object, e As EventArgs)
        Dim path = If(txtAgentPath.Text.Length > 0, txtAgentPath.Text, agentExePath)

        If path.Length = 0 Then
            path = Path.Combine(Application.StartupPath, "procurbosse-agent.exe")
            txtAgentPath.Text = path
        End If

        If Not File.Exists(path) Then
            MessageBox.Show("procurbosse-agent.exe not found at:" & vbCrLf & path &
                vbCrLf & vbCrLf & "Use Browse to locate it.", "Agent Not Found",
                MessageBoxButtons.OK, MessageBoxIcon.Warning)
            AppLog("ERROR: agent not found at " & path)
            Return
        End If

        Try
            agentProc = New Process()
            agentProc.StartInfo = New ProcessStartInfo(path) With {
                .UseShellExecute  = False,
                .CreateNoWindow   = True,
                .WindowStyle      = ProcessWindowStyle.Hidden
            }
            agentProc.Start()
            agentExePath = path

            btnStartAgent.Enabled = False
            btnStopAgent.Enabled  = True
            lblAgentStatus.Text      = "Status: Running (PID " & agentProc.Id & ")"
            lblAgentStatus.ForeColor = Theme.Success
            AppLog("Agent started: PID " & agentProc.Id)
        Catch ex As Exception
            AppLog("ERROR starting agent: " & ex.Message)
            MessageBox.Show("Failed to start agent: " & ex.Message, "Error",
                MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    Private Sub StopAgent(sender As Object, e As EventArgs)
        Try
            If agentProc IsNot Nothing AndAlso Not agentProc.HasExited Then
                agentProc.Kill()
                agentProc.WaitForExit(3000)
                AppLog("Agent stopped")
            End If
        Catch ex As Exception
            AppLog("ERROR stopping agent: " & ex.Message)
        Finally
            agentProc = Nothing
            btnStartAgent.Enabled    = True
            btnStopAgent.Enabled     = False
            lblAgentStatus.Text      = "Status: Stopped"
            lblAgentStatus.ForeColor = Theme.Danger
        End Try
    End Sub

    ' ============================================================
    ' HELPERS
    ' ============================================================
    Private Sub SafeInvoke(action As Action)
        If InvokeRequired Then
            Invoke(action)
        Else
            action()
        End If
    End Sub

    Private Sub UpdateStatus(msg As String, col As Color)
        SafeInvoke(Sub()
            lblStatus.Text      = msg
            lblStatus.ForeColor = col
            lblStatus.Location = New Point(pnlHeader.Width - lblStatus.Width - 12, 22)
        End Sub)
    End Sub

    Public Sub AppLog(msg As String)
        Dim line = "[" & DateTime.Now.ToString("HH:mm:ss") & "] " & msg
        SafeInvoke(Sub()
            If lstLog IsNot Nothing Then
                lstLog.Items.Add(line)
                If lstLog.Items.Count > 2000 Then lstLog.Items.RemoveAt(0)
                lstLog.TopIndex = lstLog.Items.Count - 1
            End If
        End Sub)
    End Sub

    Protected Overrides Sub OnFormClosing(e As FormClosingEventArgs)
        refreshTimer?.Stop()
        If agentProc IsNot Nothing AndAlso Not agentProc.HasExited Then agentProc.Kill()
        http.Dispose()
        MyBase.OnFormClosing(e)
    End Sub
End Class

End Namespace
